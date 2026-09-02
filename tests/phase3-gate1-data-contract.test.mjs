import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const recipesPath = new URL('../src/components/merchant/pages/Recipes.tsx', import.meta.url);
const inventoryPath = new URL('../src/components/merchant/pages/Inventory.tsx', import.meta.url);
let recipesSource;
let inventorySource;

before(async () => {
  recipesSource = await readFile(recipesPath, 'utf8');
  inventorySource = await readFile(inventoryPath, 'utf8');
});

test('Gate 1: merchant recipe runtime uses only canonical tenant-scoped collections', () => {
  assert.match(recipesSource, /collection\(db, 'restaurants', restaurantId, 'recipes'\)/);
  assert.match(recipesSource, /collection\(db, 'restaurants', restaurantId, 'inventory'\)/);
  assert.match(recipesSource, /collection\(db, 'restaurants', restaurantId, 'categories'\)/);
  assert.match(recipesSource, /collection\(db, 'restaurants', restaurantId, 'menuItems'\)/);
  assert.doesNotMatch(recipesSource, /collection\(db,\s*'(recipes|inventory|categories|menu)'\s*\)/);
  assert.doesNotMatch(recipesSource, /doc\(db,\s*'(recipes|inventory|categories|menu)'\s*,/);
});

test('Gate 1: recipe-to-inventory references are stable document IDs', () => {
  assert.match(recipesSource, /interface RecipeIngredient \{ inventoryItemId: string; quantity: number; \}/);
  assert.match(recipesSource, /recipeIngredients/);
  assert.match(recipesSource, /inventoryItemId/);
});

test('Gate 1: recipe publication and updates target canonical menuItems', () => {
  assert.match(recipesSource, /doc\(db, 'restaurants', restaurantId, 'menuItems', targetRecipe\.menuItemId\)/);
  assert.match(recipesSource, /addDoc\(collection\(db, 'restaurants', restaurantId, 'menuItems'\)/);
  assert.match(recipesSource, /updateDoc\(doc\(db, 'restaurants', restaurantId, 'menuItems', recipe\.menuItemId\)/);
  assert.match(recipesSource, /deleteDoc\(doc\(db, 'restaurants', restaurantId, 'menuItems', recipe\.menuItemId\)/);
});

test('Gate 1: inventory runtime reads and writes use the canonical tenant path', () => {
  assert.match(inventorySource, /collection\(db, 'restaurants', restaurantId, 'inventory'\)/);
  assert.match(inventorySource, /doc\(db, 'restaurants', restaurantId, 'inventory',/);
  assert.doesNotMatch(inventorySource, /collection\(db,\s*'inventory'\s*\)/);
  assert.doesNotMatch(inventorySource, /doc\(db,\s*'inventory'\s*,/);
});
