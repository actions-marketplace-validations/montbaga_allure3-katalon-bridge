<#
.SYNOPSIS
    Removes an Allure3-Katalon Bridge installation from a Katalon Studio project.

.DESCRIPTION
    Thin, scriptable wrapper around the package's own uninstaller
    (bin/cli.js), which reads <project>/.allure3-bridge/manifest.txt and
    deletes exactly the files the install recorded - nothing else in the
    project is touched. Generated output (allure-results/, allure-report/,
    allure-history.jsonl) is never deleted, and by default your
    allure3.properties, categories.json and allurerc.mjs are kept so a
    future reinstall does not lose your settings; pass -RemoveConfig to
    delete those too.

.PARAMETER ProjectPath
    Path to the target Katalon Studio project root.

.PARAMETER RemoveConfig
    Also delete Include/config/allure3/allure3.properties,
    Include/config/allure3/categories.json and allurerc.mjs.

.EXAMPLE
    .\Windows\uninstall.ps1 -ProjectPath "C:\Users\User\Katalon Studio\my-other-project"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [switch]$RemoveConfig
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$cliJs = Join-Path $repoRoot 'bin\cli.js'

if (-not (Test-Path $cliJs)) {
    throw "Could not find the bridge uninstaller at '$cliJs'. Run this script from inside a complete copy of the Allure3KatalonBridge package."
}

# Node is needed to run cli.js, but not npm or the pinned Allure 3 CLI -
# removing files does not require the reporting toolchain.
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    throw "Node.js was not found on PATH, and the uninstaller runs on Node. Install it from https://nodejs.org/ and run this again, or delete the files listed in '<project>\.allure3-bridge\manifest.txt' by hand."
}

$cliArgs = @($cliJs, 'uninstall', $ProjectPath)
if ($RemoveConfig) { $cliArgs += '--remove-config' }

& node @cliArgs
if ($LASTEXITCODE -ne 0) {
    throw "Uninstall failed (exit code $LASTEXITCODE). See the output above."
}
