param(
  [string]$PmtilesExe = "pmtiles.exe",
  [string]$BuildDirectory = (Join-Path ([System.IO.Path]::GetTempPath()) 'baku-2036-pmtiles-build')
)

$ErrorActionPreference = 'Stop'
$sourceUrl = 'https://download.geofabrik.de/asia/azerbaijan-shortbread-1.0.mbtiles'
$bbox = '49.20,39.85,50.75,40.75'
$repoRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $repoRoot 'assets'
New-Item -ItemType Directory -Force -Path $BuildDirectory,$assetDir | Out-Null
$mbtiles = Join-Path $BuildDirectory 'azerbaijan-shortbread-1.0.mbtiles'
$fullPmtiles = Join-Path $BuildDirectory 'azerbaijan-shortbread-1.0.pmtiles'
$crop = Join-Path $assetDir 'baku-absheron.pmtiles'

if(-not (Test-Path -LiteralPath $mbtiles)) {
  Invoke-WebRequest -Uri $sourceUrl -OutFile $mbtiles -UseBasicParsing
}
if(-not (Test-Path -LiteralPath $fullPmtiles)) {
  & $PmtilesExe convert $mbtiles $fullPmtiles --tmpdir $BuildDirectory
  if($LASTEXITCODE -ne 0){ throw "PMTiles conversion failed with exit code $LASTEXITCODE" }
}
& $PmtilesExe extract $fullPmtiles $crop --bbox=$bbox --minzoom=0 --maxzoom=14 --download-threads=4
if($LASTEXITCODE -ne 0){ throw "PMTiles extraction failed with exit code $LASTEXITCODE" }
& $PmtilesExe verify $crop
if($LASTEXITCODE -ne 0){ throw "PMTiles verification failed with exit code $LASTEXITCODE" }
Write-Output "Created $crop"