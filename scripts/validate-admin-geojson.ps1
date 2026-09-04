param(
  [string]$CanonicalPath,
  [string]$DerivativePath,
  [double]$MaxDisplacementMetres = 1.5
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($CanonicalPath)) { $CanonicalPath = Join-Path $root 'data\admin-absheron.geojson' }
if ([string]::IsNullOrWhiteSpace($DerivativePath)) { $DerivativePath = Join-Path $root 'data\admin-absheron-5dp.geojson' }

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw $message }
}

function Test-CoordinateNumber($value) {
  if ($null -eq $value -or $value -is [bool] -or $value -is [string]) { return $false }
  try { $null = [double]$value; return $true } catch { return $false }
}

function Read-JsonDocument([string]$path) {
  Assert-True (Test-Path -LiteralPath $path) "Missing GeoJSON file: $path"
  return [System.IO.File]::ReadAllText($path) | ConvertFrom-Json -Depth 100
}

function Get-DisplacementMetres([double]$leftLon, [double]$leftLat, [double]$rightLon, [double]$rightLat) {
  $meanLatRadians = (($leftLat + $rightLat) / 2) * [Math]::PI / 180
  $eastMetres = ($rightLon - $leftLon) * 111320 * [Math]::Cos($meanLatRadians)
  $northMetres = ($rightLat - $leftLat) * 110540
  return [Math]::Sqrt(($eastMetres * $eastMetres) + ($northMetres * $northMetres))
}

function Compare-CoordinateTree($canonical, $derivative, [string]$path, [ref]$maxDisplacement) {
  Assert-True (($canonical -is [System.Array]) -eq ($derivative -is [System.Array])) "$path coordinate structure changed"
  if ($canonical -isnot [System.Array]) {
    Assert-True (Test-CoordinateNumber $canonical) "$path canonical coordinate is not numeric"
    Assert-True (Test-CoordinateNumber $derivative) "$path derivative coordinate is not numeric"
    $expected = [Math]::Round([double]$canonical, 5, [MidpointRounding]::AwayFromZero)
    Assert-True ([Math]::Abs([double]$derivative - $expected) -le 0.000000001) "$path was not rounded to five decimals"
    return
  }

  Assert-True ($canonical.Count -eq $derivative.Count) "$path coordinate length changed"
  if ($canonical.Count -eq 2 -and (Test-CoordinateNumber $canonical[0]) -and (Test-CoordinateNumber $canonical[1])) {
    Assert-True (Test-CoordinateNumber $derivative[0] -and Test-CoordinateNumber $derivative[1]) "$path coordinate pair is invalid"
    $displacement = Get-DisplacementMetres ([double]$canonical[0]) ([double]$canonical[1]) ([double]$derivative[0]) ([double]$derivative[1])
    if ($displacement -gt $maxDisplacement.Value) { $maxDisplacement.Value = $displacement }
    return
  }

  for ($index = 0; $index -lt $canonical.Count; $index += 1) {
    Compare-CoordinateTree $canonical[$index] $derivative[$index] "$path[$index]" $maxDisplacement
  }
}

function Assert-ClosedRing($ring, [string]$path) {
  Assert-True ($ring -is [System.Array] -and $ring.Count -ge 4) "$path must contain at least four positions"
  $first = $ring[0]; $last = $ring[$ring.Count - 1]
  Assert-True ($first.Count -eq 2 -and $last.Count -eq 2) "$path contains an invalid position"
  Assert-True ([double]$first[0] -eq [double]$last[0] -and [double]$first[1] -eq [double]$last[1]) "$path must be closed"
}

function Assert-Rings($geometry, [string]$path) {
  switch ($geometry.type) {
    'Polygon' {
      for ($index = 0; $index -lt $geometry.coordinates.Count; $index += 1) { Assert-ClosedRing $geometry.coordinates[$index] "$path.coordinates[$index]" }
    }
    'MultiPolygon' {
      for ($polygon = 0; $polygon -lt $geometry.coordinates.Count; $polygon += 1) {
        for ($ring = 0; $ring -lt $geometry.coordinates[$polygon].Count; $ring += 1) { Assert-ClosedRing $geometry.coordinates[$polygon][$ring] "$path.coordinates[$polygon][$ring]" }
      }
    }
    default { throw "$path has unsupported geometry type $($geometry.type)" }
  }
}

try {
  $canonical = Read-JsonDocument $CanonicalPath
  $derivative = Read-JsonDocument $DerivativePath
  Assert-True ($canonical.type -eq 'FeatureCollection' -and $derivative.type -eq 'FeatureCollection') 'both files must be GeoJSON FeatureCollections'
  Assert-True ($canonical.features.Count -eq $derivative.features.Count) 'feature count changed'
  $maxDisplacement = [ref]0.0

  for ($index = 0; $index -lt $canonical.features.Count; $index += 1) {
    $left = $canonical.features[$index]
    $right = $derivative.features[$index]
    Assert-True ($left.type -eq $right.type) "feature $index type changed"
    Assert-True ((@($left.properties.PSObject.Properties.Name) -join '|') -ceq (@($right.properties.PSObject.Properties.Name) -join '|')) "feature $index property keys changed"
    Assert-True (($left.properties | ConvertTo-Json -Depth 100 -Compress) -ceq ($right.properties | ConvertTo-Json -Depth 100 -Compress)) "feature $index properties changed"
    Assert-True ($left.geometry.type -eq $right.geometry.type) "feature $index geometry type changed"
    Compare-CoordinateTree $left.geometry.coordinates $right.geometry.coordinates "feature $index" $maxDisplacement
    Assert-Rings $right.geometry "feature $index"
  }

  Assert-True ($maxDisplacement.Value -le $MaxDisplacementMetres) "maximum coordinate displacement $($maxDisplacement.Value) m exceeds $MaxDisplacementMetres m"
  $rawBytes = (Get-Item -LiteralPath $DerivativePath).Length
  Write-Output "PASS: administrative derivative validated ($($canonical.features.Count) features, max displacement $([Math]::Round($maxDisplacement.Value, 3)) m, $rawBytes raw bytes)"
} catch {
  Write-Error $_
  exit 1
}
