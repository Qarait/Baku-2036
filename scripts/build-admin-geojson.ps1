param(
  [string]$SourcePath,
  [string]$OutputPath,
  [switch]$Check
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($SourcePath)) { $SourcePath = Join-Path $root 'data\admin-absheron.geojson' }
if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = Join-Path $root 'data\admin-absheron-5dp.geojson' }

function Test-CoordinateNumber($value) {
  if ($null -eq $value -or $value -is [bool] -or $value -is [string]) { return $false }
  try { $null = [double]$value; return $true } catch { return $false }
}

function Round-CoordinateTree($value) {
  if ($value -is [System.Array]) {
    if ($value.Count -eq 2 -and (Test-CoordinateNumber $value[0]) -and (Test-CoordinateNumber $value[1])) {
      $rounded = @(
        [Math]::Round([double]$value[0], 5, [MidpointRounding]::AwayFromZero),
        [Math]::Round([double]$value[1], 5, [MidpointRounding]::AwayFromZero)
      )
      return ,$rounded
    }
    $rounded = @()
    foreach ($item in $value) { $rounded += ,(Round-CoordinateTree $item) }
    return ,$rounded
  }
  return $value
}

function Read-JsonDocument([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing GeoJSON source: $path" }
  return [System.IO.File]::ReadAllText($path) | ConvertFrom-Json -Depth 100
}

try {
  $document = Read-JsonDocument $SourcePath
  if ($document.type -ne 'FeatureCollection' -or $null -eq $document.features) { throw 'Source must be a GeoJSON FeatureCollection' }
  foreach ($feature in $document.features) {
    if ($null -ne $feature.geometry -and $null -ne $feature.geometry.coordinates) {
      $feature.geometry.coordinates = Round-CoordinateTree $feature.geometry.coordinates
    }
  }

  $json = ($document | ConvertTo-Json -Depth 100 -Compress) + [Environment]::NewLine
  $encoding = [System.Text.UTF8Encoding]::new($false)
  if ($Check) {
    if (-not (Test-Path -LiteralPath $OutputPath)) { throw "Missing generated derivative: $OutputPath" }
    $existing = [System.IO.File]::ReadAllText($OutputPath)
    if ($existing -cne $json) { throw 'Generated administrative derivative is stale; run build-admin-geojson.ps1' }
    Write-Output "PASS: administrative derivative is reproducible ($($document.features.Count) features)"
  } else {
    $directory = Split-Path -Parent $OutputPath
    if (-not (Test-Path -LiteralPath $directory)) { New-Item -ItemType Directory -Path $directory | Out-Null }
    [System.IO.File]::WriteAllText($OutputPath, $json, $encoding)
    Write-Output "WROTE: $OutputPath ($([System.IO.File]::ReadAllBytes($OutputPath).Length) bytes)"
  }
} catch {
  Write-Error $_
  exit 1
}
