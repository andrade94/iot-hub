# Workflow UX Design

> **Astrea IoT Platform** — Maps every business workflow to self-contained per-screen specs with columns, fields, actions, states, and navigation.
> Regenerated: 2026-03-19 | Phase 5b Playbook Output (new self-contained format)
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

60 pages mapped to workflows and roles. Screens in 3+ workflows marked with **HIGH TRAFFIC**.

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
| Summary Report | `/sites/{id}/reports/summary` | WF-006 | manager, admin | Fleet health + zone status | |
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
| Settings: Gateways | `/sites/{id}/gateways` | WF-001 | org_admin | Gateway table + CRUD | |
| Settings: Gateway Detail | `/sites/{id}/gateways/{id}` | WF-001 | org_admin | Gateway info + devices | |
| Settings: Devices | `/sites/{id}/devices` | WF-001, WF-002 | org_admin | Device table + stats | |
| Settings: Device Detail | `/sites/{id}/devices/{id}` | WF-001, WF-002 | org_admin | Device info cards | |
| Settings: Rules | `/sites/{id}/rules` | WF-003 | org_admin, site_manager | Rule card grid | |
| Settings: Rule Detail | `/sites/{id}/rules/{id}` | WF-003 | org_admin, site_manager | Rule conditions table | |
| Settings: Escalation Chains | `/settings/escalation-chains` | WF-003 | org_admin, site_manager | Chain table + CRUD | |
| Settings: Recipes | `/recipes` | WF-011 | org_admin | Recipe card grid | |
| Settings: Recipe Detail | `/recipes/{id}` | WF-011 | org_admin | Recipe rules + overrides | |
| Settings: Users | `/settings/users` | WF-009 | org_admin | User table + invite | |
| Settings: Organization | `/settings/organization` | WF-012 | org_admin | Org settings form | |
| Settings: Billing | `/settings/billing` | WF-007 | org_admin | Billing dashboard | |
| Settings: Billing Profiles | `/settings/billing/profiles` | WF-007 | org_admin | Profile cards + form | |
| Settings: Compliance | `/settings/compliance` | WF-008 | org_admin | Calendar + CRUD | |
| Settings: Modules | `/sites/{id}/modules` | WF-011 | org_admin | Module card grid | |
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

## 4. Screen Details — Self-Contained Per-Screen Specs

### 4.1 Dashboard

**URL:** `/dashboard` | **Roles:** All | **Pattern:** KPI cards + site grid/map toggle
**Workflows:** WF-002 (data pipeline), WF-003 (alert badges), WF-004 (device health)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Login | Auto-redirect after auth | Always |
| Sidebar | "Dashboard" menu item | Always |
| Any page | Logo click | Always |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| KPI Cards (4) | Total Devices, Online Devices, Active Alerts, Open Work Orders | Card with icon + number; emerald accent (online), red accent (alerts > 0), amber accent (WOs > 0) |
| Fleet Health | online_devices / total_devices | Progress bar; success >80%, warning otherwise |
| Site Grid | Site cards with name, status badge, device count, online count, health bar | Clickable cards in responsive grid (1→2→3 cols) |
| Site Map | Leaflet map with color-coded markers per site | Green = all online, amber = some offline, gray = no devices |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View site | Site card click | Site Detail `/sites/{id}` | Always | WF-002 |
| View site (map) | Map marker click | Site Detail `/sites/{id}` | Map view active | WF-002 |
| Toggle view | Grid/Map buttons | Same page (re-render) | Sites exist | — |
| View alerts | Alert badge in sidebar | Alerts Index `/alerts` | Alert count > 0 | WF-003 |
| Switch site | Site selector dropdown | Same page (filtered) | Multiple sites | — |
| Go to sites | "Go to Sites" button (empty state) | Settings: Sites `/settings/sites` | No sites | WF-001 |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Site Detail `/sites/{id}` | Card click or marker click | site ID |
| Alerts Index `/alerts` | Sidebar alert badge | — |
| Settings: Sites `/settings/sites` | Empty state CTA | — |

#### Role Differences
| Element | super_admin | org_admin | site_manager | site_viewer | technician |
|---|---|---|---|---|---|
| KPI cards | All orgs aggregated | Org-scoped | Assigned sites | Assigned sites | Assigned sites |
| Map view | All org sites | Org sites | Assigned sites | Assigned sites | Assigned sites |
| Command Center link | Visible | Hidden | Hidden | Hidden | Hidden |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial page load | `DashboardSkeleton` — 4 KPI skeleton cards + 6 site card skeletons + health bar skeleton | None |
| **Empty (no sites)** | `siteStats.length === 0` | `EmptyState` with MapPin icon + "Go to Sites" button | Navigate to site settings |
| **Populated (grid)** | Sites exist, grid view | KPI cards + site card grid + fleet health | All actions |
| **Populated (map)** | Sites exist, map view | KPI cards + Leaflet map + fleet health | All actions |

---

### 4.2 Alerts Index

