import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const waiter = read('src/pages/waiter/WaiterExperience.tsx');
const provider = read('src/context/MenuProvider.tsx');
const grid = read('src/components/customer/MenuGrid.tsx');

test('Gate 10.2: waiter reads the complete menu from the claimed tenant', () => {
  assert.match(waiter, /collection\(db, 'restaurants', restaurantId, 'menuItems'\)/);
  assert.match(waiter, /onSnapshot\(q/);
  assert.match(waiter, /setMenuItems\(snap\.docs\.map/);
  assert.doesNotMatch(waiter, /defaultItems/);
});

test('Gate 10.2: waiter reuses the established menu and category components', () => {
  assert.match(waiter, /import \{ MenuGrid \} from .*customer\/MenuGrid/);
  assert.match(waiter, /import \{ CategoryTabs \} from .*customer\/CategoryTabs/);
  assert.match(waiter, /<MenuGrid/);
  assert.match(waiter, /<CategoryTabs/);
});

test('Gate 10.2: Arabic, English and French are supported with RTL for Arabic', () => {
  assert.match(waiter, /type Lang = 'ar' \| 'en' \| 'fr'/);
  assert.match(waiter, /option value="ar"/);
  assert.match(waiter, /option value="en"/);
  assert.match(waiter, /option value="fr"/);
  assert.match(waiter, /dir=\{lang === 'ar' \? 'rtl' : 'ltr'\}/);
});

test('Gate 10.2: waiter menu displays catalog prices without creating price authority', () => {
  assert.match(grid, /const originalPrice = Number\(item\.price \|\| 0\)/);
  assert.match(waiter, /items = Object\.entries\(cart\)[\s\S]*menuItemId, quantity/);
  assert.doesNotMatch(waiter, /totalAmount:/);
  assert.doesNotMatch(waiter, /price: .*menuItems/);
});

test('Gate 10.2: unavailable or empty menu state is explicit and no demo fallback remains', () => {
  assert.match(waiter, /filteredItems\.length \?/);
  assert.match(waiter, /t\.noMenu/);
  assert.doesNotMatch(provider, /defaultItems/);
  assert.match(provider, /setMenuItems\(dbItems\)/);
});

test('Gate 10.2: waiter submission uses the Phase 9 canonical createOrder authority', () => {
  assert.match(waiter, /httpsCallable\(functions, 'createOrder'\)/);
  assert.match(waiter, /orderSource: 'waiter'/);
  assert.match(waiter, /restaurantId/);
  assert.match(waiter, /tableNumber/);
  assert.match(waiter, /orderNumber/);
});

console.log('Phase 10 Gate 2 waiter menu contract: 6/6 PASS');
