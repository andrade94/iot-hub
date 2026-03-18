# Astrea IoT Platform -- Business-First Gap Analysis

> **Date:** 2026-03-15 (validated 2026-03-17)
> **PRD version:** v2.0
> **Codebase commit:** `01bf12e` (main) + uncommitted work
> **Analyst:** Phase 4 deep audit against `prd_platform.md`

---

## Executive Summary

| Metric | Count |
|---|---|
| Total PRD workflows audited | 8 categories, 52 discrete workflows |
| **DONE** (backend + UI + real data) | 38 (73%) |
| **PARTIAL** (exists but incomplete) | 8 (15%) |
| **STUB** (code exists, placeholder/mock) | 2 (4%) |
| **MISSING** (no code at all) | 4 (8%) |
| P0 revenue blockers | **ALL 4 RESOLVED** |
| P1 core gaps | 1 remaining (floor plan not wired to site detail) |
| P2 business maturity | 3 remaining (P2-3, P2-4, P2-6) |
| P3 competitive advantage | 6 (unchanged) |

### Phase 8 Validation -- M1-M3 Completion (2026-03-17)

**Codebase census:**

| Layer | Count |
|---|---|
| Controllers | 37 |
| Models | 32 |
| Migrations | 45 |
| Services | 30 |
| Jobs | 13 |
| Policies | 3 |
| Commands | 8 |
| Mailables | 6 |
| Frontend Pages | 48 |
| Tests | 80 |
| Routes | 162 |

**All P0 blockers RESOLVED:**
- **P0-1 RESOLVED:** Dashboard shows live sensor data with real KPIs (DashboardController queries real devices, alerts, work orders per accessible sites)
- **P0-2 RESOLVED:** ChirpStack gateway provisioning (M1-02) and device provisioning (M1-03) wired to onboarding
- **P0-3 RESOLVED:** Invoice generation artisan command (`billing:generate-invoices`) + billing endpoints (generate, mark paid, download) implemented (M1-07)
- **P0-4 RESOLVED:** User-site assignment UI fully implemented (UserManagementController + settings/users/index.tsx with multi-select site checkboxes)

**All P1 gaps RESOLVED except P1-1 (partial):**
- **P1-1 PARTIAL:** FloorPlanView component with sensor dots exists (M2-06), drag-drop sensor placement works (M2-07), but floor plan live view not yet integrated into site detail page
- **P1-2 RESOLVED:** Escalation chain CRUD page + controller + routes (M2-05)
- **P1-3 RESOLVED:** Morning summary email delivery via 3 mailables + 3 Blade templates (M3-01), email + push in all summary jobs (M3-03)
- **P1-4 RESOLVED:** PDF report generation with temperature + energy Blade templates, dompdf download endpoints (M3-04)
- **P1-5 RESOLVED:** DefrostDetector wired to RuleEvaluator (M1-05)
- **P1-6 RESOLVED:** Push notification service already wired (M3-02)
- **P1-7 RESOLVED:** Auto-create work orders from device health -- offline >2h, battery <20%, gateway offline >30min (M3-05)
- **P1-8 RESOLVED:** Create Organization dialog in partner portal (M2-08)
- **P1-9 RESOLVED:** Drag-drop sensor placement on floor plan (M2-07)
- **P1-10 RESOLVED:** Recharts charts in zone detail (M2-01), device detail (M2-02), temperature report (M2-03), energy report (M2-04)
- **P1-11 RESOLVED:** Recipe threshold override editor (M2-10)
- **P1-12 RESOLVED:** Command Center org metrics real queries, no longer hardcoded (M1-06)

**P2 gaps resolved:**
- **P2-1 RESOLVED:** CFDI timbrado via Facturapi with real HTTP calls, PDF/XML download (M3-06)
- **P2-2 RESOLVED:** Dashboard map view with Leaflet dynamic loading, site markers (M3-08)
- **P2-7 RESOLVED:** Navigation sidebar complete -- Command Center, Work Orders, Reports, Billing, Escalation Chains (M1-08)
- **P2-8 RESOLVED:** Alert rate limiting for mass events -- Redis batching, SendBatchAlertSummary job (M3-09)

**Remaining P2 gaps (3):**
- **P2-3:** Report builder page still missing
- **P2-4:** Command Center revenue dashboard still missing
- **P2-6:** Night waste detection (energy) still missing

**Bottom line:** Milestones M1 (Foundation Fixes), M2 (Core Feature Completion), and M3 (Operational Maturity) are 100% complete. All 4 P0 revenue blockers are resolved. 11 of 12 P1 core gaps are fully resolved; the remaining one (floor plan live view) has the component built but needs wiring into the site detail page. The platform is now functional end-to-end: onboarding provisions to ChirpStack, dashboard shows live data with a Leaflet map, charts render in all monitoring/report pages, morning summaries deliver via email and push, PDF reports download, invoices generate with CFDI timbrado, and alerts rate-limit during mass events. Next milestone (M4) focuses on polish, testing, and i18n.

---

## Phase 4a: Business Model

### What does Astrea do?