**URL:** `/alerts` | **Roles:** All (view), manager+ (actions) | **Pattern:** Filterable data table
**Workflows:** WF-003 (alert lifecycle)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | "Alerts" menu item | Always |
| Dashboard | Alert badge click | Alert count > 0 |
| Site Detail | Alert card click | Alert exists |
| Zone Detail | Alert card click | Alert exists |
| Device Detail | Alert history item click | Alert exists |

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Severity | `severity` | Badge with icon (Critical=destructive/ShieldAlert, High=warning/AlertTriangle, Medium=info/Bell, Low=outline/Bell) | No | Visible |
| Alert | `data.rule_name` | Text; fallback "Alert #{id}" | No | Visible |
| Device | `data.device_name` / `data.zone` | Text + zone subtitle | No | Visible |
| Reading | `data.metric`, `data.value`, `data.threshold` | Monospace: "metric: value / threshold" | No | Visible |
| Status | `status` | Badge (active=destructive, acknowledged=warning, resolved=success, dismissed=outline) | No | Visible |
| Time | `triggered_at` | Relative time (formatTimeAgo) | No | Visible |
| Actions | Conditional buttons | Eye, CheckCircle2, XCircle icons | — | Visible |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View alert | Row click | Alert Detail `/alerts/{id}` | Always | WF-003 |
| Acknowledge | Eye icon button | Same page (status updated) | status=active; `Can permission="acknowledge alerts"` | WF-003 |
| Resolve | CheckCircle2 icon button | Same page (status updated) | status=active or acknowledged; `Can permission="acknowledge alerts"` | WF-003 |
| Dismiss | XCircle icon button | Same page (status updated) | status=active or acknowledged; `Can permission="manage alert rules"` | WF-003 |
| Filter severity | Dropdown (All/Critical/High/Medium/Low) | Same page (filtered) | Always | — |
| Filter status | Dropdown (Active+Ack/Active/Ack'd/Resolved/Dismissed) | Same page (filtered) | Always | — |
| Filter date range | From/To date inputs + Apply button | Same page (filtered) | Always | — |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Notifications |
|---|---|---|---|---|
| Acknowledge | POST `/alerts/{id}/acknowledge` | alert: acknowledged_at=now, status→acknowledged | SM-001: active→acknowledged | — |
| Resolve | POST `/alerts/{id}/resolve` | alert: resolved_at=now, resolved_by=user, status→resolved | SM-001: *→resolved | — |
| Dismiss | POST `/alerts/{id}/dismiss` | alert: resolved_at=now, status→dismissed | SM-001: *→dismissed | — |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Alert Detail `/alerts/{id}` | Row click | alert ID |

#### Role Differences
| Element | super_admin | org_admin | site_manager | site_viewer | technician |
|---|---|---|---|---|---|
| View alerts | All orgs | Org-scoped | Assigned sites | Assigned sites | Assigned sites |
| Acknowledge button | `Can` guarded | `Can` guarded | `Can` guarded | Hidden | `Can` guarded |
| Resolve button | `Can` guarded | `Can` guarded | `Can` guarded | Hidden | `Can` guarded |
| Dismiss button | `Can` guarded | `Can` guarded | `Can` guarded | Hidden | Hidden |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load / filter change | `AlertIndexSkeleton` — 6 skeleton rows + filter bar | None |
| **Empty (no alerts)** | No alerts at all | EmptyState: CheckCircle2 (emerald) + "All clear — no alerts" | — |
| **Empty (filtered)** | Filters active, no matches | EmptyState: "No alerts match these filters" + "Clear filters" button | Clear filters |
| **Populated** | Alerts exist | Data table with severity summary pills + pagination | All actions per role |
| **Critical highlight** | Row has status=active, severity=critical | Row highlighted with red-50 background | — |

---

### 4.3 Alert Detail

**URL:** `/alerts/{id}` | **Roles:** All (view), manager+ (actions) | **Pattern:** Detail card + timeline
**Workflows:** WF-003 (alert lifecycle)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Alerts Index | Row click | Always |
| Site Detail | Alert card click | Alert exists |
| Zone Detail | Alert card click | Alert exists |
| Device Detail | Alert history item click | Alert exists |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Alert title (rule_name), severity badge, status badge, triggered datetime | Card header with badges |
| Trigger Details | Device name+model, Zone, Metric+condition+threshold, Value at trigger | 4-section grid; value displayed in 2xl bold tabular-nums |
| Notification Log | Per notification: channel icon, user name, channel, sent time, status badge | Conditional (if notifications exist); channel icons: WhatsApp/Push/Email/SMS |
| Timeline (sidebar) | Triggered → Acknowledged → Resolved/Dismissed | Vertical timeline with color-coded dots; pending states shown in muted |
| Quick Details (sidebar) | Alert ID, Severity, Site name, Linked rule, Resolution type | Key-value card |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Back | ArrowLeft ghost button | Alerts Index `/alerts` | Always | — |
| Acknowledge | Eye outline button | Same page (status updated) | status=active; `Can permission="acknowledge alerts"` | WF-003 |
| Resolve | CheckCircle2 primary button | Same page (status updated) | status=active or acknowledged; `Can permission="acknowledge alerts"` | WF-003 |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Notifications |
|---|---|---|---|---|
| Acknowledge | POST `/alerts/{id}/acknowledge` | alert: acknowledged_at=now, status→acknowledged | SM-001: active→acknowledged | — |
| Resolve | POST `/alerts/{id}/resolve` | alert: resolved_at=now, resolved_by=user, status→resolved | SM-001: *→resolved | — |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Alerts Index `/alerts` | Back button | — |

#### Role Differences
| Element | manager+ | site_viewer |
|---|---|---|
| Acknowledge button | Visible (permission-guarded) | Hidden |
| Resolve button | Visible (permission-guarded) | Hidden |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Active** | status=active | Red severity, action buttons visible, timeline at "Triggered" | Acknowledge, Resolve |
| **Acknowledged** | status=acknowledged | Amber status, Resolve button only, timeline at "Acknowledged" | Resolve |
| **Resolved** | status=resolved | Green status, no action buttons, timeline complete | View only |
| **Dismissed** | status=dismissed | Gray status, no action buttons, timeline shows dismissed | View only |

---

### 4.4 Work Orders Index

**URL:** `/work-orders` | **Roles:** manager, technician | **Pattern:** Filterable data table
**Workflows:** WF-005 (work order lifecycle), WF-004 (auto-created from health)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | "Work Orders" menu item | Always |
| Dashboard | Work order count card | WO count > 0 |
| Alert Detail | "Create Work Order" (if linked) | Alert exists |

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Title | `title` | Text, font-medium | No | Visible |
| Type | `type` | Badge, outline (underscores replaced) | No | Visible |
| Priority | `priority` | Badge (urgent=destructive, high=warning, medium=info, low=outline) | No | Visible |
| Status | `status` | Badge (open=destructive, assigned=warning, in_progress=info, completed=success, cancelled=outline) | No | Visible |
| Assigned To | `assigned_user.name` | Text or "—" | No | Visible |
| Site | `site.name` | Text or "—" | No | Visible |
| Created | `created_at` | Date (toLocaleDateString) | No | Visible |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View WO | Row click | WO Detail `/work-orders/{id}` | Always | WF-005 |
| Create WO | "New" button (Plus icon) | WO Create `/work-orders/create` | `Can permission="manage work orders"` | WF-005 |
| Toggle "My WOs" | Outline/Default toggle button | Same page (filtered assigned=me) | Always | WF-005 |
| Filter status | Dropdown (All/Open/Assigned/In Progress/Completed/Cancelled) | Same page | Always | — |
| Filter priority | Dropdown (All/Urgent/High/Medium/Low) | Same page | Always | — |
| Filter type | Dropdown (All/Battery Replace/Sensor Replace/Maintenance/Inspection/Install) | Same page | Always | — |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| WO Detail `/work-orders/{id}` | Row click | WO ID |
| WO Create `/work-orders/create` | "New" button | — |

#### Role Differences
| Element | site_manager / org_admin | technician | site_viewer |
|---|---|---|---|
| "New" button | Visible (`Can` guarded) | Hidden | Hidden |
| "My WOs" toggle | Available | Available (default filter) | Hidden |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `WorkOrderIndexSkeleton` — header + filter bar + 6 skeleton rows | None |
| **Empty (no WOs)** | No WOs at all | EmptyState: Wrench icon + "No work orders yet" | — |
| **Empty (filtered)** | Filters active, no matches | EmptyState: "No work orders match these filters" + "Clear filters" button | Clear filters |
| **Populated** | WOs exist | Data table with pagination | All actions per role |

---

### 4.5 Work Order Detail

**URL:** `/work-orders/{id}` | **Roles:** manager, technician | **Pattern:** Detail + photos + notes
**Workflows:** WF-005 (work order lifecycle)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Work Orders Index | Row click | Always |
| CC Work Orders | Row click | super_admin |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Title, Priority badge, Status badge, ID, Site, Created date | Card header with badges |
| Details Card | Type, Device name, Assigned user, Created by, Linked alert ID, Description | Key-value pairs; description in border-top section |
| Photos | Grid of photos with optional captions | 2-col (mobile) → 3-col grid; aspect-square images with caption overlay |
| Notes | Chronological list of note entries | User name + timestamp + note text per entry |
| Timeline (sidebar) | Created → Assigned → Started → Completed/Cancelled | Vertical timeline with color-coded dots (gray/amber/blue/green) |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Back | ArrowLeft ghost button | Work Orders Index `/work-orders` | Always | — |
| Assign | User outline button | Same page (status updated) | status=open; `Can permission="manage work orders"` | WF-005 |
| Start | Play default button | Same page (status updated) | status=assigned; `Can permission="complete work orders"` | WF-005 |
| Complete | CheckCircle2 default button | Same page (status updated) | status=in_progress; `Can permission="complete work orders"` | WF-005 |
| Cancel | XCircle ghost button | Same page (status updated) | status ≠ completed/cancelled; `Can permission="manage work orders"` | WF-005 |
| Upload photo | Upload outline button | File picker → same page | status ≠ completed/cancelled | WF-005 |
| Add note | Text input + Send button | Same page (note appended) | status ≠ completed/cancelled | WF-005 |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Notifications | Integrations |
|---|---|---|---|---|---|
| Assign | PUT `/work-orders/{id}/status` (action=assign) | WO: assigned_to, status→assigned | SM-002: open→assigned | NT-007: push to technician | — |
| Start | PUT `/work-orders/{id}/status` (action=start) | WO: status→in_progress | SM-002: assigned→in_progress | — | — |
| Complete | PUT `/work-orders/{id}/status` (action=complete) | WO: status→completed | SM-002: in_progress→completed | Auto-resolve linked alert (BR-044) | — |
| Cancel | PUT `/work-orders/{id}/status` (action=cancel) | WO: status→cancelled | SM-002: *→cancelled | — | — |
| Upload photo | POST `/work-orders/{id}/photos` (FormData) | WorkOrderPhoto: create | — | — | — |
| Add note | POST `/work-orders/{id}/notes` | WorkOrderNote: create | — | — | — |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Work Orders Index `/work-orders` | Back button | — |

#### Role Differences
| Element | site_manager / org_admin | technician |
|---|---|---|
| Assign button | Visible (`Can` guarded) | Hidden |
| Start button | Hidden | Visible (`Can` guarded) |
| Complete button | Hidden | Visible (`Can` guarded) |
| Cancel button | Visible (`Can` guarded) | Hidden |
| Upload / Notes | Available when status allows | Available when status allows |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Open** | status=open | "Open" badge, Assign button | Assign, Cancel, Upload, Note |
| **Assigned** | status=assigned | "Assigned" badge + assignee name, Start button | Start, Cancel, Upload, Note |
| **In Progress** | status=in_progress | "In Progress" badge, Complete button | Complete, Cancel, Upload, Note |
| **Completed** | status=completed | Green "Completed" badge, completion date | View only |
| **Cancelled** | status=cancelled | Gray "Cancelled" badge | View only |
| **No photos** | photos empty | "No photos yet" message | Upload (if status allows) |

---

### 4.6 Site Detail

**URL:** `/sites/{id}` | **Roles:** All with site access | **Pattern:** KPI cards + zone grid
**Workflows:** WF-001 (onboarding), WF-002 (data pipeline), WF-004 (device health)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Dashboard | Site card or map marker click | Always |
| Sidebar | Site selector | Always |
| CC Org Detail | Site row click | super_admin |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| KPI Cards (5) | Devices, Online, Offline, Active Alerts, Low Battery | Responsive grid; emerald (online), red (offline/alerts), orange (battery) |
| Fleet Health | online / total percentage | Progress bar; success >80%, warning >50%, destructive otherwise |
| Floor Plans | Floor plan images with device overlays | Conditional (if floor plans exist); FloorPlanView component |
| Zones Grid | Zone cards with name, online/total badge, temp summary, health bar | 1→2 col responsive grid |
| Active Alerts (sidebar) | Alert cards with rule_name, device, zone, severity dot, metric/value | 320px sidebar on lg; clickable cards |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| View zone | Zone card click | Zone Detail `/sites/{id}/zones/{zone}` | Always | WF-002 |
| Summary report | "Summary" button | Summary Report `/sites/{id}/reports/summary` | Always | WF-006 |
| Temp report | "Temp Report" button | Temperature Report `/sites/{id}/reports/temperature` | Always | WF-006 |
| View alert | Alert card click | Alert Detail `/alerts/{id}` | Alert exists | WF-003 |
| View all alerts | "View all alerts" link | Alerts Index `/alerts` | Alerts exist | WF-003 |
| Manage devices | "Manage Devices" button (empty state) | Settings: Devices `/sites/{id}/devices` | No devices | WF-001 |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Zone Detail `/sites/{id}/zones/{zone}` | Zone card click | zone name (URL-encoded) |
| Alert Detail `/alerts/{id}` | Alert card click | alert ID |
| Summary Report `/sites/{id}/reports/summary` | Button | site ID |
| Temperature Report `/sites/{id}/reports/temperature` | Button | site ID |
| Alerts Index `/alerts` | "View all" link | — |
| Settings: Devices `/sites/{id}/devices` | Empty state CTA | site ID |

#### Role Differences
| Element | All roles |
|---|---|
| Data scope | Server-filtered to user's accessible sites |
| Report buttons | Visible to all with site access |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `SiteShowSkeleton` — all cards as skeletons | None |
| **Empty (no devices)** | No devices in site | EmptyState: Cpu icon + "No devices yet" + "Manage Devices" button | Navigate to device settings |
| **Empty (no alerts)** | No active alerts | Green Signal icon + "All clear" message | — |
| **Onboarding** | site.status=onboarding | "Setup incomplete" banner + "Continue Setup" CTA | Navigate to onboarding wizard |
| **Populated** | Zones + devices exist | Full layout with KPIs, zones, floor plans, alerts | All actions |

---

### 4.7 Zone Detail

**URL:** `/sites/{id}/zones/{zone}` | **Roles:** All with site access | **Pattern:** Chart + device table
**Workflows:** WF-002 (data pipeline), WF-003 (alerts)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Site Detail | Zone card click | Always |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Zone name, site name, device count, online count | — |
| Zone Chart | Temperature area chart (Recharts), gradient fill (emerald) | Height 260px; period buttons: 24h/7d/30d |
| Metric Summary (4 cards) | Per metric: name, current value, unit, min/avg/max | 2→4 col responsive grid |
| Devices Table | Device list with status, battery, signal, last seen | Full width; clickable rows |
| Recent Alerts (sidebar) | Alert cards with severity dot, rule name, device, status, time | 300px sidebar on lg |

#### Table Columns (Devices)
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Device | `name` | Text with online indicator dot (emerald=online, zinc=offline) | No | Visible |
| Model | `model` | Badge (outline, monospace, text-xs) | No | Visible |
| Status | `status` | StatusBadge (success/warning/destructive/outline/info) | No | Visible |
| Battery | `battery_pct` | Dynamic icon + percentage; red <20%, amber <40%, emerald 40%+ | No | Visible |
| Signal | `rssi` | Dynamic icon + dBm; Signal >-70, SignalMedium >-90, SignalLow otherwise | No | Visible |
| Last Seen | `last_reading_at` | Time ago (now/Xm/Xh/Xd) or "—" | No | Visible |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Back | ArrowLeft button | Site Detail `/sites/{id}` | Always | — |
| Change period | 24h/7d/30d buttons | Same page (?period=X) | Always | — |
| View device | Device row click | Device Detail `/devices/{id}` | Always | WF-002 |
| View alert | Alert card click | Alert Detail `/alerts/{id}` | Alert exists | WF-003 |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Site Detail `/sites/{id}` | Back button | site ID |
| Device Detail `/devices/{id}` | Row click | device ID |
| Alert Detail `/alerts/{id}` | Alert card click | alert ID |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **No chart data** | No readings for period | "No readings for this period" centered in chart | Change period |
| **No alerts** | No alerts for zone | "No alerts for this zone" in sidebar | — |
| **No summary** | No metric summary data | Section hidden | — |
| **Populated** | Data exists | Full layout | All actions |

---

### 4.8 Device Detail

**URL:** `/devices/{id}` | **Roles:** All | **Pattern:** Stats + chart + readings
**Workflows:** WF-002 (data pipeline), WF-003 (alerts), WF-004 (health monitoring)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Zone Detail | Device row click | Always |
| Settings: Device Detail | Different context (settings vs operational) | — |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Device name, model badge, status badge, dev_eui (mono, xs) | — |
| Quick Stats (4 cards) | Battery %, Signal (RSSI dBm), Last Seen (time ago), Alert count | 2→4 col grid; dynamic icons per metric |
| Period & Metric Controls | Period buttons (24h/7d/30d) + Metric dropdown | Card with flex row |
| Device Chart | LineChart with gradient fill (Recharts) | 300px height; min/avg/max reference lines |
| Latest Readings | Per-metric cards: name, current value, unit, time ago | 2→3 col grid |
| Device Info (sidebar) | Model, Zone, Gateway serial, Recipe, Installed date | 300px sidebar card |
| Alert History (sidebar) | Alert list: severity dot, rule name, time ago, status badge | Sidebar card; clickable items |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Back | ArrowLeft button | Site Detail `/sites/{site_id}` | Always | — |
| Change period | 24h/7d/30d buttons | Same page (?period=X) | Always | — |
| Change metric | Metric Select dropdown | Same page (?metric=X) | Always | — |
| View alert | Alert history item click | Alert Detail `/alerts/{id}` | Alert exists | WF-003 |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Site Detail `/sites/{site_id}` | Back button | site ID |
| Alert Detail `/alerts/{id}` | Alert history click | alert ID |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `DeviceShowSkeleton` — all card/chart skeletons | None |
| **No chart data** | No readings for period | "No readings for this period" in chart area | Change period/metric |
| **No alerts** | No alert history | "No alerts" in sidebar | — |
| **Populated** | Data exists | Full layout with chart, readings, info | All actions |

---

### 4.9 Reports Index

**URL:** `/reports` | **Roles:** All (except technician) | **Pattern:** Report type selection cards
**Workflows:** WF-006 (reporting)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | "Reports" menu item | Always |
| Site Detail | Report buttons | manager+ |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Report Cards (3) | Temperature (Thermometer/blue), Energy (Zap/amber), Summary (Sun/emerald) | 3-col grid (responsive); each with icon, title, description, form controls |

#### Form Fields (per Report Card)
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| site_id | Site | Select dropdown | Yes | — | Shows validation error if empty on submit |
| from | From | Date input | No | 7d/30d ago depending on type | Hidden for Summary type |
| to | To | Date input | No | Today | Hidden for Summary type |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Generate | "Generate" button per card | Report page with query params | Site selected | WF-006 |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Temperature Report `/sites/{id}/reports/temperature` | Generate (temperature card) | from, to |
| Energy Report `/sites/{id}/reports/energy` | Generate (energy card) | from, to |
| Summary Report `/sites/{id}/reports/summary` | Generate (summary card) | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `ReportsIndexSkeleton` — 3 skeleton cards | None |
| **Empty (no sites)** | No sites available | EmptyState: BarChart icon + "No sites available for reporting" | — |
| **Populated** | Sites exist | 3 report cards with controls | Generate reports |

---

### 4.10 Temperature Report

**URL:** `/sites/{id}/reports/temperature` | **Roles:** manager, admin | **Pattern:** Charts + compliance + device data
**Workflows:** WF-006 (reporting), WF-008 (compliance)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Reports Index | Generate (temperature card) | Site selected |
| Site Detail | "Temp Report" button | Always |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Summary Cards (3) | Total Readings, Excursions (AlertTriangle icon), Compliance % (CheckCircle2) | Card grid |
| Compliance by Zone | Horizontal bar chart with 80% and 95% reference lines | Color: green ≥95%, amber ≥80%, red <80% |
| Per-Zone Sections | Temperature trend chart + device table per zone | Line chart: avg (blue), min (green dashed), max (red dashed) |

#### Table Columns (Device Details per Zone)
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Device | name | Text | No | Visible |
| Readings | count | Number (tabular-nums) | No | Visible |
| Min °C | min_temp | Decimal 1 place | No | Visible |
| Avg °C | avg_temp | Decimal 1 place | No | Visible |
| Max °C | max_temp | Decimal 1 place | No | Visible |
| Excursions | excursion_count | Badge (success="None", destructive=count) | No | Visible |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Change date range | From/To inputs + Generate button | Same page (refreshed) | Always | WF-006 |
| Export PDF | "Export PDF" outline button | File download (new tab) | Always | WF-006 |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change |
|---|---|---|---|
| Export PDF | GET `/sites/{id}/reports/temperature/download?from=&to=` | — (read) | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Populated** | Report data exists | Full charts + tables | Change range, Export |
| **No zone data** | Zone has no compliance data | Chart/section hidden | — |

---

### 4.11 Energy Report

**URL:** `/sites/{id}/reports/energy` | **Roles:** manager, admin | **Pattern:** Cost breakdown + trends
**Workflows:** WF-006 (reporting)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Reports Index | Generate (energy card) | Site selected |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Summary KPIs (4) | Total kWh (Zap/amber), Total Cost MXN (DollarSign/emerald), Avg Daily Cost (TrendingUp/blue), vs Baseline % | Card grid |
| Daily Consumption Chart | Area chart with dual Y-axes: kWh (left) + MXN (right) | Average daily reference line overlay |
| Per Device Table | Device breakdown by zone | Full width |
| Daily Totals Table | Day-by-day kWh and cost | Conditional (if data exists) |

#### Table Columns (Per Device)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Device | name + model badge | Text + Badge | No |
| Zone | zone | Text or "—" | No |
| Total kWh | total_kwh | Number (tabular-nums, bold) | No |
| Avg Daily kWh | avg_daily_kwh | Decimal 1 place | No |
| Peak Current (A) | peak_current | Decimal 1 place | No |
| Readings | count | Number (muted) | No |

#### Table Columns (Daily Totals)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Date | date | Date string | No |
| kWh | kwh | Decimal 1 place (bold) | No |
| Cost (MXN) | cost | $ + decimal 2 places | No |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Change date range | From/To inputs + Generate button | Same page (refreshed) | Always | WF-006 |
| Export PDF | "Export PDF" outline button | File download | Always | WF-006 |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Populated** | Data exists | All sections with real data | Change range, Export |
| **No chart data** | No daily data | Chart hidden | — |

---

### 4.12 Summary Report

**URL:** `/sites/{id}/reports/summary` | **Roles:** manager, admin | **Pattern:** Fleet health + zone status
**Workflows:** WF-006 (morning summary)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Site Detail | "Summary" button | Always |
| Reports Index | Generate (summary card) | Site selected |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Fleet Health | Health percentage | Progress bar (success >80%, warning >50%, destructive ≤50%) |
| Stats Grid (4) | Total Devices, Online (emerald), Offline (red), Low Battery (amber) | Icon + number + label cards |
| Alerts Grid (2) | Alerts (24h), Active Alerts (now) | Card grid |
| Zone Status | Zone cards with temp avg/min/max + status badge | Grid; status: OK=success, Warning=warning, Critical=destructive |

#### Actions
None (display-only page).

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Populated** | Data loaded | All sections | View only |
| **No zones** | No zone data | Zone section hidden | — |

---

### 4.13 IAQ Module

**URL:** `/sites/{id}/modules/iaq` | **Roles:** manager, admin | **Pattern:** Zone scores + charts
**Workflows:** WF-011 (module system)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | Module menu item | Module active for site |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Overall Score | Large circular badge (24×24) with score, label, zone count | Colors: ≥80 green "Excellent", ≥60 amber "Good", ≥40 orange "Fair", <40 red "Poor" |
| Zone Cards | Per zone: name, score, CO2, Temperature, Humidity, TVOC | 3-col grid; per-metric status dots (emerald/amber/red) |
| Trend Chart | CO2 (red), Temperature (blue), Humidity (green) lines | LineChart (Recharts) |

#### Metric Thresholds
| Metric | Good | Fair | Poor | Icon |
|---|---|---|---|---|
| CO2 | <800 ppm | <1200 | ≥1200 | Wind |
| Temperature | 20-26°C | 18-28°C | Outside | Thermometer |
| Humidity | 30-60% | 20-70% | Outside | Droplets |
| TVOC | <300 ppb | <500 | ≥500 | Zap |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Change period | 24h/7d/30d buttons | Same page (?period=X) | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Populated** | Data loaded | All sections | Change period |
| **No chart** | No chart data | Chart section hidden | — |

---

### 4.14 Industrial Module

**URL:** `/sites/{id}/modules/industrial` | **Roles:** manager, admin | **Pattern:** Machine monitoring
**Workflows:** WF-011 (module system)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | Module menu item | Module active for site |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| KPI Cards (4) | Devices (Cpu), Vibration Alerts (AlertTriangle/amber), Avg Duty Cycle (Activity/%), Avg Pressure (Gauge/bar) | Card grid |
| Equipment Grid | Per-device cards: vibration, current, temperature, pressure, duty cycle progress bar | Responsive card grid; last reading timestamp |
| Compressor Health Table | Device, Duty Cycle %, Degradation Score, Status badge | Status: healthy=success, degraded=warning, critical=destructive |
| Trends Chart | Vibration (red), Current (blue), Pressure (amber) | LineChart (Recharts) |

#### Table Columns (Compressor Health)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Device | name | Text (bold) | No |
| Duty Cycle | duty_cycle_pct | % + progress bar (success <60%, warning <80%, destructive ≥80%) | No |
| Degradation | score | /100 (red >50%, amber >25%, emerald ≤25%) | No |
| Status | status | Badge (healthy/degraded/critical → success/warning/destructive) | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Change period | 24h/7d/30d buttons | Same page (?period=X) | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No devices | EmptyState: "No industrial devices" | — |
| **No chart data** | No trend data for period | "No data for selected period" | Change period |
| **Populated** | Data exists | All sections | Change period |

---

### 4.15 Command Center

**URL:** `/command-center` | **Roles:** super_admin only | **Pattern:** Global KPI dashboard
**Workflows:** WF-001 (onboarding overview), WF-004 (device health)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | "Command Center" menu item | super_admin only |
| CC sub-pages | "Overview" nav button | Always |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| KPI Cards (6) | Organizations, Sites, Devices, Online Devices (green), Active Alerts (red if >0), Open WOs (amber if >0) | Card grid |
| Platform Health | online_devices / total_devices | Progress bar (success >80%, warning otherwise) |
| Quick Nav | Alert Queue, Work Orders, Device Health buttons | 3 outline buttons |
| Organizations Table | Org list with metrics | Full width |

#### Table Columns (Organizations)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Organization | name | Text (bold) | No |
| Segment | segment | Badge (outline) | No |
| Plan | plan | Badge (secondary) | No |
| Sites | site_count | Number (tabular) | No |
| Devices | device_count | Number (tabular) | No |
| Online | online_count + health % | Number + progress bar | No |
| Alerts | active_alerts | Badge (destructive) or "0" | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Alert Queue | Quick nav button | CC Alerts `/command-center/alerts` | Always |
| Work Orders | Quick nav button | CC Work Orders `/command-center/work-orders` | Always |
| Device Health | Quick nav button | CC Devices `/command-center/devices` | Always |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| CC Alerts `/command-center/alerts` | Quick nav | — |
| CC Work Orders `/command-center/work-orders` | Quick nav | — |
| CC Devices `/command-center/devices` | Quick nav | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `CommandCenterSkeleton` — 6 KPI cards, health bar, 3 nav buttons, 6-row table | None |
| **Empty** | No organizations | EmptyState: "No organizations" | — |
| **Populated** | Orgs exist | Full dashboard | All actions |

---

### 4.16 CC Alerts

**URL:** `/command-center/alerts` | **Roles:** super_admin | **Pattern:** Global alert table
**Workflows:** WF-003 (alert lifecycle)

#### Table Columns
| Column | Field | Format | Sortable |
|---|---|---|---|
| Severity | severity | Badge with icon (ShieldAlert/AlertTriangle/Bell) | No |
| Alert | data.rule_name or rule.name | Text (bold) | No |
| Site | site.name | Text | No |
| Device | data.device_name or device.name + zone | Text + subtext | No |
| Status | status | Badge (active=destructive, acknowledged=warning, resolved=success, dismissed=outline) | No |
| Triggered | triggered_at | Relative time (formatTimeAgo) | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| View alert | Row click | Alert Detail `/alerts/{id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No unresolved alerts | CheckCircle icon + "No unresolved alerts" | — |
| **Populated** | Alerts exist | Paginated table + critical count badge (animated pulse) | Row click |
| **Critical highlight** | active + critical | Row background red-50 | — |

---

### 4.17 CC Devices

**URL:** `/command-center/devices` | **Roles:** super_admin | **Pattern:** Global device table
**Workflows:** WF-004 (device health)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| KPI Cards (4) | Total, Online (green), Offline (red if >0), Low Battery (amber if >0) | Card grid |
| Fleet Health | online / total percentage | Progress bar |

#### Table Columns
| Column | Field | Format | Sortable |
|---|---|---|---|
| Device | name | Text with online indicator dot (green glow / gray) | No |
| Model | model | Badge (outline, monospace, text-xs) | No |
| Site | site.name | Text | No |
| Status | status | Badge (active=success, provisioned=info, pending=warning, offline=destructive, maintenance=outline) | No |
| Battery | battery_pct | Dynamic icon + progress bar + % | No |
| Last Seen | last_reading_at | Relative time or "—" | No |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No devices | Cpu icon + "No devices found" | — |
| **Populated** | Devices exist | KPIs + paginated table | — |

---

### 4.18 CC Work Orders

**URL:** `/command-center/work-orders` | **Roles:** super_admin | **Pattern:** Global WO table
**Workflows:** WF-005 (work order lifecycle)

#### Table Columns
| Column | Field | Format | Sortable |
|---|---|---|---|
| Title | title | Text (bold) | No |
| Type | type | Badge (outline, mapped labels) | No |
| Priority | priority | Badge (urgent=destructive, high=warning, medium=info, low=outline) | No |
| Status | status | Badge (open=destructive, assigned=warning, in_progress=info, completed=success, cancelled=outline) | No |
| Site | site.name | Text | No |
| Assigned To | assigned_user.name | Text or "—" | No |
| Created | created_at | Date (localized) | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| View WO | Row click | WO Detail `/work-orders/{id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No WOs | Wrench icon + "No work orders found" | — |
| **Populated** | WOs exist | Paginated table | Row click |

---

### 4.19 CC Revenue

**URL:** `/command-center/revenue` | **Roles:** super_admin | **Pattern:** Revenue analytics
**Workflows:** WF-007 (billing)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| KPI Cards (4) | Total MRR ($X,XXX MXN, green), Active Subscriptions, Collection Rate (%), Overdue Invoices (red if >0) | Card grid |
| MRR by Segment Chart | Bar chart by segment | Segment colors: cold_chain=blue, retail=amber, industrial=purple, commercial=green, foodservice=red |
| Revenue Trend Chart | 12-month area chart with gradient fill (blue) | Area chart with $ formatter |
| Top Organizations | Org table by MRR | Full width |

#### Table Columns (Top Organizations)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Name | name | Text (bold) | No |
| Segment | segment | Badge (outline) | No |
| MRR | mrr | "$X,XXX MXN" (right-aligned, bold, tabular) | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| View org | Table row click | CC Org Detail `/command-center/{id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No subscription data | DollarSign icon + "No subscription data available" | — |
| **Populated** | Data exists | Full charts + table | Row click |

---

### 4.20 CC Dispatch

**URL:** `/command-center/dispatch` | **Roles:** super_admin | **Pattern:** Field dispatch map
**Workflows:** WF-005 (work order lifecycle)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| WO List (left panel) | Work order cards with priority, type, title, site, technician assignment | Scrollable list; unassigned cards have amber left border |
| Map (right panel) | Leaflet map centered on Mexico (23.6, -102.5) with site markers | Red circle = open WOs, gray = no open WOs; popup on click |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Assign technician | Select dropdown per WO card | Same page (assigned) | WO has no assignee |
| Filter unassigned | "Unassigned" toggle button | Same page (filtered) | Always |
| View site WOs | Map marker click | Scrolls to first WO in list | Site has open WOs |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change |
|---|---|---|---|
| Assign | POST `/work-orders/{id}/status` (assigned_to) | WO: assigned_to set | SM-002: open→assigned |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No WOs | Truck icon + "No work orders found" | — |
| **Populated** | WOs exist | Split panel: list + map | Assign, Filter |

---

### 4.21 CC Org Detail

**URL:** `/command-center/{id}` | **Roles:** super_admin | **Pattern:** Org drill-down
**Workflows:** WF-001 (client onboarding)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| CC Revenue | Org row click | Always |
| Command Center | — | — |

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Org name, segment badge, plan badge, MRR display | Back button + header |
| Sites Table | Site list with metrics | Main column |
| Active Alerts (sidebar) | Alert cards with severity, device, site, time | 320px sidebar |
| Recent Activity (sidebar) | Activity feed with description, causer, time | 320px sidebar |

#### Table Columns (Sites)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Name | name | Text (bold) | No |
| Status | status | Badge (active=success, onboarding=warning, else=outline) | No |
| Devices | device_count | Number (tabular) | No |
| Online | online_count + health % | Number + progress bar | No |
| Alerts | active_alerts | Badge (destructive) or "0" | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Back | ArrowLeft button | Command Center `/command-center` | Always |
| View site | Site row click | Site Detail `/sites/{id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty sites** | No sites | Building2 icon + "No sites configured" | — |
| **No alerts** | No active alerts | "No active alerts" text | — |
| **Populated** | Data exists | Sites table + sidebars | All actions |

---

### 4.22 Partner Portal

**URL:** `/partner` | **Roles:** super_admin only | **Pattern:** Org table + create dialog
**Workflows:** WF-001 (client onboarding)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Sidebar | "Partner Portal" menu item | super_admin |

#### Table Columns (Organizations)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Name | name + logo avatar | Text + Avatar | No |
| Slug | slug | Text (muted) | No |
| Segment | segment | Badge (retail/cold_chain/industrial/commercial/foodservice) | No |
| Plan | plan | Badge (starter/standard/enterprise) | No |
| Sites | site_count | Number | No |
| Status | status | Badge (active/onboarding/suspended) | No |

#### Form Fields (Create Organization Dialog)
| Field | Label | Type | Required | Validation | Default | Notes |
|---|---|---|---|---|---|---|
| name | Name | Text | Yes | — | — | Auto-generates slug |
| slug | Slug | Text | Yes | — | Auto from name | Editable |
| segment | Segment | Select | No | — | — | Options: retail, cold_chain, industrial, commercial, foodservice |
| plan | Plan | Select | No | — | — | Options: starter, standard, enterprise |
| default_timezone | Default Timezone | Text | Yes | — | "America/Mexico_City" | — |
| default_opening_hour | Opening Hour | Time | Yes | — | "08:00" | — |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Create org | "Create Organization" button | Opens dialog | Always | WF-001 |
| Submit | "Create Organization" dialog button | Same page (org added) | Form valid | WF-001 |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Integrations |
|---|---|---|---|---|
| Submit | POST `/partner` | Organization create + BillingProfile create + Subscription create (BR-049) | — | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No organizations | "No organizations" in table | Create org |
| **Populated** | Orgs exist | Table with data | Create org |
| **Processing** | Form submitted | "Creating..." button state | Wait |

---

### 4.23 Site Onboarding Wizard

**URL:** `/sites/{id}/onboard` | **Roles:** org_admin | **Pattern:** Multi-step wizard (5 steps)
**Workflows:** WF-001 (client onboarding)

#### Inbound Navigation
| From | Element | Condition |
|---|---|---|
| Settings: Sites | After site creation | site.status=onboarding |
| Site Detail | "Continue Setup" banner | site.status=onboarding |

#### Form Fields (Step 1: Gateway)
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| model | Model | Select | Yes | — | Options: UG65, UG67, UG56 (Milesight) |
| serial | Serial Number | Text | Yes | — | Placeholder: "24E124743C00XXXX" |
| is_addon | Additional gateway | Switch | No | false | Optional addon flag |

#### Form Fields (Step 2: Devices — batch, per row)
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| model | Model | Select | Yes | — | Options: EM300-TH, CT101, WS301, GS101, EM300-PT, EM310-UDL, AM307 |
| dev_eui | DevEUI | Text | Yes | — | Monospace; placeholder "A81758FFFE..." |
| name | Name | Text | Yes | — | Placeholder "e.g. Cooler A" |
| zone | Zone | Text | No | — | Placeholder "e.g. Cooler A" |
| recipe_id | Recipe | Select | No | — | Filtered by sensor model |

#### Form Fields (Step 3: Floor Plans)
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| name | Floor Name | Text | Yes | — | Placeholder "e.g. Ground Floor" |
| floor_number | Floor Number | Number | Yes | 1 | Min: 0 |
| image | Floor Plan Image | File | Yes | — | Accept: image/* |

#### Actions per Step
| Step | Action | Element | Side Effects | Integrations |
|---|---|---|---|---|
| 1. Gateway | "Add Gateway" button | Form submit | Creates Gateway record | INT-001 (ChirpStack) |
| 2. Devices | "Register Devices" button | Form submit (batch) | Creates Device records, provisions | INT-001 (ChirpStack) |
| 3. Floor Plans | "Upload" button | File upload | Creates FloorPlan record | — |
| 4. Modules | Module toggle buttons | Selection | Creates SiteModule records, applies recipes (BR-050) | — |
| 5. Complete | "Activate Site" button | Status change | Site: onboarding→active (SM-005) | — |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change |
|---|---|---|---|
| Add gateway | POST `/sites/{id}/onboard/gateway` | Gateway: create | — |
| Register devices | POST `/sites/{id}/onboard/devices` | Device: create (batch), auto-provision | SM-004: →pending |
| Upload floor plan | POST `/sites/{id}/floor-plans` | FloorPlan: create | — |
| Activate modules | POST `/sites/{id}/onboard/modules` | SiteModule: create, RecipeApplication (BR-050) | — |
| Complete | POST `/sites/{id}/onboard/complete` | Site: status→active | SM-005: onboarding→active |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Step 1: Gateway** | No gateway registered | Gateway form | Submit gateway |
| **Step 1: Complete** | Gateway registered | Gateway info + "Next" | Proceed |
| **Step 2: Devices** | Gateway done | Device batch form + existing list | Submit/Add rows |
| **Step 3: Floor Plans** | Devices done | Upload form + existing plans | Upload/skip |
| **Step 4: Modules** | Floor plans done | Module toggle buttons; suggested highlighted | Activate |
| **Step 5: Review** | Modules activated | Summary checklist + "Activate Site" | Complete |
| **Provisioning** | ChirpStack call in progress | Spinner + "Registering..." | Wait |
| **Error** | API failure | Error toast + retry | Retry |
| **ChirpStack warning** | Not configured | Amber alert banner | Proceed with caution |

---

### 4.24 Settings: Sites

**URL:** `/settings/sites` | **Roles:** org_admin (`manage sites` permission) | **Pattern:** Site table + CRUD
**Workflows:** WF-001 (client onboarding)

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Name | name | Text | No | Visible |
| Status | status | Badge (active=success, draft=outline, suspended=warning) | No | Visible |
| Timezone | timezone | Text or "—" | No | Visible |
| Opening Hour | opening_hour | Time or "—" | No | Visible |
| Devices | device_count | Number | No | Visible |
| Gateways | gateway_count | Number | No | Visible |
| Actions | — | Edit/Delete icon buttons | — | Visible |

#### Form Fields (Create/Edit Dialog)
| Field | Label | Type | Required | Validation | Default | Notes |
|---|---|---|---|---|---|---|
| name | Name | Text | Yes | — | — | — |
| address | Address | Text | No | — | — | — |
| latitude | Latitude | Number | No | -90 to 90, step: any | — | — |
| longitude | Longitude | Number | No | -180 to 180, step: any | — | — |
| timezone | Timezone | Select | No | — | — | From timezones array |
| opening_hour | Opening Hour | Time | No | — | — | — |
| status | Status | Select | Yes | — | draft | Options: draft, active, suspended |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Create site | "Create Site" button | Opens dialog | `Can permission="manage sites"` | WF-001 |
| Edit | Pencil icon per row | Opens edit dialog | `Can permission="manage sites"` | WF-001 |
| Delete | Trash icon per row | Confirmation dialog → same page | `Can permission="manage sites"` | — |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change |
|---|---|---|---|
| Create | POST `/settings/sites` | Site: create | SM-005: →draft/onboarding |
| Update | PUT `/settings/sites/{id}` | Site: update | — |
| Delete | DELETE `/settings/sites/{id}` | Site: soft-delete | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No sites | EmptyState: MapPin icon + message | Create site |
| **Populated** | Sites exist | Table with CRUD actions | All actions |

---

### 4.25 Settings: Gateways

**URL:** `/sites/{id}/gateways` | **Roles:** org_admin (`manage devices` permission) | **Pattern:** Gateway table + CRUD
**Workflows:** WF-001 (client onboarding)

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Model | model | Text (bold) | No | Visible |
| Serial | serial | Monospace, text-xs, muted | No | Visible |
| Devices | device_count | Number (tabular-nums) | No | Visible |
| Status | status | Badge (online/offline/registered) | No | Visible |
| Type | is_addon | Badge ("Add-on" or "Primary") | No | Visible |
| Actions | — | View/Delete icon buttons | — | Visible |

#### Form Fields (Create Dialog)
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| model | Model | Text | Yes | — | Placeholder "e.g. RAK7268C" |
| serial | Serial Number | Text | Yes | — | Placeholder "e.g. AC1F09FFFE0A1234" |
| is_addon | Add-on gateway | Switch | No | false | — |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Add gateway | "Add Gateway" button | Opens dialog | Always |
| View | Eye icon per row | Gateway Detail `/sites/{id}/gateways/{gw_id}` | Always |
| Delete | Trash icon per row | Confirmation dialog (warns about device count) | Always |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change | Integrations |
|---|---|---|---|---|
| Create | POST `/sites/{id}/gateways` | Gateway: create | — | INT-001 (ChirpStack) |
| Delete | DELETE `/sites/{id}/gateways/{gw_id}` | Gateway: delete | — | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `GatewaysSkeleton` — 4 skeleton rows | None |
| **Empty** | No gateways | EmptyState: Router icon + "No gateways" | Add gateway |
| **Populated** | Gateways exist | Paginated table | All actions |

---

### 4.26 Settings: Gateway Detail

**URL:** `/sites/{id}/gateways/{gw_id}` | **Roles:** org_admin | **Pattern:** Gateway info + connected devices
**Workflows:** WF-001

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Model, status badge, addon badge, serial | — |
| Connected Devices Table | Devices connected to this gateway | Main column |
| Details Card (sidebar) | Model, Serial, Status, Type, ChirpStack ID, Last Seen, Registered | Key-value card |

#### Table Columns (Connected Devices)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Device | name | Text with online indicator | No |
| Model | model | Badge (outline, monospace) | No |
| Zone | zone | Text or "—" | No |
| Status | status | Badge | No |
| Last Seen | last_reading_at | Time ago or "—" | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Back | ArrowLeft button | Gateways Index `/sites/{id}/gateways` | Always |
| View device | Device row click | Device Detail `/sites/{id}/devices/{dev_id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No devices | "No devices connected to this gateway" | — |
| **Populated** | Devices exist | Table with device list | Row click |

---

### 4.27 Settings: Devices

**URL:** `/sites/{id}/devices` | **Roles:** org_admin | **Pattern:** Device table + stats + filters
**Workflows:** WF-001 (onboarding), WF-002 (data pipeline)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Stats Cards (4) | Total, Online (emerald), Offline (destructive), Low Battery (amber) | Mini-card grid |
| Filter Bar | Search + Status dropdown + Zone dropdown | Card with flex row |

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Device | name | Text with online indicator dot | No | Visible |
| Model | model | Badge (outline) | No | Visible |
| DevEUI | dev_eui | Monospace, text-xs, muted | No | Hidden (md+) |
| Zone | zone | Text or "—" | No | Visible |
| Status | status | Badge | No | Visible |
| Battery | battery_pct | Icon + progress bar + % | No | Visible |
| Signal (RSSI) | rssi | Icon + dBm | No | Hidden (lg) |
| Last Seen | last_reading_at | Time ago or "—" | No | Visible |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Add device | "Add Device" Link | Same page (?add=true) | Always |
| Search | Search input + button | Same page (filtered) | Always |
| Filter status | Status dropdown | Same page (?status=X) | Always |
| Filter zone | Zone dropdown | Same page (?zone=X) | Zones exist |
| View device | Row click | Device Detail `/sites/{id}/devices/{dev_id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `DevicesIndexSkeleton` — stats + filters + 6 skeleton rows | None |
| **Empty** | No devices | EmptyState: Cpu icon + "No devices" | Add device |
| **Populated** | Devices exist | Stats + filters + paginated table | All actions |

---

### 4.28 Settings: Device Detail

**URL:** `/sites/{id}/devices/{dev_id}` | **Roles:** org_admin | **Pattern:** Device info cards
**Workflows:** WF-001, WF-002

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Online indicator, name, status badge, model + DevEUI | — |
| Info Cards (4) | Battery (%, icon, progress), Signal (dBm, icon), Zone (name), Last Seen (time ago) | Card grid |
| Gateway Card | Model (clickable), serial, status badge | Conditional (if gateway) |
| Recipe Card | Name (clickable), sensor model, rules count | Conditional (if recipe) |
| Details (sidebar) | Name, Model, DevEUI, Status, Zone, Battery, RSSI, Last Reading, Provisioned, Installed, Registered | Key-value card |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Back | ArrowLeft button | Devices Index `/sites/{id}/devices` | Always |
| View gateway | Gateway card click | Gateway Detail `/sites/{id}/gateways/{gw_id}` | Gateway exists |
| View recipe | Recipe card click | Recipe Detail `/recipes/{recipe_id}` | Recipe exists |

---

### 4.29 Settings: Alert Rules

**URL:** `/sites/{id}/rules` | **Roles:** org_admin, site_manager (`manage alert rules` permission) | **Pattern:** Rule card grid
**Workflows:** WF-003 (alert lifecycle)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Total rules count, active rules count | — |
| Rule Cards | Grid of cards: name with icon, severity badge, type badge, conditions preview (first 3 + "+X more"), device name, cooldown, active toggle | Responsive grid (1→2→3 cols) |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| New rule | "New Rule" button/link | Rule Create `/sites/{id}/rules/create` | `Can permission="manage alert rules"` | WF-003 |
| Edit rule | Card click | Rule Detail `/sites/{id}/rules/{rule_id}` | `Can permission="manage alert rules"` | WF-003 |
| Delete | Delete icon on card | Direct DELETE (preserveScroll) | `Can permission="manage alert rules"` | — |
| Toggle active | Switch on card | PUT with `{active: !rule.active}` | `Can permission="manage alert rules"` | WF-003 |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Delete | DELETE `/sites/{id}/rules/{rule_id}` | AlertRule: delete |
| Toggle | PUT `/sites/{id}/rules/{rule_id}` | AlertRule: active toggle |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No rules | EmptyState: Settings2 icon + "No alert rules configured" + "Create First Rule" | Create rule |
| **Populated** | Rules exist | Card grid | All actions |

---

### 4.30 Settings: Rule Detail

**URL:** `/sites/{id}/rules/{rule_id}` | **Roles:** org_admin, site_manager | **Pattern:** Rule conditions table
**Workflows:** WF-003

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Name, severity badge, active/inactive badge, type, cooldown | — |
| Conditions Table | Metric, condition, threshold, duration, severity per condition | Table |
| Associated Device (conditional) | Icon, name, model+DevEUI, status badge | Clickable card |
| Details (sidebar) | Rule ID, Name, Type, Severity, Cooldown, Status, Site, Device, Conditions count, Created | Key-value card |

#### Table Columns (Conditions)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Metric | metric | Text (bold) | No |
| Condition | condition | Badge (outline) | No |
| Threshold | threshold | Monospace (tabular-nums) | No |
| Duration | duration_minutes | "X min" or "Instant" | No |
| Severity | severity | SeverityBadge (dynamic variant) | No |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Back | ArrowLeft button | Rules Index `/sites/{id}/rules` | Always |
| View device | Device card click | Device Detail `/sites/{id}/devices/{dev_id}` | Device exists |

---

### 4.31 Settings: Escalation Chains

**URL:** `/settings/escalation-chains` | **Roles:** org_admin, site_manager (`manage alert rules` permission) | **Pattern:** Chain table + CRUD
**Workflows:** WF-003 (alert lifecycle)

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Name | name | Text (bold) | No | Visible |
| Site | site.name | Text or "Unknown" | No | Visible |
| Levels | level_count | Badge with count | No | Visible |
| Channels | channels | Multiple badges (whatsapp/push/email) | No | Visible |
| Created | created_at | Date (localized) | No | Visible |
| Actions | — | Edit/Delete icon buttons | — | Visible |

#### Form Fields (Create/Edit Dialog)
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| name | Name | Text | Yes | — | Placeholder "e.g. Critical Alert Chain" |
| site_id | Site | Select | Yes | — | From sites array |
| levels | Escalation Levels | Dynamic array (≥1) | Yes | 1 level | — |

**Per Level:**
| Field | Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| delay_minutes | Delay (minutes) | Number | Yes | 0 (L1), 5+ (others) | min: 0 |
| channels | Notification Channels | Checkboxes | Yes | — | whatsapp/push/email |
| user_ids | Users to Notify | Checkbox list | Yes | — | Scrollable, count shown |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Create chain | "Create Chain" button | Opens dialog | `Can permission="manage alert rules"` |
| Edit | Pencil icon per row | Opens edit dialog | `Can permission="manage alert rules"` |
| Delete | Trash icon per row | Confirmation dialog | `Can permission="manage alert rules"` |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Create | POST `/settings/escalation-chains` | EscalationChain: create with levels JSON |
| Update | PUT `/settings/escalation-chains/{id}` | EscalationChain: update |
| Delete | DELETE `/settings/escalation-chains/{id}` | EscalationChain: delete |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `EscalationChainsSkeleton` — 4 skeleton rows | None |
| **Empty** | No chains | EmptyState: GitBranch icon + "No escalation chains" | Create chain |
| **Populated** | Chains exist | Table with CRUD | All actions |

---

### 4.32 Settings: Recipes

**URL:** `/recipes` | **Roles:** org_admin | **Pattern:** Recipe card grid
**Workflows:** WF-011 (module & recipe system)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Recipe Cards | Grid by module: name, sensor_model badge, description, default_rules count | Responsive grid (1→2→3 cols) |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| View recipe | Card click | Recipe Detail `/recipes/{id}` | Always |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No recipes | EmptyState: FlaskConical icon + "No recipes available" | — |
| **Populated** | Recipes exist | Card grid | Card click |

---

### 4.33 Settings: Recipe Detail

**URL:** `/recipes/{id}` | **Roles:** org_admin | **Pattern:** Recipe rules + overrides
**Workflows:** WF-011

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Name, description, module, sensor_model, editable status, created_at | — |
| Default Rules Table | Metric, condition, threshold, duration, severity | Table |
| Override Editor | Site selector + editable threshold/duration table | Conditional (if recipe.editable && sites exist) |
| Existing Overrides | Per-site override cards with metrics | Grouped by site |
| Details (sidebar) | Recipe metadata | Key-value card |

#### Table Columns (Default Rules)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Metric | metric | Text (font-medium) | No |
| Condition | condition | Badge (outline) | No |
| Threshold | threshold | Monospace (tabular-nums) | No |
| Duration | duration_minutes | "X min" or "Instant" | No |
| Severity | severity | SeverityBadge | No |

#### Form Fields (Override Editor, conditional)
| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| site_id | Site | Select | Yes | From sites array |
| rules[].threshold | Threshold | Number (step=any) | Yes | Per rule row |
| rules[].duration_minutes | Duration | Number (min=0) | Yes | Per rule row |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Back | ArrowLeft button | Recipes Index `/recipes` | Always |
| Save overrides | "Save" button | Same page (overrides saved) | recipe.editable && site selected |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Save overrides | POST `/recipes/{id}/overrides` | RecipeOverride: create/update |

---

### 4.34 Settings: Users

**URL:** `/settings/users` | **Roles:** org_admin (`manage users` permission) | **Pattern:** User table + invite
**Workflows:** WF-009 (user management)

#### Table Columns
| Column | Field | Format | Sortable | Mobile |
|---|---|---|---|---|
| Name | name | Text (font-medium) | No | Visible |
| Email | email | Text (muted) | No | Visible |
| Role | role | Badge (org_admin=default, site_manager=secondary, site_viewer=outline, technician=outline) | No | Visible |
| Sites | sites | Up to 2 badges + "+X more" | No | Visible |
| App Access | has_app_access | Badge (Yes=success, No=outline) | No | Visible |
| Actions | — | Edit/Delete icons | — | Visible |

#### Form Fields (Create/Edit Dialog)
| Field | Label | Type | Required | Validation | Default | Notes |
|---|---|---|---|---|---|---|
| name | Name | Text | Yes | Zod (userSchema) | — | — |
| email | Email | Email | Yes | Zod | — | — |
| phone | Phone | Text | No | Zod | — | — |
| whatsapp | WhatsApp | Text | No | Zod | — | — |
| password | Password | Password | Create only | Zod | — | Hidden on edit |
| role | Role | Select | Yes | Zod | — | From roles array |
| site_ids | Site Access | Checkbox list | No | — | — | Scrollable, toggleable |
| has_app_access | App Access | Switch | No | — | false | — |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Add user | "Add User" button | Opens create dialog | `Can permission="manage users"` |
| Edit | Pencil icon per row | Opens edit dialog | `Can permission="manage users"` |
| Delete | Trash icon per row | Confirmation dialog | `Can permission="manage users"` |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Create | POST `/settings/users` | User: create + role assign + site pivots |
| Update | PUT `/settings/users/{id}` | User: update + sync role + sync sites |
| Delete | DELETE `/settings/users/{id}` | User: delete |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `UsersIndexSkeleton` — 6 skeleton rows | None |
| **Empty** | No users | "No users" centered in table | Add user |
| **Populated** | Users exist | Table with CRUD | All actions |

---

### 4.35 Settings: Organization

**URL:** `/settings/organization` | **Roles:** org_admin (`manage org settings` permission) | **Pattern:** Org settings form
**Workflows:** WF-012 (white-label branding)

#### Form Fields
| Field | Label | Type | Required | Validation | Default | Notes |
|---|---|---|---|---|---|---|
| name | Organization Name | Text | Yes | Zod (organizationSettingsSchema) | Current org name | — |
| default_timezone | Default Timezone | Text | No | Zod | Current | Placeholder "America/Mexico_City" |
| default_opening_hour | Default Opening Hour | Time | No | Zod | Current | — |
| primary_color | Primary Color | Color picker + hex input | No | — | Current | Branding section |
| secondary_color | Secondary Color | Color picker + hex input | No | — | Current | Branding section |
| accent_color | Accent Color | Color picker + hex input | No | — | Current | Branding section |
| font_family | Font Family | Text | No | — | Current | Placeholder "Inter, sans-serif" |
| logo | Logo URL | Text | No | — | Current | Preview shown if valid URL |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Save | "Save" button | Same page (success toast) | Form valid |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Save | PATCH `/settings/organization` | Organization: update settings + branding |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Default** | Form loaded | Populated form with current values | Edit and save |
| **Success** | Recently saved | "Saved" text with fade animation | Continue editing |
| **Logo preview** | Valid logo URL | Image preview below field | — |

---

### 4.36 Settings: Billing

**URL:** `/settings/billing` | **Roles:** org_admin | **Pattern:** Billing dashboard + invoice table
**Workflows:** WF-007 (billing & invoicing)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Subscription Card | Base Fee, Discount %, Devices, Monthly Total (green), Status badge, Contract Type badge, Start date | Summary card |
| Invoices Table | Period, Subtotal, IVA, Total, Status, CFDI UUID | Full width |

#### Table Columns (Invoices)
| Column | Field | Format | Sortable |
|---|---|---|---|
| Period | period | Text (font-medium) | No |
| Subtotal | subtotal | $X.XX (tabular-nums) | No |
| IVA | iva | $X.XX (tabular-nums) | No |
| Total | total | $X.XX (tabular-nums, font-medium) | No |
| Status | status | Badge (paid=success, sent=warning, overdue=destructive, draft=outline) | No |
| CFDI | cfdi_uuid | Text-xs, first 8 chars + "..." | No |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Billing Profiles | "Billing Profiles" button | Billing Profiles `/settings/billing/profiles` | Always | WF-007 |

#### Outbound Navigation
| Destination | Trigger | Data Passed |
|---|---|---|
| Billing Profiles `/settings/billing/profiles` | Button click | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `BillingSkeleton` — subscription card + invoice table skeletons | None |
| **No subscription** | No active subscription | EmptyState: CreditCard icon + "No active subscription" + "Contact account manager" | — |
| **No invoices** | Subscription active, no invoices | EmptyState in table: FileText icon + "No invoices yet" | — |
| **Populated** | Subscription + invoices exist | Full dashboard | All actions |

---

### 4.37 Settings: Billing Profiles

**URL:** `/settings/billing/profiles` | **Roles:** org_admin | **Pattern:** Profile cards + create form
**Workflows:** WF-007 (billing)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Profile Cards | Name (Building2 icon), RFC (monospace), Razón Social, Régimen Fiscal, Email, Default badge | 2-col responsive grid |

#### Form Fields (Toggle-able Create Form)
| Field | Label | Type | Required | Validation | Default | Notes |
|---|---|---|---|---|---|---|
| name | Profile Name | Text | Yes | Zod (billingProfileSchema) | — | Placeholder "e.g. Main Office" |
| rfc | RFC | Text | Yes | Zod | — | Monospace, uppercase, placeholder "XAXX010101000" |
| razon_social | Razón Social | Text | Yes | Zod | — | Placeholder "Legal company name"; spans 2 cols |
| regimen_fiscal | Régimen Fiscal | Text | No | Zod | — | Placeholder "601" |
| uso_cfdi | Uso CFDI | Text | No | Zod | — | Placeholder "G03" |
| email_facturacion | Email Facturación | Email | No | Zod | — | Placeholder "facturacion@empresa.com"; spans 2 cols |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| New Profile | Toggle button | Shows/hides form | Always |
| Save Profile | "Save" button | Same page (profile added) | Form valid |
| Cancel | "Cancel" button | Hides form | Form visible |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Create | POST `/settings/billing/profiles` | BillingProfile: create |

---

### 4.38 Settings: Compliance

**URL:** `/settings/compliance` | **Roles:** org_admin (`manage org settings` permission) | **Pattern:** Calendar view + CRUD
**Workflows:** WF-008 (compliance calendar)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Event Cards | Grouped by month: type badge, title, site, due date, days until due (color-coded), status badge | Cards in month sections |

**Days Until Due Color Coding:**
- Overdue: Red
- <7 days: Red
- ≤30 days: Amber
- >30 days: Emerald

#### Filter Controls
| Filter | Type | Options |
|---|---|---|
| Site | Select dropdown | All + site list |
| Type | Select dropdown | All + cofepris_audit, certificate_renewal, calibration, inspection, permit_renewal |
| Status | Select dropdown | All + upcoming, overdue, completed |

#### Form Fields (Create/Edit Dialog)
| Field | Label | Type | Required | Validation | Default | Notes |
|---|---|---|---|---|---|---|
| title | Title | Text | Yes | Zod (complianceEventSchema) | — | Placeholder "e.g. Annual COFEPRIS Audit" |
| type | Type | Select | Yes | Zod | — | Type options from enum |
| site_id | Site | Select | Yes | Zod | — | From sites array |
| due_date | Due Date | Date | Yes | Zod | — | — |
| description | Description | Textarea (rows=3) | No | Zod | — | Placeholder "Optional notes..." |

#### Actions
| Action | Element | Leads To | Condition | Workflow |
|---|---|---|---|---|
| Add event | "Add Event" button | Opens dialog | `Can permission="manage org settings"` | WF-008 |
| Complete | CheckCircle2 icon (green) | Same page (status→completed) | status ≠ completed/cancelled; `Can` guarded | WF-008 |
| Edit | Pencil icon | Opens edit dialog | `Can permission="manage org settings"` | WF-008 |
| Delete | Trash icon | Confirmation dialog | `Can permission="manage org settings"` | — |

#### Action Side Effects
| Action | API Endpoint | Data Mutations | State Change |
|---|---|---|---|
| Create | POST `/settings/compliance` | ComplianceEvent: create | SM-006: →upcoming |
| Update | PUT `/settings/compliance/{id}` | ComplianceEvent: update | — |
| Complete | POST `/settings/compliance/{id}/complete` | ComplianceEvent: status→completed | SM-006: →completed |
| Delete | DELETE `/settings/compliance/{id}` | ComplianceEvent: delete | — |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | `ComplianceSkeleton` — filter bar + 2 month groups with 3 event skeletons each | None |
| **Empty** | No events (or filtered out) | EmptyState: CalendarCheck icon + "No compliance events scheduled" | Add event |
| **Populated** | Events exist | Grouped event cards with filters | All actions |

---

### 4.39 Settings: Modules

**URL:** `/sites/{id}/modules` | **Roles:** org_admin (`manage devices` permission) | **Pattern:** Module card grid
**Workflows:** WF-011 (module & recipe system)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Module Cards | Emoji icon, name, active badge, description, recipe badges (up to 4 + "+X more") | Responsive grid (2→3 cols); inactive modules at opacity-60 |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Toggle module | Switch per card | Same page (toggled) | Always |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Toggle | POST `/sites/{id}/modules/{mod_id}/toggle` | SiteModule: toggle active state |

---

### 4.40 Settings: Profile

**URL:** `/settings/profile` | **Roles:** All | **Pattern:** Profile form

#### Form Fields
| Field | Label | Type | Required | Validation | Default |
|---|---|---|---|---|---|
| name | Name | Text | Yes | — | auth.user.name |
| email | Email address | Email | Yes | — | auth.user.email |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Save | "Save" button | Same page (success toast) | Form valid |
| Resend verification | Link text | Same page (status updated) | Email unverified |
| Delete account | Delete section | Account deletion flow | Always |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Save | PATCH `/settings/profile` | User: update name/email |
| Delete | DELETE `/settings/profile` | User: soft-delete |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Default** | Form loaded | Populated form | Edit and save |
| **Success** | Recently saved | "Saved" fade animation | Continue |
| **Email unverified** | email_verified_at is null | Warning + "Resend" link | Resend verification |

---

### 4.41 Settings: Password

**URL:** `/settings/password` | **Roles:** All | **Pattern:** Password form

#### Form Fields
| Field | Label | Type | Required | Validation |
|---|---|---|---|---|
| current_password | Current password | Password | Yes | — |
| password | New password | Password | Yes | — |
| password_confirmation | Confirm password | Password | Yes | Must match |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Save | "Save password" button | Same page (success + form reset) | Form valid |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Save | PUT `/settings/password` (throttled: 6/min) | User: update password |

---

### 4.42 Settings: Appearance

**URL:** `/settings/appearance` | **Roles:** All | **Pattern:** Theme selector

#### Data Displayed
Delegated to `AppearanceTabs` component — Light/Dark/System theme selection.

---

### 4.43 Settings: Two-Factor

**URL:** `/settings/two-factor` | **Roles:** All | **Pattern:** 2FA setup

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Status | 2FA Enabled/Disabled badge | — |
| QR Code | SVG (during setup) | Modal |
| Manual Key | Text (during setup) | Modal |
| Recovery Codes | Code list | Managed by TwoFactorRecoveryCodes component |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Enable 2FA | "Enable 2FA" button | Setup modal | 2FA not set up |
| Continue Setup | "Continue Setup" button | Setup modal | Setup data exists but not confirmed |
| Disable 2FA | "Disable 2FA" button (destructive) | Same page (2FA removed) | 2FA enabled |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Enabled** | 2FA active | "Enabled" badge + recovery codes + "Disable" button | Disable, view recovery codes |
| **Disabled** | 2FA not set up | "Disabled" badge + "Enable" button | Enable |
| **Setup modal** | Modal open | QR code + manual key entry | Confirm setup |

---

### 4.44 Settings: API Keys

**URL:** `/settings/api-keys` | **Roles:** org_admin (`manage org settings` permission) | **Pattern:** Key table + CRUD
**Workflows:** WF-010 (integration export)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Key Count | Total in header | — |
| New Key Display | One-time key in green card | Highlighted; shown only once after creation |
| Key Table | Name, Key prefix (masked), Permissions (badges, first 3 + "+N"), Rate limit, Last used, Active badge | Full width |

#### Form Fields (Toggle-able Create Form)
| Field | Label | Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| name | Name | Text | Yes | Zod (apiKeySchema) | Placeholder "e.g. Production" |
| rate_limit | Rate Limit (req/min) | Number | Yes | Zod | Min: 1, Max: 1000 |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| New Key | Toggle button | Shows form | `Can permission="manage org settings"` |
| Create | "Create" button | Same page (key created, displayed once) | Form valid |
| Delete | Trash icon per key | DELETE request | `Can permission="manage org settings"` |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Create | POST `/settings/api-keys` | ApiKey: create + return plaintext key once |
| Delete | DELETE `/settings/api-keys/{id}` | ApiKey: delete |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty** | No keys | "No API keys" in table | Create key |
| **New key** | Just created | Green card with full key (one-time) | Copy key |
| **Populated** | Keys exist | Table with masked keys | Create, Delete |

---

### 4.45 Settings: Integrations

**URL:** `/settings/integrations` | **Roles:** org_admin (`manage org settings` permission) | **Pattern:** Integration cards
**Workflows:** WF-010 (integration export)

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Integration Cards | SAP (blue/database icon), CONTPAQi (green/spreadsheet icon) — name, description, active badge, schedule, last export | 2 cards |

#### Form Fields (per Card, conditional on active=true)
| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| schedule_cron | Schedule (cron) | Text | No | Monospace, placeholder "0 6 * * *" |
| active | Toggle | Switch | No | Right-side toggle |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Toggle | Switch per card | Same page (enabled/disabled) | Always |
| Save | "Save" button per card | Same page (schedule saved) | Card is active |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Save | POST `/settings/integrations` | Integration: update schedule + active |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Inactive** | Integration disabled | Card at 70% opacity, toggle off, no schedule form | Toggle on |
| **Active** | Integration enabled | Full opacity, toggle on, schedule form + last export | Save schedule |

---

### 4.46 Activity Log

**URL:** `/activity-log` | **Roles:** manager, admin (`view activity log` permission) | **Pattern:** Timeline view

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Total Events | Count badge | — |
| Activity Timeline | Events grouped by date: Today (amber), Yesterday (sky), other dates (formatted) | Grouped sections |
| Per Event | Causer avatar+name, event type badge, description, timestamp (relative + tooltip), model reference (#ID), property changes (expandable) | Timeline items |

**Event Type Badges:** created, updated, deleted, login, logout

**Property Changes (Expandable):**
- Field name, old value (red strikethrough), new value (green)

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Filter events | Dropdown (All/Created/Updated/Deleted/Login/Logout) | Same page (?event=X) | Always |
| Refresh | "Refresh" button | Same page (reloaded) | Always |
| Load more | "Load More Events" button | Same page (next page appended) | current_page < last_page |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Loading** | Initial load | Skeleton placeholders | None |
| **Empty** | No activity | "No Activity Yet" EmptyState | — |
| **Refreshing** | Refresh in progress | Spinner on button | Wait |
| **Populated** | Events exist | Timeline with grouped entries | Filter, Refresh, Load More |

---

### 4.47 Notifications

**URL:** `/notifications` | **Roles:** All | **Pattern:** Notification list with filters
**Workflows:** ALL

#### Data Displayed
| Section | Content | Format |
|---|---|---|
| Header | Total count, unread count (if >0) | — |
| Filter | Dropdown (All/Unread/Read) | — |
| Grouped Notifications | Notifications grouped by date | Date headers + NotificationItem components |
| Pagination | Previous/Next buttons + "Page X of Y" | Conditional (last_page > 1) |

#### Actions
| Action | Element | Leads To | Condition |
|---|---|---|---|
| Mark all read | "Mark all read" button (CheckCheck icon) | Same page (all marked) | unreadCount > 0 |
| Delete read | "Delete read" button (Trash2 icon) | Confirmation dialog → same page | Any read notification exists |
| Filter | Dropdown (All/Unread/Read) | Same page (?filter=X) | Always |
| Mark single read | NotificationItem action | Same page (item marked) | Item is unread |
| Delete single | NotificationItem action | Same page (item removed) | Always |
| Previous page | Previous button | Same page (?page=X-1) | current_page > 1 |
| Next page | Next button | Same page (?page=X+1) | current_page < last_page |

#### Action Side Effects
| Action | API Endpoint | Data Mutations |
|---|---|---|
| Mark all read | POST `/notifications/mark-all-as-read` | All notifications: read_at=now |
| Delete read | DELETE `/notifications/read/delete-all` | Read notifications: deleted |
| Mark single | POST `/notifications/{id}/mark-as-read` | Notification: read_at=now |
| Delete single | DELETE `/notifications/{id}` | Notification: deleted |

#### Screen States
| State | Condition | What User Sees | User Action Available |
|---|---|---|---|
| **Empty (all)** | No notifications at all | "No notifications" message | — |
| **Empty (unread)** | Filter=unread, none match | "No unread notifications" | Change filter |
| **Empty (read)** | Filter=read, none match | "No read notifications" | Change filter |
| **Populated** | Notifications exist | Grouped list with pagination | All actions |

---

## 5. Workflow-to-UI Matrix

| Workflow | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Terminal |
|---|---|---|---|---|---|---|
| WF-001 Onboard | Partner Portal (create org) | Settings: Sites (create site) | Onboarding Wizard (4 steps) | — | — | Site Detail (active) |
| WF-002 Data Pipeline | — (system) | Dashboard (live KPIs) | Site Detail (zone grid) | Zone Detail (chart) | Device Detail (readings) | — |
| WF-003 Alert | Dashboard (badge) | Alerts Index (table) | Alert Detail (review) | Acknowledge/Resolve | — | Alerts Index (resolved) |
| WF-004 Health | — (system) | Dashboard (offline badge) | Device Detail (offline) | Auto WO created | — | WO completed |
| WF-005 Work Order | Work Orders Index (view) | WO Detail (assign) | WO Detail (start) | WO Detail (complete) | — | WO Index (completed) |
| WF-006 Summaries | — (system) | Notification (push/email) | Reports Index | Temp/Energy Report | Download PDF | — |
| WF-007 Billing | Settings: Billing | Billing Profiles | Generate Invoice | Mark Paid | Download PDF/XML | Billing (paid) |
| WF-008 Compliance | Settings: Compliance | Add Event | Wait (reminders) | Mark Complete | — | Compliance (completed) |
| WF-009 Users | Settings: Users | Add User | Assign Sites | — | — | Users (active) |
| WF-010 Integrations | Settings: Integrations | Configure | API Keys | Export | — | Integrations (synced) |
| WF-011 Modules | Onboarding Step 3 | Toggle modules | Recipes auto-applied | Module dashboard | — | Module (active) |
| WF-012 Branding | Settings: Org | Update colors/logo | — | — | — | All pages (branded) |

### Screen Coverage Check

| Screen | Defined | Content Listed | Actions Listed | States Listed | In ≥1 Workflow |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ (Data Displayed) | ✅ (6) | ✅ (4) | ✅ WF-002,003,004 |
| Alerts Index | ✅ | ✅ (7 columns) | ✅ (9) | ✅ (5) | ✅ WF-003 |
| Alert Detail | ✅ | ✅ (Data Displayed) | ✅ (3) | ✅ (4) | ✅ WF-003 |
| Work Orders Index | ✅ | ✅ (7 columns) | ✅ (7) | ✅ (4) | ✅ WF-005 |
| Work Order Detail | ✅ | ✅ (Data Displayed) | ✅ (7) | ✅ (6) | ✅ WF-005 |
| Site Detail | ✅ | ✅ (Data Displayed) | ✅ (6) | ✅ (5) | ✅ WF-001,002,004 |
| Zone Detail | ✅ | ✅ (6 columns) | ✅ (4) | ✅ (4) | ✅ WF-002,003 |
| Device Detail | ✅ | ✅ (Data Displayed) | ✅ (4) | ✅ (4) | ✅ WF-002,003,004 |
| Reports Index | ✅ | ✅ (Form Fields) | ✅ (1) | ✅ (3) | ✅ WF-006 |
| Temperature Report | ✅ | ✅ (6 columns) | ✅ (2) | ✅ (2) | ✅ WF-006,008 |
| Energy Report | ✅ | ✅ (6+3 columns) | ✅ (2) | ✅ (2) | ✅ WF-006 |
| Summary Report | ✅ | ✅ (Data Displayed) | ✅ (0) | ✅ (2) | ✅ WF-006 |
| IAQ Module | ✅ | ✅ (Data Displayed) | ✅ (1) | ✅ (2) | ✅ WF-011 |
| Industrial Module | ✅ | ✅ (4 columns) | ✅ (1) | ✅ (3) | ✅ WF-011 |
| Command Center | ✅ | ✅ (7 columns) | ✅ (3) | ✅ (3) | ✅ WF-001,004 |
| CC Alerts | ✅ | ✅ (6 columns) | ✅ (1) | ✅ (3) | ✅ WF-003 |
| CC Devices | ✅ | ✅ (6 columns) | ✅ (0) | ✅ (2) | ✅ WF-004 |
| CC Work Orders | ✅ | ✅ (7 columns) | ✅ (1) | ✅ (2) | ✅ WF-005 |
| CC Revenue | ✅ | ✅ (3 columns) | ✅ (1) | ✅ (2) | ✅ WF-007 |
| CC Dispatch | ✅ | ✅ (Data Displayed) | ✅ (3) | ✅ (2) | ✅ WF-005 |
| CC Org Detail | ✅ | ✅ (5 columns) | ✅ (2) | ✅ (3) | ✅ WF-001 |
| Partner Portal | ✅ | ✅ (6 columns + 6 fields) | ✅ (2) | ✅ (3) | ✅ WF-001 |
| Site Onboarding | ✅ | ✅ (Fields per step) | ✅ (5 per step) | ✅ (9) | ✅ WF-001 |
| Settings: Sites | ✅ | ✅ (6 columns + 7 fields) | ✅ (3) | ✅ (2) | ✅ WF-001 |
| Settings: Gateways | ✅ | ✅ (5 columns + 3 fields) | ✅ (3) | ✅ (3) | ✅ WF-001 |
| Settings: Gateway Detail | ✅ | ✅ (5 columns) | ✅ (2) | ✅ (2) | ✅ WF-001 |
| Settings: Devices | ✅ | ✅ (8 columns) | ✅ (5) | ✅ (3) | ✅ WF-001,002 |
| Settings: Device Detail | ✅ | ✅ (Data Displayed) | ✅ (3) | ✅ (1) | ✅ WF-001,002 |
| Settings: Rules | ✅ | ✅ (Card Data) | ✅ (4) | ✅ (2) | ✅ WF-003 |
| Settings: Rule Detail | ✅ | ✅ (5 columns) | ✅ (2) | ✅ (1) | ✅ WF-003 |
| Settings: Escalation Chains | ✅ | ✅ (5 columns + 3+ fields) | ✅ (3) | ✅ (3) | ✅ WF-003 |
| Settings: Recipes | ✅ | ✅ (Card Data) | ✅ (1) | ✅ (2) | ✅ WF-011 |
| Settings: Recipe Detail | ✅ | ✅ (5 columns + 3 fields) | ✅ (2) | ✅ (2) | ✅ WF-011 |
| Settings: Users | ✅ | ✅ (5 columns + 8 fields) | ✅ (3) | ✅ (3) | ✅ WF-009 |
| Settings: Organization | ✅ | ✅ (8 fields) | ✅ (1) | ✅ (3) | ✅ WF-012 |
| Settings: Billing | ✅ | ✅ (6 columns) | ✅ (1) | ✅ (4) | ✅ WF-007 |
| Settings: Billing Profiles | ✅ | ✅ (6 fields) | ✅ (3) | ✅ (1) | ✅ WF-007 |
| Settings: Compliance | ✅ | ✅ (5 fields) | ✅ (4) | ✅ (3) | ✅ WF-008 |
| Settings: Modules | ✅ | ✅ (Card Data) | ✅ (1) | ✅ (1) | ✅ WF-011 |
| Settings: API Keys | ✅ | ✅ (2 fields) | ✅ (3) | ✅ (3) | ✅ WF-010 |
| Settings: Integrations | ✅ | ✅ (2 fields) | ✅ (2) | ✅ (2) | ✅ WF-010 |
| Activity Log | ✅ | ✅ (Data Displayed) | ✅ (3) | ✅ (4) | ✅ utility |
| Notifications | ✅ | ✅ (Data Displayed) | ✅ (7) | ✅ (4) | ✅ ALL |

**All 47 operational screens fully specified.** Auth pages (Login, Register, Forgot Password, Reset Password) and utility settings (Profile, Password, Appearance, Two-Factor) are framework-standard and listed but not workflow-critical.

### Orphan Check

**Screens not in any workflow:**
- Settings: Profile — utility (self-service)
- Settings: Password — utility (self-service)
- Settings: Appearance — utility (self-service)
- Settings: Two-Factor — utility (self-service)
- Activity Log — observability tool (not workflow-driven)
- Welcome page — public landing (not authenticated)

These are correctly workflow-independent.

**Workflows with no dedicated screen (backend-only):**
- WF-002 Sensor Data Pipeline — backend processing, surfaces data on Dashboard/Site/Zone/Device screens
- WF-004 Device Health Monitoring — backend job, surfaces via Dashboard alerts and auto-created work orders
- WF-006 Morning Summaries — backend scheduled job, delivered via push/email notifications

---

## 6. Interaction Conventions

| Pattern | Decision | Rationale |
|---|---|---|
| **Data tables** | Paginated server-side with filter dropdowns + search | Large datasets need server pagination |
| **Create/Edit forms** | Modal dialogs for simple entities (site, user, escalation chain), dedicated page for complex (onboarding wizard) | Modals for ≤5-7 fields, pages for wizards |
| **Delete actions** | `ConfirmationDialog` with entity name and warning | Prevents accidental deletion |
| **Status changes** | Inline buttons on detail page (Acknowledge, Resolve, Start, Complete) | Fast — no navigation needed |
| **Bulk operations** | Not currently implemented (single-item actions only) | Simplicity — bulk added when user demand warrants |
| **Filters** | Tab bar for status + dropdown for severity/priority + date range picker | Most common filter is one-click accessible |
| **Success feedback** | Sonner toast (auto-dismiss 5s) | Non-blocking, handled globally via `useFlashMessages` |
| **Error feedback** | Inline validation errors + error toast for API failures | Inline for field errors, toast for system errors |
| **Navigation after create** | Redirect to index/parent page | "Done → back to list" mental model |
| **Navigation after update** | Stay on current page with success toast | Update = continue working on same entity |
| **Loading states** | Exported `*Skeleton` components matching content layout | Prevents layout shift; 13 pages have skeletons |
| **Empty states** | `EmptyState` component with icon + title + description + optional CTA | Guides user to next action; 10+ pages use this |
| **Charts** | Recharts with 3 period options (24h/7d/30d) | Covers operational, weekly, and monthly views |
| **Maps** | Leaflet with dynamic loading (dashboard, dispatch) | Avoids loading map library on non-map pages |
| **Real-time updates** | Reverb WebSocket via `use-realtime-notifications` hook | Live notification bell + dashboard KPI updates |
| **i18n** | All user-facing text via `t()` function (en/es) | Bilingual platform (Mexico market) |
| **Destructive confirmations** | `ConfirmationDialog` component with warning message | Standard across all delete/deactivate actions |
| **Theme** | Light/Dark/System via `useAppearance()` hook | User preference persisted in localStorage |
| **File uploads** | Single + batch upload via `FileUploadController` with allowed-types validation | Throttled (20/min single, 10/min batch) |
| **PDF reports** | Server-side via Blade templates + dompdf | Consistent formatting across browsers |
| **Permission guards** | `<Can permission="...">` wrapper hides unauthorized elements | Eliminates 403 UX errors |
| **Form validation** | `useValidatedForm` (Inertia useForm + Zod) for standard forms | Pre-submit client validation; 7 forms migrated |

---

*This document is the blueprint for Phase 6 (task planning) and Phase 7 (feature specs). Every task and spec should reference specific workflow IDs and screen definitions from this document.*
