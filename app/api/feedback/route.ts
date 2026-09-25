import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { associateFeedback } from "../../../db/schema";
import { canUseDemoManagerTools, getChatGPTUser } from "../../chatgpt-auth";
import { people } from "../../data";
import type { AppRole, Area, AssociateFeedback } from "../../types";

const areas: Area[] = ["dashboard", "pick", "stage", "checkin", "inventory", "delivery", "notifications", "feedback", "readiness", "operations", "documents"];
const impacts = ["low", "medium", "high", "blocker"] as const;
const statuses = ["reported", "reviewing", "planned", "shipped"] as const;
const frictions = ["Too many taps", "Too much walking", "Confusing steps", "Scanner problem", "Missing information", "No right option", "Other"] as const;

async function identity() {
  const user = await getChatGPTUser();
  const config = (env as unknown as Record<string, string | undefined>).INVENTORY_MANAGER_EMAILS ?? "";
  return { user, canManage: canUseDemoManagerTools(user, config) };
}

export async function GET() {
  const { user, canManage } = await identity();
  if (!user) return Response.json({ error: "Sign in to view associate feedback." }, { status: 401 });
  try {
    const rows = await getDb().select().from(associateFeedback).orderBy(desc(associateFeedback.createdAt));
    return Response.json({ feedback: rows.map(row => JSON.parse(row.payload)), canManage }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Associate feedback is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user } = await identity();
  if (!user) return Response.json({ error: "Sign in to submit feedback." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    const role = body.role as AppRole;
    const area = body.area as Area;
    const impact = body.impact as AssociateFeedback["impact"];
    const friction = body.friction as AssociateFeedback["friction"];
    const task = String(body.task ?? "").trim().slice(0, 160);
    const description = String(body.description ?? "").trim().slice(0, 1500);
    const suggestion = String(body.suggestion ?? "").trim().slice(0, 1000);
    const minutesLost = Math.max(0, Math.min(240, Math.round(Number(body.minutesLost) || 0)));
    if (!Object.hasOwn(people, role) || !areas.includes(area) || !impacts.includes(impact) || !frictions.includes(friction) || !task || !description) return Response.json({ error: "Complete the task, friction, impact and description fields." }, { status: 400 });
    const at = new Date().toISOString();
    const value: AssociateFeedback = { id: crypto.randomUUID(), area, task, friction, description, suggestion: suggestion || undefined, minutesLost, impact, submittedBy: `${people[role].name} (demo)`, submittedRole: role, submittedAt: at, status: "reported" };
    await getDb().insert(associateFeedback).values({ id: value.id, area, status: value.status, impact, minutesLost, payload: JSON.stringify(value), createdAt: at });
    return Response.json({ item: value }, { status: 201 });
  } catch {
    return Response.json({ error: "Feedback was not saved. Keep your note and try again." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const { user, canManage } = await identity();
  if (!user || !canManage) return Response.json({ error: "Only an authorized manager can update feedback status." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    const status = body.status as AssociateFeedback["status"];
    if (!statuses.includes(status)) return Response.json({ error: "Choose a valid feedback status." }, { status: 400 });
    const [row] = await getDb().select().from(associateFeedback).where(eq(associateFeedback.id, String(body.id))).limit(1);
    if (!row) return Response.json({ error: "Feedback not found." }, { status: 404 });
    const value = JSON.parse(row.payload) as AssociateFeedback;
    const updated: AssociateFeedback = { ...value, status, reviewedBy: user.displayName, reviewedAt: new Date().toISOString() };
    await getDb().update(associateFeedback).set({ status, payload: JSON.stringify(updated) }).where(eq(associateFeedback.id, row.id));
    return Response.json({ item: updated });
  } catch {
    return Response.json({ error: "Feedback status was not saved." }, { status: 503 });
  }
}
