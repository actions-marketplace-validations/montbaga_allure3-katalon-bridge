#!/usr/bin/env bash
# Removes an Allure3-Katalon Bridge installation from a Katalon Studio project.
#
# Usage:
#   ./uninstall.sh /path/to/katalon/project [--remove-config]
#
# A thin wrapper around the package's own uninstaller (bin/cli.js), which
# reads <project>/.allure3-bridge/manifest.txt and deletes exactly the files
# the install recorded - nothing else in the project is touched. Generated
# output (allure-results/, allure-report/, allure-history.jsonl) is never
# deleted. By default allure3.properties, categories.json and allurerc.mjs
# are kept so a future reinstall does not lose your settings; pass
# --remove-config to delete those too.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_JS="$REPO_ROOT/bin/cli.js"

if [ ! -f "$CLI_JS" ]; then
    echo "Could not find the bridge uninstaller at '$CLI_JS'. Run this from inside a complete copy of the Allure3KatalonBridge package." >&2
    exit 1
fi

PROJECT_PATH=""
FLAGS=()
for arg in "$@"; do
    case "$arg" in
        --remove-config)
            FLAGS+=("$arg")
            ;;
        -*)
            echo "Unknown option: $arg" >&2
            echo "Usage: $0 /path/to/katalon/project [--remove-config]" >&2
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
    echo "Usage: $0 /path/to/katalon/project [--remove-config]" >&2
    exit 1
fi
if [ ! -d "$PROJECT_PATH" ]; then
    echo "ProjectPath does not exist: $PROJECT_PATH" >&2
    exit 1
fi
PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"

if [ ! -f "$PROJECT_PATH/.allure3-bridge/manifest.txt" ]; then
    echo "No install manifest found at $PROJECT_PATH/.allure3-bridge/manifest.txt - this project doesn't look like it has the bridge installed." >&2
    exit 1
fi

# Node is needed to run cli.js, but not npm or the pinned Allure 3 CLI -
# removing files does not require the reporting toolchain.
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js was not found on PATH, and the uninstaller runs on Node. Install it from https://nodejs.org/ and run this again, or delete the files listed in '$PROJECT_PATH/.allure3-bridge/manifest.txt' by hand." >&2
    exit 1
fi

exec node "$CLI_JS" uninstall "$PROJECT_PATH" ${FLAGS[@]+"${FLAGS[@]}"}
