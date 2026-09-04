$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw "FAIL: $message" }
}

foreach ($entry in @(
  @{ Path = 'en\index.html'; Language = 'en'; Label = 'English' },
  @{ Path = 'tr\index.html'; Language = 'tr'; Label = 'Türkçe' }
)) {
  $path = Join-Path $root $entry.Path
  Assert-True (Test-Path -LiteralPath $path) "missing $($entry.Path)"
  $html = [System.IO.File]::ReadAllText($path)
  $languageMarker = '<html lang="' + $entry.Language + '">' 
  Assert-True ($html -match [regex]::Escape($languageMarker)) "$($entry.Path) must declare $($entry.Language)"
  Assert-True ($html -match "__BakuFixedLanguage = '$($entry.Language)'") "$($entry.Path) must lock runtime language"
  Assert-True ($html -match '<base href="\.\./">') "$($entry.Path) must resolve shared assets from the root"
  $labelMarker = 'id="languageLock">' + [regex]::Escape($entry.Label) + '<'
  Assert-True ($html -match $labelMarker) "$($entry.Path) must show its fixed language label"
  Assert-True ($html -notmatch 'class="language-switch"') "$($entry.Path) must not expose the language switch"
}

Write-Output 'PASS: fixed language entry-points contract'
