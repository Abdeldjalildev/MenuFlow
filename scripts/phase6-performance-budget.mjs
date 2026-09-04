import { readFile } from 'node:fs/promises';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');
const MAX_INITIAL_JS_BYTES = 400 * 1024;
const MAX_TOTAL_JS_BYTES = 3 * 1024 * 1024;

async function collectFiles(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(path, files);
    else files.push(path);
  }
  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const html = await readFile(join(distDir, 'index.html'), 'utf8');
const initialAssetNames = [...html.matchAll(/(?:src|href)=["'](?:\.\/)?assets\/([^"']+)["']/g)].map((match) => match[1]);
const initialAssetSet = new Set(initialAssetNames);
const files = await collectFiles(assetsDir);
const records = await Promise.all(files.map(async (path) => ({
  name: path.slice(assetsDir.length + 1),
  bytes: (await stat(path)).size,
})));

const javascript = records.filter(({ name }) => name.endsWith('.js'));
const initialJavaScriptBytes = javascript
  .filter(({ name }) => initialAssetSet.has(name))
  .reduce((sum, record) => sum + record.bytes, 0);
const totalJavaScriptBytes = javascript.reduce((sum, record) => sum + record.bytes, 0);

const failures = [];
if (initialJavaScriptBytes > MAX_INITIAL_JS_BYTES) {
  failures.push(`Initial JavaScript ${formatBytes(initialJavaScriptBytes)} exceeds ${formatBytes(MAX_INITIAL_JS_BYTES)}.`);
}
if (totalJavaScriptBytes > MAX_TOTAL_JS_BYTES) {
  failures.push(`Total JavaScript ${formatBytes(totalJavaScriptBytes)} exceeds ${formatBytes(MAX_TOTAL_JS_BYTES)}.`);
}

console.log('Phase 6 performance budget');
console.log('==========================');
console.log(`Initial JavaScript: ${formatBytes(initialJavaScriptBytes)} / ${formatBytes(MAX_INITIAL_JS_BYTES)}`);
console.log(`All JavaScript assets: ${formatBytes(totalJavaScriptBytes)} / ${formatBytes(MAX_TOTAL_JS_BYTES)}`);

if (failures.length > 0) {
  console.error('');
  console.error('Performance budget FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Performance budget: PASS');
}
