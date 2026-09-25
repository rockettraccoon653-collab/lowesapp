"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { freshSeedState, people, upgradeDemoState } from "./data";
import InventoryWorkspace, { InventoryRequestForm, useInventory } from "./InventoryWorkspace";
import { checkInError, matchesPickup, waitMinutes } from "../lib/workflows";
import type { AppNotification, AppRole, AppState, Area, Decision, Delivery, Order, OrderStatus, PickItem } from "./types";
import { downloadableIntegrationManifest, integrationContract, integrationReadiness } from "../lib/integration";
import OperationsWorkspace, { OperationsHome, PrintWorkspace, type PrintKind } from "./OperationsWorkspace";
import FeedbackWorkspace from "./FeedbackWorkspace";
import { deliveryTransitionError, operationCompletionError, pickQuantityError, pickScanError, stagingLocationFromBarcode, verifiedPickLocation, type QueueKey } from "../lib/operations";
import type { OperationTask } from "./types";

const roles: AppRole[] = ["Fulfillment", "Receiving", "Pro specialist", "Manager"];
const rolePlaybooks: Record<AppRole, { theme: string; title: string; focus: string; actions: Array<{ label: string; detail: string; area: Area }> }> = {
  Fulfillment: { theme: "fulfillment", title: "Fulfillment shift", focus: "Pick accurately, stage cleanly, and reach waiting customers fast.", actions: [{ label: "Start picking", detail: "Location scan → item scan", area: "pick" }, { label: "Stage picked orders", detail: "Scan every hold location", area: "stage" }, { label: "Customer handoff", detail: "Oldest arrival first", area: "checkin" }] },
  Receiving: { theme: "receiving", title: "Receiving workspace", focus: "Protect staging accuracy, delivery readiness, and physical movement.", actions: [{ label: "Stage orders", detail: "Verify every group", area: "stage" }, { label: "Today’s deliveries", detail: "Ready, loaded, complete", area: "operations" }, { label: "Inventory requests", detail: "Track manager decisions", area: "inventory" }] },
  "Pro specialist": { theme: "pro", title: "Pro service desk", focus: "Keep Pro promises, delivery decisions, and customer follow-up together.", actions: [{ label: "Delivery approvals", detail: "Review proposed dates", area: "delivery" }, { label: "Prepare orders", detail: "See fulfillment progress", area: "pick" }, { label: "Customer lookup", detail: "Order or full phone", area: "checkin" }] },
  Manager: { theme: "manager", title: "Manager control", focus: "Clear blockers, protect authorization, and watch customer delay.", actions: [{ label: "Inventory decisions", detail: "Approve or locate product", area: "inventory" }, { label: "Fix issues", detail: "Review blocked picks", area: "operations" }, { label: "Associate voice", detail: "Move feedback forward", area: "feedback" }] },
};
const approvalRoles: Array<"Receiving" | "Fulfillment" | "Pro specialist"> = ["Receiving", "Fulfillment", "Pro specialist"];
const pickStatuses: OrderStatus[] = ["ready_to_pick", "picking", "exception"];
const stageStatuses: OrderStatus[] = ["picked", "staging", "ready"];
const arrivalStatuses: OrderStatus[] = ["arrived", "retrieving", "at_vehicle"];
const statusLabel: Record<OrderStatus, string> = {
  ready_to_pick: "Ready to pick", picking: "Picking", picked: "Picked", staging: "Staging", ready: "Ready", arrived: "Arrived", retrieving: "Retrieving", at_vehicle: "At vehicle", complete: "Complete", exception: "Exception",
};

const nav: Array<{ id: Area; label: string; icon: IconName }> = [
  { id: "dashboard", label: "Home", icon: "grid" },
  { id: "pick", label: "Order work", icon: "cart" },
  { id: "delivery", label: "Delivery", icon: "truck" },
  { id: "inventory", label: "Inventory", icon: "shield" },
  { id: "feedback", label: "Voice", icon: "message" },
  { id: "notifications", label: "Alerts", icon: "bell" },
  { id: "operations", label: "More", icon: "link" },
  { id: "demo", label: "Demo", icon: "refresh" },
];

const workAreas: Area[] = ["pick", "stage", "checkin"];

type IconName = "grid" | "cart" | "box" | "car" | "truck" | "bell" | "link" | "message" | "scan" | "route" | "user" | "clock" | "pin" | "check" | "alert" | "up" | "down" | "history" | "search" | "refresh" | "close" | "chevron" | "shield" | "wifi";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    cart: <><path d="M3 4h2l2.2 10.5h10.5l2-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10"/></>,
    car: <><path d="M3 17h18M5 17l1.5-7h11L20 17M8 10V7h8v3"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/></>,
    truck: <><path d="M3 5h11v12H3zM14 9h4l3 3v5h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/></>,
    message: <><path d="M4 4h16v12H8l-4 4V4Z"/><path d="M8 8h8M8 12h5"/></>,
    scan: <><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 12h10M7 9v6M10 9v6M14 9v6M17 9v6"/></>,
    route: <><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    check: <path d="m5 12 4 4L19 6"/>, alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.5h.01"/></>,
    up: <path d="m6 14 6-6 6 6"/>, down: <path d="m6 10 6 6 6-6"/>, history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, refresh: <><path d="M20 7V3h-4M4 17v4h4M19 11a7 7 0 0 0-12-5L4 9M5 13a7 7 0 0 0 12 5l3-3"/></>,
    close: <path d="M6 6l12 12M18 6 6 18"/>, chevron: <path d="m9 18 6-6-6-6"/>, shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>, wifi: <><path d="M5 12.5a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0M11 19.5a2 2 0 0 1 2 0"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const dayLabel = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";

function progress(order: Order) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const picked = order.items.reduce((sum, item) => sum + item.pickedQuantity, 0);
  return { units, picked, percent: units ? Math.round((picked / units) * 100) : 0 };
}

