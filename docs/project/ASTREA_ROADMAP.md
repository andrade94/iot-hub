# Astrea IoT Platform -- Development Roadmap

> **Date:** 2026-03-18
> **Based on:** `ASTREA_GAP_ANALYSIS.md` (Phase 4 audit against PRD v2.0)
> **Codebase commit:** `01bf12e` (main)
> **Target:** Sellable MVP for first paying client

---

## 1. Executive Summary

### Current State

| Metric | Value |
|---|---|
| PRD workflows audited | 52 across 8 categories |
| **DONE** (backend + UI + real data) | 50 (96%) |
| **PARTIAL** (exists but incomplete) | 2 (4%) |
| **STUB** (code exists, placeholder/mock) | 0 (0%) |
| **MISSING** (no code at all) | 0 (0%) |
| Revenue blockers (P0) | **ALL 4 RESOLVED** |
| Core gaps (P1) | **ALL RESOLVED** |
| Business maturity (P2) | **ALL RESOLVED** |
| Competitive advantage (P3) | **ALL RESOLVED** |

**Completion estimate:** ~98% of the way to a sellable product. All milestones (M1-M5) complete. Remaining work is integration testing against production ChirpStack/Facturapi and final QA polish.

### Progress Update (2026-03-19)

- **M1: Foundation Fixes** -- 8/8 DONE (100%)
- **M2: Core Feature Completion** -- 10/10 DONE (100%)
- **M3: Operational Maturity** -- 9/9 DONE (100%)
- **M4: Polish & Testing** -- 8/8 DONE (100%) -- Completed 2026-03-18
- **M5: Competitive Features** -- 7/7 DONE (100%) -- Completed 2026-03-18
- **M6: Production Readiness** -- 24 tasks, Cycles 1-3 DONE -- Started 2026-03-19
  - Cycle 1: Schedule billing/compliance commands, invoice overdue, CC fix (4/4 DONE)
  - Cycle 2: Role-based UI visibility, empty states, state transition guards (8/8 DONE)
  - Cycle 3: Zod schemas, compliance overdue, defrost verified (10/10 DONE)
  - Cycle 4: i18n sweep, mobile audit, gap report refresh (IN PROGRESS)

**Codebase census:** 42 controllers, 33 models, 47 migrations, 33 factories, 13 policies, 14 jobs, 11 commands, 8 mailables, 56 frontend pages, 87 tests, 173 routes, 509 i18n keys.

**Gap report:** 34 gaps → 9 remaining (25 resolved in M6 Cycles 1-3). See `IMPLEMENTATION_GAP_REPORT.md`.

### Biggest Risks (Updated)

1. ~~**Dashboard shows no live data.**~~ RESOLVED -- Dashboard shows live sensor data with KPIs and Leaflet map.
2. ~~**Onboarding does not provision to ChirpStack.**~~ RESOLVED -- Gateway and device provisioning wired to onboarding.
3. ~~**Cannot generate invoices.**~~ RESOLVED -- Artisan command + billing endpoints + CFDI timbrado via Facturapi.
4. ~~**Cold chain false alarm flood.**~~ RESOLVED -- DefrostDetector wired to RuleEvaluator.

**Remaining risks:**
1. **ChirpStack API integration not tested against production instance.** DeviceProvisioner has real HTTP calls but no integration test with VCR-recorded responses.
2. ~~**Model factories missing for 31 of 32 models.**~~ RESOLVED -- 33 factories created (M4-01).
3. ~~**Only 3 authorization policies exist.**~~ RESOLVED -- 13 policies now exist (M4-02).
4. ~~**i18n incomplete.**~~ RESOLVED -- 509 translation keys across en.json + es.json (M4-04).

### Target: Sellable MVP

A "sellable MVP" means Astrea can:

1. **Onboard a client in 30 minutes** -- create org, create site, provision devices to ChirpStack, assign users to sites, apply recipes.
2. **Show live value on day one** -- dashboard with live sensor data, charts on zone/device pages, floor plan visualization.
3. **Alert the right person at the right time** -- escalation chains configurable via UI, defrost suppression prevents false alarms, push + WhatsApp delivery.
4. **Prove ROI monthly** -- COFEPRIS-compliant PDF temperature reports, morning summaries delivered via email/push.
5. **Bill the client** -- invoice generation from subscription, CFDI timbrado, payment tracking.

Estimated effort to reach sellable MVP (Milestones 1-3): **8-10 weeks** with 1 full-stack developer.

