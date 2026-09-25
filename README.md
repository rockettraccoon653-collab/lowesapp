# Orders Operations Pilot

An editable, full-stack demonstration for store pickup, fulfillment picking, staging, customer check-in and delivery reschedule accountability. It is designed for desktop, mobile Safari/Chrome and Zebra-sized Android devices.

## Ownership and disclosure

- Product concept, store pain points, workflow requirements, approval rules and operational decisions: **Loren Rockett**
- Prototype implementation: developed with AI-assisted coding from Loren's direction and requirements

This is a clean-room concept with fictional demonstration data. It is not an official Lowe's application and is not connected to Lowe's production systems.

## Permission and reuse

This repository and prototype are provided for evaluation only. No permission is granted to copy, modify, reuse, redistribute, publish, sublicense or commercially exploit the project materials without express written permission. Authorized future reuse or redistribution is permitted only under the scope and terms of that written permission. See [`NOTICE.md`](NOTICE.md).

## Working features

- Exact customer lookup by order number or normalized full US phone number; shared-phone matches require order selection
- Duplicate, completed, unstaged and unready check-in guards, plus a timestamp-based customer wait clock
- Item-level inventory requests with searched locations and customer-waiting priority
- Dedicated manager inbox with server-side approval allowlist; denial requires the verified stock location and decision notes
- Owner-protected full demo reset covering orders, inventory requests, delivery decisions, notifications and associate feedback
- Role-specific home playbooks for Fulfillment, Receiving, Pro specialists and Managers
- Manager/requester in-app inventory notifications, refreshed every ten seconds while the page is visible
- Optimistic concurrency protection: conflicting order edits stop with a reload prompt instead of silently overwriting another session
- Durable Associate Voice board with screen/task context, friction, impact, estimated minutes lost and manager-visible progress
- Downloadable integration contract with stable IDs, idempotent events, role boundaries and mock-to-approved-adapter separation

The product north star, authorship note, associate-first rules and pilot acceptance measures are recorded in `PRODUCT_DECISIONS.md`.

## Demonstrate the new workflows

### Full operations dashboard and compact picking

The dashboard includes all categories visible in the supplied screenshots: Customer Arrived, Fix Issues, Customer on the Way—Needs Restaging, Install—Needs Restaging, Today’s Deliveries (ready/loaded), Genesis Deliveries, Prepare Pickup and Delivery Orders (claimed/unclaimed), Expired Lockers, Restock List, Completed Deliveries, and Shipping Documents. Counts come from the demo records, not the numbers in the photos.

- Global order/shipment/full-phone lookup opens the relevant workspace. A scanner operating as keyboard input can enter the code into the focused field; native Zebra integration is not connected or device-tested.
- Compact item rows emphasize pick location, required/picked units, item number, and fictional available stock. Expand for model, optional catalog photo/price, alternate/manual location entry, issues, inventory requests, and partial quantity confirmation.
- Scan the listed shelf/location barcode before scanning the product. Each matching product barcode confirms one unit. The exact item number is accepted only for a line whose product has no usable barcode; wrong items and item-number shortcuts are rejected.
- Claim/release preserves route and quantities. Manual route editing and suggested route restoration remain available. The route view is an ordered location list, not a physical store floor map.
- Scan staging-location barcodes to stage all groups together after suitability confirmation, or scan a separate location for each group. Typed location names are rejected. All picks and scanned locations must be complete before marking customer-ready.
- Restaging, expired-locker recovery, and cleared restock tasks have claim, destination, physical-unit verification, completion, and history. Restaging updates the linked order’s group locations. The prototype does not unlock lockers, cancel orders, or adjust stock.
- Delivery execution proceeds preparing → ready → loaded → complete, separately from date approvals. Readiness requires all picks/staging; unresolved date decisions block loading. All three approved date decisions update the demo scheduled date.
- Documents includes browser-printable pick tickets, staging labels, and shipment manifests. These are clearly marked demo documents, not official carrier labels or bills of lading. Device print availability depends on the browser/OS; managed enterprise printers are not integrated.

Real customer details in the reference photographs were not copied into demo records. Real catalog imagery/prices, physical floor maps, Genesis data, locker hardware, live arrival feeds, and enterprise printer services still require approved integrations. Do not describe those integrations as implemented.

Focused tests: `node --experimental-strip-types --test tests/workflows.test.ts tests/operations.test.ts`.
Production build is verified through the Sites checkpoint. The responsive layouts, install manifest and Apple touch icon are included; physical iPhone, Android/Zebra and desktop-browser QA remains a pilot gate. Full standalone TypeScript checking still reports the pre-existing missing Cloudflare runtime declarations (`cloudflare:workers`, `Fetcher`, `D1Database`); application changes introduce no additional reported type errors.