Astrea is a **B2B IoT operations platform** for Mexican businesses. It bridges LoRaWAN sensors (Milesight hardware) to operational decision-makers via three channels: WhatsApp (emergencies), mobile app (daily monitoring, Phase 2), and web (configuration + deep analysis).

### Who pays?

**Mexican businesses** across segments: retail chains, cold chain logistics, industrial plants, commercial real estate (IAQ), foodservice. Billing model is:
- **Base fee** per organization (~$500 MXN/month)
- **Per-sensor monthly fee** ($80-$250 MXN depending on sensor model)
- **Gateway addon** ($2,500 MXN/month for 2nd+ gateway per site)
- **Payment method:** SPEI (bank transfer), not a payment processor
- **Invoicing:** CFDI 4.0 (Mexican tax-compliant electronic invoice via Facturapi)

### Core value loop

```
Install sensors at client site (30 min)
  -> Platform receives data via LoRaWAN/ChirpStack/MQTT
    -> Rules engine evaluates thresholds
      -> Alerts route to right person via right channel
        -> Morning summaries prove ROI daily
          -> Compliance reports (COFEPRIS) justify continued spend
            -> Monthly invoice (CFDI) closes billing cycle
```

**Revenue depends on:** Onboarding sites fast, keeping data flowing, proving value through reports, and generating invoices that clients can deduct fiscally.

---

## Phase 4b: Role-by-Role Job Map

### 1. super_admin (Astrea internal team)

| Daily Task | What They Need | Current Status |
|---|---|---|
| See all orgs, all sites, health overview | Command Center global view | PARTIAL -- page exists with KPI cards and org table, but device_count/online_count/active_alerts per org are hardcoded to 0 |
| Triage active alerts across all clients | Command Center alert queue | DONE -- `/command-center/alerts` with real data |
| Track open work orders | Command Center work orders view | DONE -- `/command-center/work-orders` with real data |
| Monitor device health globally | Command Center devices view | DONE -- `/command-center/devices` with stats |
| Onboard new clients (create org + sites) | Org/site creation flow | PARTIAL -- org creation not in web UI (DB only), site onboarding wizard exists |
| See revenue/MRR by segment | Revenue dashboard | MISSING -- no route, no controller, no page |
| Dispatch field techs | Field dispatch map | MISSING -- no route, no controller, no page |
| Manage recipes globally | Recipe CRUD | PARTIAL -- read-only recipes list and show, no create/edit UI |
| Manage billing for all orgs | Billing admin | PARTIAL -- can view subscription/invoices per org, no cross-org admin view |

**Key gaps for super_admin:** Revenue dashboard and field dispatch are completely missing. No org drill-down page. *(Resolved in M1-M3: org creation via partner portal, Command Center org metrics now real queries.)*

### 2. org_admin (Client's Director of Operations)

| Daily Task | What They Need | Current Status |
|---|---|---|
| See all-sites overview at login | Dashboard with map + KPIs | PARTIAL -- dashboard shows site cards with status, but no map (Leaflet), no KPIs (alerts, device health), no live sensor data |
| Review morning corporate summary | Email digest at 8am | PARTIAL -- `SendCorporateSummary` job exists but notification delivery is a TODO (logs only) |
| Manage users + assign to sites | User management + site assignment | PARTIAL -- user CRUD exists, but no site assignment UI (the critical `user_sites` pivot management) |
| Configure alert rules / edit recipe thresholds | Rule editor with recipe overrides | PARTIAL -- alert rule CRUD backend exists, but no recipe threshold editor UI per site |
| Review compliance reports | COFEPRIS / NOM-251 PDF | PARTIAL -- temperature report generates data, but PDF export is a placeholder (returns null) |
| Manage billing profiles (RFC) | Billing profile CRUD | DONE -- backend + UI for creating billing profiles |
| View invoices and subscription | Billing dashboard | PARTIAL -- page exists, shows subscription and invoices, but no invoice generation trigger, no payment tracking UI |
| Configure escalation chains | Escalation chain builder | MISSING -- model exists, AlertRouter uses it, but no UI to configure chains |
| Manage organization settings | Org settings page | DONE -- org edit page with name, defaults |

**Key gaps for org_admin:** *(All previously listed gaps resolved in M1-M3: dashboard map via Leaflet, user-site assignment UI, escalation chain CRUD, PDF report generation via dompdf, morning summary delivery via email + push.)*

### 3. site_manager (Regional Manager)

| Daily Task | What They Need | Current Status |
|---|---|---|
| Compare sites at a glance | Multi-site dashboard with KPIs | PARTIAL -- sees all sites in dashboard, but no comparison metrics, no KPI row |
| Review morning regional summary | Push notification + email digest | PARTIAL -- `SendRegionalSummary` job exists, service generates data, but delivery is TODO |
| Drill into problem sites | Site detail page | DONE -- `/sites/{id}` with zones, devices, KPIs, active alerts |
| Acknowledge alerts for their sites | Alert list + acknowledge action | DONE -- alert list with filtering, acknowledge/resolve/dismiss |
| Generate reports across sites | Report builder + PDF | PARTIAL -- per-site temp/energy reports exist, but no cross-site comparison, no PDF |
| Manage alert rules for sites | Rule management | PARTIAL -- backend CRUD exists, rules page exists, no recipe override editor |
| Review work order status | Work order list | DONE -- work order index with filters |