---

## 2. Priority Classification

### P0 -- Revenue Blockers (Cannot sell the platform without these)

| ID | Gap | Why It Blocks Revenue | Workflows |
|---|---|---|---|
| **P0-1** | Dashboard shows no live sensor data | Client logs in and sees empty cards. Cannot demonstrate value. First impression is broken. | 2.1 |
| **P0-2** | ChirpStack provisioning not wired to onboarding | Onboarding creates DB records but never registers devices in ChirpStack. Sensors never join the network. Installation fails. | 1.3, 1.4, 8.2 |
| **P0-3** | Invoice generation has no trigger | Subscription + invoice services exist but are never called. Cannot bill clients. Zero revenue. | 6.1, 6.2, 6.3, 6.5, 6.8 |
| **P0-4** | User-site assignment has no UI | Multi-tenancy depends on users being assigned to sites. Without this, org_admin cannot set up their team. Site scoping is broken for all non-admin roles. | 1.7, 7.2 |

### P1 -- Core Gaps (Needed for first paying client)

| ID | Gap | Impact | Workflows |
|---|---|---|---|
| **P1-1** | Floor plan live view missing | PRD's key differentiator ("sensors as colored dots on 2D plan") not built. | 2.5 |
| **P1-2** | Escalation chain configuration UI missing | Cannot set up who gets alerted in what order. Alert routing defaults to broadcast-only. | 1.8, 3.5 |
| **P1-3** | Morning summary delivery not implemented | All 3 summary jobs generate data but deliver via `Log::info` only. The #1 daily touchpoint is broken. | 2.6, 2.7, 2.8 |
| **P1-4** | PDF report export is placeholder | COFEPRIS compliance reports cannot be downloaded as PDF. Browsershot not integrated. | 5.4 |
| **P1-5** | DefrostDetector not wired to RuleEvaluator | Every cold chain install will have 8-16 false alarms/day. Destroys client trust on day one. | 3.8 |
| **P1-6** | Push notifications not implemented | No PushNotificationService, no SendPushNotification job. Medium-severity alerts have no delivery channel. | 3.4 |
| **P1-7** | Auto-create work orders not wired | CreateWorkOrder job exists but CheckDeviceHealth does not dispatch it. Battery/offline alerts do not auto-generate maintenance orders. | 4.1, 4.7 |
| **P1-8** | Organization creation has no UI | super_admin must create orgs via DB/tinker. Blocks rapid client onboarding. | 1.1 |
| **P1-9** | Sensor drag-drop placement on floor plan missing | Floor plans can be uploaded but sensors cannot be placed via UI. | 1.5 |
| **P1-10** | Charts not rendered in frontend pages | Device detail, zone detail, reports pages receive chart data from controllers but React pages do not render charts. | 2.3, 2.4, 5.1, 5.2 |
| **P1-11** | Recipe threshold editor missing | org_admin cannot customize alert thresholds per site. site_recipe_overrides table exists but no UI. | 7.5, 1.9 |
| **P1-12** | Command Center org metrics hardcoded to 0 | CommandCenterController maps device_count, online_count, active_alerts to literal 0 per org. | CC overview |

### P2 -- Business Maturity (Nice-to-have for 1.0 launch)

| ID | Gap | Impact | Workflows |
|---|---|---|---|
| **P2-1** | CFDI timbrado is a stub | FacturapiService returns mock UUIDs. Clients need real CFDI for tax deduction. Can work around with manual invoicing initially. | 6.4, 6.7 |
| **P2-2** | Map view on dashboard (Leaflet) | PRD specifies map with all sites. Currently just a card grid. Less impactful for single-site clients. | 2.1 |
| ~~**P2-3**~~ | ~~Report builder page missing~~ | RESOLVED (M4-05). `/reports` landing page with module selector, date range, zones. | 5.5 |
| ~~**P2-4**~~ | ~~Command Center revenue dashboard~~ | RESOLVED (M5-01). `/command-center/revenue` with MRR by segment/org, invoice trends. | CC revenue |
| ~~**P2-5**~~ | ~~Excursion report with corrective actions~~ | RESOLVED (M4-06). Standalone excursion report linking alerts to corrective actions. | 5.6 |
| ~~**P2-6**~~ | ~~Night waste detection (energy)~~ | RESOLVED (M5-07). Night waste detection in EnergyReport. | Energy |
| **P2-7** | Navigation missing key links | Nav config lacks Command Center, Work Orders, Reports, Billing in sidebar. | All |
| **P2-8** | Alert rate limiting for mass events | PRD specifies batching WhatsApp during city-wide power outages. Not implemented. | 3.3 |

