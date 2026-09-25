import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appState } from "../../../db/schema";
import { freshSeedState, upgradeDemoState } from "../../data";
import { getChatGPTUser } from "../../chatgpt-auth";
import { checkInError } from "../../../lib/workflows";
import { stateTransitionError } from "../../../lib/operations";
import type { AppState } from "../../types";

const STATE_ID = "store-0421-pilot";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected persistence error";
  if (message.includes("no such table")) {
    return "The pilot database has not been migrated yet. Deploy the generated Drizzle migration.";
  }
  return message;
}

export async function GET() {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in to load pilot orders." }, { status: 401 });
  try {
    const db = getDb();
    const [row] = await db.select().from(appState).where(eq(appState.id, STATE_ID)).limit(1);
    if (!row) {
      const state = freshSeedState();
      const now = new Date().toISOString();
      await db.insert(appState).values({ id: STATE_ID, payload: JSON.stringify(state), version: 1, updatedAt: now });
      return Response.json({ state, version: 1, source: "seeded-d1" });
    }
    return Response.json({ state: upgradeDemoState(JSON.parse(row.payload) as AppState), version: row.version, source: "d1" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: errorMessage(error), state: freshSeedState(), source: "fallback" }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in to save pilot orders." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = (await request.json()) as { state?: AppState; version?: number; reset?: boolean };
    if (!body.state?.orders || !body.state?.deliveries || !body.state?.notifications) {
      return Response.json({ error: "A complete application state is required." }, { status: 400 });
    }
    const payload = JSON.stringify({ ...body.state, lastUpdated: new Date().toISOString() });
    if (payload.length > 1_900_000) {
      return Response.json({ error: "State exceeds the pilot storage limit." }, { status: 413 });
    }
    const db = getDb();
    const [existing] = await db.select().from(appState).where(eq(appState.id, STATE_ID)).limit(1);
    if (!existing || body.version !== existing.version) return Response.json({ error: "Orders changed in another session. Refresh before continuing; your changes have not been saved." }, { status: 409 });
    const previous = upgradeDemoState(JSON.parse(existing.payload) as AppState);
    if (!body.reset) {
      const error = stateTransitionError(previous, body.state);
      if (error) return Response.json({ error }, { status: 400 });
    }
    for (const order of body.reset ? [] : body.state.orders) {
      const oldOrder = previous.orders.find(value => value.id === order.id);
      if (order.status === "arrived" && oldOrder?.status !== "arrived") {
        const problem = oldOrder ? checkInError(oldOrder) : "Order not found.";
        if (problem) return Response.json({ error: problem }, { status: 409 });
      }
    }
    const version = existing.version + 1;
    const updatedAt = new Date().toISOString();
    const updated = await db.update(appState).set({ payload, version, updatedAt }).where(and(eq(appState.id, STATE_ID), eq(appState.version, existing.version))).returning({ id: appState.id });
    if (!updated.length) return Response.json({ error: "Another session saved first. Refresh orders before continuing." }, { status: 409 });
    return Response.json({ ok: true, version, updatedAt });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
