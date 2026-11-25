#!/usr/bin/env bash
# Makes STQA_Project.zip in the repo root from the /qa folder (without node_modules).
# The CI workflow (.github/workflows/qa.yml) is added too, because it is part of task 3.6.
# Run from anywhere in Git Bash, Linux or macOS:  bash qa/submission.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$root/STQA_Project.zip"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

# Copy only what is submitted. coverage-summary.json is left out because it holds local file paths.
cd "$root"
tar --exclude='node_modules' --exclude='coverage-summary.json' --exclude='*.zip' -cf - qa .github/workflows/qa.yml \
  | tar -xf - -C "$stage"

rm -f "$out"
cd "$stage"
if command -v zip >/dev/null 2>&1; then
  zip -qr "$out" qa .github
elif [ -x /c/Windows/System32/tar.exe ]; then
  # Windows has no zip command. Its own tar.exe can write zip files.
  /c/Windows/System32/tar.exe -a -c -f "$(cygpath -w "$out")" qa .github
elif command -v python3 >/dev/null 2>&1; then
  python3 -m zipfile -c "$out" qa .github
else
  echo "No zip tool found (zip, Windows tar.exe or python3)." >&2
  exit 1
fi

echo "Created: STQA_Project.zip ($(du -h "$out" | cut -f1), $(find . -type f | wc -l) files)"
