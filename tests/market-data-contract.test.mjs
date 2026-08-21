import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRights,
  validateObservations,
  canonicalJson,
  digestJson
} from '../scripts/market-data/contract.mjs';

import {
  buildDuplicateReport,
  buildMissingnessReport,
  buildCoverageReport
} from '../scripts/market-data/reports.mjs';

const intendedUse = 'internal_testing';

const validRights = {
  schemaVersion: '1.0',
  rightsId: 'rights-synthetic-fixture',
  sourceId: 'source-synthetic-fixture',
  sourceName: 'Synthetic fixture source',
  acquisitionBasis: 'synthetic',
  allowedUses: [intendedUse],
  rawRedistribution: 'not_applicable',
  derivedPublication: 'not_applicable',
  retention: 'test-only',
  personalDataHandling: 'prohibited',
  reviewedAt: '2026-08-21',
  reviewer: 'release3-governance',
  status: 'approved_for_fixture_testing'
};

const validObservation = {
  schemaVersion: '1.0',
  observationId: 'observation-synthetic-001',
  sourceId: validRights.sourceId,
  sourceRecordId: 'record-synthetic-001',
  rightsId: validRights.rightsId,
  transactionType: 'asking',
  observedAt: '2026-01-15',
  propertyType: 'apartment',
  price: { amount: 250000, currency: 'AZN', basis: 'total' },
  area: { value: 100, unit: 'm2', measure: 'gross' },
  location: { geography: 'synthetic-zone-a', precision: 'zone' },
  characteristics: { bedrooms: 3 }
};

function rightsResult(records = [validRights], use = intendedUse) {
  return validateRights(records, { intendedUse: use });
}

function observationResult(records, rights = rightsResult().rightsById) {
  return validateObservations(records, rights, { intendedUse });
}

test('accepts a valid synthetic observation with approved rights', () => {
  const result = observationResult([validObservation]);

  assert.equal(result.valid, true);
  assert.deepEqual(result.records, [validObservation]);
  assert.deepEqual(result.rejected, []);
});

test('rejects a completed sale without eventDate with missing-event-date', () => {
  const sale = { ...validObservation, transactionType: 'completed_sale' };
  const result = observationResult([sale]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'missing-event-date'));
});

test('canonicalizes object key order before digesting', () => {
  const first = { b: 2, nested: { z: 3, a: 1 }, a: 1 };
  const second = { a: 1, nested: { a: 1, z: 3 }, b: 2 };

  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(digestJson(first), digestJson(second));
});

test('rejects observations without a rights reference', () => {
  const result = observationResult([{ ...validObservation, rightsId: 'missing-rights' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'missing-rights'));
});

test('rejects area values whose unit is not m2', () => {
  const result = observationResult([{ ...validObservation, area: { ...validObservation.area, unit: 'sqft' } }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'invalid-area-unit'));
});

test('rejects unsupported transaction types', () => {
  const result = observationResult([{ ...validObservation, transactionType: 'forecast' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'invalid-transaction-type'));
});

test('rejects personal-data fields in an observation payload', () => {
  const result = observationResult([{ ...validObservation, seller: 'Synthetic Seller' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'personal-data-field'));
});

test('rejects duplicate observation IDs', () => {
  const duplicate = { ...validObservation, sourceRecordId: 'record-synthetic-002' };
  const result = observationResult([validObservation, duplicate]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected.some(({ errors }) => errors.some((error) => error.code === 'duplicate-observation-id')));
});

test('rejects rights that do not allow the intended use', () => {
  const rights = { ...validRights, allowedUses: ['internal_analysis'] };
  const result = rightsResult([rights], intendedUse);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'intended-use-not-allowed'));
});

test('reports exact duplicate groups by source record key', () => {
  const records = [
    validObservation,
    { ...validObservation, observationId: 'observation-synthetic-002' },
    { ...validObservation, observationId: 'observation-synthetic-003', sourceRecordId: 'record-synthetic-003' }
  ];
  const report = buildDuplicateReport(records, { inputDigest: 'digest-synthetic', schemaVersion: '1.0' });

  assert.equal(report.duplicateGroupCount, 1);
  assert.deepEqual(report.groups[0], {
    kind: 'exact-source-record',
    key: 'source-synthetic-fixture:record-synthetic-001',
    observationIds: ['observation-synthetic-001', 'observation-synthetic-002']
  });
});

test('reports omitted optional fields as missingness', () => {
  const record = { ...validObservation };
  delete record.characteristics;
  const report = buildMissingnessReport([record], {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: []
  });

  assert.equal(report.fields['characteristics'].missing, 1);
});

test('reports period, transaction type, and geography coverage counts', () => {
  const records = [
    validObservation,
    {
      ...validObservation,
      observationId: 'observation-synthetic-002',
      transactionType: 'completed_sale',
      eventDate: '2026-02-10',
      observedAt: '2026-02-11',
      location: { geography: 'synthetic-zone-b', precision: 'zone' }
    }
  ];
  const report = buildCoverageReport(records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    coverageFrame: {
      periods: ['2026-01', '2026-02'],
      geographies: ['synthetic-zone-a', 'synthetic-zone-b']
    },
    rejectedCount: 0
  });

  assert.deepEqual(report.transactionTypeCounts, { asking: 1, completed_sale: 1 });
  assert.deepEqual(report.periodCounts, { '2026-01': 1, '2026-02': 1 });
  assert.deepEqual(report.geographyCounts, { 'synthetic-zone-a': 1, 'synthetic-zone-b': 1 });
});
