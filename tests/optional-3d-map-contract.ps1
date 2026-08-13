$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$html = [System.IO.File]::ReadAllText((Join-Path $root 'index.html'))
if ($html -notmatch 'id="view3dBtn"') { Write-Output 'SKIP: optional 3D view is not part of the single-audience release'; exit 0 }
$controller = [System.IO.File]::ReadAllText((Join-Path $root 'v3.js'))
function Assert-Contains([string]$Text, [string]$Needle, [string]$Message) { if ($Text -notlike "*$Needle*") { throw $Message } }
Assert-Contains $html 'id="view3dBtn"' '3D map toggle is incomplete.'
Assert-Contains $controller "type:'fill-extrusion'" 'Building extrusion layer is missing.'
Assert-Contains $controller 'setMapView' '3D camera helper is missing.'
Assert-Contains $controller "'building-extrusions'" '3D layer id is missing.'
Write-Output 'Optional 3D map contract passed.'