import type { AppRole, AppState, AuditEvent, Order, OperationTask } from "./types";

export const people: Record<AppRole, { name: string; title: string }> = {
  Fulfillment: { name: "Jordan M.", title: "Fulfillment Lead" },
  Receiving: { name: "Maya R.", title: "Receiving Lead" },
  "Pro specialist": { name: "Alex P.", title: "Pro Sales Specialist" },
  Manager: { name: "Dana W.", title: "Store Manager" },
};

const audit = (id: string, actor: string, role: AuditEvent["role"], action: string, at: string): AuditEvent => ({ id, actor, role, action, at });

const orders: Order[] = [
  {
    id: "48291", customer: "Morgan T.", channel: "Pickup", priority: "rush", promised: "Today · 3:00 PM", created: "12:38 PM", status: "picking", assignedTo: "Jordan M.", currentHandler: "Jordan M.", routeMode: "suggested", notes: "Loader required for concrete block group.",
    items: [
      { id: "i1", sku: "10385", name: "QUIKRETE 80-lb Concrete Mix", quantity: 24, pickedQuantity: 0, location: "Lumber · Aisle 22 · Bay 4", zone: "Lumber", routeRank: 1, suggestedRank: 1, status: "pending", flags: ["Heavy", "Team lift"] },
      { id: "i2", sku: "37829", name: "Blue Hawk 10-ft Tarp", quantity: 2, pickedQuantity: 2, location: "Hardware · Aisle 15 · Bay 11", zone: "Hardware", routeRank: 2, suggestedRank: 2, status: "picked" },
      { id: "i3", sku: "501412", name: "Project Source Storage Tote", quantity: 4, pickedQuantity: 0, location: "Storage · Aisle 2 · Bay 8", zone: "Storage", routeRank: 3, suggestedRank: 3, status: "pending" },
    ],
    groups: [
      { id: "g1", label: "General merchandise", type: "standard", itemIds: ["i2", "i3"] },
      { id: "g2", label: "Concrete / loader", type: "bulky", itemIds: ["i1"] },
    ],
    audit: [audit("a1", "Jordan M.", "Fulfillment", "Claimed pick", "2:02 PM"), audit("a2", "System", "System", "Order released to pick queue", "1:58 PM")],
  },
  {
    id: "54820", customer: "Casey R.", channel: "Pickup", priority: "standard", promised: "Today · 4:00 PM", created: "1:05 PM", status: "ready_to_pick", routeMode: "suggested",
    items: [
      { id: "i4", sku: "84912", name: "Kobalt 24V Drill Kit", quantity: 1, pickedQuantity: 0, location: "Tools · Aisle 63 · Bay 2", zone: "Tools", routeRank: 1, suggestedRank: 1, status: "pending", flags: ["Secure cage"] },
      { id: "i5", sku: "241109", name: "Libman Microfiber Cloths 12-Pack", quantity: 2, pickedQuantity: 0, location: "Cleaning · Aisle 1 · Bay 6", zone: "Cleaning", routeRank: 2, suggestedRank: 2, status: "pending" },
      { id: "i6", sku: "17737", name: "GE LED A19 Bulb 8-Pack", quantity: 2, pickedQuantity: 0, location: "Electrical · Aisle 9 · Bay 3", zone: "Electrical", routeRank: 3, suggestedRank: 3, status: "pending" },
      { id: "i7", sku: "59002", name: "Utilitech 50-ft Extension Cord", quantity: 1, pickedQuantity: 0, location: "Electrical · Aisle 10 · Bay 1", zone: "Electrical", routeRank: 4, suggestedRank: 4, status: "pending" },
    ],
    groups: [
      { id: "g3", label: "General merchandise", type: "standard", itemIds: ["i5", "i6", "i7"] },
      { id: "g4", label: "Secure item", type: "secure", itemIds: ["i4"] },
    ],
    audit: [audit("a3", "System", "System", "Order released to pick queue", "2:07 PM")],
  },
  {
    id: "66104", customer: "Taylor B.", channel: "PRO Pickup", priority: "standard", promised: "Today · 5:30 PM", created: "11:44 AM", status: "picked", assignedTo: "Sam K.", currentHandler: "Sam K.", routeMode: "manual",
    items: [
      { id: "i8", sku: "11220", name: "Severe Weather 2-in x 4-in x 8-ft Lumber", quantity: 12, pickedQuantity: 12, location: "Lumber · Aisle 21 · Bay 2", zone: "Lumber", routeRank: 1, suggestedRank: 2, status: "picked", flags: ["Bulky"] },
      { id: "i9", sku: "99107", name: "Grip-Rite Exterior Screws 5-lb", quantity: 3, pickedQuantity: 3, location: "Hardware · Aisle 15 · Bay 3", zone: "Hardware", routeRank: 2, suggestedRank: 1, status: "picked" },
      { id: "i10", sku: "337710", name: "Simpson Strong-Tie Joist Hanger", quantity: 8, pickedQuantity: 8, location: "Hardware · Aisle 16 · Bay 7", zone: "Hardware", routeRank: 3, suggestedRank: 3, status: "picked" },
    ],
    groups: [
      { id: "g5", label: "Hardware carton", type: "standard", itemIds: ["i9", "i10"] },
      { id: "g6", label: "Lumber cart", type: "bulky", itemIds: ["i8"] },
    ],
    audit: [audit("a4", "Sam K.", "Fulfillment", "Completed all picks", "1:47 PM"), audit("a5", "Sam K.", "Fulfillment", "Changed route to manual order", "1:22 PM")],
  },
  {
    id: "73912", customer: "Pat D.", channel: "Pickup", priority: "standard", promised: "Ready", created: "Yesterday", status: "ready", assignedTo: "Jordan M.", currentHandler: "Maya R.", routeMode: "suggested",
    items: [
      { id: "i11", sku: "400823", name: "CRAFTSMAN 6-Gallon Shop Vacuum", quantity: 1, pickedQuantity: 1, location: "Tools · Aisle 62 · Bay 8", zone: "Tools", routeRank: 1, suggestedRank: 1, status: "picked" },
      { id: "i12", sku: "278839", name: "Project Source Contractor Bags", quantity: 2, pickedQuantity: 2, location: "Cleaning · Aisle 1 · Bay 2", zone: "Cleaning", routeRank: 2, suggestedRank: 2, status: "picked" },
    ],
    groups: [{ id: "g7", label: "Pickup group", type: "standard", itemIds: ["i11", "i12"], location: "PU-11", stagedBy: "Maya R." }],
    audit: [audit("a6", "Maya R.", "Receiving", "Staged group at PU-11", "1:36 PM"), audit("a7", "Jordan M.", "Fulfillment", "Completed all picks", "1:20 PM")],
  },
  {
    id: "80614", customer: "Jamie L.", channel: "Pickup", priority: "standard", promised: "Ready", created: "Today · 9:13 AM", status: "arrived", assignedTo: "Riley S.", currentHandler: "Riley S.", routeMode: "suggested",
    items: [{ id: "i13", sku: "441910", name: "Style Selections Patio Chair", quantity: 2, pickedQuantity: 2, location: "Seasonal · Aisle 30 · Bay 1", zone: "Seasonal", routeRank: 1, suggestedRank: 1, status: "picked", flags: ["Bulky"] }],
    groups: [{ id: "g8", label: "Patio set", type: "bulky", itemIds: ["i13"], location: "Garden Hold", stagedBy: "Jordan M." }],
    checkIn: { method: "curbside", spot: "3", vehicle: "Blue Ford F-150", customerName: "Jamie L.", idVerified: false, checkedInBy: "Customer", checkedInAt: "2:14 PM" },
    audit: [audit("a8", "Riley S.", "Fulfillment", "Claimed customer handoff", "2:15 PM"), audit("a9", "Customer", "Customer", "Checked in at curbside spot 3", "2:14 PM")],
  },
];

