$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw "FAIL: $message" }
}

$workflow = [System.IO.File]::ReadAllText((Join-Path $root '.github/workflows/ci.yml'))
Assert-True ($workflow -match '(?m)^  pull_request:\s*$') 'CI workflow must run for pull requests'
Assert-True ($workflow -notmatch '(?m)^  push:\s*$') 'CI workflow must not duplicate the Pages push gate'

Write-Output 'PASS: CI workflow contract'