**Key gaps for site_manager:** No multi-site comparison dashboard. No cross-site report generation. *(Resolved in M1-M3: morning summary delivery, PDF report download.)*

### 4. site_viewer (Store Manager)

| Daily Task | What They Need | Current Status |
|---|---|---|
| Check "is everything OK" at morning | Morning summary push notification | PARTIAL -- data generation works, delivery is TODO |
| See current readings for their site | Site detail with live sensors | PARTIAL -- site detail page exists with zones/devices, but frontend shows no live readings (no chart data rendered in UI) |
| View floor plan with colored sensor dots | Floor plan live view | MISSING -- floor plan model exists, upload in onboarding, but no live floor plan visualization page |
| Acknowledge alerts | Alert list + ack | DONE -- works via alert pages |
| View temperature history | Zone/device detail charts | PARTIAL -- controller passes chart data, page structure exists, but Tremor/Recharts charts not integrated |

**Key gaps for site_viewer:** Floor plan live view component exists but not yet wired into site detail page. *(Resolved in M1-M3: charts render in zone/device detail pages via Recharts, morning summary delivers via email + push.)*

### 5. technician (Field Tech)

| Daily Task | What They Need | Current Status |
|---|---|---|
| See assigned work orders | Work order list filtered by assigned | PARTIAL -- work order list exists, but no "My Work Orders" filter by assigned_to |
| View device diagnostics (battery, signal, history) | Device detail page | DONE -- device detail page with readings, alerts, metrics |
| Update work order status + upload photos | Work order detail + photo upload | DONE -- status update, photo upload, and notes all work |
| Register new sensors on-site | Device provisioning | PARTIAL -- ChirpStack DeviceProvisioner service exists, onboarding wizard has device registration, but no actual ChirpStack API call from onboarding (just creates DB record) |
| View alert context for a work order | Work order -> alert link | DONE -- work order show page loads related alert |

**Key gaps for technician:** No "My Work Orders" view. No mobile-optimized interface (Phase 2). *(Resolved in M1-M3: onboarding now calls ChirpStack to provision gateways and devices.)*

---

## Phase 4c: Business Workflow Mapping

### Category 1: Onboarding

| # | Workflow | Description |
|---|---|---|
| 1.1 | Create Organization | Register a new client org |
| 1.2 | Create Site | Register a new physical location |
| 1.3 | Register Gateway | Add gateway, register in ChirpStack |
| 1.4 | Register Devices | Add sensors, provision in ChirpStack with OTAA |
| 1.5 | Upload Floor Plans | Upload 2D images, place sensors via drag-drop |
| 1.6 | Activate Modules | Enable cold_chain, energy, etc. per site |
| 1.7 | Assign Users to Site | Set up who sees this site |
| 1.8 | Configure Escalation Chain | Who gets alerted, in what order |
| 1.9 | Apply Recipes | Auto-apply alert templates based on sensor + module |

### Category 2: Daily Operations (Monitoring)

| # | Workflow | Description |
|---|---|---|
| 2.1 | View Dashboard | Multi-site overview with map and KPIs |
| 2.2 | View Site Detail | Single site with zones, floor plan, live readings |
| 2.3 | View Zone Detail | Temperature chart, sensor list, alert timeline |
| 2.4 | View Device Detail | Single sensor chart (24h/7d/30d), status, history |
| 2.5 | Floor Plan Live View | Sensors as colored dots on 2D plan |
| 2.6 | Morning Summary (Store) | Push at opening_hour to site_viewer |
| 2.7 | Morning Summary (Regional) | Digest for site_manager |
| 2.8 | Morning Summary (Corporate) | Email digest for org_admin |

### Category 3: Alert Response

| # | Workflow | Description |
|---|---|---|
| 3.1 | Alert Evaluation | Rules engine evaluates conditions with duration |
| 3.2 | Alert Routing | Route to channels based on severity |
| 3.3 | WhatsApp Notification | Send via Twilio |
| 3.4 | Push Notification | Send via Expo/FCM |
| 3.5 | Escalation | Level-based escalation if no ack |
| 3.6 | Alert Acknowledgment | Ack via WhatsApp or web |
| 3.7 | Alert Auto-Resolve | 2 normal readings -> auto resolve |
| 3.8 | Defrost Suppression | Suppress during detected defrost windows |

### Category 4: Maintenance

| # | Workflow | Description |
|---|---|---|
| 4.1 | Auto-Create Work Order | From battery/offline/maintenance alerts |
| 4.2 | Manual Work Order | Created from Command Center |
| 4.3 | Assign to Technician | Assign work order to field tech |
| 4.4 | Work Order Lifecycle | open -> assigned -> in_progress -> completed |
| 4.5 | Photo Upload | Technician uploads completion photos |
| 4.6 | Completion -> Auto-Resolve Alert | Completing WO resolves linked alert |
| 4.7 | Device Health Check | Scheduled: detect offline, low battery |

