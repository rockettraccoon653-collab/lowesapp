"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AppRole, Area, AssociateFeedback } from "./types";

const areaNames: Record<Area, string> = { dashboard: "Home", pick: "Picking", stage: "Staging", checkin: "Customer check-in", inventory: "Inventory", delivery: "Delivery", notifications: "Alerts", feedback: "Associate voice", readiness: "Integration", operations: "More / queues", documents: "Documents" };
const sample: AssociateFeedback[] = [
  { id: "sample-1", area: "pick", task: "Confirm a multi-quantity pick", friction: "Too many taps", description: "Quantity confirmation should stay beside the scan field so the next action is always visible.", suggestion: "Keep scan, quantity and issue actions in one thumb zone.", minutesLost: 2, impact: "high", submittedBy: "Sample associate", submittedRole: "Fulfillment", submittedAt: "2026-09-06T12:00:00Z", status: "planned" },
  { id: "sample-2", area: "stage", task: "Find all parts of a split order", friction: "Missing information", description: "The handoff should show every staging group before the customer arrives.", suggestion: "Add a one-screen group checklist with locations.", minutesLost: 5, impact: "blocker", submittedBy: "Sample associate", submittedRole: "Fulfillment", submittedAt: "2026-09-05T14:00:00Z", status: "reviewing" },
];

export default function FeedbackWorkspace({ role, currentArea }: { role: AppRole; currentArea: Area }) {
  const [items, setItems] = useState<AssociateFeedback[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"all" | AssociateFeedback["status"]>("all");
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/feedback", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(data.feedback); setCanManage(data.canManage); setError(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Feedback unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const visible = useMemo(() => (items.length ? items : sample).filter(item => filter === "all" || item.status === filter), [items, filter]);
  const realMinutes = items.reduce((sum, item) => sum + item.minutesLost, 0);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); const form = event.currentTarget; const data = new FormData(form);
    try { const response = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, area: data.get("area"), task: data.get("task"), friction: data.get("friction"), impact: data.get("impact"), minutesLost: data.get("minutesLost"), description: data.get("description"), suggestion: data.get("suggestion") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setItems(current => [result.item, ...current]); form.reset(); setNotice("Your feedback is on the frontline board."); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Feedback was not saved."); }
    finally { setBusy(false); }
  };
  const updateStatus = async (id: string, status: AssociateFeedback["status"]) => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/feedback", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(current => current.map(item => item.id === id ? data.item : item)); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Status was not saved."); }
    finally { setBusy(false); }
  };
  return <>
    <div className="page-heading"><div><span className="eyebrow">Frontline lab · built from the floor up</span><h1>Associate voice</h1><p>Report what slows the work. Keep the problem, its impact and the fix visible together.</p></div><span className="frontline-badge">Associate-first pilot</span></div>
    <div className="feedback-scorecard"><div><b>{items.length}</b><span>real pilot reports</span></div><div><b>{items.filter(item => ["reported", "reviewing"].includes(item.status)).length}</b><span>need action</span></div><div><b>{realMinutes}</b><span>minutes lost reported</span></div><p>Sample cards appear only until the first real pilot report is submitted.</p></div>
    <div className="feedback-layout"><form className="panel feedback-form" onSubmit={submit}><div className="panel-head"><div><h2>Report friction</h2><p>No customer names, phone numbers or order numbers.</p></div></div><label>Where did it happen?<select name="area" defaultValue={currentArea === "feedback" ? "dashboard" : currentArea}>{Object.entries(areaNames).filter(([key]) => key !== "feedback").map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>Task you were trying to finish<input name="task" maxLength={160} required placeholder="Example: stage a split pickup order"/></label><div className="form-grid"><label>Main friction<select name="friction" required><option>Too many taps</option><option>Too much walking</option><option>Confusing steps</option><option>Scanner problem</option><option>Missing information</option><option>No right option</option><option>Other</option></select></label><label>Impact<select name="impact" required><option value="medium">Slows the task</option><option value="high">Delays the customer</option><option value="blocker">Blocks the task</option><option value="low">Minor irritation</option></select></label></div><label>What happened?<textarea name="description" maxLength={1500} required placeholder="Describe the exact step that got in the way."/></label><label>Your fix (optional)<textarea name="suggestion" maxLength={1000} placeholder="What would make this faster or clearer?"/></label><label>Estimated minutes lost<input name="minutesLost" type="number" min="0" max="240" defaultValue="0" inputMode="numeric"/></label>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="callout success" role="status">{notice}</p>}<button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Put it on the board"}</button></form>
      <section className="panel feedback-board"><div className="panel-head"><div><h2>Frontline board</h2><p>Ranked by impact, then recency.</p></div></div><div className="segmented-tabs">{["all", "reported", "reviewing", "planned", "shipped"].map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value as typeof filter)}>{value}</button>)}</div>{loading ? <div className="empty-state">Loading feedback…</div> : <div className="feedback-list">{visible.map(item => <article key={item.id} className={`feedback-card ${item.impact}`}><header><span className={`status ${item.status}`}>{item.status}</span><b>{item.impact}</b></header><h3>{item.task}</h3><p>{item.description}</p>{item.suggestion && <blockquote>Suggested fix: {item.suggestion}</blockquote>}<footer><span>{areaNames[item.area]} · {item.friction}</span><span>{item.minutesLost} min lost · {item.submittedBy}</span></footer>{canManage && !item.id.startsWith("sample-") && <label>Manager status<select value={item.status} disabled={busy} onChange={event => void updateStatus(item.id, event.target.value as AssociateFeedback["status"])}><option value="reported">Reported</option><option value="reviewing">Reviewing</option><option value="planned">Planned</option><option value="shipped">Shipped</option></select></label>}</article>)}{!visible.length && <div className="empty-state"><strong>No reports in this view</strong><p>Change the filter or submit the first report.</p></div>}</div>}</section></div>
    <p className="fine-print">Feedback records use fictional demonstration roles. Production use requires Lowe’s-approved identity, retention and privacy controls.</p>
  </>;
}
