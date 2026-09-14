import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { strict as assert } from 'node:assert';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const readSource = (relativePath) => readFileSync(join(rootDir, relativePath), 'utf8');

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    failed++;
  }
};

console.log('\n=== Phase 8 — Gate 8.2: Multi-Admin / Multi-Restaurant Authorization ===\n');

// 1. Type definitions
test('AdminMembership interface is defined', () => {
  const source = readSource('src/types/firestore.ts');
  assert.match(source, /export interface AdminMembership/);
  assert.match(source, /adminUid: string/);
  assert.match(source, /createdAt: FirestoreDate/);
  assert.match(source, /createdBy: string/);
});

test('RestaurantMembership interface exists', () => {
  const source = readSource('src/types/firestore.ts');
  assert.match(source, /export interface RestaurantMembership/);
  assert.match(source, /actorUid: string/);
  assert.match(source, /restaurantId: string/);
});

test('AdminActor has memberships array', () => {
  const source = readSource('src/types/firestore.ts');
  assert.match(source, /interface AdminActor/);
  assert.match(source, /memberships: AdminMembership\[\]/);
});

// 2. Functions
test('getAdminMemberships callable is defined', () => {
  const source = readSource('functions/index.js');
  assert.match(source, /exports\.getAdminMemberships/);
});

test('addAdminMembership callable is defined', () => {
  const source = readSource('functions/index.js');
  assert.match(source, /exports\.addAdminMembership/);
});

test('removeAdminMembership callable is defined', () => {
  const source = readSource('functions/index.js');
  assert.match(source, /exports\.removeAdminMembership/);
});

test('isAdminOfRestaurant helper exists', () => {
  const source = readSource('functions/index.js');
  assert.match(source, /async function isAdminOfRestaurant/);
});

test('membership path uses admins subcollection', () => {
  const source = readSource('functions/index.js');
  assert.match(source, /restaurants\/\$\{restaurantId\}\/admins\/\$\{adminUid\}/);
});

// 3. Authorization logic
test('addAdminMembership requires SuperAdmin', () => {
  const source = readSource('functions/index.js');
  const addSection = source.slice(source.indexOf('exports.addAdminMembership'));
  assert.match(addSection, /caller\.role !== 'SuperAdmin'[\s\S]*throw new HttpsError\('permission-denied'/);
});

test('removeAdminMembership requires SuperAdmin', () => {
  const source = readSource('functions/index.js');
  const removeSection = source.slice(source.indexOf('exports.removeAdminMembership'));
  assert.match(removeSection, /caller\.role !== 'SuperAdmin'[\s\S]*throw new HttpsError\('permission-denied'/);
});

test('isAdminOfRestaurant checks SuperAdmin first', () => {
  const source = readSource('functions/index.js');
  const helperSection = source.slice(source.indexOf('async function isAdminOfRestaurant'));
  assert.match(helperSection, /callerToken\?\.role === 'SuperAdmin'\) return true/);
});

test('isAdminOfRestaurant checks primary restaurant claim', () => {
  const source = readSource('functions/index.js');
  const helperSection = source.slice(source.indexOf('async function isAdminOfRestaurant'));
  assert.match(helperSection, /callerToken\?\.restaurantId === restaurantId\) return true/);
});

test('isAdminOfRestaurant checks AdminMembership subcollection', () => {
  const source = readSource('functions/index.js');
  const helperSection = source.slice(source.indexOf('async function isAdminOfRestaurant'));
  assert.match(helperSection, /membershipSnap\.exists/);
});

test('provisionAuthzClaims creates AdminMembership for Admin role', () => {
  const source = readSource('functions/index.js');
  const provisionSection = source.slice(source.indexOf('exports.provisionAuthzClaims'));
  assert.match(provisionSection, /role === 'Admin'[\s\S]*restaurants\/\$\{restaurantId\}\/admins/);
});

test('transitionOrder supports Admin membership check', () => {
  const source = readSource('functions/index.js');
  assert.match(source, /await isAdminOfRestaurant\(auth\.uid, targetRestaurant, auth\.token\)/);
});

// 4. Frontend service
test('authClaims exports getAdminMemberships', () => {
  const source = readSource('src/services/authClaims.ts');
  assert.match(source, /export const getAdminMemberships/);
});

test('authClaims exports isAdminOfRestaurant', () => {
  const source = readSource('src/services/authClaims.ts');
  assert.match(source, /export const isAdminOfRestaurant/);
});

test('AdminMembership interface exported from authClaims', () => {
  const source = readSource('src/services/authClaims.ts');
  assert.match(source, /export interface AdminMembership/);
});

// 5. Firestore rules
test('firestore.rules has admins subcollection match', () => {
  const source = readSource('firestore.rules');
  assert.match(source, /match \/admins\/\{adminUid\}/);
});

test('admins read requires SuperAdmin or own Admin record', () => {
  const source = readSource('firestore.rules');
  const rulesSection = source.slice(source.indexOf('match /admins/{adminUid}'));
  assert.match(rulesSection, /allow read: if isSuperAdmin\(\)/);
  assert.match(rulesSection, /allow read: if signedIn\(\) && role\(\) == 'Admin' && adminUid == request\.auth\.uid/);
});

test('admins write requires SuperAdmin', () => {
  const source = readSource('firestore.rules');
  const rulesSection = source.slice(source.indexOf('match /admins/{adminUid}'));
  assert.match(rulesSection, /allow create: if isSuperAdmin\(\)/);
  assert.match(rulesSection, /allow delete: if isSuperAdmin\(\)/);
  assert.match(rulesSection, /allow update: if false/);
});

// 6. Firestore paths
test('firestorePaths includes admins path', () => {
  const source = readSource('src/services/firestorePaths.ts');
  assert.match(source, /admins:\s*\{/);
  assert.match(source, /collection: \(restaurantId: RestaurantId\) => `.*restaurant.*admins`/);
});

// 7. Audit logging
test('addAdminMembership writes to admin_membership_audit', () => {
  const source = readSource('functions/index.js');
  const addSection = source.slice(source.indexOf('exports.addAdminMembership'));
  assert.match(addSection, /admin_membership_audit/);
  assert.match(addSection, /action: 'add'/);
});

test('removeAdminMembership writes to admin_membership_audit', () => {
  const source = readSource('functions/index.js');
  const removeSection = source.slice(source.indexOf('exports.removeAdminMembership'));
  assert.match(removeSection, /admin_membership_audit/);
  assert.match(removeSection, /action: 'remove'/);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
