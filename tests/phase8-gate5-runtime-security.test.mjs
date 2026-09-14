import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-menuflow-phase8-security';
const RESTAURANT_A = 'restaurant-a';
const RESTAURANT_B = 'restaurant-b';
const ADMIN_UID = 'admin-a';
const OTHER_ADMIN_UID = 'admin-b';

let testEnv;

const restaurantDoc = (db, restaurantId) => doc(db, 'restaurants', restaurantId);
const tenantDoc = (db, restaurantId, collectionName, documentId) =>
  doc(db, 'restaurants', restaurantId, collectionName, documentId);

const adminContext = (uid, restaurantId = RESTAURANT_A) =>
  testEnv.authenticatedContext(uid, { role: 'Admin', restaurantId }).firestore();

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(restaurantDoc(db, RESTAURANT_A), { name: 'Restaurant A' }),
      setDoc(restaurantDoc(db, RESTAURANT_B), { name: 'Restaurant B' }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational'), { restaurantId: RESTAURANT_A }),
      setDoc(tenantDoc(db, RESTAURANT_B, 'settings', 'operational'), { restaurantId: RESTAURANT_B }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'admins', ADMIN_UID), {
        adminUid: ADMIN_UID,
        createdAt: new Date(),
        createdBy: 'super-admin',
      }),
      setDoc(tenantDoc(db, RESTAURANT_B, 'admins', ADMIN_UID), {
        adminUid: ADMIN_UID,
        createdAt: new Date(),
        createdBy: 'super-admin',
      }),
      setDoc(tenantDoc(db, RESTAURANT_B, 'admins', OTHER_ADMIN_UID), {
        adminUid: OTHER_ADMIN_UID,
        createdAt: new Date(),
        createdBy: 'super-admin',
      }),
    ]);
  });
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

after(async () => {
  await testEnv.cleanup();
});

test('Admin membership grants access to every explicitly assigned restaurant', async () => {
  const db = adminContext(ADMIN_UID);

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_B, 'settings', 'operational')));
});

test('Admin membership denies access to a restaurant without membership even when the claim points elsewhere', async () => {
  const db = adminContext(ADMIN_UID);

  await assertFails(getDoc(tenantDoc(db, 'restaurant-c', 'settings', 'operational')));
});

test('Admin membership is the authoritative tenant boundary after primary-claim mismatch', async () => {
  const db = adminContext(ADMIN_UID, 'restaurant-c');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_B, 'settings', 'operational')));
  await assertFails(getDoc(tenantDoc(db, 'restaurant-c', 'settings', 'operational')));
});

test('An Admin cannot access another Admin\'s membership record', async () => {
  const db = adminContext(ADMIN_UID);

  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'admins', OTHER_ADMIN_UID)));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_B, 'admins', ADMIN_UID)));
});
