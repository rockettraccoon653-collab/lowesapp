# Orders Ops product decisions

## Origin

Frontline workflow concept and product direction: Loren Rockett. This repository history records the prototype's evolution and design decisions. It is an authorship trail, not a determination of employment or intellectual-property rights.

## North star

Reduce the time between customer need and completed handoff by giving store associates the next useful action, the information needed to take it, and a direct path around blockers.

## Associate-first rules

1. Keep the primary action in the first screen and inside a thumb-friendly reach zone.
2. Scan once, record once. Do not ask associates to re-enter known information.
   - Picking sequence: scan item location, then scan each product barcode.
   - Manual item number is a fallback only when the product has no usable barcode.
   - Staging locations must be barcode-scanned before the order can be finalized.
3. Put location, quantity, ownership and customer urgency beside the action they affect.
4. Make exceptions first-class work, with a named owner and a visible next step.
5. Ask about a specific task and friction—not whether someone generally likes the app.
6. Publish feedback status so associates see whether a report is reviewed, planned or shipped.
7. Measure customer wait, task delay, walking, retries and exceptions before engagement.

## Integration boundary

The prototype contains no Lowe's endpoint, credential or production record. The UI depends on a clean adapter contract covering identity, orders, catalog/location, inventory review, staging, arrival, notifications and delivery. Each production write must be attributable, idempotent and version-aware. Offline device actions require a durable queue, conflict handling and an explicit retry state.

## Pilot acceptance measures

- Median customer arrival-to-handoff time
- Median pick travel and elapsed pick time per line
- Staging location errors and rework
- Inventory-check decision time and outcome
- Delivery-change time to required sign-offs
- Associate-reported minutes lost, blockers and shipped fixes

## Data rule

Use fictional data until an authorized Lowe's sandbox and written data-handling requirements are available. Never place customer names, phone numbers, order numbers or internal credentials in product feedback.
