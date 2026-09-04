$ErrorActionPreference = 'Stop'

$zonesPath = Join-Path $PSScriptRoot '..\data\zones.json'
$zones = Get-Content -Raw -LiteralPath $zonesPath | ConvertFrom-Json
$allowedRoles = @('urban-core', 'regional-centre', 'local-centre', 'district-context', 'not-specified')
$allowedStatuses = @('first-priority', 'strategic-project', 'planning-direction', 'not-zone-specific')
$allowedPhases = @('first-seven-years', 'long-range', 'context-only', 'not-specified')

function Fail([string]$message) {
  throw "Official-plan contract failed: $message"
}

if ($zones -isnot [array] -or $zones.Count -ne 16) { Fail "expected 16 zones" }

foreach ($zone in $zones) {
  $plan = $zone.officialPlan
  if ($null -eq $plan) { Fail "zone $($zone.id) is missing officialPlan" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.planId)) { Fail "zone $($zone.id) is missing planId" }
  if ([string]$plan.planId -ne 'baku-master-plan-2040') { Fail "zone $($zone.id) has an unexpected planId" }
  if ($allowedRoles -notcontains [string]$plan.role) { Fail "zone $($zone.id) has invalid role $($plan.role)" }
  if ($allowedStatuses -notcontains [string]$plan.status) { Fail "zone $($zone.id) has invalid status $($plan.status)" }
  if ($allowedPhases -notcontains [string]$plan.implementationPhase) { Fail "zone $($zone.id) has invalid implementationPhase $($plan.implementationPhase)" }
  if ([int]$plan.horizonYear -ne 2040) { Fail "zone $($zone.id) must use the official 2040 horizon" }
  if ([string]$plan.source.publisher -ne 'ARXKOM') { Fail "zone $($zone.id) has an unexpected source publisher" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.source.sourceId)) { Fail "zone $($zone.id) is missing source.sourceId" }
  if ([string]$plan.source.sourceId -ne 'arxkom.baku-master-plan-2040') { Fail "zone $($zone.id) has an unexpected sourceId" }
  if ([string]$plan.source.url -notmatch '^https://arxkom\.gov\.az/') { Fail "zone $($zone.id) has an unsafe or missing source URL" }
  if ($null -eq $plan.source.pages -or $plan.source.pages.Count -eq 0) { Fail "zone $($zone.id) has no source pages" }
  foreach ($page in $plan.source.pages) {
    if ([int]$page -lt 1 -or [int]$page -gt 226) { Fail "zone $($zone.id) has an invalid source page $page" }
  }
  if ([string]::IsNullOrWhiteSpace([string]$plan.source.section)) { Fail "zone $($zone.id) is missing source section" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.checkedAt)) { Fail "zone $($zone.id) is missing checkedAt" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.en)) { Fail "zone $($zone.id) is missing English plan statement" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.tr)) { Fail "zone $($zone.id) is missing Turkish plan statement" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.cautionEn)) { Fail "zone $($zone.id) is missing English caution" }
  if ([string]::IsNullOrWhiteSpace([string]$plan.cautionTr)) { Fail "zone $($zone.id) is missing Turkish caution" }
}

Write-Output "Official-plan contract: PASS ($($zones.Count) zones, 2040 horizon)"
