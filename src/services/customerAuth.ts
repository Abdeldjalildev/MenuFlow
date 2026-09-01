import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Customer identity is Firebase Auth based. The browser may remember UI state,
 * but authorization identity is always the Firebase UID.
 */
export const ensureAnonymousCustomer = async (): Promise<User> => {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
};

export const subscribeToAuthUser = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
