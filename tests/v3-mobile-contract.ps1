$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Assert-True([bool]$condition, [string]$message) { if (-not $condition) { throw "FAIL: $message" } }
$html = [System.IO.File]::ReadAllText((Join-Path $root 'index.html')); $css = [System.IO.File]::ReadAllText((Join-Path $root 'v3.css')); $script = [System.IO.File]::ReadAllText((Join-Path $root 'v3.js'))
Assert-True ($html -match 'width=device-width') 'root must declare a responsive viewport'
Assert-True ($html -match 'id="layersToggle"[^>]*aria-expanded="false"') 'layers button must expose collapsed state'
Assert-True ($html -match 'id="layerMenu"[^>]*hidden') 'layer menu must start closed'
Assert-True ($css -match '@media\s*\(max-width:\s*520px\)') 'v3 CSS must have a 360px mobile rule'
Assert-True ($css -match 'flex-wrap:\s*nowrap') 'mobile toolbar must not wrap'
Assert-True ($css -match '\.info-panel\s*\{[^}]*position:\s*relative;') 'mobile info panel must stay in page flow'
Assert-True ($css -match '\.info-panel\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;') 'mobile info panel must not create an inner scroll container'
Assert-True ($script -match 'toggleLayerMenu') 'v3.js must implement layer-menu behavior'
Assert-True ($script -match 'Escape') 'v3.js must support Escape for the layer menu'
Write-Output 'PASS: v3 mobile contract'
