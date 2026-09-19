#!/usr/bin/env bash
# Installs the Allure3-Katalon Bridge into a Katalon Studio project.
#
# Usage:
#   ./install.sh /path/to/katalon/project [--force] [--vendor-cli]
#
# --force       also overwrites an existing allure3.properties / allurerc.mjs
#               in the target project. Without it, customized config is left
#               alone.
# --vendor-cli  copies the Allure 3 CLI into the project itself, so the
#               project stays runnable on a machine that never ran this
#               installer (CI images, a fresh checkout).
#
# This is a thin wrapper around the package's own installer (bin/cli.js).
# The logic deliberately is not reimplemented in bash: Allure 3's CLI is a
# Node program, so Node is a hard requirement for the bridge to work at all,
# and a second copy of the logic would only be a second thing to keep in
# sync. What this adds is the preflight - finding Node, checking it is new
# enough, and doing the package's one-time 'npm install' if the pinned
# Allure 3 CLI is not unpacked yet.
#
# Safe to re-run for upgrades: payload files are always refreshed to the
# version shipped in this package.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_JS="$REPO_ROOT/bin/cli.js"

if [ ! -f "$CLI_JS" ]; then
    echo "Could not find the bridge installer at '$CLI_JS'. Run this from inside a complete copy of the Allure3KatalonBridge package." >&2
    exit 1
fi

PROJECT_PATH=""
FLAGS=()
for arg in "$@"; do
    case "$arg" in
        --force|--vendor-cli)
            FLAGS+=("$arg")
            ;;
        -*)
            echo "Unknown option: $arg" >&2
            echo "Usage: $0 /path/to/katalon/project [--force] [--vendor-cli]" >&2
            exit 1
            ;;
        *)
            if [ -z "$PROJECT_PATH" ]; then
                PROJECT_PATH="$arg"
            fi
            ;;
    esac
done

if [ -z "$PROJECT_PATH" ]; then
    read -r -p "Enter the path to your Katalon Studio project: " PROJECT_PATH
fi

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: $0 /path/to/katalon/project [--force] [--vendor-cli]" >&2
    exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo "ProjectPath does not exist: $PROJECT_PATH" >&2
    exit 1
fi
PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"

# Checked here as well as in cli.js so a mistyped folder fails before the
# one-time npm install below, not after it.
if ! find "$PROJECT_PATH" -maxdepth 1 -name '*.prj' -print -quit | grep -q .; then
    echo "No *.prj file found directly under '$PROJECT_PATH'. This does not look like a Katalon Studio project root - aborting." >&2
    exit 1
fi

# --- Preflight 1: Node.js. Allure 3's CLI is a Node program, so there is no
#     Node-free path here the way there was for Allure 2's Java CLI. -------
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js was not found on PATH. Allure 3's CLI is a Node program, so the bridge needs Node.js 18 or newer. Install it from https://nodejs.org/ and run this again." >&2
    exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Node.js $NODE_VERSION is too old - the bridge needs Node.js 18 or newer. Upgrade from https://nodejs.org/ and run this again." >&2
    exit 1
fi

# --- Preflight 2: the pinned Allure 3 CLI. Without it cli.js falls back to
#     whatever 'allure' is on PATH, which is exactly the failure mode this
#     bridge exists to remove - so unpack it now rather than warn later. ---
has_bundled_cli() {
    [ -f "$REPO_ROOT/node_modules/allure/cli.js" ] || [ -f "$REPO_ROOT/node_modules/allure/dist/cli.js" ]
}

if ! has_bundled_cli; then
    echo "First run: unpacking the pinned Allure 3 CLI (one-time 'npm install', needs internet) ..."
    if ! command -v npm >/dev/null 2>&1; then
        echo "npm was not found on PATH, so the pinned Allure 3 CLI cannot be unpacked. Install Node.js (which includes npm) from https://nodejs.org/, or run 'npm install' in '$REPO_ROOT' yourself, then run this again." >&2
        exit 1
    fi
    (cd "$REPO_ROOT" && npm install --no-audit --no-fund)
    if ! has_bundled_cli; then
        echo "'npm install' completed but the Allure 3 CLI still is not present under '$REPO_ROOT/node_modules/allure'. Check the npm output above." >&2
        exit 1
    fi
    echo ""
fi

exec node "$CLI_JS" install "$PROJECT_PATH" ${FLAGS[@]+"${FLAGS[@]}"}
