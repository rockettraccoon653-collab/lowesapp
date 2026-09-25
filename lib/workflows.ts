import type { InventoryCheck, Order } from "../app/types";

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function matchesPickup(order: Order, query: string): boolean {
  const value = query.trim();
  if (!value) return true;
  const orderNumber = value.replace(/^#\s*/, "");
  // Phone lookup requires a full number; do not expose matches on a few digits.
  return order.id === orderNumber || (!!order.phone && normalizePhone(value).length === 10 && normalizePhone(order.phone) === normalizePhone(value));
}

export function checkInError(order: Order): string | null {
  if (order.channel === "Delivery") return "This is a delivery order. Open Delivery coordination.";
  if (["arrived", "retrieving", "at_vehicle"].includes(order.status)) return "Customer is already checked in. Open their active handoff.";
  if (order.status === "complete") return "This pickup has already been completed.";
  if (order.status !== "ready") return "Order is not ready. Finish picking and staging before check-in.";
  if (!order.groups.length || order.groups.some(group => !group.location)) return "Every staging group needs a location before check-in.";
  return null;
}

export function inventoryDecisionError(request: InventoryCheck, decision: string, note: string, location: string, canManage: boolean, role: string): string | null {
  if (!canManage || role !== "Manager") return "Only an authorized manager can approve or deny inventory checks.";
  if (request.status !== "pending") return "This request has already been reviewed. Refresh the queue.";
  if (!["approved", "denied"].includes(decision)) return "Choose approve or deny.";
  if (!note.trim()) return "A decision note is required.";
  if (decision === "denied" && !location.trim()) return "Enter the verified product location before denying.";
  return null;
}

export function waitMinutes(order: Order, timestamp: number): number | null {
  const start = Date.parse(order.checkIn?.arrivedAt ?? "");
  if (!Number.isFinite(start)) return null;
  const end = order.checkIn?.completedAt ? Date.parse(order.checkIn.completedAt) : timestamp;
  return Math.max(0, Math.floor((end - start) / 60000));
}
