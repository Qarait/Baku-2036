import { canonicalJson } from './contract.mjs';

const LIMITATION = 'Observed records are not automatically a representative sample of the Baku market.';

const FIELD_PATHS = [
  'sourceId', 'sourceRecordId', 'rightsId', 'transactionType', 'observedAt', 'eventDate', 'propertyType',
  'price.amount', 'price.currency', 'price.basis', 'area.value', 'area.unit', 'area.measure',
  'location.geography', 'location.district', 'location.zoneId', 'location.precision',
  'characteristics', 'characteristics.rooms', 'characteristics.bedrooms',
  'characteristics.bathrooms', 'characteristics.condition'
];
const TRANSACTION_TYPES = new Set(['asking', 'completed_sale']);
const PROPERTY_TYPES = new Set(['apartment', 'house', 'land', 'commercial', 'other']);

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
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
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

function periodFor(date, periods) {
  if (typeof date !== 'string') return undefined;
  const month = date.slice(0, 7);
  const quarter = `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
  if (periods.includes(month)) return month;
  if (periods.includes(quarter)) return quarter;
  return undefined;
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
  const observationId = rejected?.record?.observationId;
  const prefix = nonEmptyString(observationId) ? `observations/${observationId}.` : undefined;
  for (const reportError of rejected?.errors ?? []) {
    const path = typeof reportError?.path === 'string' ? reportError.path : '';
    const tail = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : '';
    for (const field of FIELD_PATHS) {
      if (tail === field || tail.startsWith(`${field}.`) || field.startsWith(`${tail}.`)) invalidFields.add(field);
    }
  }
  return invalidFields;
}

function errorFieldPaths(rejectedRecords) {
  const fields = new Map(FIELD_PATHS.map((field) => [field, 0]));
  for (const rejected of rejectedRecords ?? []) {
    for (const field of invalidFieldsForRejected(rejected)) fields.set(field, fields.get(field) + 1);
  }
  return fields;
}

function fieldState(record, field) {
  if (field === 'eventDate' && record.transactionType === 'asking') return 'notApplicable';
  const value = readPath(record, field);
  if (value === undefined || value === null) return 'missing';
  if (value === 'unknown') return 'explicitUnknown';
  return 'present';
}

function emptyFieldSummary(invalid = 0, denominator = 0) {
  return { present: 0, missing: 0, explicitUnknown: 0, notApplicable: 0, invalid, rate: denominator === 0 ? 0 : invalid / denominator };
}

function summarizeFields(records, invalidByField = new Map(), rejectedCount = 0) {
  const denominator = records.length + rejectedCount;
  return Object.fromEntries(FIELD_PATHS.map((field) => {
    const summary = emptyFieldSummary(invalidByField.get(field) ?? 0, denominator);
    for (const record of records) summary[fieldState(record, field)] += 1;
    summary.rate = denominator === 0 ? 0 : (summary.missing + summary.explicitUnknown + summary.invalid) / denominator;
    return [field, summary];
  }));
}

function missingnessBreakdowns(records, rejectedRecords) {
  const dimensions = {
    source: (record) => nonEmptyString(record?.sourceId) ? record.sourceId : undefined,
    month: monthFor,
    quarter: quarterFor,
    transactionType: (record) => TRANSACTION_TYPES.has(record?.transactionType) ? record.transactionType : undefined,
    propertyType: (record) => PROPERTY_TYPES.has(record?.propertyType) ? record.propertyType : undefined,
    coarseLocation: safeCoarseLocation
  };
  return Object.fromEntries(Object.entries(dimensions).map(([name, keyFor]) => {
    const validGroups = groupBy(records, keyFor);
    const rejectedGroups = groupBy(rejectedRecords, (rejected) => keyFor(rejected?.record));
    const keys = sorted([...validGroups.keys(), ...rejectedGroups.keys()]);
    return [name, Object.fromEntries(keys.map((key) => {
      const validRecords = validGroups.get(key) ?? [];
      const rejected = rejectedGroups.get(key) ?? [];
      return [key, {
        recordCount: validRecords.length,
        rejectedRecordCount: rejected.length,
        fields: summarizeFields(validRecords, errorFieldPaths(rejected), rejected.length)
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
    validRecordCount: records.length,
    retainedRecordCount: records.length,
    exactDuplicateGroupCount: exactGroups.length,
    probableFingerprintGroupCount: probableGroups.length,
    duplicateGroupCount: groups.length,
    groups
  };
}

export function buildMissingnessReport(records, { inputDigest, schemaVersion, rejectedRecords = [] } = {}) {
  const invalidByField = errorFieldPaths(rejectedRecords);
  return {
    schemaVersion,
    inputDigest,
    validRecordCount: records.length,
    rejectedRecordCount: rejectedRecords.length,
    fields: summarizeFields(records, invalidByField, rejectedRecords.length),
    breakdowns: missingnessBreakdowns(records, rejectedRecords)
  };
}

export function buildCoverageReport(records, { inputDigest, schemaVersion, coverageFrame = {}, rejectedCount = 0 } = {}) {
  const periods = sorted(coverageFrame.periods ?? []);
  const geographies = sorted(coverageFrame.geographies ?? []);
  const sourceIds = sorted(records.map((record) => record.sourceId));
  const observedGeographies = sorted(records.map(coarseLocation));
  const framePeriods = periods.length > 0 ? periods : sorted(records.map((record) => record.observedAt?.slice(0, 7)));
  const allGeographies = sorted([...geographies, ...observedGeographies]);
  const periodCounts = Object.fromEntries(framePeriods.map((period) => [period, records.filter((record) => periodFor(record.observedAt, framePeriods) === period).length]));
  const geographyCounts = countBy(records, coarseLocation, allGeographies);
  const sourceByPeriodCounts = Object.fromEntries(sourceIds.map((sourceId) => [sourceId, Object.fromEntries(framePeriods.map((period) => [
    period,
    records.filter((record) => record.sourceId === sourceId && periodFor(record.observedAt, framePeriods) === period).length
  ]))]));
  const geographyByPeriodCounts = Object.fromEntries(allGeographies.map((geography) => [geography, Object.fromEntries(framePeriods.map((period) => [
    period,
    records.filter((record) => coarseLocation(record) === geography && periodFor(record.observedAt, framePeriods) === period).length
  ]))]));
  const dates = sorted(records.map((record) => record.observedAt));

  return {
    schemaVersion,
    inputDigest,
    inputRecordCount: records.length + rejectedCount,
    validRecordCount: records.length,
    rejectedRecordCount: rejectedCount,
    reportableRecordCount: records.length,
    observedAtMin: dates[0] ?? null,
    observedAtMax: dates.at(-1) ?? null,
    sourceIds,
    rightsIds: sorted(records.map((record) => record.rightsId)),
    transactionTypeCounts: countBy(records, (record) => record.transactionType),
    propertyTypeCounts: countBy(records, (record) => record.propertyType),
    currencyCounts: countBy(records, (record) => record.price?.currency),
    priceBasisCounts: countBy(records, (record) => record.price?.basis),
    coarseGeographies: allGeographies,
    geographyCounts,
    periodCounts,
    sourceByPeriodCounts,
    geographyByPeriodCounts,
    limitation: LIMITATION
  };
}
