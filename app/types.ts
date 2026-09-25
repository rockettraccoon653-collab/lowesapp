export type AppRole = "Fulfillment" | "Receiving" | "Pro specialist" | "Manager";
export type Area = "dashboard" | "pick" | "stage" | "checkin" | "inventory" | "delivery" | "notifications" | "feedback" | "readiness" | "operations" | "documents" | "demo";
export type OrderStatus = "ready_to_pick" | "picking" | "picked" | "staging" | "ready" | "arrived" | "retrieving" | "at_vehicle" | "complete" | "exception";
export type ItemStatus = "pending" | "picked" | "exception";
export type Decision = "waiting" | "approved" | "needs_changes" | "denied";

export type AuditEvent = {
  id: string;
  actor: string;
  role: AppRole | "System" | "Customer";
  action: string;
  at: string;
};

export type PickItem = {
  barcode?: string;
  locationBarcode?: string;
  model?: string;
  price?: number;
  availableQuantity?: number;
  imageUrl?: string;
  locations?: string[];
  verifiedLocation?: string;
  id: string;
  sku: string;
  name: string;
  quantity: number;
  pickedQuantity: number;
  location: string;
  zone: string;
  routeRank: number;
  suggestedRank: number;
  status: ItemStatus;
  flags?: string[];
  issue?: string;
};

export type StageGroup = {
  id: string;
  label: string;
  type: "standard" | "bulky" | "secure" | "garden";
  itemIds: string[];
  location?: string;
  stagedBy?: string;
};

export type CheckIn = {
  method: "curbside" | "in_store";
  spot?: string;
  vehicle?: string;
  customerName: string;
  idVerified: boolean;
  checkedInBy: string;
  checkedInAt: string;
  arrivedAt?: string;
  completedAt?: string;
};

export type Order = {
  shipmentId?: string;
  dueAt?: string;
  id: string;
  customer: string;
  phone?: string;
  channel: "Pickup" | "PRO Pickup" | "Delivery";
  priority: "standard" | "rush";
  promised: string;
  created: string;
  status: OrderStatus;
  assignedTo?: string;
  currentHandler?: string;
  routeMode: "suggested" | "manual";
  items: PickItem[];
  groups: StageGroup[];
  checkIn?: CheckIn;
  notes?: string;
  audit: AuditEvent[];
};

export type Approval = {
  role: "Receiving" | "Fulfillment" | "Pro specialist";
  person: string;
  decision: Decision;
  reason?: string;
  requestedAction?: string;
  suggestedDate?: string;
  at?: string;
};

export type Delivery = {
  proposedDay?: string;
  source?: "Orders" | "Genesis";
  execution?: "preparing" | "ready" | "loaded" | "complete";
  scheduledDay?: string;
  vehicle?: string;
  completedAt?: string;
  id: string;
  customer: string;
  orderId: string;
  currentDate: string;
  proposedDate?: string;
  window: string;
  status: "scheduled" | "pending" | "needs_changes" | "denied" | "approved";
  reason?: string;
  approvals: Approval[];
  audit: AuditEvent[];
};

export type AppNotification = {
  id: string;
  role: AppRole;
  recipient: string;
  title: string;
  message: string;
  at: string;
  read: boolean;
  priority: "normal" | "high";
  area: Area;
  entityId?: string;
};

export type AppState = {
  operations?: OperationTask[];
  inventorySeen?: string[];
  orders: Order[];
  deliveries: Delivery[];
  notifications: AppNotification[];
  lastUpdated: string;
};

export type OperationKind = "enroute" | "install" | "locker" | "restock";
export type OperationTask = {
  verifiedUnits?: boolean;
  id: string;
  kind: OperationKind;
  orderId: string;
  title: string;
  fromLocation: string;
  items: Array<{ sku: string; name: string; quantity: number }>;
  status: "open" | "claimed" | "complete";
  assignedTo?: string;
  destination?: string;
  note?: string;
  audit: AuditEvent[];
};

export type InventoryCheck = {
  id: string;
  orderId: string;
  itemId: string;
  sku: string;
  itemName: string;
  quantity: number;
  location: string;
  reason: string;
  searched: string;
  customerWaiting: boolean;
  requestedBy: string;
  requestedRole: AppRole;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
  reviewedBy?: string;
  reviewedAt?: string;
  decisionNote?: string;
  foundLocation?: string;
  audit: Array<{ actor: string; action: string; at: string }>;
};

export type AssociateFeedback = {
  id: string;
  area: Area;
  task: string;
  friction: "Too many taps" | "Too much walking" | "Confusing steps" | "Scanner problem" | "Missing information" | "No right option" | "Other";
  description: string;
  suggestion?: string;
  minutesLost: number;
  impact: "low" | "medium" | "high" | "blocker";
  submittedBy: string;
  submittedRole: AppRole;
  submittedAt: string;
  status: "reported" | "reviewing" | "planned" | "shipped";
  reviewedBy?: string;
  reviewedAt?: string;
};
