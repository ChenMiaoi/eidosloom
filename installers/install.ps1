param(
  [string]$RepoOwner = $(if ($env:EIDOSLOOM_OWNER) { $env:EIDOSLOOM_OWNER } else { "ChenMiaoi" }),
  [string]$RepoName = $(if ($env:EIDOSLOOM_REPO) { $env:EIDOSLOOM_REPO } else { "eidosloom" }),
  [string]$Ref = $(if ($env:EIDOSLOOM_REF) { $env:EIDOSLOOM_REF } else { "v0.2.1" }),
  [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" })
)

$ErrorActionPreference = "Stop"

function Get-ManifestSkillNames {
  param([string]$ManifestPath)

  $ManifestData = Get-Content -Path $ManifestPath -Raw | ConvertFrom-Json
  if ($ManifestData.schema -ne "eidosloom-bundle-manifest.v1") {
    throw "Unsupported Eidosloom bundle manifest schema."
  }
  if (-not $ManifestData.skills -or $ManifestData.skills.Count -eq 0) {
    throw "Bundle manifest did not declare any skills."
  }

  $SkillNames = @()
  foreach ($Skill in $ManifestData.skills) {
    $Name = [string]$Skill.name
    if (-not $Name -or $Name -notmatch "^[A-Za-z0-9_.-]+$") {
      throw "Invalid skill name in bundle manifest: '$Name'"
    }
    $SkillNames += $Name
  }

  $UniqueNames = @($SkillNames | Select-Object -Unique)
  if ($UniqueNames.Count -ne $SkillNames.Count) {
    throw "Bundle manifest declares duplicate skills."
  }
  if ($SkillNames -notcontains $ManifestData.runtime_skill) {
    throw "Bundle manifest runtime_skill must name one declared skill."
  }

  return $SkillNames
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("eidosloom-" + [System.Guid]::NewGuid().ToString("N"))
$Archive = Join-Path $TempRoot "repo.zip"
$Url = "https://codeload.github.com/$RepoOwner/$RepoName/zip/$Ref"

try {
  New-Item -ItemType Directory -Path $TempRoot | Out-Null

  Write-Host "Downloading $RepoOwner/$RepoName@$Ref..."
  Invoke-WebRequest -Uri $Url -OutFile $Archive
  Expand-Archive -Path $Archive -DestinationPath $TempRoot

  New-Item -ItemType Directory -Path (Join-Path $CodexHome "skills") -Force | Out-Null

  $Manifest = Get-ChildItem -Path $TempRoot -File -Recurse |
    Where-Object { $_.FullName -like "*\skills\eidosloom\references\bundle-manifest.json" } |
    Select-Object -First 1

  if (-not $Manifest) {
    throw "Could not find Eidosloom bundle manifest in the downloaded archive."
  }

  $SkillNames = @(Get-ManifestSkillNames -ManifestPath $Manifest.FullName)

  foreach ($SkillName in $SkillNames) {
    $Destination = Join-Path (Join-Path $CodexHome "skills") $SkillName
    $Source = Get-ChildItem -Path $TempRoot -Directory -Recurse |
      Where-Object { $_.FullName -like "*\skills\$SkillName" } |
      Select-Object -First 1

    if (-not $Source -or -not (Test-Path (Join-Path $Source.FullName "SKILL.md"))) {
      throw "Could not find bundled skill '$SkillName' in the downloaded archive."
    }

    if (Test-Path $Destination) {
      $Stamp = Get-Date -Format "yyyyMMddHHmmss"
      $Backup = "$Destination.backup.$Stamp"
      Move-Item -Path $Destination -Destination $Backup
      Write-Host "Existing installation moved to $Backup"
    }

    Copy-Item -Path $Source.FullName -Destination $Destination -Recurse

    Write-Host "Installed $SkillName to $Destination"
  }
  Write-Host "Restart Codex if the skill list does not refresh automatically."
}
finally {
  if (Test-Path $TempRoot) {
    Remove-Item -Path $TempRoot -Recurse -Force
  }
}
