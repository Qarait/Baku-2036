import { canonicalJson } from './contract.mjs';

const LIMITATION = 'Observed records are not automatically a representative sample of the Baku market.';
const INVALID_DIMENSION = '__invalid__';

const FIELD_PATHS = [
  'schemaVersion', 'observationId', 'sourceId', 'sourceRecordId', 'rightsId', 'transactionType', 'observedAt', 'eventDate',
  'propertyType', 'price', 'price.amount', 'price.currency', 'price.basis', 'area', 'area.value', 'area.unit', 'area.measure',
  'location', 'location.geography', 'location.district', 'location.zoneId', 'location.precision',
  'characteristics', 'characteristics.rooms', 'characteristics.bedrooms', 'characteristics.bathrooms', 'characteristics.condition'
];
const TRANSACTION_TYPES = new Set(['asking', 'completed_sale']);
const PRICE_BASES = new Set(['total', 'per_m2']);
export const CONTRACT_PROPERTY_TYPES = Object.freeze(['apartment', 'house', 'land', 'commercial', 'other']);
const PROPERTY_TYPES = new Set(CONTRACT_PROPERTY_TYPES);

function compare(left, right) {
  return String(left).localeCompare(String(right));
}

function sorted(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))].sort(compare);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readPath(record, path) {
  return path.split('.').reduce((value, key) => value?.[key], record);
}

function coarseLocation(record) {
  if (record?.location?.precision === 'unknown') return undefined;
  return record?.location?.geography ?? record?.location?.district ?? record?.location?.zoneId;
}

function validObservedAt(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function monthFor(record) {
  return validObservedAt(record?.observedAt) ? record.observedAt.slice(0, 7) : undefined;
}

function quarterFor(record) {
  if (!validObservedAt(record?.observedAt)) return undefined;
  return `${record.observedAt.slice(0, 4)}-Q${Math.floor((Number(record.observedAt.slice(5, 7)) - 1) / 3) + 1}`;
}

function safeCoarseLocation(record) {
  if (!['district', 'zone'].includes(record?.location?.precision)) return undefined;
  const value = coarseLocation(record);
  return nonEmptyString(value) ? value : undefined;
}

function periodKind(period) {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return 'month';
  if (/^\d{4}-Q[1-4]$/.test(period)) return 'quarter';
  return undefined;
}

function configuredPeriods(coverageFrame) {
  return sorted((coverageFrame.periods ?? []).filter((period) => periodKind(period)));
}

function observedCoveragePeriods(records, framePeriods) {
  const configuredKinds = new Set(framePeriods.map(periodKind));
  const useQuarter = configuredKinds.size === 1 && configuredKinds.has('quarter');
  return sorted(records.map((record) => useQuarter ? quarterFor(record) : monthFor(record)));
}

function periodMatches(record, period) {
  return period === monthFor(record) || period === quarterFor(record);
}

function countBy(records, valueFor, configured = []) {
  const keys = sorted([...configured, ...records.map(valueFor)]);
  return Object.fromEntries(keys.map((key) => [key, records.filter((record) => valueFor(record) === key).length]));
}

function groupBy(records, keyFor) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFor(record);
    if (key === undefined) continue;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return groups;
}

function duplicateGroups(records, keyFor, kind, keyType) {
  return [...groupBy(records, keyFor).values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      kind,
      keyType,
      observationIds: sorted(group.map((record) => record.observationId))
    }))
    .sort((left, right) => compare(left.observationIds.join('\u0000'), right.observationIds.join('\u0000')));
}

function fingerprint(record) {
  return canonicalJson({
    sourceId: record.sourceId,
    transactionType: record.transactionType,
    observedAt: record.observedAt,
    propertyType: record.propertyType,
    price: record.price && { amount: record.price.amount, currency: record.price.currency, basis: record.price.basis },
    area: record.area && { value: record.area.value, unit: record.area.unit, measure: record.area.measure },
    coarseLocation: coarseLocation(record),
    characteristics: record.characteristics
  });
}

function invalidFieldsForRejected(rejected) {
  const invalidFields = new Set();
  for (const reportError of rejected?.errors ?? []) {
    const path = typeof reportError?.path === 'string' ? reportError.path : '';
    const matches = FIELD_PATHS.filter((field) => path === field || path.endsWith(`.${field}`));
    const longestMatch = Math.max(0, ...matches.map((field) => field.length));
    for (const field of matches) {
      if (field.length === longestMatch) invalidFields.add(field);
    }
  }
  return invalidFields;
}

