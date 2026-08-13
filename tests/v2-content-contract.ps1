$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root 'v2/index.html'
$jsPath = Join-Path $root 'v2/v2.js'
$zonesPath = Join-Path $root 'v2/data/zones.json'
$contentPath = Join-Path $root 'v2/data/content.json'

$html = Get-Content -LiteralPath $htmlPath -Raw
$js = Get-Content -LiteralPath $jsPath -Raw

@(
  'v2HowTo', 'v2Content', 'v2ZoneDrawer', 'accordion-time',
  'accordion-scenarios', 'accordion-planner', 'accordion-deal',
  'accordion-shortlist', 'accordion-sources'
) | ForEach-Object {
  if ($html -notlike ('*id="' + $_ + '"*')) { throw "Missing v2 content surface: $_" }
}

@(
  'renderZoneDrawer', 'renderTimeMachine', 'renderScenarios',
  'renderPlanner', 'renderDealChecker', 'renderShortlist', 'setAccordion'
) | ForEach-Object {
  if ($js -notmatch "\b$_\b") { throw "Missing v2 controller contract: $_" }
}

if (-not (Test-Path -LiteralPath $zonesPath)) { throw 'Missing v2/data/zones.json' }
if (-not (Test-Path -LiteralPath $contentPath)) { throw 'Missing v2/data/content.json' }

$zones = Get-Content -LiteralPath $zonesPath -Raw | ConvertFrom-Json
if (@($zones).Count -ne 16) { throw "Expected exactly 16 zones, found $(@($zones).Count)" }
$ids = @($zones | ForEach-Object { $_.id })
if (@($ids | Sort-Object -Unique).Count -ne 16) { throw 'Zone ids must be unique' }

foreach ($zone in $zones) {
  foreach ($field in @('id', 'nameEn', 'nameTr', 'en', 'tr', 'dd', 'risk', 'act', 'inv')) {
    if ($null -eq $zone.$field) { throw "Zone $($zone.id) is missing $field" }
  }
}

$content = Get-Content -LiteralPath $contentPath -Raw | ConvertFrom-Json
foreach ($lang in @('en', 'tr')) {
  if ($null -eq $content.$lang) { throw "Missing $lang content" }
  foreach ($section in @('howTo', 'sections', 'labels', 'disclaimer')) {
    if ($null -eq $content.$lang.$section) { throw "Missing $lang.$section content" }
  }
  foreach ($key in @('time', 'scenarios', 'planner', 'deal', 'shortlist', 'sources')) {
    if ($null -eq $content.$lang.sections.$key) { throw "Missing $lang.sections.$key content" }
  }
}

foreach ($token in @('entry', 'proj', 'yield', 'thesis', 'risk', 'act', 'inv', 'dd', 'whatThisMeans')) {
  if ($js -notmatch "\b$token\b") { throw "Missing zone renderer token: $token" }
}

Write-Output 'v2 content contract: PASS'
