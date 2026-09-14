import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const domain = fs.readFileSync(path.join(root, 'src/services/orderDomain.ts'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/types/firestore.ts'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/context/OrderProvider.tsx'), 'utf8');

const checks = [
  ['canonical domain service exists', domain.includes('normalizeOrderItem') && domain.includes('normalizeOrderStatus')],
  ['price is canonicalized from legacy aliases', domain.includes('item.price ?? item.unitPrice ?? item.originalPrice')],
  ['quantity is canonicalized from legacy aliases', domain.includes('item.quantity ?? item.qty ?? 1')],
  ['legacy TrackDone maps to completed', domain.includes("status === 'TrackDone'\) return 'completed'")],
  ['total is calculated from canonical price and quantity', domain.includes('item.price * item.quantity')],
  ['canonical order type uses totalAmount', types.includes('totalAmount: number')],
  ['provider normalizes loaded order status', provider.includes('normalizeOrderStatus(raw.status)')],
  ['provider normalizes loaded order items', provider.includes('normalizeOrderItem(item as Record<string, unknown>)')],
  ['provider uses canonical order status type', provider.includes('export type OrderStatus = CanonicalOrderStatus')],
  ['provider sends canonical item shape to createOrder', provider.includes('items: canonicalItems')],
  ['legacy totalPrice is not used as canonical provider state', !provider.includes('totalPrice?: number')],
];

for (const [name, passed] of checks) assert.equal(passed, true, name);
console.log(`Phase 9 Gate 1 static contract: ${checks.length}/${checks.length} PASS`);