function invalidAttribution(rejectedRecords) {
  const fields = new Map(FIELD_PATHS.map((field) => [field, 0]));
  let fieldAttributedRejectedRecordCount = 0;
  for (const rejected of rejectedRecords ?? []) {
    const invalidFields = invalidFieldsForRejected(rejected);
    if (invalidFields.size > 0) fieldAttributedRejectedRecordCount += 1;
    for (const field of invalidFields) fields.set(field, fields.get(field) + 1);
  }
  return {
    fields,
    fieldAttributedRejectedRecordCount,
    unattributedRejectedRecordCount: rejectedRecords.length - fieldAttributedRejectedRecordCount
  };
}

function fieldState(record, field) {
  if (field === 'eventDate' && record.transactionType === 'asking') return 'notApplicable';
  const value = readPath(record, field);
  if (value === undefined || value === null) return 'missing';
  if (value === 'unknown') return 'explicitUnknown';
  return 'present';
}

function summarizeFields(records, attribution = invalidAttribution([]), rejectedCount = 0) {
  const stateDenominator = records.length;
  const invalidDenominator = rejectedCount;
  return Object.fromEntries(FIELD_PATHS.map((field) => {
    const summary = {
      present: 0,
      missing: 0,
      explicitUnknown: 0,
      notApplicable: 0,
      invalid: attribution.fields.get(field) ?? 0,
      stateDenominator,
      invalidDenominator,
      rate: 0,
      invalidRate: 0
    };
    for (const record of records) summary[fieldState(record, field)] += 1;
    summary.rate = stateDenominator === 0 ? 0 : (summary.missing + summary.explicitUnknown) / stateDenominator;
    summary.invalidRate = invalidDenominator === 0 ? 0 : summary.invalid / invalidDenominator;
    return [field, summary];
  }));
}

const MISSINGNESS_DIMENSIONS = {
  source: (record) => nonEmptyString(record?.sourceId) ? record.sourceId : undefined,
  month: monthFor,
  quarter: quarterFor,
  transactionType: (record) => TRANSACTION_TYPES.has(record?.transactionType) ? record.transactionType : undefined,
  propertyType: (record) => PROPERTY_TYPES.has(record?.propertyType) ? record.propertyType : undefined,
  priceBasis: (record) => PRICE_BASES.has(record?.price?.basis) ? record.price.basis : undefined,
  coarseLocation: safeCoarseLocation
};

function missingnessBreakdowns(records, rejectedRecords) {
  return Object.fromEntries(Object.entries(MISSINGNESS_DIMENSIONS).map(([name, keyFor]) => {
    const validGroups = groupBy(records, keyFor);
    const keys = sorted([
      ...validGroups.keys(),
      ...(rejectedRecords.length > 0 ? [INVALID_DIMENSION] : [])
    ]);
    return [name, Object.fromEntries(keys.map((key) => {
      const validRecords = validGroups.get(key) ?? [];
      const rejected = key === INVALID_DIMENSION ? rejectedRecords : [];
      const attribution = invalidAttribution(rejected);
      return [key, {
        recordCount: validRecords.length,
        rejectedRecordCount: rejected.length,
        fields: summarizeFields(validRecords, attribution, rejected.length)
      }];
    }))];
  }));
}

export function buildDuplicateReport(records, { inputDigest, schemaVersion } = {}) {
  const exactGroups = duplicateGroups(
    records,
    (record) => nonEmptyString(record?.sourceRecordId) ? canonicalJson([record.sourceId, record.sourceRecordId]) : undefined,
    'exact-source-record',
    'sourceId+sourceRecordId'
  );
  const probableGroups = duplicateGroups(
    records,
    fingerprint,
    'probable-normalized-fingerprint',
    'sourceId+transactionType+observedAt+propertyType+price+area+coarseLocation+characteristics'
  );
  const groups = [...exactGroups, ...probableGroups];
  return {
    schemaVersion,
    inputDigest,
    counts: {
      validRecordCount: records.length,
      retainedRecordCount: records.length,
      exactDuplicateGroupCount: exactGroups.length,
      probableFingerprintGroupCount: probableGroups.length,
      duplicateGroupCount: groups.length
    },
    dimensions: {
      exact: ['sourceId+sourceRecordId'],
      probable: ['sourceId+transactionType+observedAt+propertyType+price+area+coarseLocation+characteristics']
    },
    validRecordCount: records.length,
    retainedRecordCount: records.length,
    exactDuplicateGroupCount: exactGroups.length,
    probableFingerprintGroupCount: probableGroups.length,
    duplicateGroupCount: groups.length,
    groups,
    limitation: LIMITATION
  };
}