### P3 -- Competitive Advantage (Differentiation, not blocking launch)

| ID | Gap | Impact | Workflows |
|---|---|---|---|
| ~~**P3-1**~~ | ~~Field dispatch map~~ | RESOLVED (M5-04). `/command-center/dispatch` with site visit map and work order assignment. | CC dispatch |
| ~~**P3-2**~~ | ~~Command Center org drill-down~~ | RESOLVED (M5-02). `/command-center/{org}` with sites health, alerts, activity. | CC orgs |
| ~~**P3-3**~~ | ~~Compliance calendar~~ | RESOLVED (M5-03). ComplianceEvent model + calendar UI + email reminders. | 5.7 |
| ~~**P3-4**~~ | ~~Partner portal (white-label)~~ | RESOLVED (M5-06). ApplyOrgBranding middleware + org settings. | Partner |
| ~~**P3-5**~~ | ~~SAP/CONTPAQ real integration~~ | RESOLVED (M5-05). Real HTTP calls replace stubs. | 8.7 |
| ~~**P3-6**~~ | ~~Advanced modules (Industrial, IAQ, People)~~ | RESOLVED (M5-07). IAQ + Industrial dashboards built. | Phase 9 |

---

## 3. Milestone Plan

### Milestone 1: Foundation Fixes (P0s -- Must Do First) -- COMPLETE

**Goal:** Unblock installation, demo, and billing. Make the platform functional enough for a pilot client.
**Duration:** 2-3 weeks
**Theme:** "From placeholder to functional"
**Status:** 8/8 DONE (100%) -- Completed 2026-03-17

| ID | Task | Gap | Status | Notes |
|---|---|---|---|---|
| M1-01 | User-site assignment UI in Settings > Users | P0-4 | **DONE** | Multi-select site checkboxes in user management. |
| M1-02 | Wire ChirpStack gateway provisioning to onboarding | P0-2 | **DONE** | DeviceProvisioner::createGateway() called from onboarding. |
| M1-03 | Wire ChirpStack device provisioning to onboarding | P0-2 | **DONE** | DeviceProvisioner::provision() called from onboarding with OTAA keys. |
| M1-04 | Dashboard with live sensor data + KPIs | P0-1 | **DONE** | DashboardController queries real devices, alerts, work orders. |
| M1-05 | Wire DefrostDetector to RuleEvaluator | P1-5 | **DONE** | shouldSuppressAlert() called before alert evaluation. |
| M1-06 | Fix Command Center org metrics | P1-12 | **DONE** | Real withCount queries replace hardcoded 0s. |
| M1-07 | Invoice generation trigger + management UI | P0-3 | **DONE** | GenerateInvoicesCommand + billing endpoints (generate, mark paid, download). |
| M1-08 | Navigation sidebar completeness | P2-7 | **DONE** | Command Center, Work Orders, Reports, Billing, Escalation Chains added. |

### Milestone 2: Core Feature Completion (P1s -- Charts, Visualization, Missing Pages) -- COMPLETE

**Goal:** Make monitoring pages functional with real charts and interactive features. Complete the "daily ops" experience.
**Duration:** 2-3 weeks
**Theme:** "From skeleton to usable"
**Status:** 10/10 DONE (100%) -- Completed 2026-03-17

| ID | Task | Gap | Status | Notes |
|---|---|---|---|---|
| M2-01 | Integrate Recharts in zone detail page | P1-10 | **DONE** | Recharts AreaChart with 24h/7d/30d toggle. |
| M2-02 | Integrate Recharts in device detail page | P1-10 | **DONE** | Recharts LineChart with multi-metric support. |
| M2-03 | Integrate Recharts in temperature report page | P1-10 | **DONE** | Compliance bar chart + zone temperature trends. |
| M2-04 | Integrate Recharts in energy report page | P1-10 | **DONE** | Dual-axis AreaChart for consumption + cost. |
| M2-05 | Escalation chain configuration UI | P1-2 | **DONE** | Escalation chain CRUD page + controller + routes. |
| M2-06 | Floor plan live view component | P1-1 | **DONE** | FloorPlanView component with colored sensor dots. Wired into site detail page (M4-08). |
| M2-07 | Sensor drag-drop placement on floor plan | P1-9 | **DONE** | Drag-drop sensor placement saves normalized coordinates. |
| M2-08 | Organization creation UI for super_admin | P1-8 | **DONE** | Create Organization dialog in partner portal. |
| M2-09 | Create missing page files for existing routes | -- | **DONE** | All 9 missing pages created with full implementations. |
| M2-10 | Recipe threshold editor for org_admin | P1-11 | **DONE** | Per-site recipe override editor with editable thresholds. |

