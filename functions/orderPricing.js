const { HttpsError } = require('firebase-functions/v2/https');

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) throw new HttpsError('invalid-argument', 'Order item quantity must be a positive integer at most 100.');
  return quantity;
}
function parsePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) throw new HttpsError('failed-precondition', 'Menu item has an invalid authoritative price.');
  return price;
}
function getModifierCatalog(menuData) {
  const raw = menuData?.modifiers;
  if (!Array.isArray(raw)) return new Map();
  const catalog = new Map();
  for (const modifier of raw) {
    if (!modifier || typeof modifier !== 'object' || !isNonEmptyString(modifier.id)) continue;
    if (catalog.has(modifier.id)) throw new HttpsError('failed-precondition', 'Menu item contains duplicate modifier IDs.');
    const minSelections = Number.isInteger(modifier.minSelections) && modifier.minSelections >= 0 ? modifier.minSelections : (modifier.required === true ? 1 : 0);
    const maxSelections = Number.isInteger(modifier.maxSelections) && modifier.maxSelections > 0 ? modifier.maxSelections : 1;
    if (minSelections > maxSelections || maxSelections > 20) throw new HttpsError('failed-precondition', 'Menu modifier selection constraints are invalid.');
    catalog.set(modifier.id, { id: modifier.id, name: modifier.name, price: parsePrice(modifier.price ?? 0), groupId: isNonEmptyString(modifier.groupId) ? modifier.groupId : modifier.id, required: modifier.required === true || minSelections > 0, multiple: modifier.multiple === true, minSelections, maxSelections });
  }
  return catalog;
}
function normalizeRequestedModifiers(rawModifiers, menuData) {
  if (rawModifiers == null) return [];
  if (!Array.isArray(rawModifiers) || rawModifiers.length > 20) throw new HttpsError('invalid-argument', 'Modifiers must be an array containing at most 20 entries.');
  const catalog = getModifierCatalog(menuData);
  const selected = rawModifiers.map(raw => {
    const id = typeof raw === 'string' ? raw : raw?.id;
    if (!isNonEmptyString(id) || !catalog.has(id)) throw new HttpsError('invalid-argument', 'Order contains an invalid menu modifier.');
    return catalog.get(id);
  });
  const selectedIds = new Set();
  const groupCounts = new Map();
  for (const modifier of selected) {
    if (selectedIds.has(modifier.id)) throw new HttpsError('invalid-argument', 'Duplicate menu modifiers are not allowed.');
    selectedIds.add(modifier.id);
    const count = (groupCounts.get(modifier.groupId) || 0) + 1;
    groupCounts.set(modifier.groupId, count);
    if (!modifier.multiple && count > 1) throw new HttpsError('invalid-argument', 'Only one modifier may be selected from this group.');
    if (count > modifier.maxSelections) throw new HttpsError('invalid-argument', 'Too many modifiers selected from this group.');
  }
  const groups = new Map();
  for (const modifier of catalog.values()) {
    if (!groups.has(modifier.groupId)) groups.set(modifier.groupId, []);
    groups.get(modifier.groupId).push(modifier);
  }
  for (const [groupId, modifiers] of groups) {
    const count = groupCounts.get(groupId) || 0;
    const requiredMin = Math.max(...modifiers.map(m => m.minSelections));
    if (count < requiredMin) throw new HttpsError('invalid-argument', `Required modifiers are missing for group ${groupId}.`);
  }
  return selected.map(modifier => ({ id: modifier.id, name: modifier.name, price: modifier.price, ...(modifier.groupId ? { groupId: modifier.groupId } : {}) }));
}
function buildAuthoritativeOrder(items, menuDataById) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw new HttpsError('invalid-argument', 'Order items must contain between 1 and 50 items.');
  let subtotal = 0;
  const authoritativeItems = items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpsError('invalid-argument', 'Invalid order item.');
    const menuItemId = item.menuItemId;
    if (!isNonEmptyString(menuItemId)) throw new HttpsError('invalid-argument', 'Each order item requires menuItemId.');
    const menuData = menuDataById.get(menuItemId);
    if (!menuData) throw new HttpsError('not-found', `Menu item ${menuItemId} does not exist in this restaurant.`);
    if (menuData.restaurantId && menuData.restaurantId !== menuData.__restaurantId) throw new HttpsError('permission-denied', 'Menu item tenant identity does not match the restaurant path.');
    const quantity = parseQuantity(item.quantity ?? item.qty ?? 1);
    const unitPrice = parsePrice(menuData.price ?? menuData.unitPrice);
    const modifiers = normalizeRequestedModifiers(item.modifiers, menuData);
    const modifierUnitTotal = modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
    const lineTotal = (unitPrice + modifierUnitTotal) * quantity;
    if (!Number.isFinite(lineTotal) || lineTotal < 0) throw new HttpsError('failed-precondition', 'Calculated order total is invalid.');
    subtotal += lineTotal;
    return { menuItemId, ...(isNonEmptyString(menuData.recipeId) ? { recipeId: menuData.recipeId } : {}), name: menuData.name ?? menuData.nameAr ?? '', ...(isNonEmptyString(menuData.category) ? { category: menuData.category } : {}), price: unitPrice, quantity, ...(modifiers.length ? { modifiers } : {}), ...(typeof item.note === 'string' ? { note: item.note.slice(0, 500) } : {}) };
  });
  if (!Number.isFinite(subtotal) || subtotal < 0) throw new HttpsError('failed-precondition', 'Calculated order subtotal is invalid.');
  const discountAmount = 0;
  return { items: authoritativeItems, subtotal, discountAmount, totalAmount: subtotal - discountAmount };
}
module.exports = { buildAuthoritativeOrder, isNonEmptyString, getModifierCatalog, normalizeRequestedModifiers };