export function buildMissingnessReport(records, { inputDigest, schemaVersion, rejectedRecords = [] } = {}) {
  const attribution = invalidAttribution(rejectedRecords);
  return {
    schemaVersion,
    inputDigest,
    counts: {
      inputRecordCount: records.length + rejectedRecords.length,
      validRecordCount: records.length,
      rejectedRecordCount: rejectedRecords.length,
      invalidRecordCount: rejectedRecords.length
    },
    dimensions: Object.fromEntries(Object.entries(MISSINGNESS_DIMENSIONS).map(([name, keyFor]) => [
      name,
      sorted([
        ...records.map(keyFor),
        ...(rejectedRecords.length > 0 ? [INVALID_DIMENSION] : [])
      ])
    ]).concat([['field', FIELD_PATHS]])),
    validRecordCount: records.length,
    rejectedRecordCount: rejectedRecords.length,
    invalid: {
      rejectedRecordCount: rejectedRecords.length,
      fieldAttributedRejectedRecordCount: attribution.fieldAttributedRejectedRecordCount,
      unattributedRejectedRecordCount: attribution.unattributedRejectedRecordCount
    },
    fields: summarizeFields(records, attribution, rejectedRecords.length),
    breakdowns: missingnessBreakdowns(records, rejectedRecords),
    limitation: LIMITATION
  };
}

export function buildSafeCoverageFrame(records) {
  const validRecords = Array.isArray(records) ? records : [];
  return {
    periods: observedCoveragePeriods(validRecords, []),
    geographies: sorted(validRecords.map(safeCoarseLocation)),
    propertyTypes: sorted(CONTRACT_PROPERTY_TYPES)
  };
}

export function buildCoverageReport(records, { inputDigest, schemaVersion, coverageFrame = {}, rejectedCount = 0 } = {}) {
  const configuredFramePeriods = configuredPeriods(coverageFrame);
  const framePeriods = sorted([...configuredFramePeriods, ...observedCoveragePeriods(records, configuredFramePeriods)]);
  const configuredGeographies = sorted(coverageFrame.geographies ?? []);
  const allGeographies = sorted([...configuredGeographies, ...records.map(safeCoarseLocation)]);
  const configuredPropertyTypes = sorted((coverageFrame.propertyTypes ?? []).filter((propertyType) => PROPERTY_TYPES.has(propertyType)));
  const allPropertyTypes = sorted([...configuredPropertyTypes, ...records.map((record) => record.propertyType)]);
  const sourceIds = sorted(records.map((record) => record.sourceId));
  const periodCounts = Object.fromEntries(framePeriods.map((period) => [period, records.filter((record) => periodMatches(record, period)).length]));
  const geographyCounts = countBy(records, safeCoarseLocation, allGeographies);
  const sourceByPeriodCounts = Object.fromEntries(sourceIds.map((sourceId) => [sourceId, Object.fromEntries(framePeriods.map((period) => [
    period,
    records.filter((record) => record.sourceId === sourceId && periodMatches(record, period)).length
  ]))]));
  const geographyByPeriodCounts = Object.fromEntries(allGeographies.map((geography) => [geography, Object.fromEntries(framePeriods.map((period) => [
    period,
    records.filter((record) => safeCoarseLocation(record) === geography && periodMatches(record, period)).length
  ]))]));
  const propertyTypeByPeriodCounts = Object.fromEntries(allPropertyTypes.map((propertyType) => [propertyType, Object.fromEntries(framePeriods.map((period) => [
    period,
    records.filter((record) => record.propertyType === propertyType && periodMatches(record, period)).length
  ]))]));
  const dates = sorted(records.map((record) => record.observedAt));

  return {
    schemaVersion,
    inputDigest,
    counts: {
      inputRecordCount: records.length + rejectedCount,
      validRecordCount: records.length,
      rejectedRecordCount: rejectedCount,
      reportableRecordCount: records.length
    },
    dimensions: {
      period: framePeriods,
      geography: allGeographies,
      source: sourceIds,
      transactionType: sorted(records.map((record) => record.transactionType)),
      propertyType: allPropertyTypes,
      currency: sorted(records.map((record) => record.price?.currency)),
      priceBasis: sorted(records.map((record) => record.price?.basis))
    },
    inputRecordCount: records.length + rejectedCount,
    validRecordCount: records.length,
    rejectedRecordCount: rejectedCount,
    reportableRecordCount: records.length,
    observedAtMin: dates[0] ?? null,
    observedAtMax: dates.at(-1) ?? null,
    sourceIds,
    rightsIds: sorted(records.map((record) => record.rightsId)),
    transactionTypeCounts: countBy(records, (record) => record.transactionType),
    propertyTypeCounts: countBy(records, (record) => record.propertyType, allPropertyTypes),
    currencyCounts: countBy(records, (record) => record.price?.currency),
    priceBasisCounts: countBy(records, (record) => record.price?.basis),
    coarseGeographies: allGeographies,
    geographyCounts,
    periodCounts,
    sourceByPeriodCounts,
    geographyByPeriodCounts,
    propertyTypeByPeriodCounts,
    limitation: LIMITATION
  };
}