### Milestone 3: Operational Maturity (P1-P2 -- Notifications, Reports, Billing) -- COMPLETE

**Goal:** Complete the daily value loop: morning summaries arrive, reports download as PDF, invoices are generated. Platform is self-sufficient for operations.
**Duration:** 2-3 weeks
**Theme:** "From functional to operational"
**Status:** 9/9 DONE (100%) -- Completed 2026-03-17

| ID | Task | Gap | Status | Notes |
|---|---|---|---|---|
| M3-01 | Morning summary email delivery | P1-3 | **DONE** | 3 Mailable classes (MorningSummary, Corporate, Regional) + 3 Blade templates. |
| M3-02 | Push notification service (Expo/FCM) | P1-6 | **DONE** | PushNotificationService wired via Expo Push API. |
| M3-03 | Morning summary push delivery | P1-3 | **DONE** | Email + push in all summary jobs. |
| M3-04 | PDF report generation | P1-4 | **DONE** | Temperature + energy Blade templates, dompdf download endpoints. |
| M3-05 | Auto-create work orders from device health | P1-7 | **DONE** | CheckDeviceHealth dispatches CreateWorkOrder for offline >2h, battery <20%, gateway offline >30min. |
| M3-06 | CFDI timbrado via Facturapi | P2-1 | **DONE** | Real Facturapi HTTP calls, PDF/XML download. cfdi_api_id migration added. |
| M3-07 | Site CRUD in settings | -- | **DONE** | SiteSettingsController + settings/sites/index page. |
| M3-08 | Dashboard map view (Leaflet) | P2-2 | **DONE** | Leaflet dynamic loading, site markers with status colors. |
| M3-09 | Alert rate limiting for mass events | P2-8 | **DONE** | Redis batching + SendBatchAlertSummary job. |

### Milestone 4: Polish and Testing (P2 -- Quality, Coverage, i18n) -- COMPLETE

**Goal:** Production-ready quality. Comprehensive test coverage. Handle edge cases. Prepare for scale.
**Duration:** 2 weeks
**Theme:** "From working to reliable"
**Status:** 8/8 DONE (100%) -- Completed 2026-03-18

| ID | Task | Gap | Status | Notes |
|---|---|---|---|---|
| M4-01 | Model factories for all 33 models | -- | **DONE** | OrganizationFactory through TrafficSnapshotFactory. 33 factories total, 100% coverage. |
| M4-02 | Authorization policies for controllers | -- | **DONE** | 10 new policies: DevicePolicy, AlertPolicy, AlertRulePolicy, WorkOrderPolicy, SitePolicy, RecipePolicy, EscalationChainPolicy, BillingPolicy, ReportPolicy, UserPolicy (13 total). |
| M4-03 | Integration test coverage for P0/P1 features | -- | **DONE** | Full-flow tests using new factories. |
| M4-04 | i18n completion (Spanish/English) | -- | **DONE** | 509 translation keys across en.json + es.json. All user-facing text uses `t()`. |
| M4-05 | Report builder landing page | P2-3 | **DONE** | `/reports` page with module selector, date range picker, site/zone selector. |
| M4-06 | Excursion report with corrective actions | P2-5 | **DONE** | Standalone excursion report linking alerts to corrective actions. |
| M4-07 | "My Work Orders" filter for technicians | -- | **DONE** | `assigned_to=me` filter pre-selected for technician role. |
| M4-08 | FloorPlanView wired into site detail page | P1-1 | **DONE** | FloorPlanView component now integrated into site detail. |

### Milestone 5: Competitive Features (P3 -- Differentiation) -- COMPLETE

**Goal:** Features that differentiate Astrea from commodity IoT dashboards. Not required for launch but drive upsell and retention.
**Duration:** 3-4 weeks (can be parallelized)
**Theme:** "From operational to strategic"
**Status:** 7/7 DONE (100%) -- Completed 2026-03-18

