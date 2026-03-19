# Workflow UX Design

> **Astrea IoT Platform** — Maps every business workflow to screens, actions, navigation, and states.
> Generated: 2026-03-19 | Phase 5b Playbook Output
> Cross-references: SYSTEM_BEHAVIOR_SPEC.md, ASTREA_WORKFLOWS.md

---

## 1. Workflow Catalog

12 validated workflows. Each enriched with triggers, actors, happy/failure paths, and business rule references.

| WF-ID | Workflow | Trigger | Primary Actor | Secondary Actors | Rules | State Machines |
|---|---|---|---|---|---|---|
| WF-001 | Client Onboarding | New org created | super_admin, org_admin | — | BR-047–050 | SM-005 |
| WF-002 | Sensor Data Pipeline | MQTT payload received | System | — | BR-001–002, BR-007–009 | SM-004 |
| WF-003 | Alert Lifecycle | Threshold breach detected | System → User | technician | BR-010–020 | SM-001, SM-010 |
| WF-004 | Device Health Monitoring | Scheduled (every 5 min) | System | technician | BR-003–006 | SM-004, SM-009 |
| WF-005 | Work Order Lifecycle | Manual or auto-created | site_manager, System | technician | BR-005–006, BR-044 | SM-002 |
| WF-006 | Morning/Regional/Corporate Summaries | Scheduled (opening_hour, +30min, 08:00) | System | All roles | BR-034–037, BR-041 | — |
| WF-007 | Billing & Invoicing | Monthly (1st of month) | System → org_admin | — | BR-021–028 | SM-003, SM-007 |
| WF-008 | Compliance Calendar | Manual + scheduled reminders | org_admin, System | — | BR-038 | SM-006 |
| WF-009 | User Management | Manual | org_admin | — | — | — |
| WF-010 | Integration Export | Manual or scheduled | org_admin, System | — | BR-028, BR-045 | — |
| WF-011 | Module & Recipe System | During onboarding or settings | org_admin | — | BR-043, BR-050 | — |
| WF-012 | White-Label Branding | Settings change | org_admin | — | — | — |

---

## 2. User Journeys

### WF-001: Client Onboarding

**Journey: super_admin (creates organization)**
1. **Partner Portal** `/partner` → clicks "Create Organization" button
2. **Create Org Dialog** → fills name, segment, plan → submits
3. System auto-generates subscription with segment base_fee (BR-049)
4. Redirects to **Partner Portal** with new org in table

**Journey: org_admin (onboards first site)**
1. **Settings > Sites** `/settings/sites` → clicks "Add Site" button
2. **Create Site Form** → fills name, address, timezone, opening_hour → submits
3. Site created with status=onboarding → redirected to **Onboarding Wizard**
4. **Onboarding Wizard** `/sites/{id}/onboard` — Step 1: Gateway
   - Enters gateway serial, model → "Register Gateway" button → ChirpStack API call (INT-001)
5. Step 2: Devices — enters device details (name, dev_eui, model, app_key, zone) → "Register Devices"
   - ChirpStack provisioning + OTAA key registration
6. Step 3: Modules — toggles modules (cold_chain, energy, iaq, industrial) → "Activate"
   - Auto-applies matching recipes to devices (BR-050)
7. Step 4: Complete — reviews summary → "Complete Onboarding"
   - Validates: ≥1 gateway, ≥1 device, ≥1 module (BR-048)
   - Site status: onboarding → active (SM-005)
8. Redirected to **Site Detail** `/sites/{id}`

**Failure Paths:**
- ChirpStack API down → error toast "Could not register gateway" + retry button
- Duplicate dev_eui → inline validation error "DevEUI already registered"
- Missing requirements at completion → error toast listing what's missing

### WF-003: Alert Lifecycle

**Journey: site_manager (responds to alert)**
1. **Dashboard** → sees red alert badge in sidebar + notification bell count increments
2. Clicks notification → **Alert Detail** `/alerts/{id}`
3. Sees severity badge, trigger details (device, zone, metric, value vs threshold), timeline
4. Clicks "Acknowledge" → alert status: active → acknowledged (SM-001)
5. Investigates issue → clicks "Resolve" → alert status: acknowledged → resolved
6. Toast: "Alert resolved" → redirected to **Alerts Index**

