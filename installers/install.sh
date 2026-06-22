#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${EIDOSLOOM_OWNER:-ChenMiaoi}"
REPO_NAME="${EIDOSLOOM_REPO:-eidosloom}"
REF="${EIDOSLOOM_REF:-v0.1.0}"
SKILL_NAMES=("eidosloom" "eidosloom-review")
CODEX_HOME="${CODEX_HOME:-"$HOME/.codex"}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

download() {
  local url="$1"
  local out="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$out"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q "$url" -O "$out"
    return
  fi

  echo "Missing curl or wget. Install one of them and rerun this installer." >&2
  exit 1
}

ARCHIVE="$TMP_DIR/repo.tar.gz"
URL="https://codeload.github.com/$REPO_OWNER/$REPO_NAME/tar.gz/$REF"

echo "Downloading $REPO_OWNER/$REPO_NAME@$REF..."
download "$URL" "$ARCHIVE"

tar -xzf "$ARCHIVE" -C "$TMP_DIR"
mkdir -p "$CODEX_HOME/skills"

for SKILL_NAME in "${SKILL_NAMES[@]}"; do
  SRC="$(find "$TMP_DIR" -type d -path "*/skills/$SKILL_NAME" | head -n 1)"
  DEST="$CODEX_HOME/skills/$SKILL_NAME"

  if [[ -z "$SRC" || ! -f "$SRC/SKILL.md" ]]; then
    echo "Could not find bundled skill '$SKILL_NAME' in the downloaded archive." >&2
    exit 1
  fi

  if [[ -e "$DEST" ]]; then
    BACKUP="$DEST.backup.$(date +%Y%m%d%H%M%S)"
    mv "$DEST" "$BACKUP"
    echo "Existing installation moved to $BACKUP"
  fi

  cp -R "$SRC" "$DEST"

  echo "Installed $SKILL_NAME to $DEST"
done
echo "Restart Codex if the skill list does not refresh automatically."
