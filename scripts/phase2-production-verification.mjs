import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, addDoc, collection, deleteDoc } from 'firebase/firestore';

const required = ['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID', 'FIREBASE_RESTAURANT_ID'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const app = initializeApp({ apiKey: process.env.FIREBASE_API_KEY, authDomain: process.env.FIREBASE_AUTH_DOMAIN, projectId: process.env.FIREBASE_PROJECT_ID, appId: process.env.FIREBASE_APP_ID });
const auth = getAuth(app);
const db = getFirestore(app);
const restaurantId = process.env.FIREBASE_RESTAURANT_ID;
const userCredential = await signInAnonymously(auth);
const uid = userCredential.user.uid;
const orderData = { restaurantId, customerId: uid, items: [], tableNumber: 'PHASE2-CANARY', status: 'pending', totalAmount: 0 };
let orderRef;
try {
  orderRef = await addDoc(collection(db, 'restaurants', restaurantId, 'orders'), orderData);
  console.log(`PASS: anonymous customer created tenant-scoped order ${orderRef.id}`);
  try {
    await addDoc(collection(db, 'orders'), orderData);
    throw new Error('Legacy top-level order write unexpectedly succeeded');
  } catch (error) {
    if (error instanceof Error && error.message === 'Legacy top-level order write unexpectedly succeeded') throw error;
    console.log('PASS: legacy top-level customer order write is denied');
  }
} finally {
  if (orderRef) await deleteDoc(orderRef);
  await deleteUser(userCredential.user);
}
console.log('Phase 2 production customer boundary verification passed.');
