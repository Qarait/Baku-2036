import { createHash } from 'node:crypto';

const SCHEMA_VERSION = '1.0';
const RIGHTS_STATUSES = new Set(['approved_for_fixture_testing', 'approved', 'restricted', 'rejected', 'expired']);
const ALLOWED_USES = new Set(['internal_testing', 'internal_analysis']);
const ACQUISITION_BASES = new Set(['synthetic', 'licensed', 'permission', 'public_terms', 'internal']);
const RAW_REDISTRIBUTION_VALUES = new Set(['prohibited', 'allowed', 'not_applicable']);
const DERIVED_PUBLICATION_VALUES = new Set(['prohibited', 'allowed', 'review_required', 'not_applicable']);
const PERSONAL_DATA_HANDLING_VALUES = new Set(['prohibited', 'redacted', 'allowed']);
const TRANSACTION_TYPES = new Set(['asking', 'completed_sale']);
const PROPERTY_TYPES = new Set(['apartment', 'house', 'land', 'commercial', 'other']);
const CURRENCIES = new Set(['AZN', 'USD', 'EUR']);
const PRICE_BASES = new Set(['total', 'per_m2']);
const AREA_MEASURES = new Set(['gross', 'net', 'land']);
const LOCATION_PRECISIONS = new Set(['exact', 'street', 'district', 'zone', 'unknown']);
const CHARACTERISTICS = new Set(['rooms', 'bedrooms', 'bathrooms', 'condition']);
const CONDITION_VALUES = new Set(['new', 'good', 'needs_repair', 'unknown']);
const PERSONAL_DATA_KEY = /seller|broker|phone|email/i;

function error(code, path, message) {
  return { code, path, message };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasOnlyKeys(value, keys, path, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value).sort()) {
    if (PERSONAL_DATA_KEY.test(key)) {
      errors.push(error('personal-data-field', `${path}.${key}`, 'personal-data field is prohibited'));
    } else if (!keys.has(key)) {
      errors.push(error('unexpected-field', `${path}.${key}`, 'field is not permitted by the contract'));
    }
  }
}

function validateRequiredString(record, key, path, errors, code = 'missing-required-field') {
  if (!isNonEmptyString(record?.[key])) {
    errors.push(error(code, `${path}.${key}`, 'non-empty string is required'));
  }
}

function recordPath(kind, record, index, idField) {
  const id = isNonEmptyString(record?.[idField]) ? record[idField] : `index-${String(index).padStart(6, '0')}`;
  return `${kind}/${id}`;
}

function sortByPath(errors) {
  return errors.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
}

function sortedRecords(records, idField) {
  return [...records].sort((left, right) => String(left[idField]).localeCompare(String(right[idField])));
}

function collectDuplicates(records, field) {
  const duplicates = new Set();
  const ids = new Map();
  for (const record of records) {
    if (!isNonEmptyString(record?.[field])) continue;
    const key = record[field];
    if (ids.has(key)) duplicates.add(key);
    else ids.set(key, record);
  }
  return duplicates;
}

export function canonicalJson(value) {
  const serialize = (item) => {
    if (Array.isArray(item)) return `[${item.map((entry) => serialize(entry) ?? 'null').join(',')}]`;
    if (!isObject(item)) return JSON.stringify(item);
    return `{${Object.keys(item).sort().flatMap((key) => {
      const serialized = serialize(item[key]);
      return serialized === undefined ? [] : [`${JSON.stringify(key)}:${serialized}`];
    }).join(',')}}`;
  };
  return serialize(value);
}