1. Open **Order work → Check-in & handoff**. Search `73912` or `(704) 555-0104`, confirm the customer and items, select in-store or curbside, then check in. Only fictional demo phone numbers are provided.
2. Open **Order work → Pick** and choose **Inventory check** on an item. Add the reason and locations searched, then send to the manager.
3. Switch to the **Manager** demo persona. The home attention banner and Alerts link to the Inventory decision desk. Approve with check instructions, or deny with verified product location and explanation.
4. Switch back to the requesting role to see the decision notification and next action.
5. Open **Demo** and type `RESET DEMO` to restore every fictional workflow before the next presentation. Only the authenticated demo owner can run the reset.

`INVENTORY_MANAGER_EMAILS` is a server-side, comma-separated allowlist of authenticated demo operators. Merely choosing Manager in the browser does not grant approval permission. The hosted owner is configured as the demo operator; this is not enterprise staff authorization. No browser-supplied email is trusted. Keep the value in hosted configuration, never in committed source. Local `.env` and `.env.example` use an empty value (deny by default).

Inventory requests are stored independently from the general pilot snapshot. One request per order/item is retained in this pilot; additional request cycles, physical-count completion and stock adjustments belong in an approved inventory-system integration. Approval authorizes a check, not an adjustment. In-app refresh is not operating-system push notification delivery.

Run focused workflow tests with `node --experimental-strip-types --test tests/workflows.test.ts`.

- Operations dashboard with pick, stage, arrival, delivery-review and exception counts
- Order claim with named associate ownership
- Scan or manual confirmation of pick items
- Touch-friendly manual route ordering plus one-tap restore to the suggested aisle route
- Handling flags for heavy, bulky, team-lift and secure items
- Pick exceptions with reason, notes, manager notification and audit history
- Multiple staging groups with independently verified locations
- Final staging gate that prevents customer-ready status until every group is located
- Associate-assisted curbside or in-store customer check-in
- Arrival-to-retrieval-to-vehicle-to-complete handoff flow
- Current-handler updates and named audit entries from whoever presses the action
- Role-routed notifications with links to affected work
- Delivery reschedule request with required Receiving, Fulfillment and Pro sign-off
- Required reason for denial or requested changes, optional next action and replacement date
- Responsive phone layout and installable PWA manifest
- Cloud D1 persistence for the hosted pilot; local fallback if the database is unavailable
- Typed integration-adapter contract and a visible production-readiness checklist

## Run in VS Code on Windows

Requirements: [Node.js 22.13+](https://nodejs.org/) and Visual Studio Code.

1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Select **Terminal > New Terminal**.
4. Run:

```powershell
npm install
npm run dev
```

Open the address printed in the terminal, normally `http://localhost:5173`. Stop it with `Ctrl+C`.

`npm run dev` automatically prepares the local D1 demo database and uses a fictional local-only operator identity. This keeps order saving, inventory decisions, feedback and the full reset testable in VS Code. The local identity is disabled in production builds; the hosted Site still requires its configured signed-in operator.

To open the local project on a phone connected to the same private Wi-Fi:

```powershell
npm run dev:network
ipconfig
```

Find the computer's IPv4 address, then open `http://YOUR-IP-ADDRESS:5173` on the phone. Allow Windows network access only for private networks.

## Code map

| Path | Purpose |
| --- | --- |
| `app/OrdersApp.tsx` | Workspaces, forms, state transitions, role routing and audit behavior |
| `app/data.ts` | Fictional seed orders, items, staging groups, deliveries and alerts |
| `app/types.ts` | Application domain model |
| `app/globals.css` | Desktop, phone and Zebra-sized responsive design |
| `app/api/state/route.ts` | Persistent pilot-state API |
| `db/schema.ts` | D1 schema |
| `drizzle/` | Generated schema-only migration |
| `lib/integration.ts` | Clean-room contract for future approved enterprise adapters |
| `REGIONAL_PILOT_BRIEF.md` | Research findings, scope, integration gates and pilot measures |

## Useful commands

```powershell
npm run dev
npm run dev:network
npm run lint
npm run build
npm run db:generate
```

## Production boundary

The hosted app persists fictional pilot state, but it is not production software. A Lowe's deployment requires approved system owners, API specifications, sandbox credentials, SSO/role claims, data classification, privacy and security reviews, device-management testing, notification services, observability, support ownership and a rollback plan. Do not add real customer information or production credentials to this repository.

## Suggested explanation to leadership

> I identified the store-level problems and designed the proposed picking, staging, check-in, notification, handoff and delivery-approval workflows. I used AI-assisted development as a coding tool to turn my requirements into a working pilot so leadership and system owners can evaluate the process before committing production resources.
