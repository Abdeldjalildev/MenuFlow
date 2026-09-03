import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-menuflow-phase5-gate2-driver';
const RESTAURANT_A = 'restaurant-a';
let testEnv;

const orderRef = (db) => doc(db, 'restaurants', RESTAURANT_A, 'orders', 'order-a');
const delivery = (uid) => testEnv.authenticatedContext(uid, {
  restaurantId: RESTAURANT_A,
  role: 'Delivery',
}).firestore();

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `restaurants/${RESTAURANT_A}/orders/order-a`), {
      restaurantId: RESTAURANT_A,
      customerId: 'customer-a',
      items: [{ recipeId: 'recipe-a', quantity: 1 }],
      tableNumber: '1',
      status: 'preparing',
      totalAmount: 1200,
      driverId: null,
      driverName: null,
      isClaimed: false,
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

test('Gate 2: concurrent driver claims are single-owner and transactional', async () => {
  const driverA = delivery('driver-a');
  const driverB = delivery('driver-b');

  const claim = async (db, uid) => runTransaction(db, async (tx) => {
    const ref = orderRef(db);
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    if (data.isClaimed && data.driverId && data.driverId !== uid) {
      throw new Error('already-claimed');
    }
    if (data.isClaimed && data.driverId === uid) return 'already-owned';
    tx.update(ref, {
      status: 'driver_claimed',
      driverId: uid,
      driverName: uid,
      isClaimed: true,
      updatedAt: new Date(),
    });
    return 'claimed';
  });

  const results = await Promise.allSettled([
    claim(driverA, 'driver-a'),
    claim(driverB, 'driver-b'),
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);

  const winner = (await getDoc(orderRef(driverA))).data();
  assert.equal(winner.status, 'driver_claimed');
  assert.ok(['driver-a', 'driver-b'].includes(winner.driverId));
  assert.equal(winner.isClaimed, true);

  await assertFails(runTransaction(driverA, async (tx) => {
    const ref = orderRef(driverA);
    const snapshot = await tx.get(ref);
    tx.update(ref, {
      status: 'driver_claimed',
      driverId: winner.driverId === 'driver-a' ? 'driver-b' : 'driver-a',
      driverName: 'other',
      isClaimed: true,
      updatedAt: new Date(),
    });
    return snapshot;
  }));
  await assertSucceeds(getDoc(orderRef(driverA)));
});
