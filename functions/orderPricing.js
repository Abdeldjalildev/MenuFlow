const { HttpsError } = require('firebase-functions/v2/https');

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
    throw new HttpsError('invalid-argument', 'Order item quantity must be a positive integer at most 100.');
  }
  return quantity;
}

function parsePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new HttpsError('failed-precondition', 'Menu item has an invalid authoritative price.');
  }
  return price;
}

function getModifierCatalog(menuData) {
  const raw = menuData?.modifiers;
  if (!Array.isArray(raw)) return new Map();
  const catalog = new Map();
  for (const modifier of raw) {
    if (!modifier || typeof modifier !== 'object' || !isNonEmptyString(modifier.id)) continue;
    catalog.set(modifier.id, {
      id: modifier.id,
      name: modifier.name,
      price: parsePrice(modifier.price ?? 0),
    });
  }
  return catalog;
}

function normalizeRequestedModifiers(rawModifiers, menuData) {
  if (rawModifiers == null) return [];
  if (!Array.isArray(rawModifiers) || rawModifiers.length > 20) {
    throw new HttpsError('invalid-argument', 'Modifiers must be an array containing at most 20 entries.');
  }
  const catalog = getModifierCatalog(menuData);
  return rawModifiers.map(raw => {
    const id = typeof raw === 'string' ? raw : raw?.id;
    if (!isNonEmptyString(id) || !catalog.has(id)) {
      throw new HttpsError('invalid-argument', 'Order contains an invalid menu modifier.');
    }
    const modifier = catalog.get(id);
    return { id: modifier.id, name: modifier.name, price: modifier.price };
  });
}

/**
 * Builds the only order-item pricing representation accepted by createOrder.
 * Client-supplied price/unitPrice/originalPrice values are deliberately ignored.
 */
function buildAuthoritativeOrder(items, menuDataById) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new HttpsError('invalid-argument', 'Order items must contain between 1 and 50 items.');
  }

  let subtotal = 0;
  const authoritativeItems = items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new HttpsError('invalid-argument', 'Invalid order item.');
    }
    const menuItemId = item.menuItemId;
    if (!isNonEmptyString(menuItemId)) {
      throw new HttpsError('invalid-argument', 'Each order item requires menuItemId.');
    }

    const menuData = menuDataById.get(menuItemId);
    if (!menuData) {
      throw new HttpsError('not-found', `Menu item ${menuItemId} does not exist in this restaurant.`);
    }
    if (menuData.restaurantId && menuData.restaurantId !== menuData.__restaurantId) {
      throw new HttpsError('permission-denied', 'Menu item tenant identity does not match the restaurant path.');
    }

    const quantity = parseQuantity(item.quantity ?? item.qty ?? 1);
    const unitPrice = parsePrice(menuData.price ?? menuData.unitPrice);
    const modifiers = normalizeRequestedModifiers(item.modifiers, menuData);
    const modifierUnitTotal = modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
    const lineUnitTotal = unitPrice + modifierUnitTotal;
    const lineTotal = lineUnitTotal * quantity;
    if (!Number.isFinite(lineTotal) || lineTotal < 0) {
      throw new HttpsError('failed-precondition', 'Calculated order total is invalid.');
    }

    subtotal += lineTotal;
    return {
      menuItemId,
      ...(isNonEmptyString(menuData.recipeId) ? { recipeId: menuData.recipeId } : {}),
      name: menuData.name ?? menuData.nameAr ?? '',
      price: unitPrice,
      quantity,
      ...(modifiers.length ? { modifiers } : {}),
      ...(typeof item.note === 'string' ? { note: item.note.slice(0, 500) } : {}),
    };
  });

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new HttpsError('failed-precondition', 'Calculated order subtotal is invalid.');
  }

  // Discount authority is intentionally server-side. Until a restaurant-level
  // discount policy is defined, the authoritative discount is zero; any client
  // supplied total/discount is ignored rather than trusted.
  const discountAmount = 0;
  const totalAmount = subtotal - discountAmount;
  return { items: authoritativeItems, subtotal, discountAmount, totalAmount };
}

module.exports = { buildAuthoritativeOrder, isNonEmptyString };