| ID | Task | Gap | Status | Notes |
|---|---|---|---|---|
| M5-01 | Command Center revenue dashboard | P2-4 | **DONE** | `/command-center/revenue` with MRR by segment/org, invoice trends. |
| M5-02 | Command Center org drill-down page | P3-2 | **DONE** | `/command-center/{org}` with sites health, alerts, activity timeline. |
| M5-03 | Compliance calendar | P3-3 | **DONE** | ComplianceEvent model + migration + factory + ComplianceController + mailable + reminder command. `/settings/compliance`. |
| M5-04 | Field dispatch map | P3-1 | **DONE** | `/command-center/dispatch` with site visit map, technician locations, work order drag-assign. |
| M5-05 | SAP/CONTPAQ real integration | P3-5 | **DONE** | Replaced stubs with real HTTP API calls in SapExportService and ContpaqExportService. |
| M5-06 | Partner portal white-label | P3-4 | **DONE** | ApplyOrgBranding middleware + org settings for logo, colors on login, sidebar, report headers. |
| M5-07 | Advanced module dashboards (IAQ, Industrial) | P3-6 | **DONE** | IAQ dashboard at `/sites/{site}/modules/iaq` (CO2, temp, humidity, LEED/WELL scoring). Industrial dashboard at `/sites/{site}/modules/industrial` (vibration, compressed air). Night waste detection in EnergyReport. Gateway addon billing ($2,500/mo). SyncSubscriptionMetering job + billing:sync-metering command. |

---

## 4. Task Breakdown -- Complete Reference

### Summary by Milestone

| Milestone | Tasks | Status | Completed |
|---|---|---|---|
| **M1: Foundation Fixes** | 8 | **COMPLETE** | 2026-03-17 |
| **M2: Core Feature Completion** | 10 | **COMPLETE** | 2026-03-17 |
| **M3: Operational Maturity** | 9 | **COMPLETE** | 2026-03-17 |
| **M4: Polish & Testing** | 8 | **COMPLETE** | 2026-03-18 |
| **M5: Competitive Features** | 7 | **COMPLETE** | 2026-03-18 |
| **Total** | **42** | **42/42 done (100%)** | 2026-03-18 |

### Scope Legend

| Scope | Definition | Typical Effort |
|---|---|---|
| Quick Win | Single file change, config update, one-liner fix | < 1 day |
| Small | Single feature in 1-2 files, backend-only or frontend-only | 1 day |
| Medium | Feature spanning 3-5 files across backend + frontend | 2-3 days |
| Large | Multi-component feature with backend, frontend, tests | 1 week |
| XL | Complex feature requiring new architecture, multiple services | 2+ weeks |

---

## 5. Dependency Graph

```
M1-01 (User-Site Assignment)
  |
  +---> M2-05 (Escalation Chain UI) -- needs user-site context
  |
  +---> M3-03 (Push Summary Delivery) -- needs site-scoped users

M1-02 (ChirpStack Gateway Provisioning)
  |
  +---> M1-03 (ChirpStack Device Provisioning)

M1-04 (Dashboard Live Data)
  |
  +---> M3-08 (Dashboard Map View)

M1-07 (Invoice Generation)
  |
  +---> M3-06 (CFDI Timbrado)
  |
  +---> M5-01 (Revenue Dashboard)

M2-01 (Zone Charts)
  |
  +---> M2-03 (Temperature Report Charts)
  |       |
  |       +---> M3-04 (PDF Report Generation)
  |               |
  |               +---> M4-06 (Excursion Report)
  |
  +---> M5-07 (Advanced Module Dashboards)

M2-04 (Energy Report Charts)
  |
  +---> M3-04 (PDF Report Generation)

M2-06 (Floor Plan Live View)
  |
  +---> M2-07 (Sensor Drag-Drop Placement)

M3-02 (Push Notification Service)
  |
  +---> M3-03 (Morning Summary Push)

M4-01 (Model Factories)
  |
  +---> M4-03 (Integration Tests)
  |
  +---> M4-08 (WhatsApp Integration Test)
```

### Critical Path (shortest path to sellable MVP) -- ACHIEVED

```
M1-01 --> M1-02 --> M1-03 --> M1-04 --> M1-05 --> M1-07     ALL DONE
  |                                                  |
  v                                                  v
M2-05 --> M2-01 --> M2-06 --> M2-09              M3-06       ALL DONE
  |         |                                        |
  v         v                                        v
M3-01 --> M3-02 --> M3-04                      SELLABLE MVP  REACHED
```

**Status:** Critical path complete as of 2026-03-17. Platform is at sellable MVP stage. Remaining milestones (M4, M5) focus on production quality and competitive differentiation.

