param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)
$ErrorActionPreference = 'Stop'
$html = [System.IO.File]::ReadAllText((Join-Path $RepoRoot 'index.html'))
$controller = [System.IO.File]::ReadAllText((Join-Path $RepoRoot 'v3.js'))
function Assert-Contains([string]$Text, [string]$Needle, [string]$Message) { if ($Text -notlike "*$Needle*") { throw $Message } }
Assert-Contains $html 'id="v2Map"' 'MapLibre container is missing.'
Assert-Contains $html 'maplibre-gl' 'MapLibre runtime hook is missing.'
Assert-Contains $controller 'pmtiles://' 'PMTiles protocol URL is missing.'
Assert-Contains $controller 'baku-absheron.pmtiles' 'Cropped Baku/Absheron PMTiles asset is missing.'
Assert-Contains $controller 'setData(' 'Geographic overlay sources are missing.'
Assert-Contains $controller 'identifyLocation' 'Geographic click-selection hook is missing.'
Write-Output 'Map migration contract passed.'