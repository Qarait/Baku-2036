param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$html = Get-Content -LiteralPath (Join-Path $RepoRoot 'index.html') -Raw
$controller = Get-Content -LiteralPath (Join-Path $RepoRoot 'maplibre-atlas.js') -Raw

function Assert-Contains([string]$Text, [string]$Needle, [string]$Message) {
  if ($Text -notlike "*$Needle*") { throw $Message }
}

Assert-Contains $html 'id="maplibreMap"' 'MapLibre container is missing.'
Assert-Contains $html 'maplibre-gl' 'MapLibre runtime hook is missing.'
Assert-Contains $controller 'pmtiles://' 'PMTiles protocol URL is missing.'
Assert-Contains $controller 'baku-absheron.pmtiles' 'Cropped Baku/Absheron PMTiles asset is missing.'
Assert-Contains $controller 'setData(' 'Geographic overlay sources are missing.'
Assert-Contains $controller 'window.select(' 'Geographic zone selection hook is missing.'

Write-Output 'Map migration contract passed.'