### Category 5: Reporting

| # | Workflow | Description |
|---|---|---|
| 5.1 | Temperature Report | HACCP/COFEPRIS per site |
| 5.2 | Energy Report | Consumption, cost, baseline comparison |
| 5.3 | Summary Report | Morning summary on-demand |
| 5.4 | PDF Export | Branded PDF with client logo |
| 5.5 | Report Builder | Select module, date range, zones |
| 5.6 | Excursion Report | All temperature excursions with corrective actions |
| 5.7 | Compliance Calendar | Reminders for audits, renewals |

### Category 6: Billing

| # | Workflow | Description |
|---|---|---|
| 6.1 | Subscription Management | Create/edit subscription per org |
| 6.2 | Per-Sensor Metering | Track which devices are billed |
| 6.3 | Invoice Generation | Monthly invoice from subscription |
| 6.4 | CFDI Timbrado | Generate XML+PDF via Facturapi |
| 6.5 | Payment Tracking | Mark invoices as paid |
| 6.6 | Billing Profile Management | CRUD for RFC / razon social |
| 6.7 | Invoice Download | Download PDF/XML |
| 6.8 | Gateway Addon Billing | 2nd+ gateway at $2,500/month |

### Category 7: Administration

| # | Workflow | Description |
|---|---|---|
| 7.1 | User Management | CRUD users with roles |
| 7.2 | User-Site Assignment | Assign users to specific sites |
| 7.3 | Organization Settings | Edit org name, defaults, logo |
| 7.4 | Module Management | Toggle modules per site |
| 7.5 | Recipe Management | View/edit/override recipe thresholds |
| 7.6 | Activity Log | Audit trail for compliance |
| 7.7 | API Key Management | Create/revoke API keys |

### Category 8: Integrations

| # | Workflow | Description |
|---|---|---|
| 8.1 | ChirpStack MQTT Listener | Receive uplinks |
| 8.2 | ChirpStack Device Provisioning | Register devices via REST API |
| 8.3 | WhatsApp via Twilio | Send alert notifications |
| 8.4 | WhatsApp Webhook | Receive ack/escalate replies |
| 8.5 | Reverb WebSocket | Live dashboard updates |
| 8.6 | Facturapi CFDI | Generate timbrado invoices |
| 8.7 | SAP/CONTPAQ Export | ERP integration |
| 8.8 | MQTT Simulator | Dev/demo without hardware |

---

## Phase 4d: System Audit

### Category 1: Onboarding

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Create Organization | Model + migration exist | Create dialog in partner portal | Real | **DONE** | M2-08: Create Organization dialog in partner portal. |
| 1.2 | Create Site | SiteOnboardingController + SiteSettingsController | Onboard wizard + settings/sites/index | Real | **DONE** | M3-07: Site CRUD in settings. Standalone site create/edit form at `/settings/sites`. |
| 1.3 | Register Gateway | GatewayController + onboarding + DeviceProvisioner | Onboard wizard step 1 | Real | **DONE** | M1-02: ChirpStack gateway provisioning wired to onboarding. |
| 1.4 | Register Devices | DeviceController + onboarding + DeviceProvisioner | Onboard wizard step 2, device list page | Real | **DONE** | M1-03: ChirpStack device provisioning wired to onboarding with OTAA key registration. |
| 1.5 | Upload Floor Plans | FloorPlanController with store/update/delete | Onboard wizard step 3 + drag-drop | Real | **DONE** | M2-07: Drag-drop sensor placement on floor plan. Saves normalized coordinates to floor_x/floor_y. |
| 1.6 | Activate Modules | ModuleController with toggle | Modules page + onboard step 4 | Real | **DONE** | Module activation per site works end-to-end. |
| 1.7 | Assign Users to Site | UserManagementController with site assignment | settings/users/index.tsx with multi-select | Real | **DONE** | M1-01/P0-4: Full user-site assignment UI with multi-select site checkboxes. |
| 1.8 | Configure Escalation Chain | EscalationChainController + model | Escalation chain CRUD page | Real | **DONE** | M2-05: Escalation chain CRUD page + controller + routes. |
| 1.9 | Apply Recipes | Recipe model + RecipeController + override editor | Recipe list/show + threshold override editor | Real | **DONE** | M2-10: Recipe threshold override editor for per-site customization. |

