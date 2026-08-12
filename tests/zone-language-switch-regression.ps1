$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw

function Assert-Contains([string]$Text, [string]$Needle, [string]$Message) {
  if ($Text -notlike "*$Needle*") { throw $Message }
}

$setLang = [regex]::Match($html, 'function setLang\(l\)\{(?s).*?\n\}', [Text.RegularExpressions.RegexOptions]::Singleline).Value
$select = [regex]::Match($html, 'function select\(id, opts\)\{(?s).*?\n\}', [Text.RegularExpressions.RegexOptions]::Singleline).Value

Assert-Contains $setLang 'panelWasOpen' 'Language switching does not capture the panel open state.'
Assert-Contains $setLang 'keepClosed' 'Language switching does not preserve a closed mobile panel.'
Assert-Contains $select 'opts&&opts.keepClosed' 'Zone selection does not support a closed-panel rerender.'

Write-Output 'Zone language-switch regression contract passed.'
