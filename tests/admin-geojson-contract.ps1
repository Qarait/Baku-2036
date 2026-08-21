$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw "FAIL: $message" }
}

function Get-GzipLength([string]$path) {
  $inputStream = [System.IO.File]::OpenRead($path)
  $outputStream = [System.IO.MemoryStream]::new()
  try {
    $gzip = [System.IO.Compression.GzipStream]::new($outputStream, [System.IO.Compression.CompressionMode]::Compress, $true)
    try { $inputStream.CopyTo($gzip) } finally { $gzip.Dispose() }
    return $outputStream.Length
  } finally {
    $inputStream.Dispose()
    $outputStream.Dispose()
  }
}

function Test-PointInRing([double[]]$point, $ring) {
  $inside = $false
  for ($index = 0; $index -lt $ring.Count; $index += 1) {
    $previous = ($index + $ring.Count - 1) % $ring.Count
    $xi = [double]$ring[$index][0]; $yi = [double]$ring[$index][1]
    $xj = [double]$ring[$previous][0]; $yj = [double]$ring[$previous][1]
    $crosses = (($yi -gt $point[1]) -ne ($yj -gt $point[1])) -and ($point[0] -lt (($xj - $xi) * ($point[1] - $yi) / ($yj - $yi)) + $xi)
    if ($crosses) { $inside = -not $inside }
  }
  return $inside
}

function Test-PointInGeometry([double[]]$point, $geometry) {
  if ($geometry.type -eq 'Polygon') {
    if (-not (Test-PointInRing $point $geometry.coordinates[0])) { return $false }
    for ($index = 1; $index -lt $geometry.coordinates.Count; $index += 1) {
      if (Test-PointInRing $point $geometry.coordinates[$index]) { return $false }
    }
    return $true
  }
  foreach ($polygon in $geometry.coordinates) {
    if (Test-PointInGeometry $point ([pscustomobject]@{ type = 'Polygon'; coordinates = $polygon })) { return $true }
  }
  return $false
}

function Get-FeatureAtPoint($document, [double[]]$point) {
  foreach ($feature in $document.features) {
    if (Test-PointInGeometry $point $feature.geometry) { return $feature }
  }
  return $null
}

$canonical = Join-Path $root 'data\admin-absheron.geojson'
$derivative = Join-Path $root 'data\admin-absheron-5dp.geojson'
$builder = Join-Path $root 'scripts\build-admin-geojson.ps1'
$validator = Join-Path $root 'scripts\validate-admin-geojson.ps1'
$zonesPath = Join-Path $root 'data\zones.json'
$v3 = [System.IO.File]::ReadAllText((Join-Path $root 'v3.js'))
$measurement = [System.IO.File]::ReadAllText((Join-Path $root 'scripts\measure-performance.js'))

Assert-True (Test-Path -LiteralPath $canonical) 'canonical administrative GeoJSON is missing'
Assert-True (Test-Path -LiteralPath $derivative) '5-decimal administrative GeoJSON derivative is missing'
Assert-True (Test-Path -LiteralPath $builder) 'administrative GeoJSON builder is missing'
Assert-True (Test-Path -LiteralPath $validator) 'administrative GeoJSON validator is missing'
Assert-True ($v3 -match 'data/admin-absheron-5dp\.geojson') 'v3.js must load the reduced administrative derivative'
Assert-True ($measurement -match 'admin-absheron' -and $measurement -match '5dp') 'performance measurement must identify the reduced administrative derivative'

& pwsh -NoProfile -File $builder -Check
Assert-True ($LASTEXITCODE -eq 0) 'committed administrative derivative is stale'
& pwsh -NoProfile -File $validator
Assert-True ($LASTEXITCODE -eq 0) 'administrative derivative validation failed'

$rawBytes = (Get-Item -LiteralPath $derivative).Length
$gzipBytes = Get-GzipLength $derivative
Assert-True ($rawBytes -le 1350000) "derivative must be at most 1.35 MB raw; got $rawBytes bytes"
Assert-True ($gzipBytes -le 310000) "derivative must be at most 310 KB gzip; got $gzipBytes bytes"

$canonicalJson = [System.IO.File]::ReadAllText($canonical) | ConvertFrom-Json -Depth 100
$derivativeJson = [System.IO.File]::ReadAllText($derivative) | ConvertFrom-Json -Depth 100
$zones = [System.IO.File]::ReadAllText($zonesPath) | ConvertFrom-Json -Depth 100
foreach ($zone in $zones) {
  $canonicalFeature = Get-FeatureAtPoint $canonicalJson ([double[]]$zone.coords)
  $derivativeFeature = Get-FeatureAtPoint $derivativeJson ([double[]]$zone.coords)
  $canonicalName = if ($null -eq $canonicalFeature) { '' } else { [string]$canonicalFeature.properties.nameEn }
  $derivativeName = if ($null -eq $derivativeFeature) { '' } else { [string]$derivativeFeature.properties.nameEn }
  Assert-True ($canonicalName -ceq $derivativeName) "zone $($zone.id) administrative lookup changed from '$canonicalName' to '$derivativeName'"
}

Write-Output "PASS: administrative GeoJSON derivative contract ($rawBytes raw / $gzipBytes gzip)"