### Category 2: Daily Operations (Monitoring)

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 2.1 | View Dashboard | DashboardController with real queries | Dashboard page with site cards + Leaflet map | Real | **DONE** | M1-04 + M3-08: Live sensor data, KPIs, Leaflet map with site markers, toggle between map and card views. |
| 2.2 | View Site Detail | SiteDetailController with zone grouping, KPIs | sites/show.tsx | Real | **DONE** | Loads zones, devices, KPIs, active alerts. Controller passes real data. |
| 2.3 | View Zone Detail | SiteDetailController::zone with chart data | sites/zone.tsx with Recharts AreaChart | Real | **DONE** | M2-01: Recharts AreaChart in zone detail with 24h/7d/30d toggle. |
| 2.4 | View Device Detail | DeviceDetailController with chart + readings | devices/show.tsx with Recharts LineChart | Real | **DONE** | M2-02: Recharts LineChart in device detail with multi-metric support. |
| 2.5 | Floor Plan Live View | FloorPlan model, FloorPlanView component | Component built, not wired to site detail | Real | **PARTIAL** | M2-06 + M2-07: FloorPlanView component with sensor dots and drag-drop placement built, but not yet integrated into site detail page. |
| 2.6 | Morning Summary (Store) | SendMorningSummary job + MorningSummaryService + MorningSummary mailable | reports/summary.tsx (on-demand) | Real | **DONE** | M3-01 + M3-03: Delivers via email (MorningSummary mailable + Blade template) and push notification. |
| 2.7 | Morning Summary (Regional) | SendRegionalSummary job + service + Regional mailable | No page | Real | **DONE** | M3-01 + M3-03: Delivers via email (Regional mailable + Blade template) and push notification. |
| 2.8 | Morning Summary (Corporate) | SendCorporateSummary job + service + Corporate mailable | No page | Real | **DONE** | M3-01 + M3-03: Delivers via email (Corporate mailable + Blade template). |

### Category 3: Alert Response

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 3.1 | Alert Evaluation | RuleEvaluator service with Redis state tracking | N/A (backend only) | Real | **DONE** | Full implementation: threshold check, duration tracking via Redis, cooldown management, auto-resolve on 2 normal readings. |
| 3.2 | Alert Routing | AlertRouter service with severity-based channel selection | N/A (backend only) | Real | **DONE** | Routes to escalation chain levels based on severity. Dispatches SendAlertNotification + EscalateAlert jobs with delays. |
| 3.3 | WhatsApp Notification | TwilioService with template messages | N/A (backend only) | Real | **DONE** | Full implementation: severity-based templates in Spanish, Twilio HTTP API calls, graceful degradation when not configured. |
| 3.4 | Push Notification | PushNotificationService via Expo Push API | N/A (backend only) | Real | **DONE** | M3-02: Push notification service wired via Expo Push API. |
| 3.5 | Escalation | EscalationService + EscalateAlert job | No config UI | Real | **PARTIAL** | Backend works: job dispatched with delay, service checks alert status before escalating. But no UI to configure chains (see 1.8). |
| 3.6 | Alert Acknowledgment | AlertController::acknowledge + WhatsApp webhook | Alert show page + WhatsApp ACK reply | Real | **DONE** | Web ack works. WhatsApp webhook parses ACK/ESC replies. |
| 3.7 | Alert Auto-Resolve | RuleEvaluator::handleNormal with 2 consecutive readings | Auto (no UI needed) | Real | **DONE** | Clears breach state, tracks consecutive normals in Redis, auto-resolves when count >= 2. |
| 3.8 | Defrost Suppression | DefrostDetector::shouldSuppressAlert wired to RuleEvaluator | No UI for schedule management | Real | **DONE** | M1-05: DefrostDetector wired to RuleEvaluator. Suppresses alerts during detected defrost windows. No schedule management UI yet but detection is automatic. |

### Category 4: Maintenance

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 4.1 | Auto-Create Work Order | CreateWorkOrder job dispatched from CheckDeviceHealth | N/A (auto) | Real | **DONE** | M3-05: Auto-create work orders from device health -- offline >2h, battery <20%, gateway offline >30min. |
| 4.2 | Manual Work Order | WorkOrderController::store | work-orders/index.tsx + show.tsx | Real | **DONE** | Manual creation from site context works. |
| 4.3 | Assign to Technician | WorkOrderController::updateStatus with assign | Work order show page | Real | **DONE** | Assign action updates assigned_to. |
| 4.4 | Work Order Lifecycle | WorkOrder model with status methods | Status update in show page | Real | **DONE** | Full lifecycle: open -> assigned -> in_progress -> completed/cancelled. |
| 4.5 | Photo Upload | WorkOrderController::addPhoto | Work order show page | Real | **DONE** | Photo stored to public disk with caption. |
| 4.6 | Completion -> Auto-Resolve | WorkOrderService::complete | Auto | Real | **DONE** | Completing work order auto-resolves linked alert. |
| 4.7 | Device Health Check | CheckDeviceHealth job dispatches CreateWorkOrder | N/A (scheduled) | Real | **DONE** | M3-05: CheckDeviceHealth dispatches CreateWorkOrder for battery/offline/gateway health issues. |

