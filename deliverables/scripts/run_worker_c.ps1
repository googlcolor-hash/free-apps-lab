param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dataDir = Join-Path $root 'data'
$appsPath = Join-Path $dataDir 'apps.json'
$statsPath = Join-Path $dataDir 'stats.json'

if (-not (Test-Path -LiteralPath $appsPath)) {
  Write-Host "WAIT: missing input file $appsPath"
  exit 2
}

$appsRaw = Get-Content -LiteralPath $appsPath -Raw
if ([string]::IsNullOrWhiteSpace($appsRaw) -or $appsRaw -eq '[]') {
  Write-Host "WAIT: apps.json is empty"
  exit 2
}

Write-Host "Input check passed: apps.json present"
if (-not (Test-Path -LiteralPath $statsPath)) {
  Write-Host "stats.json missing, it will be derived by catalog script"
}

py -3 (Join-Path $PSScriptRoot 'build_free_apps_catalog.py')
py -3 (Join-Path $PSScriptRoot 'build_free_apps_overview.py')
Write-Host 'Worker C generation complete.'
