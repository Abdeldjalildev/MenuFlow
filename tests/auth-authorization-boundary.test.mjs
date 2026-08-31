import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readSource = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('login authorization is derived from trusted Firebase claims', async () => {
  const source = await readSource('src/pages/auth/Login.tsx');

  if (!source.includes("getAuthzClaims(user)")) {
    throw new Error('Login must obtain authorization from the centralized Firebase claims helper.');
  }

  if (source.includes("localStorage.setItem('userRole', 'SuperAdmin')")) {
    throw new Error('Login must not grant SuperAdmin through browser storage.');
  }

  if (source.includes("abdeldjalilkhalfa2@gmail.com")) {
    throw new Error('Login must not contain a hard-coded privileged identity.');
  }

  if (source.includes("localStorage.setItem('userRole', staffData.role)")) {
    throw new Error('Login must not derive authorization from a Firestore staff document.');
  }

  if (source.includes("localStorage.setItem('userRole', 'Admin')")) {
    throw new Error('Login must not grant Admin through browser-controlled state.');
  }
});

test('protected routes use the same centralized authorization contract', async () => {
  const source = await readSource('src/routes/ProtectedRouteProps.tsx');

  if (!source.includes("getAuthzClaims(user)")) {
    throw new Error('ProtectedRoute must use the centralized Firebase claims helper.');
  }

  if (source.includes("localStorage.getItem('userRole')")) {
    throw new Error('ProtectedRoute must never authorize from localStorage.userRole.');
  }
});