**Journey: technician (via mobile/WhatsApp)**
1. Receives WhatsApp message with alert details + "Reply ACK to acknowledge"
2. Replies "ACK" → webhook processes acknowledgment → alert acknowledged
3. Receives push notification on mobile app
4. Opens mobile app → **Alert Detail** → acknowledges/resolves

**Journey: System (auto-resolution)**
1. `RuleEvaluator` detects 2 consecutive normal readings (BR-013)
2. Alert auto-resolved with resolution_type=auto
3. Resolved alert broadcast via Reverb (NT-010)

### WF-005: Work Order Lifecycle

**Journey: site_manager (creates and assigns)**
1. **Work Orders** `/work-orders` → clicks "New Work Order" (or auto-created by BR-005/BR-006)
2. **Work Order Form** → fills title, type, priority, description, assigns technician
3. Submits → work order created (status=open or assigned)
4. Technician receives push notification (NT-007)

**Journey: technician (completes work order)**
1. **Work Orders** `/work-orders` → filters "Assigned to me"
2. Clicks work order → **Work Order Detail** `/work-orders/{id}`
3. Clicks "Start Work" → status: assigned → in_progress
4. Uploads photos, adds notes during work
5. Clicks "Complete" → status: in_progress → completed
6. If linked to alert, alert auto-resolved (BR-044)

### WF-007: Billing & Invoicing

**Journey: org_admin (reviews and pays)**
1. **Settings > Billing** `/settings/billing` → sees plan summary + usage stats
2. Clicks "Generate Invoice" → selects period → system calculates total (BR-023)
3. Invoice created (status=draft) → clicks "Send" → status: draft → sent
4. Customer pays → org_admin clicks "Mark Paid" → selects payment_method (spei/transfer)
5. Invoice status: sent → paid → CFDI timbrado via Facturapi (BR-025)
6. Downloads PDF/XML from invoice row

### WF-008: Compliance Calendar

**Journey: org_admin (manages compliance)**
1. **Settings > Compliance** `/settings/compliance` → sees calendar view of events
2. Clicks "Add Event" → fills type (cofepris_audit, calibration, etc.), title, due_date
3. Event created (status=upcoming)
4. System sends reminders at 30/7/1 days before due_date (NT-006)
5. When audit complete → clicks "Mark Complete" → status: upcoming → completed

---

## 3. Screen Inventory

56 pages mapped to workflows and roles. Screens in 3+ workflows marked with **HIGH TRAFFIC**.