export const seedState: AppState = {
  orders,
  deliveries: [
    {
      id: "D-78122", customer: "Northline Renovations", orderId: "66104", currentDate: "Tue, Aug 25", proposedDate: "Fri, Aug 28", window: "8 AM – 12 PM", status: "needs_changes", reason: "Jobsite requested a later delivery date.",
      approvals: [
        { role: "Receiving", person: "Maya R.", decision: "approved", at: "1:42 PM", reason: "Inbound space is clear." },
        { role: "Fulfillment", person: "Jordan M.", decision: "waiting" },
        { role: "Pro specialist", person: "Alex P.", decision: "needs_changes", at: "1:55 PM", reason: "Customer has not confirmed Friday.", requestedAction: "Contact customer and submit a confirmed date.", suggestedDate: "Mon, Aug 31" },
      ],
      audit: [audit("da1", "Alex P.", "Pro specialist", "Requested changes and a confirmed date", "1:55 PM"), audit("da2", "Maya R.", "Receiving", "Approved reschedule", "1:42 PM")],
    },
    {
      id: "D-66390", customer: "Jamie L.", orderId: "80614", currentDate: "Wed, Aug 26", window: "12 PM – 4 PM", status: "scheduled",
      approvals: [
        { role: "Receiving", person: "Maya R.", decision: "waiting" }, { role: "Fulfillment", person: "Jordan M.", decision: "waiting" }, { role: "Pro specialist", person: "Alex P.", decision: "waiting" },
      ], audit: [audit("da3", "System", "System", "Delivery scheduled", "Aug 19")],
    },
  ],
  notifications: [
    { id: "n1", role: "Fulfillment", recipient: "Jordan M.", title: "Customer arrived · #80614", message: "Jamie L. is waiting in curbside spot 3. Riley S. claimed the handoff.", at: "2 min ago", read: false, priority: "high", area: "checkin", entityId: "80614" },
    { id: "n2", role: "Fulfillment", recipient: "Jordan M.", title: "Delivery review required · D-78122", message: "Fulfillment sign-off is still required for the proposed date.", at: "12 min ago", read: false, priority: "high", area: "delivery", entityId: "D-78122" },
    { id: "n3", role: "Receiving", recipient: "Maya R.", title: "Order ready to stage · #66104", message: "Two groups need staging locations: hardware carton and lumber cart.", at: "6 min ago", read: false, priority: "normal", area: "stage", entityId: "66104" },
    { id: "n4", role: "Pro specialist", recipient: "Alex P.", title: "Customer confirmation needed · D-78122", message: "Confirm a replacement date with Northline Renovations and resubmit.", at: "10 min ago", read: false, priority: "high", area: "delivery", entityId: "D-78122" },
    { id: "n5", role: "Manager", recipient: "Dana W.", title: "Rush order in progress · #48291", message: "Concrete group requires a loader and remains unpicked.", at: "8 min ago", read: false, priority: "normal", area: "pick", entityId: "48291" },
  ],
  lastUpdated: new Date().toISOString(),
};