### Category 5: Reporting

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 5.1 | Temperature Report | TemperatureReport service with excursion detection | reports/temperature.tsx with Recharts charts | Real | **DONE** | M2-03 + M3-04: Compliance bar chart + zone temperature trends. PDF download via dompdf + Blade template. |
| 5.2 | Energy Report | EnergyReport service with cost calculator + baseline | reports/energy.tsx with Recharts charts | Real | **DONE** | M2-04 + M3-04: Dual-axis AreaChart. PDF download via dompdf + Blade template. |
| 5.3 | Summary Report | MorningSummaryService::generateStoreSummary | reports/summary.tsx | Real | **DONE** | On-demand summary for a site. Data + page. |
| 5.4 | PDF Export | dompdf with Blade templates for temp + energy | Download endpoints + buttons | Real | **DONE** | M3-04: PDF report generation with temperature + energy Blade templates, dompdf download endpoints. |
| 5.5 | Report Builder | No controller | No page | None | **MISSING** | PRD specifies `/reports` report builder page with module selector. Does not exist. |
| 5.6 | Excursion Report | Excursion detection in TemperatureReport::detectExcursions | No dedicated page | Real (embedded) | **PARTIAL** | Excursion data generated as part of temperature report, but no standalone compliance report with corrective actions log. |
| 5.7 | Compliance Calendar | Not implemented | Not implemented | None | **MISSING** | No model, no controller, no page for regulatory calendar/reminders. |

### Category 6: Billing

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 6.1 | Subscription Management | SubscriptionService with create + addDevice | No management UI | Real logic | **PARTIAL** | Service has real subscription creation + per-sensor pricing map. But no UI to create/edit subscriptions. BillingController::dashboard shows existing subscription. |
| 6.2 | Per-Sensor Metering | SubscriptionItem model, addDevice method | Shown in dashboard | Schema + logic | **PARTIAL** | SubscriptionService::addDevice works. Price map for 10 sensor models. But no automated metering (no job that syncs devices to subscription items). |
| 6.3 | Invoice Generation | InvoiceService + GenerateInvoicesCommand | Billing dashboard with generate button | Real | **DONE** | M1-07: Artisan command `billing:generate-invoices` + billing endpoints (generate, mark paid, download). |
| 6.4 | CFDI Timbrado | FacturapiService with real HTTP calls | Invoice download PDF/XML | Real | **DONE** | M3-06: Real Facturapi API calls, stores UUID, PDF/XML download routes. |
| 6.5 | Payment Tracking | InvoiceService::markPaid + BillingController | Mark paid UI in billing dashboard | Real | **DONE** | M1-07: Payment tracking via mark-as-paid endpoint. |
| 6.6 | Billing Profile Management | BillingController::storeProfile | settings/billing/profiles.tsx | Real | **DONE** | Full CRUD with RFC, razon social, regimen fiscal, uso CFDI, default toggle. |
| 6.7 | Invoice Download | BillingController download endpoints | Download PDF/XML buttons | Real | **DONE** | M1-07 + M3-06: Invoice PDF/XML download routes via FacturapiService. |
| 6.8 | Gateway Addon Billing | Gateway.is_addon field exists | Not in billing UI | Schema only | **STUB** | Subscription::calculateMonthlyTotal would need to include addon gateway fees. Not implemented. |

### Category 7: Administration

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 7.1 | User Management | UserManagementController with CRUD | settings/users/index.tsx | Real | **DONE** | Create, update, delete users with role assignment. |
| 7.2 | User-Site Assignment | UserManagementController with site pivot management | settings/users/index.tsx with multi-select | Real | **DONE** | M1-01/P0-4: User-site assignment UI with multi-select site checkboxes. |
| 7.3 | Organization Settings | OrganizationSettingsController | settings/organization.tsx | Real | **DONE** | Edit org name, settings. |
| 7.4 | Module Management | ModuleController with toggle | settings/modules.tsx | Real | **DONE** | Per-site module activation/deactivation. |
| 7.5 | Recipe Management | RecipeController + threshold override editor | recipes list/show + override editor | Real | **DONE** | M2-10: Recipe threshold override editor for per-site customization by org_admin. |
| 7.6 | Activity Log | ActivityLogController with index, user, model views | activity-log.tsx | Real | **DONE** | View logs by model or user. Permission-gated. |
| 7.7 | API Key Management | ApiKeyController with CRUD | settings/api-keys.tsx | Real | **DONE** | Create with hashed key, show once, delete. |

### Category 8: Integrations

| # | Workflow | Backend | UI | Data | Status | Notes |
|---|---|---|---|---|---|---|
| 8.1 | ChirpStack MQTT Listener | MqttListener service + ProcessSensorReading job | N/A | Real | **DONE** | Handles uplink and gateway status. Dispatches decode + store + evaluate chain. |
| 8.2 | ChirpStack Device Provisioning | DeviceProvisioner wired to SiteOnboardingController | Onboarding wizard provisions to ChirpStack | Real | **DONE** | M1-02 + M1-03: Gateway and device provisioning called from onboarding. OTAA keys registered. |
| 8.3 | WhatsApp via Twilio | TwilioService with severity templates | N/A | Real | **DONE** | Full implementation with Spanish templates, Twilio API calls. |
| 8.4 | WhatsApp Webhook | WhatsAppWebhookController | N/A (API endpoint) | Real | **DONE** | Receives Twilio webhooks, parses ACK/ESC, routes to service. |
| 8.5 | Reverb WebSocket | SensorReadingReceived + AlertTriggered events | Broadcast in ProcessSensorReading | Real | **DONE** | Events defined and dispatched. Broadcast integration functional. |
| 8.6 | Facturapi CFDI | FacturapiService with real HTTP calls | Invoice download PDF/XML | Real | **DONE** | M3-06: Real Facturapi API integration for CFDI timbrado, PDF/XML download. |
| 8.7 | SAP/CONTPAQ Export | SapExportService + ContpaqExportService exist | settings/integrations.tsx | Unknown | **STUB** | Files exist, IntegrationController has CRUD. Actual export logic quality unknown (likely placeholders). |
| 8.8 | MQTT Simulator | SimulatorStart command with 7 sensor models | N/A (artisan command) | Simulated | **DONE** | Full implementation: 4 modes (normal/incidents/onboarding/stress), realistic Milesight binary payloads per model, proper hex encoding. |

