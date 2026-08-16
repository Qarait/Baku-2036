$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw "FAIL: $message" }
}

$workflowPath = Join-Path $root '.github/workflows/pages.yml'
Assert-True (Test-Path -LiteralPath $workflowPath) 'Pages workflow is missing'
$workflow = [System.IO.File]::ReadAllText($workflowPath)
$v2Exclusion = [regex]::Escape("--exclude='v2'")
Assert-True (([regex]::Matches($workflow, $v2Exclusion)).Count -eq 2) 'preview and live Pages artifacts must exclude v2'
Assert-True (Test-Path -LiteralPath (Join-Path $root 'v2/index.html')) 'v2 snapshot must remain tracked for Git archival'

Write-Output 'PASS: Pages artifact contract'
