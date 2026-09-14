import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 13.2 diagnostics module defines a bounded error taxonomy', () => {
  const source = read('functions/operationalDiagnostics.js');
  for (const category of ['authorization', 'validation', 'dependency', 'timeout', 'data_integrity', 'not_found', 'internal']) {
    assert.match(source, new RegExp(`['"]${category}['"]`));
  }
  assert.match(source, /sanitizeDiagnosticContext/);
  assert.match(source, /logDiagnostic/);
});

test('Gate 13.2 diagnostics never intentionally logs secrets or raw request payloads', () => {
  const source = read('functions/operationalDiagnostics.js');
  assert.doesNotMatch(source, /request\.data/);
  assert.doesNotMatch(source, /authorization\s*:/i);
  assert.doesNotMatch(source, /apiKey|api_key|token\s*:/i);
  assert.doesNotMatch(source, /password|secret/i);
});

test('Gate 13.2 operational notification failures use the safe diagnostic boundary', () => {
  const source = read('functions/operationalNotifications.js');
  assert.match(source, /require\(['"]\.\/operationalDiagnostics['"]\)/);
  assert.match(source, /logDiagnostic\(['"]warn['"],\s*['"]operational_notification['"]/);
  assert.doesNotMatch(source, /console\.error/);
});

test('Gate 13.2 preserves notification failure isolation', () => {
  const source = read('functions/operationalNotifications.js');
  assert.match(source, /catch\s*\(error\)[\s\S]*?return null/);
});

test('Gate 13.2 does not alter the canonical order authority boundary', () => {
  const source = read('functions/canonicalOrderCreation.js');
  assert.match(source, /onCall/);
  assert.match(source, /buildAuthoritativeOrder/);
  assert.match(source, /runTransaction/);
});
