#!/usr/bin/env bash
set -euo pipefail

# Share the repository root, regardless of where the launcher was invoked.
REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$REPO_DIR"

for tool in nono opencode mktemp; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf 'Required executable not found: %s\n' "$tool" >&2
        exit 1
    fi
done

export VOLTA_HOME="${VOLTA_HOME:-"$HOME/.volta"}"
export PATH="$VOLTA_HOME/bin:$PATH"

if [[ ! -d "$VOLTA_HOME" ]]; then
    printf 'Volta directory not found: %s\n' "$VOLTA_HOME" >&2
    exit 1
fi

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-"$HOME/.cache/toybox-tanks-playwright"}"

# Create this before sandbox startup so nono can grant the existing path.
SESSION_TMP="$(mktemp -d "${TMPDIR:-/tmp}/toybox-tanks.XXXXXXXX")"

cleanup() {
    local status=$?
    trap - EXIT
    rm -rf -- "$SESSION_TMP" || \
        printf 'Warning: could not remove temporary directory: %s\n' \
            "$SESSION_TMP" >&2
    exit "$status"
}
trap cleanup EXIT

export TMPDIR="$SESSION_TMP"
export TMP="$SESSION_TMP"
export TEMP="$SESSION_TMP"

printf 'Repository: %s\nTemporary directory: %s\n' \
    "$REPO_DIR" "$SESSION_TMP"

# Do not use exec: the launcher must remain alive to perform cleanup.
nono run \
    --profile nolabs-ai/opencode \
    --allow-cwd \
    --read "$VOLTA_HOME" \
    --allow "$SESSION_TMP" \
    -- opencode --standalone "$@"