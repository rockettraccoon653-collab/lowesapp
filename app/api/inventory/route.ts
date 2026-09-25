import { env } from "cloudflare:workers";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { appState, inventoryChecks } from "../../../db/schema";
import { canUseDemoManagerTools, getChatGPTUser } from "../../chatgpt-auth";
import { freshSeedState, people } from "../../data";
import type { AppRole, AppState, InventoryCheck } from "../../types";
import { inventoryDecisionError } from "../../../lib/workflows";

async function identity() {
  const user = await getChatGPTUser();
  const config = (env as unknown as Record<string, string | undefined>).INVENTORY_MANAGER_EMAILS ?? "";
  return { user, canManage: canUseDemoManagerTools(user, config) };
}

export async function GET() {
  const { user, canManage } = await identity();
  if (!user) return Response.json({ error: "Sign in to use inventory requests." }, { status: 401 });
  try {
    const rows = await getDb().select().from(inventoryChecks).orderBy(desc(inventoryChecks.createdAt));
    return Response.json({ requests: rows.map(row => JSON.parse(row.payload)), canManage }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Inventory requests are unavailable. No changes have been saved." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, canManage } = await identity();
  if (!user) return Response.json({ error: "Sign in to use inventory requests." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    const role = body.role as AppRole;
    if (!Object.hasOwn(people, role)) return Response.json({ error: "Select a valid demonstration role." }, { status: 400 });
    const db = getDb();
    const at = new Date().toISOString();
    const actor = `${people[role].name} (demo)`;
    if (body.action === "request") {
      const [snapshot] = await db.select().from(appState).where(eq(appState.id, "store-0421-pilot")).limit(1);
      const state = snapshot ? JSON.parse(snapshot.payload) as AppState : freshSeedState();
      const order = state.orders.find(value => value.id === body.orderId);
      const item = order?.items.find(value => value.id === body.itemId);
      if (!order || !item) return Response.json({ error: "Order or item not found." }, { status: 404 });
      const reason = String(body.reason ?? "").trim().slice(0, 200);
      const searched = String(body.searched ?? "").trim().slice(0, 1000);
      if (!reason || !searched) return Response.json({ error: "Reason and locations searched are required." }, { status: 400 });
      const value: InventoryCheck = { id: crypto.randomUUID(), orderId: order.id, itemId: item.id, sku: item.sku, itemName: item.name, quantity: item.quantity, location: item.location, reason, searched, customerWaiting: body.customerWaiting === true, requestedBy: actor, requestedRole: role, requestedAt: at, status: "pending", audit: [{ actor: `${user.displayName} · ${actor}`, action: "Requested inventory check", at }] };
      const inserted = await db.insert(inventoryChecks).values({ id: value.id, orderItem: `${order.id}:${item.id}`, payload: JSON.stringify(value), status: "pending", createdAt: at }).onConflictDoNothing().returning({ id: inventoryChecks.id });
      if (!inserted.length) return Response.json({ error: "This item already has an inventory request. Open Inventory to view its status." }, { status: 409 });
      return Response.json({ request: value }, { status: 201 });
    }
    if (body.action === "decide") {
      if (!canManage || role !== "Manager") return Response.json({ error: "Only an authorized manager can make this decision." }, { status: 403 });
      const [row] = await db.select().from(inventoryChecks).where(eq(inventoryChecks.id, String(body.id))).limit(1);
      if (!row) return Response.json({ error: "Request not found." }, { status: 404 });
      const value = JSON.parse(row.payload) as InventoryCheck;
      const note = String(body.note ?? "").trim().slice(0, 1000);
      const location = String(body.location ?? "").trim().slice(0, 200);
      const problem = inventoryDecisionError(value, body.decision, note, location, canManage, role);
      if (problem) return Response.json({ error: problem }, { status: value.status !== "pending" ? 409 : 400 });
      const updated: InventoryCheck = { ...value, status: body.decision, reviewedBy: actor, reviewedAt: at, decisionNote: note, foundLocation: body.decision === "denied" ? location : undefined, audit: [...value.audit, { actor: `${user.displayName} · ${actor}`, action: `${body.decision === "approved" ? "Approved inventory check" : "Denied — product located"}: ${note}${location ? ` · ${location}` : ""}`, at }] };
      const rows = await db.update(inventoryChecks).set({ status: updated.status, payload: JSON.stringify(updated) }).where(and(eq(inventoryChecks.id, row.id), eq(inventoryChecks.status, "pending"))).returning({ id: inventoryChecks.id });
      if (!rows.length) return Response.json({ error: "Another manager already reviewed this request." }, { status: 409 });
      return Response.json({ request: updated });
    }
    return Response.json({ error: "Unknown inventory action." }, { status: 400 });
  } catch {
    return Response.json({ error: "Unable to save the inventory request. Refresh before retrying." }, { status: 503 });
  }
}
