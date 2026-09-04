import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { digestJson, validateObservations, validateRights } from './market-data/contract.mjs';

const schemaVersion = '1.0';
const fixtureDirectory = fileURLToPath(new URL('../research/market-data/fixtures/', import.meta.url));
const allowedUses = new Set(['internal_testing', 'internal_analysis']);

function error(code, path, message) {
  return { code, path, message };
}

function parseArguments(argv, { requiresOutDir = false } = {}) {
  const options = { intendedUse: 'internal_testing' };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!['--observations', '--rights', '--use', '--out-dir'].includes(flag) || value === undefined || value.startsWith('--')) {
      return { errors: [error('invalid-arguments', 'arguments', 'expected supported option-value pairs')] };
    }
    index += 1;
    if (flag === '--observations') options.observationsPath = resolve(process.cwd(), value);
    if (flag === '--rights') options.rightsPath = resolve(process.cwd(), value);
    if (flag === '--out-dir') options.outDir = resolve(process.cwd(), value);
    if (flag === '--use') options.intendedUse = value;
  }
  if (Boolean(options.observationsPath) !== Boolean(options.rightsPath)) {
    return { errors: [error('incomplete-input-pair', 'arguments', 'observations and rights paths must be supplied together')] };
  }
  if (!allowedUses.has(options.intendedUse)) {
    return { errors: [error('invalid-intended-use', 'arguments.use', 'use must be internal_testing or internal_analysis')] };
  }
  if (requiresOutDir && !options.outDir) {
    return { errors: [error('missing-out-dir', 'arguments.outDir', 'out-dir is required')] };
  }
  if (!options.observationsPath) {
    options.observationsPath = resolve(fixtureDirectory, 'synthetic-observations.json');
    options.rightsPath = resolve(fixtureDirectory, 'synthetic-rights.json');
  }
  return { options };
}

function readJson(filePath, path) {
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    return { error: error('input-read-failed', path, 'input file could not be read') };
  }
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: error('invalid-json', path, 'input must contain valid JSON') };
  }
}

export function loadAndValidate(argv, options = {}) {
  const parsed = parseArguments(argv, options);
  if (parsed.errors) return { valid: false, errors: parsed.errors, recordsRead: 0, rightsRecordsRead: 0, inputDigest: null };

  const observationsInput = readJson(parsed.options.observationsPath, 'observations');
  const rightsInput = readJson(parsed.options.rightsPath, 'rights');
  const inputErrors = [observationsInput.error, rightsInput.error].filter(Boolean);
  if (inputErrors.length > 0) return { valid: false, errors: inputErrors, recordsRead: 0, rightsRecordsRead: 0, inputDigest: null };

  if (!Array.isArray(observationsInput.value) || !Array.isArray(rightsInput.value)) {
    return {
      valid: false,
      errors: [error('unclassifiable-input', 'input', 'observations and rights inputs must both be arrays')],
      recordsRead: Array.isArray(observationsInput.value) ? observationsInput.value.length : 0,
      rightsRecordsRead: Array.isArray(rightsInput.value) ? rightsInput.value.length : 0,
      inputDigest: null
    };
  }

  const inputDigest = digestJson({ observations: observationsInput.value, rights: rightsInput.value, intendedUse: parsed.options.intendedUse });
  const rights = validateRights(rightsInput.value, { intendedUse: parsed.options.intendedUse });
  const observations = validateObservations(observationsInput.value, rights.rightsById, { intendedUse: parsed.options.intendedUse });
  const errors = [...rights.errors, ...observations.errors].sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));

  return {
    valid: errors.length === 0,
    errors,
    inputDigest,
    recordsRead: observationsInput.value.length,
    rightsRecordsRead: rightsInput.value.length,
    observations,
    outDir: parsed.options.outDir
  };
}

function validationOutput(result) {
  return {
    valid: result.valid,
    schemaVersion,
    inputDigest: result.inputDigest,
    recordsRead: result.recordsRead,
    rightsRecordsRead: result.rightsRecordsRead,
    errors: result.errors
  };
}

export function runValidationCli(argv = process.argv.slice(2)) {
  const result = loadAndValidate(argv);
  process.stdout.write(`${JSON.stringify(validationOutput(result), null, 2)}\n`);
  if (!result.valid) process.exitCode = 1;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runValidationCli();
