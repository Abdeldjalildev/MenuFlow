import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const authoritySource = await readFile(new URL("../src/services/orderAuthority.ts", import.meta.url), "utf8");

test("Gate 8.4: OrderAuthorityService module exists", () => {
  assert.match(authoritySource, /export type OrderSource/);
  assert.match(authoritySource, /export type OrderMutationType/);
  assert.match(authoritySource, /export interface OrderCreationRequest/);
  assert.match(authoritySource, /export interface ServerAuthoritativeValues/);
});

test("Gate 8.4: OrderSource distinguishes customer and waiter", () => {
  assert.match(authoritySource, /'customer'/);
  assert.match(authoritySource, /'waiter'/);
});

test("Gate 8.4: Server-authoritative values defined", () => {
  assert.match(authoritySource, /orderId: string/);
  assert.match(authoritySource, /orderNumber: number/);
  assert.match(authoritySource, /totalAmount: number/);
});

test("Gate 8.4: canPerformOrderMutation helper exists", () => {
  assert.match(authoritySource, /export const canPerformOrderMutation/);
});

test("Gate 8.4: canCreateOrder helper exists", () => {
  assert.match(authoritySource, /export const canCreateOrder/);
});

test("Gate 8.4: OrderSourceMetadata records provenance", () => {
  assert.match(authoritySource, /export interface OrderSourceMetadata/);
});

test("Gate 8.4: Service documents single canonical path", () => {
  assert.match(authoritySource, /ONE canonical order creation path/);
});

test("Gate 8.4: Service documents deferred items", () => {
  assert.match(authoritySource, /DEFERRED/);
});