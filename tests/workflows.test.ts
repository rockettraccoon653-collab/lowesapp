import assert from "node:assert/strict";
import test from "node:test";
import { checkInError, matchesPickup, normalizePhone, inventoryDecisionError, waitMinutes } from "../lib/workflows.ts";
import type { Order, InventoryCheck } from "../app/types.ts";

const order = { id: "73912", phone: "7045550104", channel: "Pickup", status: "ready", groups: [{ location: "PU-11" }] } as Order;
const pending = { status: "pending" } as InventoryCheck;
test("phone normalization accepts punctuation and US country prefix", () => {
  assert.equal(normalizePhone("+1 (704) 555-0104"), "7045550104");
  assert.ok(matchesPickup(order, "+1 (704) 555-0104"));
  assert.ok(matchesPickup(order, "#73912"));
  assert.equal(matchesPickup(order, "0104"), false);
  assert.equal(matchesPickup(order, "739"), false);
  assert.equal(matchesPickup(order, "7045550105"), false);
});
test("shared phone returns every matching order, not just the first", () => {
  assert.equal([order, { ...order, id: "12345" }].filter(value => matchesPickup(value, "7045550104")).length, 2);
});
test("only ready, fully staged pickups can check in", () => {
  assert.equal(checkInError(order), null);
  for (const status of ["arrived", "retrieving", "at_vehicle", "complete", "picking", "exception", "staging"] as const) assert.ok(checkInError({ ...order, status }));
  assert.ok(checkInError({ ...order, groups: [] }));
  assert.ok(checkInError({ ...order, channel: "Delivery" }));
});
test("manager permission and role both required", () => {
  assert.ok(inventoryDecisionError(pending, "approved", "Check stock", "", false, "Manager"));
  assert.ok(inventoryDecisionError(pending, "approved", "Check stock", "", true, "Fulfillment"));
  assert.equal(inventoryDecisionError(pending, "approved", "Check stock", "", true, "Manager"), null);
});
test("denials require product location and all decisions require notes", () => {
  assert.ok(inventoryDecisionError(pending, "denied", "Found stock", " ", true, "Manager"));
  assert.ok(inventoryDecisionError(pending, "approved", " ", "", true, "Manager"));
  assert.equal(inventoryDecisionError(pending, "denied", "Found 4", "Aisle 2 bay 8", true, "Manager"), null);
  assert.ok(inventoryDecisionError({ ...pending, status: "approved" }, "denied", "Found", "A2", true, "Manager"));
});
test("wait clock excludes unknown timestamps and stops on completion", () => {
  assert.equal(waitMinutes(order, Date.now()), null);
  const checked = { ...order, checkIn: { arrivedAt: "2026-08-28T10:00:00Z", completedAt: "2026-08-28T10:06:00Z" } } as Order;
  assert.equal(waitMinutes(checked, Date.parse("2026-08-28T11:00:00Z")), 6);
});