export function digestJson(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export function validateRights(records, { intendedUse } = {}) {
  const errors = [];
  const rightsById = new Map();
  if (!Array.isArray(records)) {
    return { valid: false, errors: [error('invalid-records', 'rights', 'rights records must be an array')], rightsById };
  }

  const duplicateRightsIds = collectDuplicates(records, 'rightsId');
  const duplicateSourceIds = collectDuplicates(records, 'sourceId');
  const validRecords = [];

  records.forEach((record, index) => {
    const path = recordPath('rights', record, index, 'rightsId');
    const recordErrors = [];
    if (!isObject(record)) {
      recordErrors.push(error('invalid-record', path, 'rights record must be an object'));
    } else {
      hasOnlyKeys(record, new Set([
        'schemaVersion', 'rightsId', 'sourceId', 'sourceName', 'acquisitionBasis', 'termsUrl', 'allowedUses',
        'rawRedistribution', 'derivedPublication', 'retention', 'personalDataHandling', 'reviewedAt', 'reviewer', 'status'
      ]), path, recordErrors);
      validateRequiredString(record, 'rightsId', path, recordErrors);
      validateRequiredString(record, 'sourceId', path, recordErrors);
      for (const key of ['sourceName', 'acquisitionBasis', 'rawRedistribution', 'derivedPublication', 'retention', 'personalDataHandling', 'reviewer', 'status']) {
        validateRequiredString(record, key, path, recordErrors);
      }
      if (record.schemaVersion !== SCHEMA_VERSION) recordErrors.push(error('invalid-schema-version', `${path}.schemaVersion`, 'schema version must be 1.0'));
      if (duplicateRightsIds.has(record.rightsId)) recordErrors.push(error('duplicate-rights-id', `${path}.rightsId`, 'rightsId must be unique'));
      if (duplicateSourceIds.has(record.sourceId)) recordErrors.push(error('duplicate-source-id', `${path}.sourceId`, 'sourceId must be unique'));
      if (!isDate(record.reviewedAt)) recordErrors.push(error('invalid-date', `${path}.reviewedAt`, 'date must use YYYY-MM-DD'));
      if (!RIGHTS_STATUSES.has(record.status)) recordErrors.push(error('invalid-rights-status', `${path}.status`, 'status must be explicit and recognized'));
      if (record.status === 'rejected' || record.status === 'expired') recordErrors.push(error('invalid-rights-status', `${path}.status`, 'rejected or expired rights cannot be used'));
      for (const [key, values] of [
        ['acquisitionBasis', ACQUISITION_BASES],
        ['rawRedistribution', RAW_REDISTRIBUTION_VALUES],
        ['derivedPublication', DERIVED_PUBLICATION_VALUES],
        ['personalDataHandling', PERSONAL_DATA_HANDLING_VALUES]
      ]) {
        if (!values.has(record[key])) recordErrors.push(error('invalid-rights-metadata', `${path}.${key}`, 'rights metadata value must be explicit and recognized'));
      }
      if (record.termsUrl !== undefined && record.termsUrl !== null) {
        let validUrl = typeof record.termsUrl === 'string';
        if (validUrl) {
          try { validUrl = ['http:', 'https:'].includes(new URL(record.termsUrl).protocol); } catch { validUrl = false; }
        }
        if (!validUrl) recordErrors.push(error('invalid-terms-url', `${path}.termsUrl`, 'termsUrl must be an HTTP(S) URL or null'));
      }
      if (!Array.isArray(record.allowedUses) || record.allowedUses.length === 0 || record.allowedUses.some((use) => !ALLOWED_USES.has(use))) {
        recordErrors.push(error('invalid-allowed-uses', `${path}.allowedUses`, 'allowedUses must contain recognized explicit uses'));
      } else if (!record.allowedUses.includes(intendedUse)) {
        recordErrors.push(error('intended-use-not-allowed', `${path}.allowedUses`, 'intended use is not allowed'));
      }
    }
    if (recordErrors.length === 0) validRecords.push(record);
    errors.push(...recordErrors);
  });

  for (const record of sortedRecords(validRecords, 'rightsId')) rightsById.set(record.rightsId, record);
  return { valid: errors.length === 0, errors: sortByPath(errors), rightsById };
}

function validateObservation(record, path, rightsById) {
  const errors = [];
  if (!isObject(record)) return [error('invalid-record', path, 'observation record must be an object')];
  hasOnlyKeys(record, new Set([
    'schemaVersion', 'observationId', 'sourceId', 'sourceRecordId', 'rightsId', 'transactionType', 'observedAt', 'eventDate',
    'propertyType', 'price', 'area', 'location', 'characteristics'
  ]), path, errors);
  for (const key of ['observationId', 'sourceId', 'rightsId']) validateRequiredString(record, key, path, errors);
  if (record.sourceRecordId !== undefined && !isNonEmptyString(record.sourceRecordId)) errors.push(error('invalid-source-record-id', `${path}.sourceRecordId`, 'sourceRecordId must be a non-empty string when present'));
  if (record.schemaVersion !== SCHEMA_VERSION) errors.push(error('invalid-schema-version', `${path}.schemaVersion`, 'schema version must be 1.0'));
  if (!TRANSACTION_TYPES.has(record.transactionType)) errors.push(error('invalid-transaction-type', `${path}.transactionType`, 'transactionType must be asking or completed_sale'));
  if (!PROPERTY_TYPES.has(record.propertyType)) errors.push(error('invalid-property-type', `${path}.propertyType`, 'propertyType must be explicit and recognized'));
  if (!isDate(record.observedAt)) errors.push(error('invalid-date', `${path}.observedAt`, 'date must use YYYY-MM-DD'));
  if (record.eventDate !== undefined && record.eventDate !== null && !isDate(record.eventDate)) errors.push(error('invalid-date', `${path}.eventDate`, 'date must use YYYY-MM-DD'));
  if (record.transactionType === 'completed_sale' && !isDate(record.eventDate)) errors.push(error('missing-event-date', `${path}.eventDate`, 'completed_sale requires eventDate'));
  if (record.transactionType === 'asking' && record.eventDate !== undefined && record.eventDate !== null) errors.push(error('unexpected-event-date', `${path}.eventDate`, 'asking observations must not have eventDate'));

  hasOnlyKeys(record.price, new Set(['amount', 'currency', 'basis']), `${path}.price`, errors);
  if (!Number.isFinite(record.price?.amount) || record.price.amount <= 0) errors.push(error('invalid-price-amount', `${path}.price.amount`, 'price amount must be a positive finite number'));
  if (!CURRENCIES.has(record.price?.currency)) errors.push(error('invalid-currency', `${path}.price.currency`, 'currency must be explicit and recognized'));
  if (!PRICE_BASES.has(record.price?.basis)) errors.push(error('invalid-price-basis', `${path}.price.basis`, 'price basis must be explicit and recognized'));

  hasOnlyKeys(record.area, new Set(['value', 'unit', 'measure']), `${path}.area`, errors);
  if (!Number.isFinite(record.area?.value) || record.area.value <= 0) errors.push(error('invalid-area-value', `${path}.area.value`, 'area value must be a positive finite number'));
  if (record.area?.unit !== 'm2') errors.push(error('invalid-area-unit', `${path}.area.unit`, 'area unit must be m2'));
  if (!AREA_MEASURES.has(record.area?.measure)) errors.push(error('invalid-area-measure', `${path}.area.measure`, 'area measure must be explicit and recognized'));

  hasOnlyKeys(record.location, new Set(['geography', 'district', 'zoneId', 'precision']), `${path}.location`, errors);
  if (!LOCATION_PRECISIONS.has(record.location?.precision)) errors.push(error('invalid-location-precision', `${path}.location.precision`, 'location precision must be explicit and recognized'));
  for (const key of ['geography', 'district', 'zoneId']) {
    if (record.location?.[key] !== undefined && !isNonEmptyString(record.location[key])) {
      errors.push(error('invalid-location-identifier', `${path}.location.${key}`, 'location identifier must be a non-empty string when present'));
    }
  }

  if (record.characteristics !== undefined) {
    if (!isObject(record.characteristics)) errors.push(error('invalid-characteristics', `${path}.characteristics`, 'characteristics must be an object when present'));
    else {
      for (const key of Object.keys(record.characteristics).sort()) {
        if (PERSONAL_DATA_KEY.test(key)) errors.push(error('personal-data-field', `${path}.characteristics.${key}`, 'personal-data field is prohibited'));
        if (!CHARACTERISTICS.has(key)) errors.push(error('unsupported-characteristic', `${path}.characteristics.${key}`, 'characteristic is not permitted by the contract'));
        else if (
          (key === 'condition' && !CONDITION_VALUES.has(record.characteristics[key])) ||
          (key !== 'condition' && (!Number.isInteger(record.characteristics[key]) || record.characteristics[key] < 0))
        ) errors.push(error('invalid-characteristic-value', `${path}.characteristics.${key}`, 'characteristic value must match the contract type and range'));
      }
    }
  }
  const rights = rightsById?.get(record.rightsId);
  if (!rights) errors.push(error('missing-rights', `${path}.rightsId`, 'rights reference is absent or not valid for intended use'));
  else if (rights.sourceId !== record.sourceId) errors.push(error('rights-source-mismatch', `${path}.sourceId`, 'sourceId must match the referenced rights record'));
  return errors;
}

export function validateObservations(records, rightsById, { intendedUse } = {}) {
  const errors = [];
  const accepted = [];
  const rejected = [];
  if (!Array.isArray(records)) {
    return { valid: false, errors: [error('invalid-records', 'observations', 'observation records must be an array')], records: accepted, rejected };
  }
  const duplicateIds = collectDuplicates(records, 'observationId');
  records.forEach((record, index) => {
    const path = recordPath('observations', record, index, 'observationId');
    const recordErrors = validateObservation(record, path, rightsById);
    if (isObject(record) && duplicateIds.has(record.observationId)) recordErrors.push(error('duplicate-observation-id', `${path}.observationId`, 'observationId must be unique'));
    if (recordErrors.length === 0) accepted.push(record);
    else rejected.push({ record, errors: sortByPath(recordErrors) });
    errors.push(...recordErrors);
  });
  return {
    valid: errors.length === 0,
    errors: sortByPath(errors),
    records: sortedRecords(accepted, 'observationId'),
    rejected: rejected.sort((left, right) => {
      const idOrder = String(left.record?.observationId ?? '').localeCompare(String(right.record?.observationId ?? ''));
      if (idOrder !== 0) return idOrder;
      return canonicalJson({ errors: left.errors, record: left.record })
        .localeCompare(canonicalJson({ errors: right.errors, record: right.record }));
    })
  };
}
