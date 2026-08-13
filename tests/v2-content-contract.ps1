$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root 'v2/index.html'
$jsPath = Join-Path $root 'v2/v2.js'
$zonesPath = Join-Path $root 'data/zones.json'
$contentPath = Join-Path $root 'data/content.json'

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

if (-not (Test-Path -LiteralPath $zonesPath)) { throw 'Missing data/zones.json' }
if (-not (Test-Path -LiteralPath $contentPath)) { throw 'Missing data/content.json' }

$zones = Get-Content -LiteralPath $zonesPath -Raw | ConvertFrom-Json
if (@($zones).Count -ne 16) { throw "Expected exactly 16 zones, found $(@($zones).Count)" }
$ids = @($zones | ForEach-Object { $_.id })
if (@($ids | Sort-Object -Unique).Count -ne 16) { throw 'Zone ids must be unique' }

foreach ($zone in $zones) {
  foreach ($field in @('id', 'nameEn', 'nameTr', 'en', 'tr', 'dd', 'risk', 'act', 'inv', 'evidence')) {
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

$lokbatan = @($zones | Where-Object { $_.id -eq 'lokbatan' })[0]
if ($null -eq $lokbatan -or @($lokbatan.localPlaces).Count -ne 3) { throw 'Lokbatan needs exactly three local places' }
foreach ($place in @($lokbatan.localPlaces)) {
  foreach ($field in @('nameEn', 'nameTr', 'status', 'en', 'tr')) {
    if ($null -eq $place.$field -or [string]::IsNullOrWhiteSpace([string]$place.$field)) { throw "Lokbatan local place is missing $field" }
  }
  if ($place.status -notin @('open', 'building')) { throw "Lokbatan local place has invalid status $($place.status)" }
  if ($place.en -notmatch 'local prices rise') { throw "Lokbatan local place copy must state the price-rise effect: $($place.nameEn)" }
}
if ($js -notmatch '\blocalPlaces\b') { throw 'Missing local places renderer contract' }
if ($js -match 'Field-reported|Unverified|Supports local convenience|price effect is not separately measured') { throw 'Local places copy contains disallowed complexity' }

Write-Output 'v2 content contract: PASS'

foreach ($zone in @($zones)) {
  if (@($zone.evidence).Count -lt 1) { throw "Zone $($zone.id) needs at least one evidence item" }
  foreach ($item in @($zone.evidence)) {
    foreach ($field in @('status', 'source', 'sourceDate', 'checkedAt', 'confidence', 'claim', 'claimTr', 'investmentMeaning', 'investmentMeaningTr', 'url')) {
      if ($null -eq $item.$field -or [string]::IsNullOrWhiteSpace([string]$item.$field)) { throw "Zone $($zone.id) evidence is missing $field" }
    }
    if ($item.status -notin @('operational', 'contracted', 'programmed', 'private-plan', 'concept')) { throw "Zone $($zone.id) has invalid evidence status $($item.status)" }
    if ($item.confidence -notin @('high', 'medium', 'low')) { throw "Zone $($zone.id) has invalid evidence confidence $($item.confidence)" }
  }
}

foreach ($token in @('evidenceLegend', 'builtLegend', 'contractedLegend', 'programmedLegend', 'privateLegend')) {
  if ($html -notlike ('*id="' + $token + '"*') -and $js -notmatch "\b$token\b") { throw "Missing evidence legend token: $token" }
}

foreach ($token in @('evidenceLegend', 'builtLegend', 'contractedLegend', 'programmedLegend', 'privateLegend')) {
  if ($js -notmatch ('\$\(' + [regex]::Escape("'" + $token + "'") + '\)\.textContent')) { throw "Language switch does not update evidence legend token: $token" }
}