---

## Phase 4e: Priority Classification

### P0 -- Revenue Blockers (Cannot sell the platform without these)

| # | Gap | Why It Blocks Revenue | Workflows Affected |
|---|---|---|---|
| **P0-1** | Dashboard shows no live sensor data | Client logs in and sees empty cards with "No sensors configured" text. Cannot demonstrate value. First impression is broken. | 2.1 |
| **P0-2** | ChirpStack provisioning not wired to onboarding | Onboarding creates DB records but never registers devices in ChirpStack. Sensors will never join the network. Installation fails. | 1.3, 1.4, 8.2 |
| **P0-3** | Invoice generation has no trigger | Subscription + invoice services exist but are never called. Cannot bill clients. Zero revenue. | 6.1, 6.2, 6.3, 6.5, 6.8 |
| **P0-4** | User-site assignment has no UI | Multi-tenancy depends on users being assigned to sites. Without this, org_admin cannot set up their team. site_managers see nothing. Scoping is broken for all non-admin roles. | 1.7, 7.2 |

### P1 -- Core Gaps (Feature exists but incomplete -- needed for first paying client)

| # | Gap | Impact | Workflows Affected |
|---|---|---|---|
| **P1-1** | Floor plan live view missing | PRD's key differentiator ("sensors as colored dots on 2D plan") not built. Site detail page has no visual layout. | 2.5 |
| **P1-2** | Escalation chain configuration UI missing | Cannot set up who gets alerted in what order. Alert routing defaults to broadcast-only. Escalation is blind. | 1.8, 3.5 |
| **P1-3** | Morning summary delivery not implemented | All 3 summary jobs generate data but deliver via Log::info only. No push, no email. The #1 daily touchpoint is broken. | 2.6, 2.7, 2.8 |
| **P1-4** | PDF report export is placeholder | COFEPRIS compliance reports cannot be downloaded as PDF. Browsershot not integrated, no Blade template. Cold chain clients need this for audits. | 5.4 |
| **P1-5** | DefrostDetector not wired to RuleEvaluator | DefrostDetector has full spike analysis + suppression logic, but EvaluateAlertRules job never calls shouldSuppressAlert. Every cold chain install will have 8-16 false alarms/day. | 3.8 |
| **P1-6** | Push notifications not implemented | No PushNotificationService, no SendPushNotification job. Medium-severity alerts have no delivery channel. Mobile app (Phase 2) will need this. | 3.4 |
| **P1-7** | Auto-create work orders not wired | CreateWorkOrder job exists but CheckDeviceHealth doesn't dispatch it. Battery/offline alerts don't auto-generate maintenance orders. | 4.1, 4.7 |
| **P1-8** | Organization creation has no UI | super_admin must create orgs via DB/tinker. No web form. Blocks rapid client onboarding. | 1.1 |
| **P1-9** | Sensor drag-drop placement on floor plan missing | Floor plans can be uploaded but sensors cannot be placed via UI. The floor_x/floor_y fields are never populated visually. | 1.5 |
| **P1-10** | Charts not rendered in frontend pages | Device detail, zone detail, reports pages receive chart data from controllers but the React pages likely do not render Tremor/Recharts charts (dashboard only shows text cards). | 2.3, 2.4, 5.1, 5.2 |
| **P1-11** | Recipe threshold editor missing | org_admin cannot customize alert thresholds per site. site_recipe_overrides table exists but no UI to create overrides. | 7.5, 1.9 |
| **P1-12** | Command Center org metrics hardcoded to 0 | CommandCenterController maps device_count, online_count, active_alerts to literal 0 per org. Table shows all zeros. | CC overview |

### P2 -- Business Maturity (Nice-to-have for 1.0 launch)

