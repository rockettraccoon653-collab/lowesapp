"use client";
import { useCallback, useEffect, useState } from "react";
import type { AppRole, InventoryCheck, Order } from "./types";

export function useInventory(role: AppRole) {
  const [requests, setRequests] = useState<InventoryCheck[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRequests(data.requests); setCanManage(data.canManage); setError("");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Inventory queue unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 10000); return () => window.clearInterval(timer); }, [refresh]);
  const submit = async (body: Record<string, unknown>) => {
    if (busy) return false;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/inventory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRequests(current => [data.request, ...current.filter(item => item.id !== data.request.id)]);
      return true;
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Request could not be saved."); return false; }
    finally { setBusy(false); }
  };
  return { requests, canManage, error, busy, loading, refresh, submit };
}

export function InventoryRequestForm({ orders, initial, busy, error, onSubmit }: { orders: Order[]; initial: { orderId: string; itemId: string }; busy: boolean; error: string; onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [orderId, setOrderId] = useState(initial.orderId || orders[0]?.id || "");
  const [itemId, setItemId] = useState(initial.itemId);
  const order = orders.find(value => value.id === orderId);
  const item = order?.items.find(value => value.id === itemId) ?? order?.items[0];
  return <form className="modal-form" onSubmit={async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await onSubmit({ action: "request", orderId, itemId: item?.id, reason: form.get("reason"), searched: form.get("searched"), customerWaiting: form.get("waiting") === "on" });
  }}>
    <label>Order<select value={orderId} onChange={event => { setOrderId(event.target.value); setItemId(""); }}>{orders.map(value => <option key={value.id} value={value.id}>#{value.id} · {value.customer}</option>)}</select></label>
    <label>Item<select value={item?.id ?? ""} onChange={event => setItemId(event.target.value)}>{order?.items.map(value => <option key={value.id} value={value.id}>{value.sku} · {value.name}</option>)}</select></label>
    <div className="inventory-context"><strong>Need {item?.quantity} units</strong><span>{item?.location}</span></div>
    <label>Reason<select name="reason" required><option>Item not found</option><option>Quantity appears incorrect</option><option>Product damaged or unsellable</option><option>Location does not match</option></select></label>
    <label>Locations already checked<textarea name="searched" required maxLength={1000} placeholder="Shelf, topstock, receiving, alternate display…"/></label>
    <label className="check-label"><input type="checkbox" name="waiting"/><span>Customer is waiting now</span></label>
    <div className="callout warning">Sent to the manager review queue. Approval authorizes a check—it does not adjust inventory or cancel the order.</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy || !item} type="submit">{busy ? "Sending…" : "Send to manager"}</button>
  </form>;
}

type InventoryProps = ReturnType<typeof useInventory> & { role: AppRole; onRequest: () => void; onOpenOrder: (id: string) => void; selectedId: string; onSelect: (id: string) => void };
export default function InventoryWorkspace({ requests, role, canManage, busy, loading, error, refresh, onRequest, submit, onOpenOrder, selectedId, onSelect }: InventoryProps) {
  const [filter, setFilter] = useState("pending");
  const [decision, setDecision] = useState<"approved" | "denied">("approved");
  const pending = requests.filter(value => value.status === "pending");
  const filtered = requests.filter(value => filter === "all" || value.status === filter).sort((a, b) => Number(b.customerWaiting) - Number(a.customerWaiting) || a.requestedAt.localeCompare(b.requestedAt));
  const selected = requests.find(value => value.id === selectedId) ?? filtered[0];
  return <>
    <div className="page-heading"><div><span className="eyebrow">Inventory · manager decision desk</span><h1>Find it. Verify it. Resolve it.</h1><p>One request, a clear decision, and a next step back to the associate.</p></div><button className="button primary" onClick={onRequest}>Request inventory check</button></div>
    <div className="inventory-summary"><div><b>{pending.length}</b><span>Awaiting manager</span></div><div><b>{pending.filter(value => value.customerWaiting).length}</b><span>Customers waiting</span></div><div><b>{requests.filter(value => value.status === "denied").length}</b><span>Product located</span></div><p>Manager-only approval and denial.<br/>In-app alerts refresh every 10 seconds.</p></div>
    <div className="inventory-toolbar"><div className="segmented-tabs">{[["pending", "Needs review"], ["approved", "Approved"], ["denied", "Product found"], ["all", "All requests"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); onSelect(""); }}>{label}</button>)}</div><button className="button ghost compact" onClick={refresh}>Refresh</button></div>
    {error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={refresh}>Retry</button></div>}
    <div className="workspace-grid"><section className="panel queue-panel"><div className="panel-head"><div><h2>Inventory requests</h2><p>Waiting customers first · oldest request next</p></div></div><div className="inventory-queue">{loading ? <p className="empty-state">Loading requests…</p> : filtered.length ? filtered.map(value => <button key={value.id} className={selected?.id === value.id ? "selected" : ""} onClick={() => onSelect(value.id)}><span className={`status ${value.status}`}>{value.status === "denied" ? "Product found" : value.status}</span>{value.customerWaiting && <small className="waiting-badge">Customer waiting</small>}<strong>{value.itemName}</strong><span>#{value.orderId} · Item {value.sku} · {value.quantity} units</span><small>{value.requestedBy} · {new Date(value.requestedAt).toLocaleString()}</small></button>) : <div className="empty-state"><strong>No requests in this view</strong><p>Request a check from a pick item or use the button above.</p></div>}</div></section>
    <section className="panel detail-panel">{selected ? <>
      <div className="detail-title"><div><span className={`status ${selected.status}`}>{selected.status === "denied" ? "Denied · product located" : selected.status}</span><h2>{selected.itemName}</h2><p>Order #{selected.orderId} · Item #{selected.sku} · Need {selected.quantity}</p></div><button className="button ghost compact" onClick={() => onOpenOrder(selected.orderId)}>Open order</button></div>
      <div className="inventory-evidence"><div><span>Expected location</span><strong>{selected.location}</strong></div><div><span>Reason</span><strong>{selected.reason}</strong></div><div><span>Already searched</span><p>{selected.searched}</p></div><div><span>Requested by</span><strong>{selected.requestedBy}</strong><small>{new Date(selected.requestedAt).toLocaleString()}</small></div></div>
      {selected.status === "pending" ? role === "Manager" && canManage ? <form className="inventory-decision modal-form" key={selected.id} onSubmit={async event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        if (await submit({ action: "decide", id: selected.id, decision, note: form.get("note"), location: form.get("location") })) { setFilter("all"); onSelect(selected.id); }
      }}><h3>Manager decision</h3><div className="method-cards"><label><input type="radio" checked={decision === "approved"} onChange={() => setDecision("approved")}/><span><b>Approve check</b><small>Authorize physical verification</small></span></label><label><input type="radio" checked={decision === "denied"} onChange={() => setDecision("denied")}/><span><b>Deny · product found</b><small>Send associate to verified stock</small></span></label></div>{decision === "denied" && <label>Verified product location<input name="location" required maxLength={200} placeholder="Aisle, bay, topstock or receiving location"/></label>}<label>{decision === "approved" ? "Check instructions / next action" : "What was verified?"}<textarea name="note" required maxLength={1000} placeholder={decision === "approved" ? "Who should check, which locations, and what to verify" : "Quantity found and instructions for the associate"}/></label><button className={`button ${decision === "approved" ? "success" : "warning"}`} disabled={busy} type="submit">{busy ? "Saving decision…" : decision === "approved" ? "Approve inventory check" : "Deny and send product location"}</button></form> : <div className="callout warning">Awaiting an authorized manager. Associates can request and track checks, but cannot approve or deny them.{role === "Manager" && !canManage && " This signed-in account has no manager approval permission."}</div> : <div className={`inventory-result ${selected.status}`}><span>Next action for associate</span><h3>{selected.status === "denied" ? `Retrieve at ${selected.foundLocation}` : "Complete the authorized physical check"}</h3><p>{selected.decisionNote}</p><small>{selected.reviewedBy} · {selected.reviewedAt && new Date(selected.reviewedAt).toLocaleString()}</small><p className="fine-print">No stock adjustment, cancellation, or pick confirmation was performed automatically.</p></div>}
      <div className="audit"><h3>Request history</h3>{selected.audit.map((entry, index) => <p key={index}><i/><span><b>{entry.actor}</b> · {entry.action}</span><time>{new Date(entry.at).toLocaleString()}</time></p>)}</div>
    </> : <div className="empty-state"><strong>Ready when a request arrives</strong><p>Managers get the item, searched locations, customer urgency, and full decision history together.</p></div>}</section></div>
    <p className="fine-print">Fictional demonstration roles. Only the configured signed-in demo operator may exercise manager approvals; real staff permissions require approved Lowe’s identity integration.</p>
  </>;
}
