$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script = [System.IO.File]::ReadAllText((Join-Path $root 'v3.js'))
$html = [System.IO.File]::ReadAllText((Join-Path $root 'index.html'))
function Assert-Contains([string]$Text, [string]$Needle, [string]$Message) { if ($Text -notlike "*$Needle*") { throw $Message } }
Assert-Contains $script 'function setLanguage' 'Language switching function is missing.'
Assert-Contains $script 'renderPanel()' 'Language switching does not rerender the selected panel.'
Assert-Contains $html 'id="langEn"' 'English language control is missing.'
Assert-Contains $html 'id="langTr"' 'Turkish language control is missing.'
Write-Output 'Zone language-switch regression contract passed.'