export default function OrdersApp() {
  const [area, setArea] = useState<Area>("dashboard");
  const [feedbackOrigin, setFeedbackOrigin] = useState<Area>("dashboard");
  const [operationQueue, setOperationQueue] = useState<QueueKey>("prepare");
  const [printJob, setPrintJob] = useState<{ orderId: string; kind: PrintKind }>({ orderId: "", kind: "shipping" });
  const [role, setRole] = useState<AppRole>("Fulfillment");
  const [state, setState] = useState<AppState>(() => freshSeedState());
  const [selectedOrderId, setSelectedOrderId] = useState("48291");
  const [selectedStageId, setSelectedStageId] = useState("66104");
  const [selectedCheckinId, setSelectedCheckinId] = useState("73912");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState("D-78122");
  const [search, setSearch] = useState("");
  const [sync, setSync] = useState<"loading" | "saved" | "saving" | "local">("loading");
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState("");
  const version = useRef(0);
  const savedPayload = useRef("");
  const saveQueue = useRef(Promise.resolve());
  const saveBlocked = useRef(false);
  const resetRequested = useRef(false);
  const [toast, setToast] = useState("");
  const [itemIssue, setItemIssue] = useState<{ orderId: string; itemId: string } | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState<{ id: string; decision: Exclude<Decision, "waiting"> } | null>(null);
  const [inventoryDraft, setInventoryDraft] = useState<{ orderId: string; itemId: string } | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const inventory = useInventory(role);
  const actor = people[role];

  useEffect(() => {
    let live = true;
    fetch("/api/state").then(async (response) => response.json()).then((result) => {
      if (!live) return;
      if (result.state) { const next = upgradeDemoState(result.state as AppState); savedPayload.current = JSON.stringify(next); setState(next); }
      version.current = result.version ?? 0;
      if (result.error) { setSaveError("Orders could not be loaded. Refresh to reconnect before making changes."); saveBlocked.current = true; }
      setSync(result.source === "fallback" ? "local" : "saved");
      setHydrated(true);
    }).catch(() => { if (live) { setSync("local"); setHydrated(true); setSaveError("Connection unavailable. Refresh before making changes."); saveBlocked.current = true; } });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || saveBlocked.current || JSON.stringify(state) === savedPayload.current) return;
    setSync((current) => current === "local" ? "local" : "saving");
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (saveBlocked.current) return;
        try {
          const response = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state, version: version.current, reset: resetRequested.current }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Changes were not saved. Refresh orders.");
          version.current = result.version; savedPayload.current = JSON.stringify(state); resetRequested.current = false; setSync("saved");
        } catch (problem) { saveBlocked.current = true; setSync("local"); setSaveError(problem instanceof Error ? problem.message : "Changes were not saved."); }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  const inventoryNotifications: AppNotification[] = inventory.requests.filter(item => role === "Manager" ? item.status === "pending" : item.requestedRole === role && item.status !== "pending").map(item => ({ id: `inventory-${item.id}-${item.status}`, role, recipient: actor.name, title: item.status === "pending" ? `Inventory review · #${item.orderId}` : `${item.status === "approved" ? "Inventory check approved" : "Product located"} · #${item.orderId}`, message: `${item.itemName} · ${item.status === "pending" ? item.reason : item.decisionNote}${item.foundLocation ? ` · ${item.foundLocation}` : ""}`, at: new Date(item.reviewedAt ?? item.requestedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), read: (state.inventorySeen ?? []).includes(`${role}:${item.id}:${item.status}`), priority: item.customerWaiting ? "high" : "normal", area: "inventory", entityId: item.id }));
  const roleNotifications = [...inventoryNotifications, ...state.notifications.filter((item) => item.role === role)];
  const unread = roleNotifications.filter((item) => !item.read).length;
  const pickOrders = state.orders.filter((order) => pickStatuses.includes(order.status));
  const stageOrders = state.orders.filter((order) => stageStatuses.includes(order.status));
  const readyOrders = state.orders.filter((order) => order.status === "ready");
  const activeArrivals = state.orders.filter((order) => arrivalStatuses.includes(order.status));
  const selectedOrder = state.orders.find((order) => order.id === selectedOrderId) ?? pickOrders[0] ?? state.orders[0];
  const selectedStage = state.orders.find((order) => order.id === selectedStageId) ?? stageOrders[0] ?? state.orders[0];
  const selectedCheckin = state.orders.find((order) => order.id === selectedCheckinId) ?? readyOrders[0] ?? state.orders[0];
  const selectedDelivery = state.deliveries.find((delivery) => delivery.id === selectedDeliveryId) ?? state.deliveries[0];

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const openArea = (next: Area, id?: string) => {
    setArea(next);
    if (id && next === "pick") setSelectedOrderId(id);
    if (id && next === "stage") setSelectedStageId(id);
    if (id && next === "checkin") setSelectedCheckinId(id);
    if (id && next === "delivery") setSelectedDeliveryId(id);
    if (id && next === "inventory") setSelectedInventoryId(id);
    if (id && next === "operations") { const task = state.operations?.find(value => value.id === id); if (task) setOperationQueue(task.kind); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateOrder = (id: string, update: (order: Order) => Order, extraNotifications: AppNotification[] = []) => {
    setState((current) => ({ ...current, orders: current.orders.map((order) => order.id === id ? update(order) : order), notifications: [...extraNotifications, ...current.notifications], lastUpdated: new Date().toISOString() }));
  };
  const log = (order: Order, action: string, next?: Partial<Order>): Order => ({ ...order, ...next, currentHandler: actor.name, audit: [{ id: uid("a"), actor: actor.name, role, action, at: now() }, ...order.audit] });
  const makeNotification = (targetRole: AppRole, title: string, message: string, targetArea: Area, entityId?: string, priority: "normal" | "high" = "normal"): AppNotification => ({ id: uid("n"), role: targetRole, recipient: people[targetRole].name, title, message, at: "just now", read: false, priority, area: targetArea, entityId });

  const openQueue = (queue: QueueKey) => { setOperationQueue(queue); openArea("operations"); };
  const openPrint = (orderId: string, kind: PrintKind) => { setPrintJob({ orderId, kind }); openArea("documents"); };
  const confirmLocation = (order: Order, itemId: string, location: string) => {
    const value = location.trim();
    const item = order.items.find(candidate => candidate.id === itemId);
    if (!item || !value) return flash("Scan the item location barcode");
    const verified = verifiedPickLocation(item, value);
    if (!verified) return flash("Wrong location. Scan the barcode at the listed aisle and bay.");
    updateOrder(order.id, current => log({ ...current, items: current.items.map(candidate => candidate.id === itemId ? { ...candidate, verifiedLocation: verified } : candidate) }, `Scanned pick location ${verified} for item ${item.sku}`));
    flash("Pick location confirmed");
  };
  const recordQuantity = (order: Order, itemId: string, quantity: number) => {
    const currentOrder = state.orders.find(value => value.id === order.id)!;
    const item = currentOrder.items.find(value => value.id === itemId)!;
    if (!["picking", "picked", "exception"].includes(currentOrder.status)) return flash("Claim an actionable pick order first");
    const error = pickQuantityError(item, quantity);
    if (error) return flash(error);
    const items = currentOrder.items.map(value => value.id === itemId ? { ...value, pickedQuantity: quantity, status: quantity === value.quantity ? "picked" as const : "pending" as const, issue: undefined } : value);
    const complete = items.every(value => value.pickedQuantity === value.quantity);
    updateOrder(order.id, current => log({ ...current, items, groups: current.groups.map(group => quantity < item.quantity && group.itemIds.includes(item.id) ? { ...group, location: undefined, stagedBy: undefined } : group) }, `Confirmed ${quantity}/${item.quantity} units of item ${item.sku}`, { status: complete ? "picked" : items.some(value => value.status === "exception") ? "exception" : "picking", assignedTo: actor.name }), complete ? [makeNotification("Receiving", `Ready to stage · #${order.id}`, "All requested units are confirmed.", "stage", order.id)] : []);
    flash(complete ? "All units picked — ready to stage" : "Quantity recorded");
  };
  const releasePick = (order: Order) => {
    if (!window.confirm("Release this pick? Confirmed quantities and route order will be kept.")) return;
    updateOrder(order.id, current => log(current, "Released pick to unclaimed queue", { assignedTo: undefined, status: "ready_to_pick" }));
  };
  const stageTogether = (event: FormEvent<HTMLFormElement>, order: Order) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const location = stagingLocationFromBarcode(String(form.get("location") || ""));
    if (!location || form.get("verified") !== "on" || !order.items.every(item => item.pickedQuantity === item.quantity)) return flash("Scan a valid staging barcode and verify all units first");
    updateOrder(order.id, current => log({ ...current, groups: current.groups.map(group => ({ ...group, location, stagedBy: actor.name })) }, `Staged all ${current.groups.length} groups together at ${location}`, { status: "staging" }));
    flash("All group locations saved — finalize when verified");
  };
  const taskAction = (task: OperationTask, action: "claim" | "complete", location = "", confirmed = false) => {
    const currentTask = state.operations?.find(value => value.id === task.id);
    if (!currentTask || currentTask.status === "complete") return flash("Task already completed or unavailable");
    if (action === "claim" && currentTask.status !== "open") return flash("Task is already claimed");
    if (action === "complete") {
      const error = operationCompletionError(currentTask, location, confirmed);
      if (error) return flash(error);
      const linked = state.orders.find(order => order.id === task.orderId);
      if (["enroute", "install"].includes(task.kind) && (!linked || !["picked", "staging", "ready"].includes(linked.status) || !linked.items.every(item => item.pickedQuantity === item.quantity))) return flash("The linked order must be fully picked and not in active handoff before restaging");
    }
    const description = action === "claim" ? "Claimed task" : `Verified every listed unit and moved to ${location.trim()}`;
    setState(current => ({ ...current, operations: current.operations?.map(value => value.id === task.id ? { ...value, status: action === "claim" ? "claimed" : "complete", assignedTo: actor.name, destination: action === "complete" ? location.trim() : undefined, verifiedUnits: action === "complete" ? confirmed : undefined, audit: [{ id: uid("op"), actor: actor.name, role, action: description, at: new Date().toISOString() }, ...value.audit] } : value), orders: action === "complete" && ["enroute", "install"].includes(task.kind) ? current.orders.map(order => order.id === task.orderId ? log({ ...order, groups: order.groups.map(group => ({ ...group, location: location.trim(), stagedBy: actor.name })) }, description, { status: order.status === "ready" ? "ready" : "staging" }) : order) : current.orders, notifications: action === "complete" ? [makeNotification("Fulfillment", `${task.title} completed`, `${actor.name}: ${location.trim()}`, "operations", task.id), ...current.notifications] : current.notifications }));
    flash(action === "claim" ? "Task claimed" : "Movement recorded");
  };
  const deliveryAction = (delivery: Delivery, target: "ready" | "loaded" | "complete", note: string) => {
    const error = deliveryTransitionError(delivery, target, state.orders.find(order => order.id === delivery.orderId));
    if (error || !note.trim()) return flash(error || "A verification note is required");
    setState(current => ({ ...current, deliveries: current.deliveries.map(value => value.id === delivery.id ? { ...value, execution: target, vehicle: target === "loaded" ? note : value.vehicle, completedAt: target === "complete" ? new Date().toISOString() : undefined, audit: [{ id: uid("delivery"), actor: actor.name, role, action: `${target}: ${note}`, at: new Date().toISOString() }, ...value.audit] } : value) }));
    flash(`Delivery ${target} recorded`);
  };

  const claimPick = (order: Order) => {
    if (!["ready_to_pick", "picking", "exception"].includes(order.status)) return flash("This order is no longer in the pick queue");
    updateOrder(order.id, (current) => log(current, "Claimed pick", { status: "picking", assignedTo: actor.name }));
    flash(`${actor.name} now owns order #${order.id}`);
  };

  const moveItem = (order: Order, item: PickItem, direction: -1 | 1) => {
    const sorted = [...order.items].sort((a, b) => a.routeRank - b.routeRank);
    const from = sorted.findIndex((candidate) => candidate.id === item.id);
    const to = from + direction;
    if (to < 0 || to >= sorted.length) return;
    [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
    const rank = new Map(sorted.map((candidate, index) => [candidate.id, index + 1]));
    updateOrder(order.id, (current) => log({ ...current, routeMode: "manual", items: current.items.map((candidate) => ({ ...candidate, routeRank: rank.get(candidate.id) ?? candidate.routeRank })) }, `Moved ${item.name} ${direction < 0 ? "earlier" : "later"} in manual route`));
  };

  const resetRoute = (order: Order) => {
    updateOrder(order.id, (current) => log({ ...current, routeMode: "suggested", items: current.items.map((item) => ({ ...item, routeRank: item.suggestedRank })) }, "Restored suggested aisle route"));
    flash("Suggested route restored");
  };

  const scanItem = (event: FormEvent<HTMLFormElement>, order: Order) => {
    event.preventDefault();
    const scan = String(new FormData(event.currentTarget).get("scan") ?? "").trim().toLowerCase();
    if (!scan) return flash("Scan the item barcode");
    const item = order.items.find((candidate) => candidate.barcode ? candidate.barcode.toLowerCase() === scan : candidate.sku.toLowerCase() === scan);
    if (!item) return flash("Wrong item. No order line matches that barcode.");
    const problem = pickScanError(item, scan);
    if (problem) return flash(problem);
    recordQuantity(order, item.id, item.pickedQuantity + 1);
    event.currentTarget.reset();
  };

  const submitIssue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!itemIssue) return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason"));
    const notes = String(form.get("notes") || "");
    const order = state.orders.find((candidate) => candidate.id === itemIssue.orderId)!;
    const item = order.items.find((candidate) => candidate.id === itemIssue.itemId)!;
    updateOrder(order.id, (current) => log({ ...current, status: "exception", items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, status: "exception", issue: `${reason}${notes ? ` — ${notes}` : ""}` } : candidate) }, `Reported ${reason.toLowerCase()} for ${item.name}`), [makeNotification("Manager", `Pick exception · #${order.id}`, `${actor.name} reported ${reason.toLowerCase()} for ${item.name}. ${notes}`, "pick", order.id, "high")]);
    setItemIssue(null);
    flash("Exception recorded and manager notified");
  };

  const stageGroup = (event: FormEvent<HTMLFormElement>, order: Order, groupId: string) => {
    event.preventDefault();
    if (!order.items.every(item => item.pickedQuantity === item.quantity)) return flash("Complete all picks before staging");
    const location = stagingLocationFromBarcode(String(new FormData(event.currentTarget).get("location") || ""));
    if (!location) return flash("Scan a valid staging-location barcode");
    updateOrder(order.id, (current) => log({ ...current, status: "staging", groups: current.groups.map((group) => group.id === groupId ? { ...group, location, stagedBy: actor.name } : group) }, `Staged ${current.groups.find((group) => group.id === groupId)?.label} at ${location}`));
    flash(`Group staged at ${location}`);
  };

  const finalizeStaging = (order: Order) => {
    if (!order.items.every(item => item.pickedQuantity === item.quantity) || !order.groups.length) return flash("Complete all picks and create staging groups first");
    if (!order.groups.every((group) => group.location)) return flash("Every group needs a staging location");
    updateOrder(order.id, (current) => log(current, "Finalized staging and released customer notification", { status: "ready" }), [makeNotification("Fulfillment", `Pickup ready · #${order.id}`, `${actor.name} finalized ${order.groups.length} staging group${order.groups.length === 1 ? "" : "s"}.`, "checkin", order.id), makeNotification("Manager", `Order ready · #${order.id}`, `${order.customer}'s order is staged and ready for pickup.`, "checkin", order.id)]);
    setSelectedCheckinId(order.id);
    flash("Order is ready — pickup notification created");
  };

  const checkInCustomer = (event: FormEvent<HTMLFormElement>, order: Order) => {
    event.preventDefault();
    const problem = checkInError(state.orders.find(value => value.id === order.id) ?? order);
    if (problem) return flash(problem);
    const form = new FormData(event.currentTarget);
    const method = String(form.get("method")) as "curbside" | "in_store";
    const spot = String(form.get("spot") || "");
    const vehicle = String(form.get("vehicle") || "");
    const customerName = String(form.get("customerName") || order.customer);
    const idVerified = form.get("idVerified") === "on";
    if (method === "curbside" && !spot) return flash("A curbside spot is required");
    updateOrder(order.id, (current) => log({ ...current, checkIn: { method, spot: method === "curbside" ? spot : undefined, vehicle: method === "curbside" ? vehicle : undefined, customerName, idVerified, checkedInBy: actor.name, checkedInAt: now(), arrivedAt: new Date().toISOString() } }, `Checked in ${customerName} for ${method === "curbside" ? `curbside spot ${spot}` : "in-store pickup"}`, { status: "arrived" }), [makeNotification("Fulfillment", `Customer checked in · #${order.id}`, `${actor.name} checked in ${customerName}${method === "curbside" ? ` at spot ${spot}` : " in store"}. Claim the handoff.`, "checkin", order.id, "high"), makeNotification("Manager", `Associate check-in · #${order.id}`, `${actor.name} recorded the customer arrival.`, "checkin", order.id)]);
    flash(`${customerName} checked in — Fulfillment notified`);
  };

  const advanceHandoff = (order: Order) => {
    const next: Partial<Record<OrderStatus, OrderStatus>> = { arrived: "retrieving", retrieving: "at_vehicle", at_vehicle: "complete" };
    const target = next[order.status];
    if (!target) return;
    const actions: Partial<Record<OrderStatus, string>> = { retrieving: "Started retrieval", at_vehicle: "Arrived at customer", complete: "Completed pickup handoff" };
    updateOrder(order.id, (current) => log(current, actions[target] ?? "Updated pickup", { status: target, assignedTo: actor.name, checkIn: current.checkIn && { ...current.checkIn, ...(target === "complete" ? { completedAt: new Date().toISOString() } : {}) } }));
    flash(`${actor.name} updated #${order.id} to ${statusLabel[target]}`);
  };

  const submitReschedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = dayLabel(String(form.get("date")));
    const reason = String(form.get("reason"));
    if (!date || !reason) return;
    const targets = approvalRoles.map((targetRole) => makeNotification(targetRole, `Delivery sign-off required · ${selectedDelivery.id}`, `${actor.name} requested ${date} for ${selectedDelivery.customer}.`, "delivery", selectedDelivery.id, "high"));
    setState((current) => ({ ...current, deliveries: current.deliveries.map((delivery) => delivery.id === selectedDelivery.id ? { ...delivery, proposedDate: date, proposedDay: String(form.get("date")), reason, status: "pending", approvals: delivery.approvals.map((approval) => ({ ...approval, decision: "waiting", reason: undefined, requestedAction: undefined, suggestedDate: undefined, at: undefined })), audit: [{ id: uid("da"), actor: actor.name, role, action: `Requested delivery change to ${date}`, at: now() }, ...delivery.audit] } : delivery), notifications: [...targets, ...current.notifications] }));
    setRescheduleOpen(false);
    flash("All required roles were notified");
  };

  const submitDecision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decisionOpen || role === "Manager") return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") || "");
    const requestedAction = String(form.get("action") || "");
    const suggested = String(form.get("suggestedDate") || "");
    if (decisionOpen.decision !== "approved" && !reason) return flash("A reason is required");
    const suggestedDate = suggested ? dayLabel(suggested) : undefined;
    setState((current) => ({ ...current, deliveries: current.deliveries.map((delivery) => {
      if (delivery.id !== decisionOpen.id) return delivery;
      const approvals = delivery.approvals.map((approval) => approval.role === role ? { ...approval, person: actor.name, decision: decisionOpen.decision, reason: reason || undefined, requestedAction: requestedAction || undefined, suggestedDate, at: now() } : approval);
      let finalStatus: Delivery["status"] = "pending";
      if (approvals.some((approval) => approval.decision === "denied")) finalStatus = "denied";
      else if (approvals.some((approval) => approval.decision === "needs_changes")) finalStatus = "needs_changes";
      else if (approvals.every((approval) => approval.decision === "approved")) finalStatus = "approved";
      return { ...delivery, status: finalStatus, currentDate: finalStatus === "approved" ? delivery.proposedDate ?? delivery.currentDate : delivery.currentDate, scheduledDay: finalStatus === "approved" ? delivery.proposedDay ?? delivery.scheduledDay : delivery.scheduledDay, approvals, audit: [{ id: uid("da"), actor: actor.name, role, action: `${decisionOpen.decision.replace("_", " ")}${reason ? ` — ${reason}` : ""}`, at: now() }, ...delivery.audit] };
    }), notifications: [makeNotification("Manager", `Delivery decision · ${decisionOpen.id}`, `${actor.name} recorded ${decisionOpen.decision.replace("_", " ")}${reason ? `: ${reason}` : ""}.`, "delivery", decisionOpen.id, decisionOpen.decision === "approved" ? "normal" : "high"), ...current.notifications] }));
    setDecisionOpen(null);
    flash(`${actor.name}'s decision was recorded`);
  };

  const openNotification = (notification: AppNotification) => {
    if (notification.area === "inventory") {
      const item = inventory.requests.find(value => value.id === notification.entityId);
      if (item) setState(current => ({ ...current, inventorySeen: [...(current.inventorySeen ?? []), `${role}:${item.id}:${item.status}`] }));
    }
    setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item) }));
    openArea(notification.area, notification.entityId);
  };

  return <main className={`app-shell role-${rolePlaybooks[role].theme}`}>
    <header className="topbar">
      <button className="brand" onClick={() => openArea("dashboard")}><span className="brand-mark">O</span><span><strong>Orders Ops</strong><small>Store pilot · 0421</small></span></button>
      <div className="demo-chip"><i/> Demonstration · no production connection</div>
      <div className="top-actions">
        <span className={`sync ${sync}`}><Icon name={sync === "local" ? "alert" : sync === "loading" ? "refresh" : "wifi"}/>{sync === "loading" ? "Loading" : sync === "saving" ? "Saving" : sync === "local" ? "Local fallback" : "Saved"}</span>
        <button className="bell-button" onClick={() => openArea("notifications")} aria-label={`${unread} unread notifications`}><Icon name="bell"/>{unread > 0 && <b>{unread}</b>}</button>
        <label className="role-select"><span>{actor.name}</span><select value={role} onChange={(event) => { setRole(event.target.value as AppRole); setArea("dashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{roles.map((item) => <option value={item} key={item}>{people[item].name} — {item}</option>)}</select></label>
      </div>
    </header>

    <div className="app-layout">
      <aside className="sidebar">
        <nav>{nav.map((item) => { const active = item.id === "pick" ? workAreas.includes(area) : item.id === "operations" ? ["operations", "documents", "readiness"].includes(area) : area === item.id; return <button key={item.id} className={active ? "active" : ""} onClick={() => openArea(item.id)}><Icon name={item.icon}/><span>{item.label}</span>{item.id === "notifications" && unread > 0 && <i>{unread}</i>}</button>; })}</nav>
        <div className="sidebar-context"><Icon name="shield"/><div><strong>Clean-room pilot</strong><p>Simulated customer, order and associate data. Integration points are documented separately.</p></div></div>
        <button className="reset" onClick={() => openArea("demo")}><Icon name="refresh"/> Demo controls</button>
      </aside>

      <section className="content">
        {saveError && <div className="form-error" role="alert"><strong>Changes are not saved.</strong> {saveError} <button className="button ghost compact" onClick={() => window.location.reload()}>Reload saved orders</button></div>}
        {role === "Manager" && inventory.requests.some(item => item.status === "pending") && area === "dashboard" && <button className="manager-attention" onClick={() => openArea("inventory")}><Icon name="shield"/><span><strong>{inventory.requests.filter(item => item.status === "pending").length} inventory checks need your decision</strong><small>Review searched locations and send a clear next action.</small></span><Icon name="chevron"/></button>}
        <div inert={!!saveError || sync === "loading"}>
        {area === "dashboard" && <><RolePlaybook role={role} onOpen={openArea}/><OperationsHome state={state} onOpen={openArea} onQueue={openQueue} inventoryCount={inventory.requests.filter(item => item.status === "pending").length}/></>}
        {workAreas.includes(area) && <WorkTabs area={area} pickCount={pickOrders.length} stageCount={stageOrders.filter((order) => order.status !== "ready").length} readyCount={readyOrders.length} arrivalCount={activeArrivals.length} onOpen={openArea}/>} 
        {area === "pick" && <PickWorkspace orders={pickOrders} selected={selectedOrder} search={search} setSearch={setSearch} onSelect={setSelectedOrderId} onClaim={claimPick} onScan={scanItem} onQuantity={recordQuantity} onLocation={confirmLocation} onRelease={releasePick} onPrint={openPrint} onIssue={(orderId, itemId) => setItemIssue({ orderId, itemId })} onInventory={(orderId, itemId) => setInventoryDraft({ orderId, itemId })} onMove={moveItem} onResetRoute={resetRoute} onStage={(id) => openArea("stage", id)}/>} 
        {area === "stage" && <StageWorkspace orders={stageOrders} selected={selectedStage} onSelect={setSelectedStageId} onStageGroup={stageGroup} onFinalize={finalizeStaging} onStageAll={stageTogether} onPrint={openPrint}/>} 
        {area === "checkin" && <CheckInWorkspace orders={state.orders} readyOrders={readyOrders} arrivals={activeArrivals} selected={selectedCheckin} actor={actor.name} onSelect={setSelectedCheckinId} onCheckIn={checkInCustomer} onAdvance={advanceHandoff} onOpen={openArea}/>} 
        {area === "inventory" && <InventoryWorkspace {...inventory} role={role} selectedId={selectedInventoryId} onSelect={setSelectedInventoryId} onOpenOrder={id => openArea("pick", id)} onRequest={() => setInventoryDraft({ orderId: "", itemId: "" })}/>}
        {area === "feedback" && <FeedbackWorkspace role={role} currentArea={feedbackOrigin}/>}
        {area === "delivery" && <><div className="more-shortcuts"><button className="button ghost" onClick={() => openQueue("deliveries")}>Today’s deliveries</button><button className="button ghost" onClick={() => openQueue("genesis")}>Genesis deliveries</button><button className="button ghost" onClick={() => openQueue("completed")}>Completed deliveries</button></div><DeliveryWorkspace deliveries={state.deliveries} selected={selectedDelivery} role={role} onSelect={setSelectedDeliveryId} onReschedule={() => setRescheduleOpen(true)} onDecision={(decision) => setDecisionOpen({ id: selectedDelivery.id, decision })}/></>} 
        {area === "notifications" && <NotificationsWorkspace notifications={roleNotifications} role={role} onOpen={openNotification} onReadAll={() => setState((current) => ({ ...current, inventorySeen: [...new Set([...(current.inventorySeen ?? []), ...inventory.requests.map(item => `${role}:${item.id}:${item.status}`)])], notifications: current.notifications.map((item) => item.role === role ? { ...item, read: true } : item) }))}/>} 
        {area === "operations" && <><div className="more-shortcuts"><button className="button ghost" onClick={() => openArea("documents")}>Shipping documents</button><button className="button ghost" onClick={() => openArea("readiness")}>Integration readiness</button></div><OperationsWorkspace state={state} queue={operationQueue} onQueue={setOperationQueue} onOpen={openArea} onTask={taskAction} onDelivery={deliveryAction}/></>}
        {area === "documents" && <PrintWorkspace key={printJob.orderId + printJob.kind} orders={state.orders} initialOrderId={printJob.orderId} initialKind={printJob.kind}/>}
        {area === "readiness" && <ReadinessWorkspace/>}
        {area === "demo" && <DemoWorkspace/>}
        </div>
        {area !== "feedback" && <button className="feedback-fab" onClick={() => { setFeedbackOrigin(area); openArea("feedback"); }}><Icon name="message"/> Improve this screen</button>}
        <footer className="concept-notice"><strong>Concept and workflow design · Loren Rockett</strong><span>Evaluation prototype. Reuse or redistribution requires express written permission.</span></footer>
      </section>
    </div>

    {itemIssue && <Modal title="Record pick exception" subtitle={`Order #${itemIssue.orderId}`} onClose={() => setItemIssue(null)}><form className="modal-form" onSubmit={submitIssue}><label>What happened?<select name="reason" required><option value="Item not found">Item not found</option><option value="Insufficient quantity">Insufficient quantity</option><option value="Damaged item">Damaged item</option><option value="Location mismatch">Location mismatch</option><option value="Barcode mismatch">Barcode mismatch</option></select></label><label>Notes for the next person<textarea name="notes" placeholder="Where you looked, available quantity, or suggested resolution"/></label><div className="callout warning"><Icon name="alert"/><span>This pauses the order, records you as the actor and notifies a manager.</span></div><button className="button danger" type="submit">Record exception</button></form></Modal>}
    {rescheduleOpen && <Modal title="Request a delivery change" subtitle={`${selectedDelivery.id} · ${selectedDelivery.customer}`} onClose={() => setRescheduleOpen(false)}><form className="modal-form" onSubmit={submitReschedule}><label>Proposed date<input name="date" type="date" required/></label><label>Reason<select name="reason" required defaultValue=""><option value="" disabled>Select reason</option><option>Customer requested change</option><option>Material unavailable</option><option>Carrier capacity conflict</option><option>Weather or safety risk</option><option>Order not fulfillment-ready</option></select></label><div className="recipient-row">{approvalRoles.map((item) => <span key={item}><Icon name="user"/><b>{people[item].name}</b><small>{item}</small></span>)}</div><button className="button primary" type="submit">Send for all sign-offs</button></form></Modal>}
    {decisionOpen && <Modal title={`${decisionOpen.decision === "approved" ? "Approve" : decisionOpen.decision === "denied" ? "Deny" : "Request changes"} delivery`} subtitle={`${decisionOpen.id} · acting as ${actor.name}`} onClose={() => setDecisionOpen(null)}><form className="modal-form" onSubmit={submitDecision}>{decisionOpen.decision !== "approved" && <><label>Reason<textarea name="reason" required placeholder="Explain what blocks this date"/></label><label>Required next action<input name="action" placeholder="Example: confirm date with customer"/></label><label>Suggested replacement date<input name="suggestedDate" type="date"/></label></>}<div className={`callout ${decisionOpen.decision === "approved" ? "success" : "warning"}`}><Icon name={decisionOpen.decision === "approved" ? "check" : "alert"}/><span>Your name, role, decision and reason become part of the audit history.</span></div><button className={`button ${decisionOpen.decision === "approved" ? "success" : "danger"}`} type="submit">Record decision</button></form></Modal>}
    {inventoryDraft && <Modal title="Request inventory check" subtitle="Send the item and search details directly to a manager." onClose={() => { if (!inventory.busy) setInventoryDraft(null); }}><InventoryRequestForm orders={state.orders} initial={inventoryDraft} busy={inventory.busy} error={inventory.error} onSubmit={async body => { const success = await inventory.submit(body); if (success) { setInventoryDraft(null); flash("Request saved — manager review queue updated"); } return success; }}/></Modal>}
    {toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}
  </main>;
}

function PageHeading({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

function RolePlaybook({ role, onOpen }: { role: AppRole; onOpen: (area: Area) => void }) {
  const playbook = rolePlaybooks[role];
  return <section className="role-playbook">
    <div className="role-playbook-copy">
      <span className="eyebrow">{people[role].name} · {role}</span>
      <h2>{playbook.title}</h2>
      <p>{playbook.focus}</p>
    </div>
    <div className="role-playbook-actions">{playbook.actions.map((action, index) => <button key={action.label} onClick={() => onOpen(action.area)}>
      <i>{index + 1}</i><span><strong>{action.label}</strong><small>{action.detail}</small></span><Icon name="chevron"/>
    </button>)}</div>
  </section>;
}

function DemoWorkspace() {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reset = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The demo could not be reset.");
      window.location.reload();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The demo could not be reset.");
      setBusy(false);
    }
  };
  return <>
    <PageHeading eyebrow="Pilot · owner controls" title="Demo controls" copy="Restore the entire walkthrough before a presentation and confirm how the pilot runs on each device."/>
    <div className="demo-workspace">
      <section className="panel demo-reset-panel">
        <div className="demo-danger-heading"><Icon name="refresh"/><div><h2>Reset the whole demo</h2><p>This is an owner-protected reset of fictional pilot data. It does not write to a Lowe’s production system.</p></div></div>
        <ul className="reset-scope"><li><Icon name="check"/>Orders, picks, exceptions and staging</li><li><Icon name="check"/>Customer arrivals, handoffs and notifications</li><li><Icon name="check"/>Delivery requests and role decisions</li><li><Icon name="check"/>Inventory requests, manager decisions and feedback</li></ul>
        <label className="reset-confirm">Type <b>RESET DEMO</b> to continue<input value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="RESET DEMO" autoComplete="off"/></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button danger" disabled={confirmation !== "RESET DEMO" || busy} onClick={reset}>{busy ? "Resetting everything…" : "Reset all demo data"}</button>
      </section>
      <section className="panel device-panel">
        <div className="panel-head"><div><h2>Run it on the floor or at a desk</h2><p>One responsive web app, sized for touch, scanner input and desktop review.</p></div><span className="frontline-badge">Cross-device</span></div>
        <div className="device-grid">
          <article><span>iPhone / iPad</span><h3>Safari web app</h3><p>Share → Add to Home Screen → Open as Web App. Safe-area spacing keeps controls clear of the screen edges.</p></article>
          <article><span>Android / Zebra</span><h3>Chrome + scanner</h3><p>Use the browser install or home-screen option. Hardware scanners can enter barcodes directly into the focused scan field.</p></article>
          <article><span>Desktop</span><h3>Full operations view</h3><p>Use a modern browser for wider queues, management review, printing and presentation mode.</p></article>
        </div>
        <div className="device-status"><span><Icon name="check"/>Responsive layout</span><span><Icon name="check"/>Standalone manifest</span><span><Icon name="check"/>Touch-safe controls</span><span><Icon name="check"/>Keyboard-wedge scanning</span></div>
        <div className="callout warning"><Icon name="wifi"/><span><b>Connection required for this pilot.</b> Offline transaction syncing and camera-based scanning still require production engineering and device testing.</span></div>
      </section>
    </div>
  </>;
}

function WorkTabs({ area, pickCount, stageCount, readyCount, arrivalCount, onOpen }: { area: Area; pickCount: number; stageCount: number; readyCount: number; arrivalCount: number; onOpen: (area: Area) => void }) {
  const tabs: Array<{ id: "pick" | "stage" | "checkin"; label: string; helper: string; count: number; icon: IconName }> = [
    { id: "pick", label: "Pick", helper: "Find and confirm items", count: pickCount, icon: "cart" },
    { id: "stage", label: "Stage", helper: "Assign every location", count: stageCount, icon: "box" },
    { id: "checkin", label: "Check-in & handoff", helper: arrivalCount ? `${arrivalCount} customer${arrivalCount === 1 ? "" : "s"} waiting` : "Assist ready customers", count: arrivalCount || readyCount, icon: "car" },
  ];
  return <div className="work-tabs" aria-label="Order work steps">{tabs.map((tab) => <button key={tab.id} className={area === tab.id ? "active" : ""} onClick={() => onOpen(tab.id)}><span className="work-tab-icon"><Icon name={tab.icon}/></span><span><strong>{tab.label}</strong><small>{tab.helper}</small></span><b>{tab.count}</b></button>)}</div>;
}

function OrderQueue({ orders, selectedId, onSelect, empty = "No orders in this queue" }: { orders: Order[]; selectedId: string; onSelect: (id: string) => void; empty?: string }) {
  return <div className="queue">{orders.length ? orders.map((order) => { const p = progress(order); return <button key={order.id} className={selectedId === order.id ? "selected" : ""} onClick={() => onSelect(order.id)}><div className="queue-top"><span className={`status ${order.status}`}>{statusLabel[order.status]}</span><small>{order.promised}</small></div><strong>#{order.id} · {order.customer}</strong><p>{order.items.length} lines · {p.units} units · {order.groups.length} groups</p><div className="mini-progress"><i style={{ width: `${p.percent}%` }}/></div><div className="queue-owner"><span><Icon name="user"/>{order.currentHandler ?? "Unassigned"}</span><b>{p.percent}%</b></div></button>; }) : <div className="empty-state"><Icon name="check"/><strong>Queue clear</strong><p>{empty}</p></div>}</div>;
}

type PickWorkspaceProps = {
  orders: Order[]; selected: Order; search: string; setSearch: (value: string) => void;
  onSelect: (id: string) => void; onClaim: (order: Order) => void; onRelease: (order: Order) => void;
  onScan: (event: FormEvent<HTMLFormElement>, order: Order) => void;
  onQuantity: (order: Order, itemId: string, quantity: number) => void;
  onLocation: (order: Order, itemId: string, location: string) => void;
  onIssue: (orderId: string, itemId: string) => void; onInventory: (orderId: string, itemId: string) => void;
  onMove: (order: Order, item: PickItem, direction: -1 | 1) => void; onResetRoute: (order: Order) => void;
  onStage: (id: string) => void; onPrint: (id: string, kind: PrintKind) => void;
};

function PickWorkspace({ orders, selected, search, setSearch, onSelect, onClaim, onRelease, onScan, onQuantity, onLocation, onIssue, onInventory, onMove, onResetRoute, onStage, onPrint }: PickWorkspaceProps) {
  const [tab, setTab] = useState("unpicked");
  const [editRoute, setEditRoute] = useState(false);
  const [map, setMap] = useState(false);
  const [claimFilter, setClaimFilter] = useState("all");
  const filtered = orders.filter(order => `${order.id} ${order.shipmentId} ${order.customer}`.toLowerCase().includes(search.toLowerCase()) && (claimFilter === "all" || (claimFilter === "claimed" ? !!order.assignedTo : !order.assignedTo)));
  const allItems = [...selected.items].sort((a, b) => a.routeRank - b.routeRank);
  const items = allItems.filter(item => tab === "all" || (tab === "picked" ? item.status === "picked" : item.status !== "picked"));
  const p = progress(selected);
  const editable = ["picking", "exception", "picked"].includes(selected.status);
  return <>
    <PageHeading eyebrow="Fulfillment · scan-verified picking" title="Prepare pickup & delivery" copy="Scan the location first, then scan each item. Type an item number only when the product has no usable barcode."/>
    <div className="workspace-grid compact-workspace">
      <section className="panel queue-panel"><div className="panel-head"><div><h2>Pick queue</h2><p>{orders.filter(order => order.assignedTo).length} claimed · {orders.filter(order => !order.assignedTo).length} unclaimed</p></div></div><div className="pick-queue-tools"><label className="search"><Icon name="search"/><input aria-label="Search pick orders" value={search} onChange={event => setSearch(event.target.value)} placeholder="Order, shipment, customer"/></label><select aria-label="Claim filter" value={claimFilter} onChange={event => setClaimFilter(event.target.value)}><option value="all">All orders</option><option value="claimed">Claimed</option><option value="unclaimed">Unclaimed</option></select></div><OrderQueue orders={filtered} selectedId={selected.id} onSelect={id => { onSelect(id); setTab("unpicked"); }}/></section>
      <section className="panel detail-panel">
        <div className="shipment-header"><div><span className={"status " + selected.status}>{statusLabel[selected.status]}</span><h2>Order #{selected.id}</h2><p>{selected.shipmentId} · {selected.channel}</p></div><div className="shipment-progress"><b>{p.picked}/{p.units}</b><span>units picked</span></div></div>
        <div className="shipment-strip"><span><Icon name="user"/>{selected.assignedTo || "Unclaimed"}</span><span><Icon name="clock"/>{selected.promised}</span>{selected.priority === "rush" && <b className="waiting-badge">Rush</b>}{selected.dueAt && Date.parse(selected.dueAt) < Date.now() && selected.status !== "complete" && <b className="status denied">Past due</b>}</div>
        <details className="shipment-details"><summary>Customer & shipment details</summary><p><strong>{selected.customer}</strong> · Phone ending {selected.phone?.slice(-4) || "not recorded"}</p><p>{selected.notes || "No special handling notes."}</p>{selected.dueAt && <p>Demo deadline: {new Date(selected.dueAt).toLocaleString()}</p>}<div className="inline-actions"><button className="button ghost compact" onClick={() => onPrint(selected.id, "pick")}>Print pick ticket</button>{editable && selected.status !== "picked" && <button className="button ghost compact" onClick={() => onRelease(selected)}>Release claim</button>}</div></details>
        {selected.status === "ready_to_pick" ? <div className="claim-banner"><strong>Claim this shipment before picking.</strong><button className="button primary" onClick={() => onClaim(selected)}>Claim pick</button></div> : editable && <><div className="scan-sequence"><span className="done">1</span><b>Scan shelf location</b><i/><span>2</span><b>Scan each item</b></div><form className="scan-bar compact-scan" onSubmit={event => onScan(event, selected)}><Icon name="scan"/><input name="scan" aria-label="Scan item barcode" autoComplete="off" placeholder="Scan item barcode" required/><button className="button primary">Verify + add 1</button></form><p className="scan-help">No barcode label on the product? Enter the item number only for lines marked <b>No barcode · item # allowed</b>.</p></>}
        <div className="pick-toolbar"><div className="segmented-tabs">{[["unpicked", "Unpicked"], ["picked", "Picked"], ["all", "All"]].map(([value, label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label} <b>{allItems.filter(item => value === "all" || (value === "picked" ? item.status === "picked" : item.status !== "picked")).length}</b></button>)}</div><div className="inline-actions"><button className="button ghost compact" onClick={() => setMap(!map)}>{map ? "Hide route" : "Route / locations"}</button><button className="button ghost compact" onClick={() => { setEditRoute(!editRoute); setTab("all"); }}>{editRoute ? "Done sorting" : "Edit route"}</button>{selected.routeMode === "manual" && <button className="text-button" onClick={() => onResetRoute(selected)}>Restore suggested</button>}</div></div>
        {map && <div className="route-overview"><strong>{selected.routeMode === "manual" ? "Your manual route" : "Suggested aisle sequence"}</strong><p>Ordered stops—not a store floor map. Approved store-map data is not connected.</p><ol>{allItems.map(item => <li key={item.id}><b>{item.location}</b><span>{item.sku} · {item.name}</span></li>)}</ol></div>}
        <div className="compact-picks">{items.length ? items.map(item => { const index = allItems.findIndex(value => value.id === item.id); return <article className={"compact-pick " + item.status} key={item.id}>
          <div className="pick-row-main"><span className="stop-number">{index + 1}</span><div className="pick-row-copy"><strong className="pick-location">{item.verifiedLocation || item.location}</strong><h3>{item.name}</h3><p>Item #{item.sku} · Available {item.availableQuantity ?? "—"} <small>(demo)</small>{item.flags?.length ? " · " + item.flags.join(" · ") : ""}</p></div><div className="pick-row-quantity"><b>{item.pickedQuantity}/{item.quantity}</b><span>picked</span></div></div>
          {item.issue && <div className="item-issue"><Icon name="alert"/>{item.issue}</div>}
          <div className="pick-row-actions">{editRoute && <div className="move-buttons"><button aria-label={"Move " + item.name + " earlier"} disabled={index === 0 || !editable} onClick={() => onMove(selected, item, -1)}><Icon name="up"/></button><button aria-label={"Move " + item.name + " later"} disabled={index === allItems.length - 1 || !editable} onClick={() => onMove(selected, item, 1)}><Icon name="down"/></button></div>}
          {item.status === "picked" ? <span className="verified-tag">✓ Picked by scan</span> : item.verifiedLocation ? <span className="verified-tag">✓ Location scanned · now scan {item.barcode ? "item barcode" : `item #${item.sku}`}</span> : <form className="inline-location-scan" onSubmit={event => { event.preventDefault(); onLocation(selected, item.id, String(new FormData(event.currentTarget).get("location"))); event.currentTarget.reset(); }}><Icon name="scan"/><input name="location" aria-label={`Scan location barcode for ${item.name}`} placeholder="Scan location barcode" required/><button className="button primary compact" disabled={!editable}>Verify location</button></form>}
          </div>
          <details className="pick-row-details"><summary>Barcode & item details</summary><div className="expanded-item-grid"><div><strong>Model {item.model || "Not supplied"}</strong><p>{item.price !== undefined ? "$" + item.price.toFixed(2) : "Price not supplied by demo catalog"}</p>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="catalog-image"/> : <p className="catalog-placeholder">Product photo will appear when the approved catalog is connected.</p>}</div><div className="barcode-details"><p><b>Demo location barcode:</b> {item.locationBarcode}</p><p><b>{item.barcode ? "Demo item barcode" : "No usable barcode"}:</b> {item.barcode || `Enter item #${item.sku}`}</p><small>Production values come from the approved location and catalog services.</small></div></div><div className="inline-actions"><button className="button ghost compact" disabled={!editable} onClick={() => onIssue(selected.id, item.id)}>Report issue</button><button className="button ghost compact" onClick={() => onInventory(selected.id, item.id)}>Request inventory check</button></div></details>
        </article>; }) : <div className="empty-state"><strong>{tab === "unpicked" ? "No unpicked items" : "No items in this view"}</strong><p>Choose another tab to review the shipment.</p></div>}</div>
        <div className="shipment-actionbar"><span><b>{p.percent}%</b> picked · {selected.groups.length} staging groups</span>{selected.status === "picked" ? <button className="button success" onClick={() => onStage(selected.id)}>Stage this order</button> : <button className="button ghost" onClick={() => onPrint(selected.id, "pick")}>Print pick ticket</button>}</div>
        <AuditTrail order={selected}/>
      </section>
    </div>
  </>;
}

function StageWorkspace({ orders, selected, onSelect, onStageGroup, onFinalize, onStageAll, onPrint }: { orders: Order[]; selected: Order; onSelect: (id: string) => void; onStageGroup: (event: FormEvent<HTMLFormElement>, order: Order, groupId: string) => void; onFinalize: (order: Order) => void; onStageAll: (event: FormEvent<HTMLFormElement>, order: Order) => void; onPrint: (id: string, kind: PrintKind) => void }) {
  const complete = selected.groups.filter((group) => group.location).length;
  return <>
    <PageHeading eyebrow="Consolidation · barcode-verified locations" title="Stage orders" copy="Scan the staging-location barcode for every group before the order can be marked ready." actions={<button className="button ghost" onClick={() => onPrint(selected.id, "labels")}>Print staging labels</button>}/>
    <div className="workspace-grid"><section className="panel queue-panel"><div className="panel-head"><div><h2>Staging queue</h2><p>{orders.length} orders picked or staged</p></div></div><OrderQueue orders={orders} selectedId={selected.id} onSelect={onSelect}/></section>
      <section className="panel detail-panel"><div className="detail-title"><div><span className={`status ${selected.status}`}>{statusLabel[selected.status]}</span><h2>#{selected.id} · {selected.customer}</h2><p>{selected.items.length} lines · {selected.groups.length} staging groups</p></div><div className="owner-card"><span>Last handled by</span><strong><Icon name="user"/>{selected.currentHandler ?? "Unassigned"}</strong></div></div>
        <details className="stage-all"><summary>Stage all together</summary><form className="operation-form" onSubmit={event => onStageAll(event, selected)}><label>Scan shared staging-location barcode<input name="location" required placeholder="Scan staging barcode" maxLength={150} autoComplete="off"/></label><small>Demo format: STAGE-PU-11</small><label className="check-label"><input name="verified" type="checkbox" required/><span>I verified all groups can safely share this location, including secure or oversized items.</span></label><button className="button primary">Scan and stage all groups</button></form></details>
        <div className="stage-progress"><span><b>{complete}</b> of {selected.groups.length} groups located</span><div><i style={{ width: `${selected.groups.length ? complete / selected.groups.length * 100 : 0}%` }}/></div></div>
        <div className="group-list">{selected.groups.map((group, index) => <article key={group.id} className={group.location ? "staged" : ""}><div className="group-icon"><Icon name={group.type === "bulky" ? "truck" : group.type === "secure" ? "shield" : "box"}/></div><div className="group-copy"><span>Group {index + 1} · {group.type}</span><h3>{group.label}</h3><p>{group.itemIds.length} line{group.itemIds.length === 1 ? "" : "s"} · {group.itemIds.map((id) => selected.items.find((item) => item.id === id)?.name).join(", ")}</p>{group.location && <div className="stage-location"><Icon name="pin"/><b>{group.location}</b><small>Barcode scanned by {group.stagedBy}</small></div>}</div><form key={selected.id + group.id + group.location} onSubmit={(event) => onStageGroup(event, selected, group.id)}><label><Icon name="scan"/><input name="location" placeholder="Scan staging barcode" autoComplete="off" required/></label><small>Demo: STAGE-PU-{index + 11}</small><button className={`button compact ${group.location ? "ghost" : "primary"}`} type="submit">{group.location ? "Scan new location" : "Scan + stage"}</button></form></article>)}</div>
        <div className="finalize-row"><div><Icon name={complete === selected.groups.length ? "check" : "alert"}/><span><strong>{complete === selected.groups.length ? "Ready to finalize" : "Order not fully staged"}</strong><small>{complete === selected.groups.length ? "Customer-ready status will be released." : `${selected.groups.length - complete} group${selected.groups.length - complete === 1 ? "" : "s"} still need a location.`}</small></span></div><button className="button success" disabled={complete !== selected.groups.length || selected.status === "ready"} onClick={() => onFinalize(selected)}>{selected.status === "ready" ? "Already ready" : "Finalize staging"}</button></div>
        <AuditTrail order={selected}/>
      </section>
    </div>
  </>;
}

function CheckInWorkspace({ orders, readyOrders, arrivals, selected, actor, onSelect, onCheckIn, onAdvance, onOpen }: { orders: Order[]; readyOrders: Order[]; arrivals: Order[]; selected: Order; actor: string; onSelect: (id: string) => void; onCheckIn: (event: FormEvent<HTMLFormElement>, order: Order) => void; onAdvance: (order: Order) => void; onOpen: (area: Area, id?: string) => void }) {
  const [mode, setMode] = useState<"ready" | "arrivals">(arrivals.some(item => item.id === selected.id) ? "arrivals" : "ready");
  const [query, setQuery] = useState(!["ready", "arrived", "retrieving", "at_vehicle"].includes(selected.status) ? selected.id : "");
  const [lookup, setLookup] = useState(!["ready", "arrived", "retrieving", "at_vehicle"].includes(selected.status) ? selected.id : "");
  const [method, setMethod] = useState<"curbside" | "in_store">("curbside");
  const [timestamp, setTimestamp] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setTimestamp(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const sortedArrivals = [...arrivals].sort((a, b) => (a.checkIn?.arrivedAt ?? "").localeCompare(b.checkIn?.arrivedAt ?? ""));
  const queue = lookup ? orders.filter(order => matchesPickup(order, lookup)) : mode === "ready" ? readyOrders : sortedArrivals;
  const current = queue.find(order => order.id === selected.id) ?? queue[0];
  const active = current && arrivalStatuses.includes(current.status);
  const problem = current ? checkInError(current) : null;
  const select = (id: string) => { onSelect(id); setMethod("curbside"); };
  const timed = arrivals.map(order => waitMinutes(order, timestamp)).filter((value): value is number => value !== null);
  return <>
    <PageHeading eyebrow="Pickup · fast customer arrival" title="Find customer. Start handoff." copy="Use an order number or full phone number. Confirm the matching order before checking in."/>
    <form className="pickup-search" onSubmit={event => { event.preventDefault(); setLookup(query.trim()); }}>
      <label htmlFor="pickup-lookup">Order number or phone number</label>
      <div><Icon name="search"/><input id="pickup-lookup" value={query} onChange={event => { setQuery(event.target.value); if (!event.target.value.trim()) setLookup(""); }} placeholder="73912 or (704) 555-0104" autoComplete="off" inputMode="tel" required/><button className="button primary" type="submit">Find customer</button>{lookup && <button className="button ghost" type="button" onClick={() => { setQuery(""); setLookup(""); }}>Clear</button>}</div>
      <small>Demo: order 73912 · phone (704) 555-0104. A shared phone can return multiple orders; choose the correct one.</small>
    </form>
    <div className="pickup-pulse"><span><b>{arrivals.length}</b> customers waiting</span><span><b>{timed.length ? Math.max(...timed) + " min" : "—"}</b> longest recorded wait</span><span><b>{readyOrders.length}</b> ready for pickup</span></div>
    <div className="segmented-tabs"><button className={!lookup && mode === "ready" ? "active" : ""} onClick={() => { setMode("ready"); setLookup(""); setQuery(""); }}>Ready to check in <b>{readyOrders.length}</b></button><button className={!lookup && mode === "arrivals" ? "active" : ""} onClick={() => { setMode("arrivals"); setLookup(""); setQuery(""); }}>Customers waiting <b>{arrivals.length}</b></button></div>
    <div className="workspace-grid">
      <section className="panel queue-panel"><div className="panel-head"><div><h2>{lookup ? "Matching orders" : mode === "ready" ? "Ready orders" : "Waiting customers"}</h2><p>{lookup ? queue.length + " exact matches · confirm customer and items" : mode === "arrivals" ? "Oldest arrivals first" : "Select a customer to assist"}</p></div></div>
        <div className="pickup-queue">{queue.length ? queue.map(order => {
          const minutes = waitMinutes(order, timestamp);
          return <button key={order.id} className={current?.id === order.id ? "selected" : ""} onClick={() => select(order.id)}>
            <div><span className={"status " + order.status}>{statusLabel[order.status]}</span>{arrivalStatuses.includes(order.status) && <small className="waiting-badge">{minutes === null ? "Arrival time not recorded" : minutes + " min waiting"}</small>}</div>
            <strong>#{order.id} · {order.customer}</strong><span>{order.phone ? "Phone ending " + order.phone.slice(-4) : "No phone on record"} · {order.items.length} item lines</span>
            <small>{order.checkIn ? (order.checkIn.method === "curbside" ? "Spot " + order.checkIn.spot : "Pickup desk") + " · " + (order.currentHandler ?? "Unassigned") : order.groups.map(group => group.location).filter(Boolean).join(" + ") || "Not staged"}</small>
          </button>;
        }) : <div className="empty-state"><Icon name="search"/><strong>{lookup ? "No matching order" : "Queue clear"}</strong><p>{lookup ? "Check the full order number or 10-digit phone number. No customer has been checked in." : "No customers in this view."}</p></div>}</div>
      </section>
      <section className="panel detail-panel">{current ? <>
        <div className="detail-title"><div><span className={"status " + current.status}>{statusLabel[current.status]}</span><h2>#{current.id} · {current.customer}</h2><p>{current.channel} · {current.items.length} item lines · {current.groups.map(group => group.location).filter(Boolean).join(" + ") || "Locations pending"}</p></div>{current.currentHandler && <div className="owner-card"><span>Current handler</span><strong><Icon name="user"/>{current.currentHandler}</strong></div>}</div>
        {active ? <><div className="callout success">Already checked in — continue the existing handoff. Do not create another arrival.</div><Handoff order={current} actor={actor} onAdvance={onAdvance}/></> : problem ? <div className="pickup-blocked"><Icon name="alert"/><h3>{current.status === "complete" ? "Pickup already completed" : "Not ready for check-in"}</h3><p>{problem}</p>{current.status !== "complete" && <button className="button primary" onClick={() => onOpen(current.channel === "Delivery" ? "delivery" : ["picked", "staging"].includes(current.status) ? "stage" : "pick", current.channel === "Delivery" ? undefined : current.id)}>Open next task</button>}</div> : <form key={current.id} className="checkin-form" onSubmit={event => { onCheckIn(event, current); setMode("arrivals"); }}>
          <div className="form-section"><span className="section-kicker">1 · Confirm the matching customer</span><p className="pickup-items">{current.items.map(item => item.quantity + " × " + item.name).join(" · ")}</p><div className="form-grid"><label>Customer / pickup person<input name="customerName" defaultValue={current.customer} required maxLength={100}/></label><label className="check-label"><input type="checkbox" name="idVerified"/><span><b>Photo ID verified</b><small>Follow the approved store verification policy.</small></span></label></div></div>
          <div className="form-section"><span className="section-kicker">2 · Where is the customer?</span><div className="method-cards"><label><input type="radio" name="method" value="curbside" checked={method === "curbside"} onChange={() => setMethod("curbside")}/><span><Icon name="car"/><b>Curbside</b><small>Parked outside</small></span></label><label><input type="radio" name="method" value="in_store" checked={method === "in_store"} onChange={() => setMethod("in_store")}/><span><Icon name="pin"/><b>In store</b><small>At the pickup desk</small></span></label></div></div>
          {method === "curbside" && <div className="form-section"><div className="form-grid"><label>Curbside spot<input name="spot" inputMode="numeric" required maxLength={12} placeholder="Spot number"/></label><label>Vehicle (optional)<input name="vehicle" maxLength={100} placeholder="Color, make and model"/></label></div></div>}
          <div className="checkin-submit"><div><Icon name="bell"/><span><strong>Start the wait clock and notify Fulfillment</strong><small>Checked in by {actor}. Phone lookup is not identity verification.</small></span></div><button className="button primary" type="submit">Check in customer</button></div>
        </form>}
        <AuditTrail order={current}/>
      </> : <div className="empty-state"><strong>Find the customer to get started</strong><p>Search above or choose a ready order. Unready or completed orders cannot be checked in.</p></div>}</section>
    </div>
  </>;
}

function Handoff({ order, actor, onAdvance }: { order: Order; actor: string; onAdvance: (order: Order) => void }) {
  const steps: OrderStatus[] = ["arrived", "retrieving", "at_vehicle", "complete"];
  const index = steps.indexOf(order.status);
  const actionLabel: Partial<Record<OrderStatus, string>> = { arrived: "Start retrieving", retrieving: order.checkIn?.method === "in_store" ? "I’m with the customer" : "I’m at the vehicle", at_vehicle: "Complete handoff" };
  return <div className="handoff"><div className="arrival-banner"><span className="arrival-icon"><Icon name={order.checkIn?.method === "curbside" ? "car" : "pin"}/></span><div><span>Customer arrived · {order.checkIn?.checkedInAt}</span><h3>{order.checkIn?.method === "curbside" ? `Spot ${order.checkIn.spot}` : "In-store pickup desk"}</h3><p>{order.checkIn?.vehicle || "No vehicle description"} · checked in by {order.checkIn?.checkedInBy}</p></div></div><div className="handoff-steps">{steps.map((step, stepIndex) => <div key={step} className={stepIndex <= index ? "done" : ""}><i>{stepIndex < index ? <Icon name="check"/> : stepIndex + 1}</i><span>{statusLabel[step]}</span></div>)}</div><div className="handoff-actions"><div><span>Action will be recorded as</span><strong><Icon name="user"/>{actor}</strong></div>{order.status !== "complete" && <button className="button primary" onClick={() => onAdvance(order)}>{actionLabel[order.status]}</button>}</div><div className="location-strip"><Icon name="box"/><span><strong>Retrieve {order.groups.length} group{order.groups.length === 1 ? "" : "s"}</strong><small>{order.groups.map((group) => `${group.label}: ${group.location}`).join(" · ")}</small></span></div></div>;
}

function DeliveryWorkspace({ deliveries, selected, role, onSelect, onReschedule, onDecision }: { deliveries: Delivery[]; selected: Delivery; role: AppRole; onSelect: (id: string) => void; onReschedule: () => void; onDecision: (decision: Exclude<Decision, "waiting">) => void }) {
  const mine = role === "Manager" ? null : selected.approvals.find((approval) => approval.role === role);
  return <>
    <PageHeading eyebrow="Delivery · controlled rescheduling" title="Delivery coordination" copy="A proposed date cannot commit until Receiving, Fulfillment and Pro sign off." actions={<button className="button primary" onClick={onReschedule}>Request date change</button>}/>
    <div className="workspace-grid"><section className="panel queue-panel"><div className="panel-head"><div><h2>Delivery orders</h2><p>{deliveries.length} scheduled or under review</p></div></div><div className="delivery-queue">{deliveries.map((delivery) => <button key={delivery.id} className={selected.id === delivery.id ? "selected" : ""} onClick={() => onSelect(delivery.id)}><div><span className={`status ${delivery.status}`}>{delivery.status.replace("_", " ")}</span><small>{delivery.window}</small></div><strong>{delivery.id} · {delivery.customer}</strong><p>{delivery.currentDate}{delivery.proposedDate && ` → ${delivery.proposedDate}`}</p><div className="approval-dots">{delivery.approvals.map((approval) => <i className={approval.decision} key={approval.role} title={`${approval.role}: ${approval.decision}`}/>)}</div></button>)}</div></section>
      <section className="panel detail-panel"><div className="detail-title"><div><span className={`status ${selected.status}`}>{selected.status.replace("_", " ")}</span><h2>{selected.id} · {selected.customer}</h2><p>Linked order #{selected.orderId} · {selected.window}</p></div><button className="button ghost compact" onClick={onReschedule}>Edit request</button></div>
        <div className="date-route"><div><span>Current date</span><strong>{selected.currentDate}</strong><small>{selected.window}</small></div><Icon name="chevron"/><div className={selected.proposedDate ? "proposed" : ""}><span>Proposed date</span><strong>{selected.proposedDate ?? "No change requested"}</strong><small>{selected.reason ?? "Submit a reason with any request"}</small></div></div>
        <div className="approval-section"><div className="section-title"><span><Icon name="shield"/> Required sign-offs</span><small>All three must approve</small></div><div className="approval-list">{selected.approvals.map((approval) => <article key={approval.role} className={`${approval.decision} ${approval.role === role ? "mine" : ""}`}><span className="avatar">{approval.person.split(" ").map((part) => part[0]).join("")}</span><div><span>{approval.role}</span><strong>{approval.person}</strong>{approval.reason && <p>{approval.reason}</p>}{approval.requestedAction && <small>Next: {approval.requestedAction}</small>}{approval.suggestedDate && <small>Suggested: {approval.suggestedDate}</small>}</div><span className={`status ${approval.decision}`}>{approval.decision.replace("_", " ")}</span></article>)}</div></div>
        {mine && selected.proposedDate && <div className="decision-bar"><div><strong>Your review · {people[role].name}</strong><small>Reason is required for denial or requested changes.</small></div><button className="button success compact" onClick={() => onDecision("approved")}>Approve</button><button className="button warning compact" onClick={() => onDecision("needs_changes")}>Request changes</button><button className="button danger compact" onClick={() => onDecision("denied")}>Deny</button></div>}
        <div className="audit"><div className="section-title"><span><Icon name="history"/> Decision history</span></div>{selected.audit.map((event) => <p key={event.id}><i/><span><b>{event.actor}</b> ({event.role}) {event.action}</span><time>{event.at}</time></p>)}</div>
      </section>
    </div>
  </>;
}

function NotificationsWorkspace({ notifications, role, onOpen, onReadAll }: { notifications: AppNotification[]; role: AppRole; onOpen: (item: AppNotification) => void; onReadAll: () => void }) {
  return <>
    <PageHeading eyebrow={`Inbox · ${people[role].name}`} title="Notifications" copy="Role-routed work with direct links back to the affected order." actions={<button className="button ghost" onClick={onReadAll}>Mark all read</button>}/>
    <section className="panel notifications-page"><div className="notification-summary"><span><b>{notifications.filter((item) => !item.read).length}</b> unread</span><span><b>{notifications.filter((item) => item.priority === "high" && !item.read).length}</b> high priority</span><span><b>{notifications.length}</b> total</span></div><div className="notification-list">{notifications.length ? notifications.map((item) => <button key={item.id} className={`${item.read ? "read" : "unread"} ${item.priority}`} onClick={() => onOpen(item)}><span className="notification-icon"><Icon name={item.priority === "high" ? "alert" : item.area === "delivery" ? "truck" : item.area === "stage" ? "box" : "bell"}/></span><div><div><strong>{item.title}</strong><time>{item.at}</time></div><p>{item.message}</p><small>For {item.recipient} · Open {workAreas.includes(item.area) ? "Order work" : nav.find((entry) => entry.id === item.area)?.label}</small></div>{!item.read && <i/>}</button>) : <div className="empty-state"><Icon name="bell"/><strong>Nothing for this role</strong><p>New work will appear here.</p></div>}</div></section>
  </>;
}

function ReadinessWorkspace() {
  const downloadContract = () => {
    const blob = new Blob([downloadableIntegrationManifest()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders-ops-integration-contract.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return <>
    <PageHeading eyebrow="Architecture · clean-room boundary" title="Integration readiness" copy="The pilot is functional with simulated data. These approved interfaces are required before production use." actions={<button className="button primary" onClick={downloadContract}>Download interface contract</button>}/>
    <div className="boundary-banner"><Icon name="shield"/><div><strong>Not connected to Lowe’s production systems</strong><p>No proprietary endpoint, credential, employee record or live customer order is stored in this pilot. The connector contract isolates the UI from the future approved system of record.</p></div><span>MOCK ADAPTER</span></div>
    <div className="contract-strip"><div><span>Adapter mode</span><b>{integrationContract.mode}</b></div><div><span>Contract</span><b>{integrationContract.contractVersion}</b></div><div><span>Write safety</span><b>Idempotent + versioned</b></div><div><span>Device handling</span><b>Offline queue ready</b></div></div>
    <div className="integration-grid">{integrationReadiness.map((item, index) => <article key={item.key}><div className="integration-number">{String(index + 1).padStart(2, "0")}</div><div><span>{item.owner}</span><h3>{item.name}</h3><p>{item.purpose}</p><small><b>{item.direction}</b> · {item.identifiers}</small><small>{item.actions}</small></div><b>Interface ready</b></article>)}</div>
    <div className="readiness-bottom"><section className="panel"><div className="panel-head"><div><h2>Production controls</h2><p>Minimum technical gates for a Regional pilot.</p></div></div><ul className="check-list"><li><Icon name="check"/>Enterprise SSO and role authorization</li><li><Icon name="check"/>Store-level data isolation and least privilege</li><li><Icon name="check"/>Immutable audit export and retention policy</li><li><Icon name="check"/>PII minimization, encryption and deletion rules</li><li><Icon name="check"/>Offline queue conflict handling on Zebra devices</li><li><Icon name="check"/>Sandbox integration tests and rollback plan</li></ul></section><section className="panel"><div className="panel-head"><div><h2>Pilot measurement</h2><p>Show whether the workflow helps associates and customers.</p></div></div><ul className="metric-list"><li><span>Pick travel</span><b>Steps / order</b></li><li><span>Pick quality</span><b>Exceptions / 100 lines</b></li><li><span>Stage quality</span><b>Location errors</b></li><li><span>Customer handoff</span><b>Arrival → complete</b></li><li><span>Delivery change</span><b>Time to all sign-offs</b></li><li><span>Associate experience</span><b>Task survey</b></li></ul></section></div>
  </>;
}

function AuditTrail({ order }: { order: Order }) {
  return <details className="audit"><summary><span><Icon name="history"/> Audit history</span><small>{order.audit.length} events</small></summary>{order.audit.map((event) => <p key={event.id}><i/><span><b>{event.actor}</b> ({event.role}) {event.action}</span><time>{event.at}</time></p>)}</details>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose} aria-label="Close"><Icon name="close"/></button></header>{children}</section></div>;
}
