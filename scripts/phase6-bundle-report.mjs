import { readFile } from 'node:fs/promises';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');

async function collectFiles(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(path, files);
    else files.push(path);
  }
  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB (${(bytes / 1024 / 1024).toFixed(2)} MiB)`;
}

const html = await readFile(join(distDir, 'index.html'), 'utf8');
const initialAssetNames = [...html.matchAll(/(?:src|href)=["'](?:\.\/)?assets\/([^"']+)["']/g)].map((match) => match[1]);
const initialAssetSet = new Set(initialAssetNames);
const files = await collectFiles(assetsDir);
const records = await Promise.all(files.map(async (path) => {
  const bytes = (await stat(path)).size;
  const name = path.slice(assetsDir.length + 1);
  return { name, bytes, initial: initialAssetSet.has(name) };
}));

const javascript = records.filter(({ name }) => name.endsWith('.js')).sort((a, b) => b.bytes - a.bytes);
const initialJavaScript = javascript.filter(({ initial }) => initial);
const totalJavaScript = javascript.reduce((sum, record) => sum + record.bytes, 0);
const initialJavaScriptBytes = initialJavaScript.reduce((sum, record) => sum + record.bytes, 0);

console.log('Phase 6 bundle report');
console.log('=====================');
console.log(`Initial JavaScript: ${formatBytes(initialJavaScriptBytes)}`);
console.log(`All JavaScript assets: ${formatBytes(totalJavaScript)}`);
console.log('');
console.log('Largest JavaScript assets:');
for (const record of javascript.slice(0, 10)) {
  console.log(`- ${record.name}: ${formatBytes(record.bytes)}${record.initial ? ' [initial]' : ''}`);
}
console.log('');
console.log('Initial JavaScript assets:');
for (const record of initialJavaScript) {
  console.log(`- ${record.name}: ${formatBytes(record.bytes)}`);
}
