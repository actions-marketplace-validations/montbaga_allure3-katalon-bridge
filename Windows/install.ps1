<#
.SYNOPSIS
    Installs the Allure3-Katalon Bridge into a Katalon Studio project.

.DESCRIPTION
    Thin, scriptable wrapper around the package's own installer
    (bin/cli.js). Unlike the Allure 2 bridge, the install logic is NOT
    reimplemented here: Allure 3's CLI is a Node program, so Node is a hard
    requirement for the bridge to work at all, and a PowerShell copy of the
    logic would only be a second thing to keep in sync. What this script
    adds on top of cli.js is the Windows-side preflight - finding Node,
    checking it is new enough, and performing the package's one-time
    'npm install' if the pinned Allure 3 CLI is not unpacked yet.

.PARAMETER ProjectPath
    Path to the target Katalon Studio project root (the folder containing
    the project's *.prj file).

.PARAMETER Force
    Also overwrite an existing Include/config/allure3/allure3.properties
    and allurerc.mjs in the target project.

.PARAMETER VendorCli
    Copy the Allure 3 CLI into the project itself, so the project stays
    runnable on a machine that never ran this installer (CI images, a fresh
    checkout). Larger, but self-contained.

.EXAMPLE
    .\Windows\install.ps1 -ProjectPath "C:\Users\User\Katalon Studio\my-other-project"

.EXAMPLE
    .\Windows\install.ps1 -ProjectPath "..\another-project" -Force -VendorCli
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [switch]$Force,

    [switch]$VendorCli
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$cliJs = Join-Path $repoRoot 'bin\cli.js'

if (-not (Test-Path -LiteralPath $cliJs)) {
    throw "Could not find the bridge installer at '$cliJs'. Run this script from inside a complete copy of the Allure3KatalonBridge package."
}

# --- Preflight 1: Node.js. The Allure 3 CLI is a Node program, so there is
#     no Node-free path here the way there was for Allure 2's Java CLI. ----
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    throw "Node.js was not found on PATH. Allure 3's CLI is a Node program, so the bridge needs Node.js 18 or newer. Install it from https://nodejs.org/ and run this again."
}

$nodeMajor = 0
$nodeVersion = (& node -p 'process.versions.node').Trim()
if ($nodeVersion -match '^(\d+)') {
    $nodeMajor = [int]$Matches[1]
}
if ($nodeMajor -lt 18) {
    throw "Node.js $nodeVersion is too old - the bridge needs Node.js 18 or newer. Upgrade from https://nodejs.org/ and run this again."
}

# --- Preflight 2: the pinned Allure 3 CLI. Without it cli.js falls back to
#     whatever 'allure' is on PATH, which is exactly the failure mode this
#     bridge exists to remove - so unpack it now rather than warn later. ---
function Test-BundledCli {
    $candidates = @(
        (Join-Path $repoRoot 'node_modules\allure\cli.js'),
        (Join-Path $repoRoot 'node_modules\allure\dist\cli.js')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { return $true }
    }
    return $false
}

if (-not (Test-BundledCli)) {
    Write-Host "First run: unpacking the pinned Allure 3 CLI (one-time 'npm install', needs internet) ..." -ForegroundColor Yellow
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCmd) {
        throw "npm was not found on PATH, so the pinned Allure 3 CLI cannot be unpacked. Install Node.js (which includes npm) from https://nodejs.org/, or run 'npm install' in '$repoRoot' yourself, then run this again."
    }

    Push-Location -LiteralPath $repoRoot
    try {
        & npm install --no-audit --no-fund
        $npmExit = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($npmExit -ne 0) {
        throw "'npm install' failed in '$repoRoot' (exit code $npmExit). Fix that first - the bridge needs the pinned Allure 3 CLI to generate reports."
    }
    if (-not (Test-BundledCli)) {
        throw "'npm install' completed but the Allure 3 CLI still is not present under '$repoRoot\node_modules\allure'. Check the npm output above."
    }
    Write-Host ""
}

# --- Hand off to the package's own installer. -----------------------------
$cliArgs = @($cliJs, 'install', $ProjectPath)
if ($Force) { $cliArgs += '--force' }
if ($VendorCli) { $cliArgs += '--vendor-cli' }

& node @cliArgs
if ($LASTEXITCODE -ne 0) {
    throw "Install failed (exit code $LASTEXITCODE). See the output above."
}