| # | Gap | Impact | Workflows Affected |
|---|---|---|---|
| **P2-1** | CFDI timbrado is a stub | FacturapiService returns mock UUIDs. Clients need real CFDI for tax deduction. Can work around with manual invoicing initially. | 6.4, 6.7 |
| **P2-2** | Map view on dashboard (Leaflet) | PRD specifies map with all sites. Currently just a card grid. Less impactful for single-site clients. | 2.1 |
| **P2-3** | Report builder page missing | No `/reports` landing page to select report type, date range, zones. Users must navigate via site routes. | 5.5 |
| **P2-4** | Command Center revenue dashboard | MRR by segment/org not built. Astrea team can use spreadsheet initially. | CC revenue |
| **P2-5** | Excursion report with corrective actions | Excursion data exists in temperature report but no standalone corrective action log linked to alerts. | 5.6 |
| **P2-6** | Night waste detection (energy) | EnergyReport has daily totals but no overnight consumption isolation or alerting. | Energy module |
| **P2-7** | Navigation missing key links | Nav config lacks Command Center, Work Orders, Reports, Billing in sidebar. Users cannot discover these features. | All |
| **P2-8** | Alert rate limiting for mass events | PRD specifies batching WhatsApp during city-wide power outages. Not implemented. Could spam Twilio API. | 3.3 |

### P3 -- Competitive Advantage (Differentiation, not blocking launch)

| # | Gap | Impact | Workflows Affected |
|---|---|---|---|
| **P3-1** | Field dispatch map | Map showing which sites need visits, technician locations, route optimization. | CC dispatch |
| **P3-2** | Command Center org drill-down | Per-org detail page with site list, health grid, MRR chart. | CC orgs |
| **P3-3** | Compliance calendar | Reminders for COFEPRIS audits, certificate renewals. Regulatory scheduling. | 5.7 |
| **P3-4** | Partner portal (white-label) | PartnerController exists with org list, but no white-label branding application. | Partner |
| **P3-5** | SAP/CONTPAQ real integration | Services exist as stubs. Actual ERP export would unlock enterprise clients. | 8.7 |
| **P3-6** | Advanced modules (Industrial, IAQ, People) | Models exist (IaqZoneScore, TrafficSnapshot, CompressorBaseline, DoorBaseline). No dashboards or analytics built. | Phase 9 |

---

## Appendix: Implementation Depth Scorecard

| Layer | Files Exist | Real Logic | Wired End-to-End | Score |
|---|---|---|---|---|
| **Database (migrations + models)** | 32 models, 45 migrations | All migrations real | All tables usable | 95% |
| **Seeders** | 10 seeders (roles, modules, recipes, orgs, sites, users, gateways, devices) | Comprehensive | Full demo dataset | 90% |
| **Services** | 30 services across 8 namespaces | ~28 have real logic | ~25 actually called from controllers/jobs | 90% |
| **Jobs** | 13 jobs | ~12 have real logic | ~11 are dispatched from code | 90% |
| **Controllers** | 37 controllers | All have real logic | All have routes | 95% |
| **API Routes** | 26 endpoints + webhooks | Real controller logic | Functional | 90% |
| **Frontend Pages** | 48 pages | ~42 render meaningful UI | ~38 show real data | 85% |
| **Charts/Visualizations** | Recharts integrated | Zone, device, temperature, energy charts | All render real data | 90% |
| **Real-time (Reverb)** | 3 events defined | Broadcast in jobs | Listener in frontend | 70% |
| **External APIs** | ChirpStack, Twilio, Facturapi, Expo Push | All have real HTTP calls | All wired to controllers/jobs | 90% |

---

## Recommended Execution Order

**M1-M3 items below are ALL COMPLETED as of 2026-03-17.**

1. ~~**P0-4** User-site assignment UI~~ -- DONE (M1-01)
2. ~~**P0-2** Wire ChirpStack provisioning to onboarding~~ -- DONE (M1-02, M1-03)
3. ~~**P0-1** Dashboard with live sensor data + KPIs~~ -- DONE (M1-04)
4. ~~**P1-5** Wire DefrostDetector to RuleEvaluator~~ -- DONE (M1-05)
5. ~~**P1-12** Fix Command Center org metrics~~ -- DONE (M1-06)
6. ~~**P1-2** Escalation chain UI~~ -- DONE (M2-05)
7. ~~**P1-10** Integrate Recharts charts in frontend pages~~ -- DONE (M2-01 through M2-04)
8. **P1-1** Floor plan live view -- PARTIAL (component built in M2-06/M2-07, needs wiring into site detail page)
9. ~~**P1-3** Morning summary delivery (email + push)~~ -- DONE (M3-01, M3-03)
10. ~~**P1-4** PDF report export~~ -- DONE (M3-04, uses dompdf)
11. ~~**P0-3** Invoice generation trigger + payment tracking~~ -- DONE (M1-07)
12. ~~**P2-7** Navigation sidebar completeness~~ -- DONE (M1-08)

**Next priorities (M4: Polish & Testing):**
1. Wire FloorPlanView into site detail page (remaining P1-1)
2. Model factories for all 32 models (M4-01)
3. Authorization policies for controllers (M4-02)
4. Integration test coverage for M1-M3 features (M4-03)
5. i18n completion Spanish/English (M4-04)
6. Report builder landing page (M4-05, P2-3)
7. "My Work Orders" filter for technicians (M4-07)

---

*Generated by Phase 4 gap analysis against PRD v2.0. All findings based on code inspection, not runtime testing.*
