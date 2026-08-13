$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$entry = Join-Path $root 'v2\index.html'
$script = Join-Path $root 'v2\v2.js'
$admin = Join-Path $root 'v2\data\admin-absheron.geojson'
$metro = Join-Path $root 'v2\data\metro.json'
$places = Join-Path $root 'v2\data\places.json'

if (!(Test-Path -LiteralPath $entry)) { throw 'v2/index.html is missing' }
if (!(Test-Path -LiteralPath $script)) { throw 'v2/v2.js is missing' }
foreach ($path in @($admin,$metro,$places)) {
  if (!(Test-Path -LiteralPath $path)) { throw "Required v2 data file is missing: $path" }
}

$html = Get-Content -LiteralPath $entry -Raw
$js = Get-Content -LiteralPath $script -Raw

@(
  'id="v2Map"',
  'maplibre-gl.css',
  'admin-absheron.geojson',
  'metro.json',
  'places.json'
) | ForEach-Object {
  if ((($html + $js) -notlike "*$_*")) { throw "v2 files missing required contract: $_" }
}

@(
  'queryRenderedFeatures',
  'identifyLocation',
  'distanceKm',
  'distanceRing',
  'admin-fill',
  'admin-labels',
  'adminLabelFeatures',
  'investment-zones',
  'metro-lines',
  'searchPlaces'
) | ForEach-Object {
  if ($js -notlike "*$_*") { throw "v2/v2.js missing required contract: $_" }
}

if ($js -match "id: 'admin-label'.*source: 'admin'") { throw 'Administrative labels must use one representative point per district, not polygon components' }

if ($js -notlike '*pmtiles://../assets/baku-absheron.pmtiles*') { throw 'v2/v2.js must point to the existing Absheron PMTiles asset' }
$adminJson = Get-Content -LiteralPath $admin -Raw | ConvertFrom-Json
if ($adminJson.type -ne 'FeatureCollection') { throw 'admin-absheron.geojson must be a FeatureCollection' }
if ($adminJson.features.Count -lt 10) { throw 'admin-absheron.geojson must contain the Baku/Absheron polygons' }
if (!($adminJson.features | Where-Object { $_.geometry.type -in @('Polygon','MultiPolygon') })) { throw 'Administrative layer must contain polygon geometry' }

$metroJson = Get-Content -LiteralPath $metro -Raw | ConvertFrom-Json
if ($metroJson.lines.Count -lt 3 -or $metroJson.stations.Count -lt 10) { throw 'metro.json must contain lines and stations' }

$placesJson = Get-Content -LiteralPath $places -Raw | ConvertFrom-Json
if ($placesJson.Count -lt 20) { throw 'places.json must contain a useful local gazetteer' }

Write-Output 'v2 foundation contract: PASS'
