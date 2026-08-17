$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw "FAIL: $message" }
}

$workflowPath = Join-Path $root '.github/workflows/pages.yml'
Assert-True (Test-Path -LiteralPath $workflowPath) 'Pages workflow is missing'
$workflow = [System.IO.File]::ReadAllText($workflowPath)
Assert-True (([regex]::Matches($workflow, [regex]::Escape('--exclude-from=.pagesignore'))).Count -eq 3) 'Pages artifact stages must use the shared exclusion manifest'
Assert-True (Test-Path -LiteralPath (Join-Path $root 'v2/index.html')) 'v2 snapshot must remain tracked for Git archival'

$ignorePath = Join-Path $root '.pagesignore'
Assert-True (Test-Path -LiteralPath $ignorePath) '.pagesignore is missing'
$ignore = [System.IO.File]::ReadAllText($ignorePath)
foreach ($entry in @('.github/', '.pagesignore', 'docs/', 'scripts/', 'tests/', 'v1/', 'v2/', 'package.json', 'package-lock.json', 'playwright.config.js', 'README.md', 'vendor/*-dev.mjs')) {
  Assert-True ($ignore -match [regex]::Escape($entry)) ".pagesignore must exclude $entry"
}

Write-Output 'PASS: Pages artifact contract'
