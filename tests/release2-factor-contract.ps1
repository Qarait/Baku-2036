$ErrorActionPreference = 'Stop'

$zonesPath = Join-Path $PSScriptRoot '..\data\zones.json'
$zones = Get-Content -Raw -LiteralPath $zonesPath | ConvertFrom-Json
$allowedRoles = @('support', 'risk', 'dependency', 'unknown')
$expectedEvidenceIds = @(
  'whitecity.aiib-metro-y14',
  'whitecity.atkins-white-city',
  'yasamal.state-programme-purple-b4-b8',
  'narimanov.aqp-market-may-2026',
  'sabail.aqp-market-may-2026',
  'khojasan.aiib-purple-depot',
  'khirdalan.ady-absheron-rail',
  'sumgayit.economic-zones-industrial-park',
  'novkhani.ayna-northern-corridor',
  'bilgah.sea-breeze-development',
  'bilgah.state-programme-tram',
  'mardakan.polycentric-plan',
  'airport.president-northern-corridor',
  'mohammadi.president-bogushor-pirshagi-road',
  'hovsan.state-programme-rail',
  'zikh.polycentric-transport-plan',
  'lokbatan.polycentric-plan',
  'alat.port-of-baku-throughput',
  'alat.afez-master-plan'
)

function Fail([string]$message) {
  throw "Release 2 factor contract failed: $message"
}

if ($zones -isnot [array] -or $zones.Count -ne 16) { Fail "expected 16 zones" }

$evidenceIds = @{}
foreach ($zone in $zones) {
  if ([string]::IsNullOrWhiteSpace([string]$zone.id)) { Fail 'zone is missing an id' }
  if ($null -eq $zone.evidence -or $zone.evidence.Count -eq 0) { Fail "zone $($zone.id) has no evidence" }
  foreach ($evidence in $zone.evidence) {
    if ([string]::IsNullOrWhiteSpace([string]$evidence.id)) { Fail "zone $($zone.id) has evidence with a missing id" }
    if ($evidenceIds.ContainsKey([string]$evidence.id)) { Fail "duplicate evidence id $($evidence.id)" }
    $evidenceIds[[string]$evidence.id] = $true
  }

  if ($null -eq $zone.scenarioFactors -or $zone.scenarioFactors.Count -eq 0) { Fail "zone $($zone.id) has no scenarioFactors" }
  $factorIds = @{}
  foreach ($factor in $zone.scenarioFactors) {
    if ([string]::IsNullOrWhiteSpace([string]$factor.id)) { Fail "zone $($zone.id) has a factor with a missing id" }
    if ($factorIds.ContainsKey([string]$factor.id)) { Fail "zone $($zone.id) has duplicate factor id $($factor.id)" }
    $factorIds[[string]$factor.id] = $true
    if ($allowedRoles -notcontains [string]$factor.role) { Fail "zone $($zone.id) factor $($factor.id) has invalid role $($factor.role)" }
    if ($null -eq $factor.evidenceIds -or $factor.evidenceIds.Count -eq 0) { Fail "zone $($zone.id) factor $($factor.id) has no evidenceIds" }
    foreach ($evidenceId in $factor.evidenceIds) {
      if (-not $evidenceIds.ContainsKey([string]$evidenceId)) { Fail "zone $($zone.id) factor $($factor.id) references unknown evidence $evidenceId" }
    }
    if ([string]::IsNullOrWhiteSpace([string]$factor.en)) { Fail "zone $($zone.id) factor $($factor.id) has no English statement" }
    if ([string]::IsNullOrWhiteSpace([string]$factor.tr)) { Fail "zone $($zone.id) factor $($factor.id) has no Turkish statement" }
    $numericKeys = @($factor.PSObject.Properties.Name | Where-Object { $_ -match '(weight|score|percent|percentage|multiplier|coefficient)' })
    if ($numericKeys.Count -gt 0) { Fail "zone $($zone.id) factor $($factor.id) contains prohibited numerical fields: $($numericKeys -join ', ')" }
  }
}

if ($evidenceIds.Count -ne $expectedEvidenceIds.Count) { Fail "expected $($expectedEvidenceIds.Count) evidence IDs, found $($evidenceIds.Count)" }
foreach ($expectedId in $expectedEvidenceIds) {
  if (-not $evidenceIds.ContainsKey($expectedId)) { Fail "missing approved evidence id $expectedId" }
}

Write-Output "Release 2 factor contract: PASS ($($zones.Count) zones, $($evidenceIds.Count) evidence IDs)"
