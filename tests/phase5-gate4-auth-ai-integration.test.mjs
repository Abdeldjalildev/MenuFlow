import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';

const PROJECT_ID = 'demo-menuflow-phase5-gate4';
const REGION = 'us-central1';
const RESTAURANT_A = 'restaurant-a';
const RESTAURANT_B = 'restaurant-b';

let adminApp;
let adminAuth;
const clientApps = [];

const createClient = (name) => {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: PROJECT_ID, appId: `gate4-${name}` }, name);
  clientApps.push(app);
  const auth = getAuth(app);
  const functions = getFunctions(app, REGION);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return { app, auth, functions };
};

const callAI = (functions, data) => httpsCallable(functions, 'aiAssistant')(data);

const createStaffClient = async (name, role, restaurantId = RESTAURANT_A) => {
  const user = await adminAuth.createUser({ displayName: name });
  const token = await adminAuth.createCustomToken(user.uid, { role, restaurantId });
  const client = createClient(name);
  await signInWithCustomToken(client.auth, token);
  return client;
};

const assertCallableError = async (promise, code) => {
  await assert.rejects(promise, (error) => error.code === `functions/${code}`);
};

before(async () => {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.GCLOUD_PROJECT = PROJECT_ID;
  adminApp = getAdminApps().length ? getAdminApps()[0] : initializeAdminApp({ projectId: PROJECT_ID });
  adminAuth = getAdminAuth(adminApp);
});

after(async () => {
  await Promise.all(clientApps.map(deleteApp));
  await adminApp?.delete();
});

test('Gate 4: unauthenticated AI callers are rejected before any provider work', async () => {
  const client = createClient('unauthenticated');
  await assertCallableError(
    callAI(client.functions, { restaurantId: RESTAURANT_A, userPrompt: 'hello', menuItems: [] }),
    'unauthenticated',
  );
});

test('Gate 4: anonymous customers are accepted by the AI authorization boundary but invalid input is rejected before secret access', async () => {
  const client = createClient('anonymous');
  await signInAnonymously(client.auth);
  await assertCallableError(
    callAI(client.functions, { restaurantId: RESTAURANT_A, userPrompt: 'hello', menuItems: null }),
    'invalid-argument',
  );
});

test('Gate 4: every tenant staff role is authorized only for its own tenant', async () => {
  for (const role of ['Admin', 'Kitchen', 'Cashier', 'Delivery']) {
    const client = await createStaffClient(`role-${role.toLowerCase()}`, role);
    await assertCallableError(
      callAI(client.functions, { restaurantId: RESTAURANT_B, userPrompt: 'hello', menuItems: [] }),
      'permission-denied',
    );
    await assertCallableError(
      callAI(client.functions, { restaurantId: RESTAURANT_A, userPrompt: '', menuItems: [] }),
      'invalid-argument',
    );
  }
});

test('Gate 4: SuperAdmin may explicitly target another tenant while validation remains server-side', async () => {
  const client = await createStaffClient('super-admin', 'SuperAdmin', RESTAURANT_A);
  await assertCallableError(
    callAI(client.functions, { restaurantId: RESTAURANT_B, userPrompt: '', menuItems: [] }),
    'invalid-argument',
  );
});

test('Gate 4: malformed authorization claims are denied', async () => {
  const user = await adminAuth.createUser({ displayName: 'invalid-claims' });
  const token = await adminAuth.createCustomToken(user.uid, { role: 'cashier', restaurantId: RESTAURANT_A });
  const client = createClient('invalid-claims');
  await signInWithCustomToken(client.auth, token);
  await assertCallableError(
    callAI(client.functions, { restaurantId: RESTAURANT_A, userPrompt: 'hello', menuItems: [] }),
    'permission-denied',
  );
});

test('Gate 4: AI rate-limit mapping and validation remain part of the trusted callable contract', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../functions/index.js', import.meta.url), 'utf8'));
  assert.match(source, /AI_RATE_LIMITED/);
  assert.match(source, /resource-exhausted/);
  assert.match(source, /if \(!isNonEmptyString\(userPrompt\) \|\| !Array\.isArray\(menuItems\)\)/);
  assert.match(source, /assertAIAuthorization\(request, restaurantId\)/);
  assert.ok(source.indexOf('assertAIAuthorization(request, restaurantId)') < source.indexOf('geminiApiKey.value()'));
});
