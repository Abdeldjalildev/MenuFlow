import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = process.cwd();
const SOURCE_DIRS = ['src', 'functions', 'scripts'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.css', '.html']);
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);
const FORBIDDEN_SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const FORBIDDEN_CLIENT_AI_PATTERNS = [
  /generativelanguage\.googleapis\.com/i,
  /VITE_API_KEY/i,
  /VITE_GEMINI/i,
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

async function readRepositoryText() {
  const files = [];
  for (const directory of SOURCE_DIRS) files.push(...await collectFiles(join(ROOT, directory)));
  files.push(join(ROOT, 'README.md'), join(ROOT, 'AGENTS.md'));
  return Promise.all(files.map(async (path) => ({
    path: relative(ROOT, path),
    content: await readFile(path, 'utf8'),
  })));
}

async function hasExactFilename(directory, expectedName) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.some((entry) => entry.isFile() && entry.name === expectedName);
}

test('Phase 7 Gate 5: approved normalized component filenames exist', async () => {
  const required = [
    ['src/components/customer', 'DeliveryForm.tsx'],
    ['src/components/customer', 'OrderStatus.tsx'],
    ['src/components/kitchen', 'KitchenDashboard.tsx'],
    ['src/components/merchant/pages', 'Expenses.tsx'],
    ['src/components/merchant/pages', 'WasteLog.tsx'],
  ];
  for (const [directory, file] of required) {
    assert.equal(await hasExactFilename(join(ROOT, directory), file), true, `${directory}/${file} is missing`);
  }
});

test('Phase 7 Gate 5: deprecated filename spellings are absent', async () => {
  const legacy = [
    ['src/components/customer', 'DeliveryuForm.tsx'],
    ['src/components/customer', 'orderStatus.tsx'],
    ['src/components/kitchen', 'kitchenDashboard.tsx'],
    ['src/components/merchant/pages', 'Exepenses.tsx'],
    ['src/components/merchant/pages', 'Wastelog.tsx'],
  ];
  for (const [directory, file] of legacy) {
    assert.equal(await hasExactFilename(join(ROOT, directory), file), false, `${directory}/${file} still exists`);
  }
});

test('Phase 7 Gate 5: no high-confidence mojibake markers remain in source text', async () => {
  const files = await readRepositoryText();
  const markers = /(?:Ã.|Â.|â.|ð.|�)/u;
  const matches = files.filter(({ content }) => markers.test(content)).map(({ path }) => path);
  assert.deepEqual(matches, []);
});

test('Phase 7 Gate 5: privileged AI credentials and direct browser provider endpoints remain absent', async () => {
  const files = await readRepositoryText();
  const violations = [];
  for (const { path, content } of files) {
    if (FORBIDDEN_SECRET_PATTERNS.some((pattern) => pattern.test(content))) violations.push(`${path}: possible private key material`);
    if (path.startsWith('src/') && FORBIDDEN_CLIENT_AI_PATTERNS.some((pattern) => pattern.test(content))) violations.push(`${path}: forbidden client AI/provider marker`);
  }
  assert.deepEqual(violations, []);
});

test('Phase 7 Gate 5: README is MenuFlow-specific', async () => {
  const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /^# MenuFlow/m);
  assert.match(readme, /Architecture/);
  assert.match(readme, /Firestore/);
  assert.match(readme, /AI Security/);
  assert.match(readme, /Local Development/);
  assert.doesNotMatch(readme, /Vite \+ React template/i);
  assert.doesNotMatch(readme, /Getting Started with Vite/i);
});

test('Phase 7 Gate 5: Gate 1–4 documentation records are present', async () => {
  const files = [
    'docs/phase7-gate1-encoding-forensics.md',
    'docs/phase7-gate2-safe-encoding-repair.md',
    'docs/phase7-gate3-naming-normalization.md',
    'docs/phase7-gate4-architecture.md',
  ];
  for (const file of files) await readFile(join(ROOT, file), 'utf8');
});

test('Phase 7 Gate 5: root test command includes the final quality barrier', async () => {
  const packageJson = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  assert.match(packageJson.scripts.test, /test:phase7:gate5/);
  assert.equal(packageJson.scripts['test:phase7:gate5'], 'node --test tests/phase7-gate5-quality-barrier.test.mjs');
});