| Screen | URL Pattern | Workflows | Roles | Pattern | High Traffic |
|---|---|---|---|---|---|
| Dashboard | `/dashboard` | WF-002, WF-003, WF-004 | All | KPI cards + site grid/map | ✅ |
| Alerts Index | `/alerts` | WF-003 | All (view), manager+ (actions) | Filterable data table | |
| Alert Detail | `/alerts/{id}` | WF-003 | All (view), manager+ (actions) | Detail card + timeline | |
| Work Orders Index | `/work-orders` | WF-005, WF-004 | manager, technician | Filterable data table | |
| Work Order Detail | `/work-orders/{id}` | WF-005 | manager, technician | Detail + photos + notes | |
| Site Detail | `/sites/{id}` | WF-001, WF-002, WF-004 | All | KPI cards + zones grid | ✅ |
| Zone Detail | `/sites/{id}/zones/{zone}` | WF-002, WF-003 | All | Chart + device table | |
| Device Detail | `/devices/{id}` | WF-002, WF-003, WF-004 | All | Stats + chart + readings | ✅ |
| Reports Index | `/reports` | WF-006 | All (except technician) | Report type cards | |
| Temperature Report | `/sites/{id}/reports/temperature` | WF-006, WF-008 | manager, admin | Charts + compliance bars | |
| Energy Report | `/sites/{id}/reports/energy` | WF-006 | manager, admin | Cost breakdown + trends | |
| IAQ Module | `/sites/{id}/modules/iaq` | WF-011 | manager, admin | Zone scores + charts | |
| Industrial Module | `/sites/{id}/modules/industrial` | WF-011 | manager, admin | Machine monitoring | |
| Command Center | `/command-center` | WF-001, WF-004 | super_admin | Global KPIs + org table | ✅ |
| CC Alerts | `/command-center/alerts` | WF-003 | super_admin | Global alert table | |
| CC Devices | `/command-center/devices` | WF-004 | super_admin | Global device table | |
| CC Work Orders | `/command-center/work-orders` | WF-005 | super_admin | Global WO table | |
| CC Revenue | `/command-center/revenue` | WF-007 | super_admin | Revenue analytics | |
| CC Dispatch | `/command-center/dispatch` | WF-005 | super_admin | Field dispatch map | |
| CC Org Detail | `/command-center/{id}` | WF-001 | super_admin | Org drill-down | |
| Partner Portal | `/partner` | WF-001 | super_admin | Org table + create dialog | |
| Site Onboarding | `/sites/{id}/onboard` | WF-001 | org_admin | Multi-step wizard | |
| Settings: Sites | `/settings/sites` | WF-001 | org_admin | Site table + CRUD | |
| Settings: Gateways | `/settings/gateways` | WF-001 | org_admin | Gateway table + CRUD | |
| Settings: Gateway Detail | `/settings/gateways/{id}` | WF-001 | org_admin | Gateway info + diagnostics | |
| Settings: Devices | `/settings/devices` | WF-001, WF-002 | org_admin | Device table + config | |
| Settings: Device Detail | `/settings/devices/{id}` | WF-001, WF-002 | org_admin | Device config form | |
| Settings: Rules | `/settings/rules` | WF-003 | org_admin, site_manager | Rule table + toggle | |
| Settings: Rule Detail | `/settings/rules/{id}` | WF-003 | org_admin, site_manager | Rule config form | |
| Settings: Escalation Chains | `/settings/escalation-chains` | WF-003 | org_admin, site_manager | Chain table + CRUD | |
| Settings: Recipes | `/settings/recipes` | WF-011 | org_admin | Recipe table | |
| Settings: Recipe Detail | `/settings/recipes/{id}` | WF-011 | org_admin | Recipe config + metrics | |
| Settings: Users | `/settings/users` | WF-009 | org_admin | User table + invite | |
| Settings: Organization | `/settings/organization` | WF-012 | org_admin | Org settings form | |
| Settings: Billing | `/settings/billing` | WF-007 | org_admin | Billing dashboard | |
| Settings: Compliance | `/settings/compliance` | WF-008 | org_admin | Calendar + CRUD | |
| Settings: API Keys | `/settings/api-keys` | WF-010 | org_admin | Key table + CRUD | |
| Settings: Integrations | `/settings/integrations` | WF-010 | org_admin | Integration cards | |
| Settings: Profile | `/settings/profile` | — | All | Profile form | |
| Settings: Password | `/settings/password` | — | All | Password form | |
| Settings: Appearance | `/settings/appearance` | — | All | Theme selector | |
| Settings: Two-Factor | `/settings/two-factor` | — | All | 2FA setup | |
| Activity Log | `/activity-log` | — | manager, admin | Timeline view | |
| Notifications | `/notifications` | ALL | All | Notification list | ✅ |
| Login | `/login` | — | Unauthenticated | Auth form | |
| Register | `/register` | — | Unauthenticated | Auth form | |
| Forgot Password | `/password/forgot` | — | Unauthenticated | Email form | |
| Reset Password | `/password/reset/{token}` | — | Unauthenticated | Reset form | |

---

## 4. Screen Details — Actions & Navigation

### 4.1 Dashboard

**URL:** `/dashboard` | **Roles:** All | **Pattern:** KPI cards + site grid/map toggle

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Login | Auto-redirect after auth | Always |
| Sidebar | "Dashboard" menu item | Always |
| Any page | Logo click | Always |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View site | Site card click | Site Detail `/sites/{id}` | Always | WF-002 |
| Toggle map/grid | View toggle buttons | Same page (re-render) | Always | — |
| View alerts | Alert badge in sidebar | Alerts Index `/alerts` | Alert count > 0 | WF-003 |
| Switch site | Site selector dropdown | Same page (filtered) | Multiple sites | — |

