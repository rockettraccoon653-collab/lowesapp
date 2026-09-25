import type { AppState, Delivery, OperationTask, Order, PickItem } from "../app/types";

export type QueueKey = "issues" | "enroute" | "install" | "locker" | "restock" | "deliveries" | "genesis" | "completed" | "prepare";
export const queueLabels: Record<QueueKey, string> = {
  issues: "Fix issues", enroute: "On the way · restage", install: "Install · restage", locker: "Expired lockers", restock: "Restock list", deliveries: "Today’s deliveries", genesis: "Genesis deliveries", completed: "Completed deliveries", prepare: "Prepare orders",
};

export function queueCounts(state: AppState): Record<QueueKey, number> {
  const open = (state.operations ?? []).filter(task => task.status !== "complete");
  const today = new Date().toISOString().slice(0, 10);
  return {
    issues: state.orders.filter(order => order.items.some(item => item.status === "exception")).length,
    enroute: open.filter(task => task.kind === "enroute").length,
    install: open.filter(task => task.kind === "install").length,
    locker: open.filter(task => task.kind === "locker").length,
    restock: open.filter(task => task.kind === "restock").length,
    deliveries: state.deliveries.filter(item => item.scheduledDay === today && item.execution !== "complete").length,
    genesis: state.deliveries.filter(item => item.source === "Genesis" && item.execution !== "complete").length,
    completed: state.deliveries.filter(item => item.execution === "complete").length,
    prepare: state.orders.filter(order => ["ready_to_pick", "picking", "exception", "picked", "staging"].includes(order.status)).length,
  };
}

export function pickQuantityError(item: PickItem, quantity: number): string | null {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > item.quantity) return "Enter a whole quantity between zero and the requested quantity.";
  if (quantity > item.pickedQuantity && !item.verifiedLocation) return "Confirm the pick location first.";
  return null;
}

export function pickScanError(item: PickItem, scan: string): string | null {
  if (!item.verifiedLocation) return "Scan the item location before scanning the product.";
  const value = scan.trim().toLowerCase();
  if (!value) return "Scan the item barcode.";
  if (item.barcode) return value === item.barcode.toLowerCase() ? null : "Wrong item. The scanned barcode does not match this order line.";
  return value === item.sku.toLowerCase() ? null : "This item has no usable barcode. Enter the exact item number.";
}

export function verifiedPickLocation(item: PickItem, scan: string): string | null {
  return item.locationBarcode && scan.trim().toLowerCase() === item.locationBarcode.toLowerCase() ? item.location : null;
}

export function stagingLocationFromBarcode(scan: string): string | null {
  const value = scan.trim().toUpperCase();
  const match = /^STAGE-([A-Z0-9]+(?:-[A-Z0-9]+)*)$/.exec(value);
  return match ? match[1] : null;
}

export function deliveryTransitionError(delivery: Delivery, target: string, order?: Order): string | null {
  const next: Record<string, string> = { preparing: "ready", ready: "loaded", loaded: "complete" };
  if (next[delivery.execution ?? "preparing"] !== target) return "Follow the delivery steps in order.";
  if (target === "ready" && (!order || !order.items.every(item => item.pickedQuantity === item.quantity) || !order.groups.length || order.groups.some(group => !group.location))) return "Pick every item and stage every group first.";
  if (target === "loaded" && ["pending", "needs_changes", "denied"].includes(delivery.status)) return "Resolve the delivery date reviews before loading.";
  return null;
}

export function operationCompletionError(task: OperationTask, destination: string, confirmed: boolean): string | null {
  if (task.status !== "claimed") return "Claim this task before completing it.";
  if (!destination.trim()) return "Scan or enter the destination location.";
  if (!confirmed) return "Confirm every listed unit was moved.";
  if (destination.trim().toLowerCase() === task.fromLocation.trim().toLowerCase()) return "The destination must differ from the current location.";
  return null;
}

export function routeArea(order: Order): "pick" | "stage" | "checkin" {
  if (["ready", "arrived", "retrieving", "at_vehicle", "complete"].includes(order.status)) return "checkin";
  return ["picked", "staging"].includes(order.status) ? "stage" : "pick";
}

// Validate the durable snapshot as well as the interactive controls. A save can
// contain multiple consecutive UI actions, so validate final-state invariants.
export function stateTransitionError(previous: AppState, next: AppState): string | null {
  if (next.orders.length !== previous.orders.length) return "Orders must come from the approved order feed.";
  for (const order of next.orders) {
    const old = previous.orders.find(value => value.id === order.id);
    if (!old || order.items.length !== old.items.length) return "Order lines cannot be added or removed in this pilot.";
    for (const item of order.items) {
      const before = old.items.find(value => value.id === item.id);
      if (!before || item.quantity !== before.quantity) return "Requested item quantities cannot be changed.";
      const error = pickQuantityError({ ...before, verifiedLocation: item.verifiedLocation }, item.pickedQuantity);
      if (error) return error;
      if (item.verifiedLocation && item.verifiedLocation !== before.location) return "The scanned pick location must match the order line location.";
      if (item.status === "picked" && item.pickedQuantity !== item.quantity) return "Picked items must have every requested unit confirmed.";
    }
    if (["ready", "arrived", "retrieving", "at_vehicle", "complete"].includes(order.status) && (!order.items.every(item => item.pickedQuantity === item.quantity) || !order.groups.length || order.groups.some(group => !group.location))) return "Customer-ready orders must be fully picked and staged.";
  }
  for (const task of next.operations ?? []) {
    const old = previous.operations?.find(value => value.id === task.id);
    if (!old) return "Operational tasks must come from the approved work feed.";
    if (old.status === "complete" && task.status !== "complete") return "Completed tasks cannot be reopened by a snapshot save.";
    if (task.status === "complete" && old.status !== "complete") {
      const error = operationCompletionError({ ...old, status: task.assignedTo ? "claimed" : old.status }, task.destination ?? "", task.verifiedUnits === true);
      if (error) return error;
      if (["enroute", "install"].includes(task.kind)) {
        const order = next.orders.find(value => value.id === task.orderId);
        if (!order || !["picked", "staging", "ready"].includes(order.status) || !order.items.every(item => item.pickedQuantity === item.quantity) || order.groups.some(group => group.location !== task.destination)) return "Restaging must move every fully picked group to the verified destination.";
      }
    }
  }
  const stages = ["preparing", "ready", "loaded", "complete"];
  for (const delivery of next.deliveries) {
    const old = previous.deliveries.find(value => value.id === delivery.id);
    if (!old) return "Delivery not found.";
    if (delivery.execution === old.execution) continue;
    const before = stages.indexOf(old.execution ?? "preparing");
    const after = stages.indexOf(delivery.execution ?? "preparing");
    if (after <= before || after < 0) return "Delivery steps cannot move backwards.";
    const order = next.orders.find(value => value.id === delivery.orderId);
    if (before < 1) {
      const error = deliveryTransitionError({ ...delivery, execution: "preparing" }, "ready", order);
      if (error) return error;
    }
    if (before < 2 && after >= 2) {
      const error = deliveryTransitionError({ ...delivery, execution: "ready" }, "loaded", order);
      if (error || !delivery.vehicle?.trim()) return error || "A vehicle or load reference is required.";
    }
    if (after === 3 && !Number.isFinite(Date.parse(delivery.completedAt ?? ""))) return "A verified completion timestamp is required.";
  }
  return null;
}