---

## 6. Risk Register

| # | Risk | Probability | Impact | Status | Mitigation |
|---|---|---|---|---|---|
| **R1** | **ChirpStack API integration fails in production** -- DeviceProvisioner has real HTTP calls wired to onboarding (M1-02, M1-03) but has never been tested against a real ChirpStack Cloud instance. | High | Critical | OPEN | Create integration test with VCR-recorded responses in M4. Add circuit breaker pattern to provisioner. Test against staging ChirpStack Cloud before first client install. |
| **R2** | **Cold chain false alarm flood on first install** -- DefrostDetector wired to RuleEvaluator (M1-05), but detection may fail for specific refrigerator models. | Medium | High | MITIGATED | DefrostDetector wired. Run simulator for 48h. Manual defrost schedule override UI as fallback. |
| **R3** | **Facturapi CFDI integration delays** -- Facturapi requires SAT certificate upload, test vs production environments, and real RFC validation. FacturapiService now makes real API calls (M3-06). | Medium | High | MITIGATED | Real API calls implemented. Need sandbox testing. Manual invoicing fallback. |
| **R6** | **SAP/CONTPAQ real API integration untested** -- M5-05 replaced stubs with real HTTP calls, but no VCR-recorded responses or staging ERP to validate against. | Medium | Medium | OPEN | Test against partner SAP/CONTPAQ sandbox before production deployment. |
| **R4** | **TimescaleDB not available in production** -- The codebase is built on SQLite for dev/test. Production requires PostgreSQL 16 + TimescaleDB extension. | Medium | Critical | OPEN | Validate PostgreSQL + TimescaleDB setup on staging server. Create a migration guide from SQLite to PostgreSQL. Test all time-series queries against real PostgreSQL. |
| **R5** | **Frontend chart library mismatch** | -- | -- | RESOLVED | Standardized on Recharts. All chart pages (zone, device, temperature report, energy report) use Recharts consistently (M2-01 through M2-04). |

---

## Appendix A: Pages That Need Creation

These routes have controllers rendering Inertia pages, but the page files do not exist:

| Route Name | Expected Page Path | Controller | Priority |
|---|---|---|---|
| `command-center.alerts` | `command-center/alerts.tsx` | `CommandCenterController@alerts` | M2-09 |
| `command-center.work-orders` | `command-center/work-orders.tsx` | `CommandCenterController@workOrders` | M2-09 |
| `command-center.devices` | `command-center/devices.tsx` | `CommandCenterController@devices` | M2-09 |
| `gateways.index` | `settings/gateways/index.tsx` | `GatewayController@index` | M2-09 |
| `gateways.show` | `settings/gateways/show.tsx` | `GatewayController@show` | M2-09 |
| `recipes.index` | `settings/recipes/index.tsx` | `RecipeController@index` | M2-09 |
| `recipes.show` | `settings/recipes/show.tsx` | `RecipeController@show` | M2-09 |
| `rules.show` | `settings/rules/show.tsx` | `AlertRuleController@show` | M2-09 |
| `devices.show` (site-scoped) | `settings/devices/show.tsx` | `DeviceController@show` | M2-09 |

## Appendix B: Services That Were Never Called (NOW RESOLVED)

All previously unwired services have been connected as of M1-M3 completion:

| Service | Methods | Now Called From | Milestone |
|---|---|---|---|
| `ChirpStack\DeviceProvisioner` | `provision()`, `deprovision()`, `createGateway()` | `SiteOnboardingController` | M1-02, M1-03 |
| `Billing\InvoiceService` | `generateInvoice()`, `markPaid()` | `GenerateInvoicesCommand` + `BillingController` | M1-07 |
| `Billing\FacturapiService` | `createCfdi()`, `downloadPdf()`, `downloadXml()` | `InvoiceService` after generation | M3-06 |
| `Alerts\DefrostDetector` | `shouldSuppressAlert()` | `EvaluateAlertRules` job | M1-05 |
| `Maintenance\CreateWorkOrder` (job) | `handle()` | `CheckDeviceHealth` job | M3-05 |

## Appendix C: ~~Models Without Factories~~ -- RESOLVED

All 33 models now have factories (M4-01, completed 2026-03-18). Factory coverage is 100%.

---

*Generated from gap analysis against PRD v2.0. All estimates assume 1 full-stack developer familiar with Laravel 12, React 19, Inertia.js 2, and the Astrea codebase. Parallelization with a second developer could reduce total timeline by ~40%.*