#### Role Differences
| Element | super_admin | org_admin | site_manager | site_viewer | technician |
|---|---|---|---|---|---|
| KPI cards | All orgs aggregated | Org-scoped | Assigned sites | Assigned sites | Assigned sites |
| Map view | All org sites | Org sites | Assigned sites | Assigned sites | Assigned sites |
| Command Center link | Visible | Hidden | Hidden | Hidden | Hidden |

### 4.2 Alerts Index

**URL:** `/alerts` | **Roles:** All (view), manager+ (actions) | **Pattern:** Filterable data table

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View alert | Row click | Alert Detail `/alerts/{id}` | Always | WF-003 |
| Acknowledge | "Ack" button on row | Same page (status updated) | Status=active, permission | WF-003 |
| Resolve | "Resolve" button on row | Same page (status updated) | Status=active/ack'd, permission | WF-003 |
| Dismiss | "Dismiss" in dropdown | Same page (status updated) | Status=active/ack'd, permission | WF-003 |
| Filter severity | Dropdown (critical/high/medium/low) | Same page (filtered) | Always | — |
| Filter status | Tab bar (all/active/ack'd/resolved) | Same page (filtered) | Always | — |
| Filter date range | Date picker | Same page (filtered) | Always | — |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Notifications |
|---|---|---|---|---|
| Acknowledge | POST `/alerts/{id}/acknowledge` | alert: status→acknowledged, acknowledged_at=now | SM-001: active→acknowledged | — |
| Resolve | POST `/alerts/{id}/resolve` | alert: status→resolved, resolved_at=now, resolved_by=user | SM-001: *→resolved | — |
| Dismiss | POST `/alerts/{id}/dismiss` | alert: status→dismissed, resolved_at=now | SM-001: *→dismissed | — |

### 4.3 Site Detail

**URL:** `/sites/{id}` | **Roles:** All with site access | **Pattern:** KPI cards + zone grid

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View zone | Zone card click | Zone Detail `/sites/{id}/zones/{zone}` | Always | WF-002 |
| View floor plan | Floor plan section | Inline expansion | Floor plans exist | — |
| Temperature report | "Temp Report" link | Temperature Report `/sites/{id}/reports/temperature` | manager+ | WF-006 |
| Summary report | "Summary" link | Summary page | manager+ | WF-006 |
| Onboard (if incomplete) | "Continue Setup" banner | Onboarding Wizard `/sites/{id}/onboard` | status=onboarding | WF-001 |

### 4.4 Work Orders Index

**URL:** `/work-orders` | **Roles:** manager, technician | **Pattern:** Filterable data table

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View work order | Row click | Work Order Detail `/work-orders/{id}` | Always | WF-005 |
| Create work order | "New" button | Work Order Form (modal or page) | manage work orders | WF-005 |
| Filter status | Tab bar (open/assigned/in_progress/completed) | Same page (filtered) | Always | — |
| Filter "My WOs" | "Assigned to me" toggle | Same page (filtered) | technician role | WF-005 |
| Filter priority | Dropdown | Same page (filtered) | Always | — |

### 4.5 Settings: Billing

**URL:** `/settings/billing` | **Roles:** org_admin | **Pattern:** Dashboard + invoice table

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Generate invoice | "Generate Invoice" button | Invoice generation modal | manage org settings | WF-007 |
| Mark paid | "Mark Paid" button on invoice row | Payment method dialog | Invoice status=sent/draft | WF-007 |
| Download PDF | PDF icon on invoice row | File download | Invoice has cfdi_api_id | WF-007 |
| Download XML | XML icon on invoice row | File download | Invoice has cfdi_api_id | WF-007 |
| View profiles | "Billing Profiles" tab | Profiles list | manage org settings | WF-007 |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Notifications | Integrations |
|---|---|---|---|---|---|
| Generate invoice | POST `/settings/billing/generate-invoice` | invoice: create with calculated totals | SM-003: →draft | — | — |
| Mark paid | POST `/settings/billing/invoices/{id}/mark-paid` | invoice: status→paid, paid_at=now, payment_method | SM-003: →paid | — | INT-003: Facturapi CFDI |
| Download PDF | GET `/settings/billing/invoices/{id}/download/pdf` | — (read) | — | — | INT-003: Facturapi PDF |

### 4.6 Site Onboarding Wizard

**URL:** `/sites/{id}/onboard` | **Roles:** org_admin | **Pattern:** Multi-step wizard (5 steps)

#### Actions per Step
| Step | Action | Element | Side Effects | Integrations |
|---|---|---|---|---|
| 1. Gateway | Register gateway | Form submit | Creates Gateway record, provisions in ChirpStack | INT-001 |
| 2. Devices | Register devices | Form submit (batch) | Creates Device records, provisions in ChirpStack, sets OTAA keys | INT-001 |
| 3. Modules | Activate modules | Toggle switches | Creates SiteModule records, applies recipes (BR-050) | — |
| 4. Complete | Complete onboarding | "Complete" button | Site status: onboarding→active (SM-005) | — |

### 4.7 Settings: Compliance

**URL:** `/settings/compliance` | **Roles:** org_admin | **Pattern:** Calendar view + CRUD

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Create event | "Add Event" button | Create form/modal | manage org settings | WF-008 |
| Edit event | Edit button on row | Edit form/modal | status ≠ completed | WF-008 |
| Mark complete | "Complete" button | Confirmation dialog | status=upcoming/overdue | WF-008 |
| Delete event | Delete in dropdown | Confirmation dialog | manage org settings | WF-008 |

### 4.8 Command Center

**URL:** `/command-center` | **Roles:** super_admin only | **Pattern:** Global KPI dashboard

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View org detail | Org row click | CC Org Detail `/command-center/{id}` | Always | WF-001 |
| View global alerts | "Alerts" nav | CC Alerts `/command-center/alerts` | Always | WF-003 |
| View global devices | "Devices" nav | CC Devices `/command-center/devices` | Always | WF-004 |
| View global WOs | "Work Orders" nav | CC Work Orders `/command-center/work-orders` | Always | WF-005 |
| View revenue | "Revenue" nav | CC Revenue `/command-center/revenue` | Always | WF-007 |
| View dispatch | "Dispatch" nav | CC Dispatch `/command-center/dispatch` | Always | WF-005 |

---

## 5. Screen States

### Dashboard States

| State | Condition | What User Sees | Available Actions |
|---|---|---|---|
| **Loading** | Initial page load | Skeleton KPI cards (4) + skeleton grid | None |
| **Empty (no sites)** | User has no accessible sites | "No sites yet" + CTA varies by role | org_admin: "Create Site" button |
| **Populated** | Sites exist | KPI cards + site grid/map | All actions per role |
| **Map view** | Map toggle active | Leaflet map with site markers | Click marker → site detail |
| **Error** | API failure | Error banner "Could not load dashboard" + Retry | Retry |

### Alerts Index States

| State | Condition | What User Sees | Available Actions |
|---|---|---|---|
| **Loading** | Page load or filter change | Skeleton table | None |
| **Empty (no alerts)** | No alerts match filters | "No alerts" + illustration | Clear filters |
| **Empty (filtered)** | Filters active, no matches | "No alerts match this filter" + "Clear" | Clear filters |
| **Populated** | Alerts exist | Data table with severity badges + pagination | All actions per role |
| **Error** | API failure | Error banner + Retry | Retry |

### Site Detail States

| State | Condition | What User Sees | Available Actions |
|---|---|---|---|
| **Loading** | Page load | Skeleton cards + zones | None |
| **Onboarding** | site.status = onboarding | "Setup incomplete" banner + "Continue" CTA | Navigate to onboarding |
| **Active (healthy)** | All devices online | Green KPIs + zone grid | View zones, reports |
| **Active (degraded)** | Some devices offline/alerting | Amber/red KPIs + alert badges on zones | View zones, acknowledge alerts |
| **No devices** | Site active but no devices | Empty zones area + "Add devices" CTA | Navigate to device settings |
| **Error** | API failure | Error banner + Retry | Retry |

### Work Order Detail States

| State | Condition | What User Sees | Available Actions |
|---|---|---|---|
| **Loading** | Page load | Skeleton | None |
| **Open** | status=open | Status badge "Open" + "Assign" button | Assign, Cancel |
| **Assigned** | status=assigned | Status badge "Assigned" + assignee name | Start Work, Cancel |
| **In Progress** | status=in_progress | Status badge "In Progress" + timer | Complete, Upload Photo, Add Note, Cancel |
| **Completed** | status=completed | Status badge "Completed" (green) + completion date | View only |
| **Cancelled** | status=cancelled | Status badge "Cancelled" (gray) | View only |

### Onboarding Wizard States

| State | Condition | What User Sees | Available Actions |
|---|---|---|---|
| **Step 1: Gateway** | No gateway registered | Gateway registration form | Submit gateway |
| **Step 1: Complete** | Gateway registered | Gateway info + "Next" button | Proceed to devices |
| **Step 2: Devices** | Gateway done, no devices | Device registration form (batch) | Submit devices |
| **Step 2: Complete** | Devices registered | Device list + "Next" button | Proceed to modules |
| **Step 3: Modules** | Devices done | Module toggles | Activate modules, proceed |
| **Step 4: Review** | Modules activated | Summary of setup | Complete onboarding |
| **Provisioning** | ChirpStack API call in progress | Spinner + "Registering..." | Wait |
| **Error** | ChirpStack API failure | Error message + retry button | Retry |

### Billing Dashboard States

| State | Condition | What User Sees | Available Actions |
|---|---|---|---|
| **Loading** | Page load | Skeleton | None |
| **No subscription** | Org has no subscription | "No active subscription" + contact info | — |
| **Active** | Subscription active | Plan summary + usage stats + invoice table | Generate invoice, mark paid |
| **Invoice empty** | No invoices yet | Empty invoice table + "Generate" CTA | Generate first invoice |

---

## 6. Workflow-to-UI Matrix

| Workflow | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Terminal |
|---|---|---|---|---|---|---|
| WF-001 Onboard | Partner Portal (create org) | Settings: Sites (create site) | Onboarding Wizard (4 steps) | — | — | Site Detail (active) |
| WF-002 Data Pipeline | — (system) | Dashboard (live KPIs) | Site Detail (zone grid) | Zone Detail (chart) | Device Detail (readings) | — |
| WF-003 Alert | Dashboard (badge) | Alerts Index (table) | Alert Detail (review) | Acknowledge/Resolve | — | Alerts Index (resolved) |
| WF-004 Health | — (system) | Dashboard (offline badge) | Device Detail (offline) | Auto WO created | — | WO completed |
| WF-005 Work Order | Work Orders Index (view) | WO Detail (assign) | WO Detail (start) | WO Detail (complete) | — | WO Index (completed) |
| WF-006 Summaries | — (system) | Notification (push/email) | Reports Index | Temp/Energy Report | Download PDF | — |
| WF-007 Billing | Settings: Billing | Generate Invoice | Mark Paid | Download PDF/XML | — | Billing (paid) |
| WF-008 Compliance | Settings: Compliance | Add Event | Wait (reminders) | Mark Complete | — | Compliance (completed) |
| WF-009 Users | Settings: Users | Invite User | Assign Sites | — | — | Users (active) |
| WF-010 Integrations | Settings: Integrations | Configure | Export | — | — | Integrations (synced) |
| WF-011 Modules | Onboarding Step 3 | Toggle modules | Recipes auto-applied | Module dashboard | — | Module (active) |
| WF-012 Branding | Settings: Org | Update colors/logo | — | — | — | All pages (branded) |

### Screen Coverage Check

| Screen | Actions Listed | States Listed | In ≥1 Workflow |
|---|---|---|---|
| Dashboard | ✅ (4) | ✅ (5) | ✅ WF-002,003,004 |
| Alerts Index | ✅ (6) | ✅ (5) | ✅ WF-003 |
| Alert Detail | ✅ (3) | ✅ (3) | ✅ WF-003 |
| Site Detail | ✅ (5) | ✅ (6) | ✅ WF-001,002,004 |
| Zone Detail | ✅ (2) | ✅ (3) | ✅ WF-002,003 |
| Device Detail | ✅ (2) | ✅ (4) | ✅ WF-002,003,004 |
| Work Orders Index | ✅ (5) | ✅ (4) | ✅ WF-005 |
| Work Order Detail | ✅ (6) | ✅ (6) | ✅ WF-005 |
| Command Center | ✅ (6) | ✅ (3) | ✅ WF-001,003,004,005,007 |
| Site Onboarding | ✅ (4) | ✅ (8) | ✅ WF-001 |
| Settings: Billing | ✅ (5) | ✅ (4) | ✅ WF-007 |
| Settings: Compliance | ✅ (4) | ✅ (3) | ✅ WF-008 |
| Settings: Users | ✅ (4) | ✅ (3) | ✅ WF-009 |
| Reports Index | ✅ (3) | ✅ (3) | ✅ WF-006 |
| Notifications | ✅ (4) | ✅ (4) | ✅ ALL |

### Orphan Check

**Screens not in any workflow:**
- Settings: Profile — utility (self-service)
- Settings: Password — utility (self-service)
- Settings: Appearance — utility (self-service)
- Settings: Two-Factor — utility (self-service)
- Activity Log — observability tool (not workflow-driven)

These are correctly workflow-independent — they are utility/self-service screens.

**Workflows with no dedicated screen (backend-only):**
- WF-002 Sensor Data Pipeline — backend processing, surfaces data on Dashboard/Site/Zone/Device screens
- WF-004 Device Health Monitoring — backend job, surfaces via Dashboard alerts and auto-created work orders
- WF-006 Morning Summaries — backend scheduled job, delivered via push/email notifications

---

## 7. Interaction Conventions

| Pattern | Decision | Rationale |
|---|---|---|
| **Data tables** | Paginated server-side with filter dropdowns + search | Large datasets (devices, alerts, work orders) need server pagination |
| **Create/Edit forms** | Modal dialogs for simple entities (site, user), dedicated page for complex (onboarding wizard) | Modals for ≤5 fields, pages for wizards |
| **Delete actions** | Confirmation dialog with entity name | Prevents accidental deletion |
| **Status changes** | Inline buttons on detail page (Acknowledge, Resolve, Start, Complete) | Fast — no navigation needed for status transitions |
| **Bulk operations** | Not currently implemented (single-item actions only) | Simplicity — bulk added when user demand warrants |
| **Filters** | Tab bar for status + dropdown for severity/priority + date range picker | Most common filter (status) is one-click accessible |
| **Success feedback** | Sonner toast (auto-dismiss 5s) | Non-blocking, handled globally via `useFlashMessages` |
| **Error feedback** | Inline validation errors + error toast for API failures | Inline for field errors, toast for system errors |
| **Navigation after create** | Redirect to index/parent page | "Done → back to list" mental model |
| **Navigation after update** | Stay on current page with success toast | Update = continue working on same entity |
| **Loading states** | Skeleton components matching content layout | Prevents layout shift, communicates loading |
| **Empty states** | Illustration + descriptive text + CTA button (role-appropriate) | Guides user to next action |
| **Charts** | Recharts with 3 period options (24h/7d/30d) | Covers operational (24h), weekly, and monthly views |
| **Maps** | Leaflet with dynamic loading (dashboard only) | Avoids loading map library on non-map pages |
| **Real-time updates** | Reverb WebSocket via `use-realtime-notifications` hook | Live notification bell + dashboard KPI updates |
| **i18n** | All user-facing text via `t()` function (en/es) | Bilingual platform (Mexico market) |
| **Destructive confirmations** | `ConfirmationDialog` component with warning message | Standard pattern across all delete/deactivate actions |
| **Theme** | Light/Dark/System via `useAppearance()` hook | User preference persisted in localStorage |
| **File uploads** | Single + batch upload via `FileUploadController` with allowed-types validation | Throttled (20/min single, 10/min batch) |
| **PDF reports** | Server-side generation via Blade templates + dompdf, downloaded via dedicated endpoint | Consistent formatting across browsers |
