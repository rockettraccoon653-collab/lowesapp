# Orders Operations Pilot — Regional Brief

Prepared from Loren Rockett's operational requirements and public-source research. This document describes a clean-room proposal; it does not document proprietary Lowe's systems.

## Executive problem statement

Store fulfillment work crosses picking, staging, customer arrival, retrieval and delivery coordination, but the associate who performs the next action can differ from the person who first claimed the order. The pilot makes the actual actor and current handler visible, keeps split staging groups together, gives Fulfillment control over its practical store route, and turns delivery-date changes into a documented multi-role decision.

## Public evidence used

1. Lowe's public pickup instructions describe a customer flow of **Check In**, confirm pickup method and indicate they are on the way, then select **I'm Here** on arrival. The associate-assisted check-in in this pilot produces the same operational arrival event instead of a separate queue. Source: https://www.lowes.com/l/help/store-pickup
2. Lowe's publicly states that its channels include in-store pickup, pickup lockers, curbside pickup, home delivery and parcel shipment. That supports treating pickup and delivery as related order-lifecycle views. Source: https://corporate.lowes.com/who-we-are/our-business
3. Lowe's pickup-locker announcement describes staging followed by a customer notification and one-time barcode retrieval. This informed the pilot's rule that all staging groups need locations before ready status is released. Source: https://corporate.lowes.com/newsroom/press-releases/lowes-leverages-innovative-technology-launch-contactless-pickup-lockers-nationwide-09-22-20
4. Lowe's and Google Cloud publicly described Android-based mobile devices that let associates view and update real-time pricing and inventory data. This supports a compact, mobile-first associate experience and a future approved adapter instead of copying data into another source of truth. Source: https://corporate.lowes.com/newsroom/press-releases/google-cloud-helps-lowes-build-true-channel-less-customer-experience-01-13-20
5. Lowe's has publicly described aisle/bay product-location data and in-store route guidance. The pilot uses aisle/bay inputs for a suggested route while allowing an associate to override the sequence when real store conditions demand it. Sources: https://corporate.lowes.com/newsroom/press-releases/lowes-introduces-product-locator-mobile-technology-make-shopping-easier-11-27-13 and https://corporate.lowes.com/newsroom/press-releases/lowes-introduces-store-navigation-using-augmented-reality-03-23-17
6. Lowe's same-day-delivery announcement describes stores as fulfillment points and a third-party last-mile relationship with OneRail. The delivery screen therefore treats transportation capacity and store readiness as governed integration inputs, not assumptions made by the user interface. Source: https://corporate.lowes.com/newsroom/press-releases/lowes-expands-same-day-delivery-service-nationwide-pro-and-diy-customers-partnership-onerail-07-19-23
7. Zebra reports that barcode scanners and mobile computers improved order processing, traceability and fulfillment at a retailer. This supports scan confirmation and explicit exception paths. Source: https://www.zebra.com/us/en/about-zebra/newsroom/press-releases/2024/kitchen-ware-reduces-picking-time-by-50-with-zebra-technologies-warehouse-solutions.html
8. Operations research consistently treats batching and picker routing as linked efficiency problems. One online-retail study minimizes travel distance by combining batching and routing; another reports that drop-off points, dynamic batching, carts and zone layout can materially affect performance. The pilot does not claim to optimize a store mathematically; it preserves a suggested order while allowing informed manual sequencing. Sources: https://doi.org/10.1080/00207543.2016.1187313 and https://doi.org/10.1287/mnsc.2021.4275

## Demonstrated workflow

### Pick

1. Order enters an actionable queue with promise time, line/unit count and handling flags.
2. Associate claims the order; ownership and audit history update to that person.
3. A suggested aisle route is shown.
4. Associate can move any item earlier or later; the order becomes a saved manual route.
5. A scan or manual confirmation records full quantity for the item.
6. Not-found, insufficient, damaged, location mismatch and barcode mismatch issues pause the order, preserve notes and notify management.
7. Completing all item quantities moves the order to picked and notifies Receiving.

### Stage

1. Each logical group—standard, bulky, garden or secure—receives its own staging location.
2. Moving a group records the location and the associate who performed it.
3. The order cannot become customer-ready until every group is located.
4. Finalization creates a pickup-ready notification and preserves the group map for retrieval.

### Associate-assisted check-in and handoff

1. Associate searches/selects a ready order.
2. Associate confirms pickup person, approved ID-check status, curbside/in-store method, spot and vehicle description.
3. Fulfillment receives a high-priority arrival notification.
4. Any associate who starts retrieval, arrives at the vehicle or completes handoff becomes the current handler and audit actor for that action.

### Delivery reschedule

1. Requester provides proposed date and reason.
2. Receiving, Fulfillment and Pro specialist are individually notified.
3. Each records approve, request changes or deny.
4. A non-approval requires a reason and can include a required next action and suggested replacement date.
5. The app derives the overall status from all three decisions and notifies management.

## Integration contract

The user experience is separated from enterprise services through `lib/integration.ts`. A production discovery team must identify approved owners and contracts for:

- associate identity, store assignment and authorization roles;
- order creation, promise, cancellation and lifecycle events;
- item, quantity, inventory, aisle/bay and handling data;
- valid staging locations, capacity and consolidation groups;
- customer on-the-way/arrival and pickup-method events;
- push/in-app notification delivery and acknowledgement;
- delivery availability, carrier capacity and schedule commitment.

No production integration should begin until the relevant system owners supply API documentation, authentication, nonproduction data, rate limits, error semantics and an approved write-back model.

## Controls required before a field pilot

- Enterprise SSO; never use the demonstration role switcher in production.
- Server-side authorization for every write, not only hidden buttons.
- Store scoping and least privilege.
- Immutable audit export with a defined retention policy.
- PII minimization for customer and vehicle information.
- Encryption in transit and at rest.
- Offline queue, retry, idempotency and conflict policy for store Wi-Fi gaps.
- Cancellation and order-change reconciliation while an associate is picking.
- Managed Zebra device testing, scanner intent integration and accessibility review.
- Monitoring, support ownership, incident response and rollback.

## Regional pilot proposal

Run a limited, approved, nonproduction-data study first. Compare the current workflow with this proposed workflow using:

- picker travel steps or minutes per order;
- time from release to fully staged;
- exceptions per 100 order lines and time to resolution;
- staging-location errors or missing groups;
- arrival-to-handoff time;
- delivery reschedule time to all required decisions;
- abandoned/duplicate actions;
- associate task-completion survey and qualitative notes.

Do not set a success target before baseline data is captured. The goal of the first study is to validate workflow, data availability and associate usability, then decide whether deeper integration is justified.
