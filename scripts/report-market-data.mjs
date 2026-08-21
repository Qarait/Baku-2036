import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { buildCoverageReport, buildDuplicateReport, buildMissingnessReport, buildSafeCoverageFrame } from './market-data/reports.mjs';
import { loadAndValidate } from './validate-market-data.mjs';

const schemaVersion = '1.0';

function reportJson(filePath, report) {
  writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

export function runReportCli(argv = process.argv.slice(2)) {
  const result = loadAndValidate(argv, { requiresOutDir: true });
  if (!result.observations) {
    process.stderr.write(`${JSON.stringify({ valid: false, schemaVersion, errors: result.errors }, null, 2)}\n`);
    process.exitCode = 1;
    return result;
  }

  const reportOptions = {
    inputDigest: result.inputDigest,
    schemaVersion,
    rejectedRecords: result.observations.rejected
  };
  const reports = {
    'duplicates.json': buildDuplicateReport(result.observations.records, reportOptions),
    'missingness.json': buildMissingnessReport(result.observations.records, reportOptions),
    'coverage.json': buildCoverageReport(result.observations.records, {
      ...reportOptions,
      coverageFrame: buildSafeCoverageFrame(result.observations.records),
      rejectedCount: result.observations.rejected.length
    }),
    'summary.json': {
      schemaVersion,
      inputDigest: result.inputDigest,
      counts: {
        recordsRead: result.recordsRead,
        rightsRecordsRead: result.rightsRecordsRead,
        validRecordCount: result.observations.records.length,
        rejectedRecordCount: result.observations.rejected.length
      },
      dimensions: {
        validation: result.valid ? ['valid'] : ['invalid'],
        recordStatus: ['valid', 'rejected'],
        rights: ['recordsRead']
      },
      valid: result.valid,
      recordsRead: result.recordsRead,
      rightsRecordsRead: result.rightsRecordsRead,
      validRecordCount: result.observations.records.length,
      rejectedRecordCount: result.observations.rejected.length,
      errors: result.errors,
      limitation: 'Observed records are not automatically a representative sample of the Baku market.'
    }
  };

  mkdirSync(result.outDir, { recursive: true });
  for (const [fileName, report] of Object.entries(reports)) reportJson(resolve(result.outDir, fileName), report);
  if (!result.valid) process.exitCode = 1;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runReportCli();
