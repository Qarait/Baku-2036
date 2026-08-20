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

$topLevelPermissions = [regex]::Match($workflow, '(?ms)^permissions:\r?\n(?<block>.*?)(?=^\S|\z)').Groups['block'].Value
Assert-True ($topLevelPermissions -match '(?m)^  contents:\s+read\s*$') 'Pages workflow must retain read-only contents permission globally'
Assert-True ($topLevelPermissions -notmatch '(?m)^  (pages|id-token):') 'Pages deploy permissions must not be granted to the smoke job globally'

$deployJob = [regex]::Match($workflow, '(?ms)^  deploy:\r?\n(?<block>.*?)(?=^  \w+:|\z)').Groups['block'].Value
Assert-True ($deployJob -match '(?m)^    permissions:\s*$') 'Pages deploy job must declare its own permissions'
Assert-True ($deployJob -match '(?m)^      pages:\s+write\s*$') 'Pages deploy job must have pages: write permission'
Assert-True ($deployJob -match '(?m)^      id-token:\s+write\s*$') 'Pages deploy job must have id-token: write permission'

$noticePath = Join-Path $root 'THIRD_PARTY_NOTICES.md'
Assert-True (Test-Path -LiteralPath $noticePath) 'Third-party licence notice is missing'
$notice = [System.IO.File]::ReadAllText($noticePath)
foreach ($marker in @('MapLibre contributors', 'v6.3.0', 'Protomaps LLC', 'PMTiles', 'BSD-3-Clause', 'Redistribution and use in source and binary forms', 'AS IS', 'ODbL')) {
  Assert-True ($notice -match [regex]::Escape($marker)) "Third-party notice must include $marker"
}
Assert-True ($ignore -notmatch '(?m)^THIRD_PARTY_NOTICES\.md$') 'Pages artifact must ship THIRD_PARTY_NOTICES.md'

foreach ($entry in @('index.html', 'en/index.html', 'tr/index.html')) {
  $entryPath = Join-Path $root $entry
  Assert-True (Test-Path -LiteralPath $entryPath) "$entry is missing"
  $html = [System.IO.File]::ReadAllText($entryPath)
  Assert-True ($html -match 'OpenStreetMap contributors') "$entry must visibly credit OpenStreetMap contributors"
  Assert-True ($html -match 'https://www\.openstreetmap\.org/copyright') "$entry must link to the OpenStreetMap copyright page"
  Assert-True ($html -match 'Geofabrik') "$entry must visibly credit Geofabrik"
}

$v3Path = Join-Path $root 'v3.js'
$v3 = [System.IO.File]::ReadAllText($v3Path)
Assert-True ($v3 -match "(?s)basemap:\s*\{\s*type:\s*'vector',\s*url:\s*PMTILES_URL,\s*attribution:") 'MapLibre basemap source must carry explicit attribution'

foreach ($entry in @('.github/', '.pagesignore', 'docs/', 'scripts/', 'tests/', 'v1/', 'v2/', 'package.json', 'package-lock.json', 'playwright.config.js', 'README.md', 'vendor/*-dev.mjs')) {
  Assert-True ($ignore -match [regex]::Escape($entry)) ".pagesignore must exclude $entry"
}

Write-Output 'PASS: Pages artifact contract'
