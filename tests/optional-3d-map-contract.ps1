$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
$controller = Get-Content -LiteralPath (Join-Path $root 'maplibre-atlas.js') -Raw

function Assert-Contains([string]$Text, [string]$Needle, [string]$Message) {
  if ($Text -notlike "*$Needle*") { throw $Message }
}

Assert-Contains $html 'id="view3dBtn"' '3D map toggle is missing.'
Assert-Contains $html 'VIEW3D' '3D state variable is missing.'
Assert-Contains $html 'view=3d' '3D deep-link serialization is missing.'
Assert-Contains $html 'view3d' '3D state/deep-link hook is missing.'
Assert-Contains $html '3B görünüm' 'Turkish 3D label is missing.'
Assert-Contains $controller "type:'fill-extrusion'" 'Building extrusion layer is missing.'
Assert-Contains $controller 'setMapView' '3D camera helper is missing.'
Assert-Contains $controller "'building-extrusions'" '3D layer id is missing.'

Write-Output 'Optional 3D map contract passed.'
