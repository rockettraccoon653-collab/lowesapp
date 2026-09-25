import assert from "node:assert/strict";
import test from "node:test";
import { queueCounts, pickQuantityError, pickScanError, verifiedPickLocation, stagingLocationFromBarcode, deliveryTransitionError, operationCompletionError, routeArea, stateTransitionError } from "../lib/operations.ts";
import type { AppState, Delivery, OperationTask, Order, PickItem } from "../app/types.ts";

const item = { id: "a", quantity: 3, pickedQuantity: 0, status: "pending", location: "A7 B1" } as PickItem;
const order = { id: "o", status: "ready", items: [{ ...item, pickedQuantity: 3 }], groups: [{ location: "PU-1" }] } as Order;
test("partial picks require verified location and bounded integer quantity", () => {
  assert.ok(pickQuantityError(item, 1));
  assert.equal(pickQuantityError({ ...item, verifiedLocation: "A7 B1" }, 2), null);
  for (const quantity of [-1, 4, 1.5, NaN]) assert.ok(pickQuantityError({ ...item, verifiedLocation: "A7" }, quantity));
});
test("picking requires location then barcode, with item-number fallback only when barcode is absent", () => {
  const scanned = { ...item, sku: "10385", barcode: "UPC-10385", location: "Aisle 22 · Bay 4", locationBarcode: "LOC-LUMBER-10385" };
  assert.equal(verifiedPickLocation(scanned, "LOC-LUMBER-10385"), scanned.location);
  assert.equal(verifiedPickLocation(scanned, scanned.location), null);
  assert.ok(pickScanError(scanned, "UPC-10385"));
  assert.equal(pickScanError({ ...scanned, verifiedLocation: scanned.location }, "UPC-10385"), null);
  assert.ok(pickScanError({ ...scanned, verifiedLocation: scanned.location }, "10385"));
  assert.equal(pickScanError({ ...scanned, barcode: undefined, verifiedLocation: scanned.location }, "10385"), null);
  assert.equal(stagingLocationFromBarcode("STAGE-PU-11"), "PU-11");
  assert.equal(stagingLocationFromBarcode("PU-11"), null);
});
test("restage tasks require a claim, new location and physical verification", () => {
  const task = { status: "claimed", fromLocation: "PU-1" } as OperationTask;
  assert.equal(operationCompletionError(task, "PU-2", true), null);
  assert.ok(operationCompletionError(task, "pu-1", true));
  assert.ok(operationCompletionError(task, "PU-2", false));
  assert.ok(operationCompletionError({ ...task, status: "open" }, "PU-2", true));
});
test("delivery cannot load before readiness or unresolved date approvals", () => {
  const delivery = { execution: "preparing", status: "scheduled" } as Delivery;
  assert.equal(deliveryTransitionError(delivery, "ready", order), null);
  assert.ok(deliveryTransitionError(delivery, "loaded", order));
  assert.ok(deliveryTransitionError(delivery, "ready", { ...order, groups: [] }));
  assert.ok(deliveryTransitionError({ ...delivery, execution: "ready", status: "needs_changes" }, "loaded", order));
  assert.equal(deliveryTransitionError({ ...delivery, execution: "loaded" }, "complete", order), null);
});
test("dashboard counts derive from records and exclude completed work", () => {
  const state = { orders: [{ ...order, status: "picking" }], deliveries: [{ execution: "complete", source: "Genesis" }, { execution: "ready", scheduledDay: new Date().toISOString().slice(0,10) }], operations: [{ kind: "locker", status: "open" }, { kind: "locker", status: "complete" }, { kind: "enroute", status: "claimed" }] } as AppState;
  const counts = queueCounts(state);
  assert.equal(counts.locker, 1); assert.equal(counts.enroute, 1); assert.equal(counts.completed, 1); assert.equal(counts.genesis, 0); assert.equal(counts.deliveries, 1); assert.equal(counts.prepare, 1);
});
test("order search routes records to the appropriate workspace", () => {
  assert.equal(routeArea({ ...order, status: "picking" }), "pick");
  assert.equal(routeArea({ ...order, status: "staging" }), "stage");
  assert.equal(routeArea({ ...order, status: "complete" }), "checkin");
});

test("server snapshot refuses quantity inflation and unverified picking", () => {
  const previous = { orders: [{ ...order, status: "picking", items: [item] }], deliveries: [], operations: [], notifications: [], lastUpdated: "" } as AppState;
  const next = structuredClone(previous);
  next.orders[0].items[0].pickedQuantity = 1;
  assert.ok(stateTransitionError(previous, next));
  next.orders[0].items[0].verifiedLocation = "A7 B1";
  assert.equal(stateTransitionError(previous, next), null);
  next.orders[0].items[0].quantity = 9;
  assert.ok(stateTransitionError(previous, next));
});
test("server snapshot requires physical confirmation before completing restock", () => {
  const previous = { orders: [], deliveries: [], notifications: [], lastUpdated: "", operations: [{ id: "t1", kind: "restock", status: "claimed", assignedTo: "Associate", fromLocation: "Returns", audit: [] }] } as unknown as AppState;
  const next = structuredClone(previous);
  next.operations![0] = { ...next.operations![0], status: "complete", destination: "Aisle 2" };
  assert.ok(stateTransitionError(previous, next));
  next.operations![0].verifiedUnits = true;
  assert.equal(stateTransitionError(previous, next), null);
});
