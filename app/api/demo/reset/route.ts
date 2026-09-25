import { env } from "cloudflare:workers";
import { canUseDemoManagerTools, getChatGPTUser } from "../../../chatgpt-auth";
import { freshSeedState } from "../../../data";

const STATE_ID = "store-0421-pilot";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to reset the demo." }, { status: 401 });
  const configuredEmails = (env as unknown as Record<string, string | undefined>).INVENTORY_MANAGER_EMAILS ?? "";
  if (!canUseDemoManagerTools(user, configuredEmails)) return Response.json({ error: "Only the authorized demo owner can reset all demo records." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json() as { confirmation?: string };
    if (body.confirmation !== "RESET DEMO") return Response.json({ error: "Type RESET DEMO exactly to continue." }, { status: 400 });
    const now = new Date().toISOString();
    const payload = JSON.stringify(freshSeedState());
    await env.DB.batch([
      env.DB.prepare("DELETE FROM associate_feedback"),
      env.DB.prepare("DELETE FROM inventory_checks"),
      env.DB.prepare("INSERT INTO app_state (id, payload, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, version = app_state.version + 1, updated_at = excluded.updated_at").bind(STATE_ID, payload, now),
    ]);
    return Response.json({ ok: true, resetAt: now });
  } catch {
    return Response.json({ error: "The full demo reset did not complete. Existing records were left available for review." }, { status: 503 });
  }
}
