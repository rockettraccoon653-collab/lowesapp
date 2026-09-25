import type { AppState } from "../app/types";

/**
 * Clean-room contract for an approved enterprise connector. No Lowe's API,
 * credential, endpoint, or proprietary data is embedded in this pilot.
 */
export interface OrdersIntegrationAdapter {
  getOrders(storeId: string): Promise<AppState["orders"]>;
  claimOrder(orderId: string, employeeId: string): Promise<void>;
  recordPick(orderId: string, itemId: string, quantity: number, employeeId: string): Promise<void>;
  recordException(orderId: string, itemId: string, reason: string, employeeId: string): Promise<void>;
  stageGroup(orderId: string, groupId: string, location: string, employeeId: string): Promise<void>;
  checkInCustomer(orderId: string, payload: Record<string, unknown>, employeeId: string): Promise<void>;
  findPickupOrders(storeId: string, lookup: { orderNumber?: string; phone?: string }): Promise<AppState["orders"]>;
  requestInventoryCheck(orderId: string, itemId: string, reason: string, searched: string, employeeId: string): Promise<void>;
  reviewInventoryCheck(requestId: string, decision: "approved" | "denied", note: string, foundLocation: string | undefined, managerId: string): Promise<void>;
  submitDeliveryDecision(deliveryId: string, payload: Record<string, unknown>, employeeId: string): Promise<void>;
}

export type IntegrationDirection = "read" | "write" | "event" | "read/write";

export type IntegrationEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  storeId: string;
  actorId: string;
  entityId: string;
  idempotencyKey: string;
  expectedVersion?: number;
  payload: Record<string, unknown>;
};

export const integrationContract = {
  contractVersion: "1.0.0-draft",
  mode: "mock",
  principles: ["Approved interfaces only", "Stable external IDs", "Idempotent writes", "Least-privilege roles", "Offline-safe event queue", "No customer data in logs"],
  requiredHeaders: ["x-store-id", "x-actor-id", "x-correlation-id", "idempotency-key"],
  errors: ["INVALID_REQUEST", "NOT_AUTHORIZED", "NOT_FOUND", "VERSION_CONFLICT", "TEMPORARILY_UNAVAILABLE"],
} as const;

export const integrationReadiness: Array<{ key: string; name: string; owner: string; purpose: string; direction: IntegrationDirection; identifiers: string; actions: string }> = [
  { key: "identity", name: "Associate identity & roles", owner: "IAM / workforce", purpose: "Named-user authorization and audit", direction: "read", identifiers: "employeeId, storeId, role", actions: "session, role refresh" },
  { key: "orders", name: "Order lifecycle feed", owner: "Order management", purpose: "Queues, status, cancellations and promise times", direction: "read/write", identifiers: "orderId, shipmentId", actions: "claim, pick, exception, status" },
  { key: "catalog", name: "Item & store location", owner: "Product / inventory", purpose: "SKU, aisle, bay, quantity and handling flags", direction: "read", identifiers: "itemId, sku, locationId", actions: "item detail, on-hand, locations" },
  { key: "inventory-review", name: "Inventory check authorization", owner: "Inventory control / IAM", purpose: "Manager-only review, physical-count workflow and verified-stock feedback", direction: "read/write", identifiers: "requestId, orderId, itemId", actions: "request, approve, deny" },
  { key: "staging", name: "Staging locations", owner: "Store operations", purpose: "Validated holds, capacity and group consolidation", direction: "read/write", identifiers: "groupId, locationId", actions: "validate, stage, move, finalize" },
  { key: "checkin", name: "Customer arrival events", owner: "Digital pickup", purpose: "On-the-way, arrival, vehicle and pickup method", direction: "event", identifiers: "orderId, arrivalId", actions: "arrived, retrieving, handoff" },
  { key: "notifications", name: "Enterprise messaging", owner: "Platform", purpose: "Role routing, acknowledgement and escalation", direction: "event", identifiers: "messageId, recipientId", actions: "publish, acknowledge" },
  { key: "delivery", name: "Delivery scheduling", owner: "Transportation", purpose: "Availability, carrier windows and reschedule commits", direction: "read/write", identifiers: "deliveryId, orderId", actions: "propose, sign off, load, complete" },
] as const;

export function downloadableIntegrationManifest() {
  return JSON.stringify({ ...integrationContract, capabilities: integrationReadiness, sampleEvent: { eventId: "evt_demo_001", eventType: "pickup.customer_arrived", occurredAt: "2026-09-06T14:30:00Z", storeId: "DEMO_STORE", actorId: "DEMO_ASSOCIATE", entityId: "DEMO_ORDER", idempotencyKey: "demo-only-not-production", payload: { pickupMethod: "curbside", spot: "DEMO" } } }, null, 2);
}