export function freshSeedState(): AppState {
  return upgradeDemoState(JSON.parse(JSON.stringify(seedState)) as AppState);
}

export function upgradeDemoState(state: AppState): AppState {
  const phones: Record<string, string> = { "48291": "7045550101", "54820": "7045550102", "66104": "7045550103", "73912": "7045550104", "80614": "7045550105" };
  const today = new Date().toISOString().slice(0, 10);
  const tasks: OperationTask[] = [
    { id: "OP-101", kind: "enroute", orderId: "73912", title: "Customer on the way · move pickup group", fromLocation: "PU-11", items: [{ sku: "400823", name: "Shop vacuum", quantity: 1 }, { sku: "278839", name: "Contractor bags", quantity: 2 }], status: "open", note: "Fictional arrival notice. Move the complete group to an accessible pickup hold.", audit: [] },
    { id: "OP-102", kind: "install", orderId: "66104", title: "Installation crew · consolidate material", fromLocation: "Lumber cart", items: [{ sku: "11220", name: "Pressure-treated lumber", quantity: 12 }, { sku: "99107", name: "Exterior screws", quantity: 3 }, { sku: "337710", name: "Joist hangers", quantity: 8 }], status: "open", note: "Confirm all listed units before moving to installation hold.", audit: [] },
    { id: "OP-103", kind: "locker", orderId: "DEMO-L01", title: "Expired locker · recover held order", fromLocation: "Locker L-08", items: [{ sku: "17737", name: "LED bulb pack", quantity: 1 }], status: "open", note: "Record removal to staffed hold. This demo cannot open lockers or cancel orders.", audit: [] },
    { id: "OP-104", kind: "restock", orderId: "DEMO-R01", title: "Return cleared merchandise to selling location", fromLocation: "Returns hold R-02", items: [{ sku: "59002", name: "50-ft extension cord", quantity: 2 }], status: "open", note: "Demo return already cleared for restock. Record physical movement; no inventory adjustment is transmitted.", audit: [] },
  ];
  return { ...state, operations: state.operations ?? tasks.filter(task => task.kind === "locker" || task.kind === "restock" || state.orders.some(order => order.id === task.orderId && (task.kind === "enroute" ? order.status === "ready" : ["picked", "staging", "ready"].includes(order.status)))), orders: state.orders.map(order => ({ ...order, shipmentId: order.shipmentId ?? `DEMO-S-${order.id}`, dueAt: order.dueAt ?? (order.id === "48291" ? "2026-08-27T15:00:00Z" : undefined), phone: order.phone ?? phones[order.id], items: order.items.map(item => ({ ...item, model: item.model ?? `DEMO-${item.sku}`, availableQuantity: item.availableQuantity ?? item.quantity + 7, locations: item.locations ?? [item.location], barcode: item.sku === "241109" ? undefined : item.barcode ?? `UPC-${item.sku}`, locationBarcode: item.locationBarcode ?? `LOC-${item.zone.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${item.sku}` })) })), deliveries: state.deliveries.map((delivery, index) => ({ ...delivery, source: delivery.source ?? (index === 1 ? "Genesis" : "Orders"), execution: delivery.execution ?? "preparing", scheduledDay: delivery.scheduledDay ?? today })) };
}
