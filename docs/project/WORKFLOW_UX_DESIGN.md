# Workflow UX Design

> **Astrea IoT Platform** — Complete screen-level UX specification for all 72 frontend pages.
> Regenerated: 2026-03-24 | Updated after massive build session (62 gaps resolved, 7 new pages)
> Cross-references: SYSTEM_BEHAVIOR_SPEC.md, ASTREA_WORKFLOWS.md, ASTREA_FEATURE_SPECS.md

---

## Table of Contents

1. [Screen Inventory](#1-screen-inventory)
2. [Screen Detail — Core (21 pages)](#2-screen-detail--core-21-pages)
3. [Screen Detail — Settings (27 pages)](#3-screen-detail--settings-27-pages)
4. [Screen Detail — Auth (8 pages)](#4-screen-detail--auth-8-pages)
5. [Screen Detail — Command Center (8 pages)](#5-screen-detail--command-center-8-pages)
6. [Screen Detail — Modules (3 pages)](#6-screen-detail--modules-3-pages)
7. [Interaction Conventions](#7-interaction-conventions)
8. [Cross-Cutting Issues](#8-cross-cutting-issues)

---

## 1. Screen Inventory

Master table of all 72 pages sorted by area.

| # | Page | URL | Pattern | Roles | Primary Workflow |
|---|------|-----|---------|-------|-----------------|
| **Core** | | | | | |
| 1 | Dashboard | `/dashboard` | Dashboard | All authenticated | WF-004 Device Health |
| 2 | Alerts Index | `/alerts` | Index table + bulk | All authenticated | WF-003 Alert Lifecycle |
| 3 | Alert Show | `/alerts/{alert}` | Detail 2-column | All authenticated | WF-003 Alert Lifecycle |
| 4 | Sites Index | `/sites` | Card grid | All authenticated | WF-001 Onboarding |
| 5 | Site Show | `/sites/{site}` | Detail/Dashboard 2-col | All authenticated | WF-004 Device Health |
| 6 | Zone Detail | `/sites/{site}/zones/{zone}` | Detail + chart | All authenticated | WF-002 Sensor Pipeline |
| 7 | Site Comparison | `/sites/compare` | Analytics/ranking | All authenticated | WF-004 Device Health |
| 8 | Site Timeline | `/sites/{site}/timeline` | Chronological feed | All authenticated | WF-003 Alert Lifecycle |
| 9 | Site Audit | `/sites/{site}/audit` | Compliance report | All authenticated | WF-008 Compliance |
| 9a | Temperature Verification | `/sites/{site}/verifications` | Form + checklist | All authenticated | WF-008 Compliance |
| 10 | Devices Index | `/devices` | Index table + filters | All authenticated | WF-004 Device Health |
| 11 | Device Show | `/devices/{device}` | Detail + chart 2-col | All authenticated | WF-004 Device Health |
| 12 | Work Orders Index | `/work-orders` | Index table + bulk | All authenticated | WF-005 WO Lifecycle |
| 13 | Work Order Show | `/work-orders/{workOrder}` | Detail + forms 2-col | All authenticated | WF-005 WO Lifecycle |
| 14 | Activity Log | `/activity-log` | Chronological feed | All authenticated | WF-009 User Mgmt |
| 15 | Notifications | `/notifications` | Notification feed | All authenticated | — |
| 16 | Alert Tuning | `/analytics/alerts` | Analytics dashboard | All authenticated | WF-003 Alert Lifecycle |
| 17 | Performance | `/analytics/performance` | Analytics dashboard | All authenticated | WF-004 Device Health |
| 18 | Reports Index | `/reports` | Report launcher | All authenticated | WF-006 Summaries |
| 19 | Temperature Report | `/sites/{site}/reports/temperature` | Report + charts | All authenticated | WF-006 Summaries |
| 20 | Energy Report | `/sites/{site}/reports/energy` | Report + charts | All authenticated | WF-006 Summaries |
| 21 | Morning Summary | `/sites/{site}/reports/summary` | Read-only report | All authenticated | WF-006 Summaries |
| 21a | Device Inventory Report | `/sites/{site}/reports/inventory` | Report + table | All authenticated | WF-006 Summaries |
| **Settings** | | | | | |
| 22 | Profile | `/settings/profile` | Form (3 sections) | All authenticated | WF-009 User Mgmt |
| 23 | Password | `/settings/password` | Form | All authenticated | WF-009 User Mgmt |
| 24 | Appearance | `/settings/appearance` | Tabs | All authenticated | WF-012 White-Label |
| 25 | Two-Factor | `/settings/two-factor` | Setup modal | All authenticated | WF-009 User Mgmt |
| 26 | Organization | `/settings/organization` | Form | Can "manage org settings" | WF-012 White-Label |
| 27 | Sites Settings | `/settings/sites` | CRUD table | Can "manage sites" | WF-001 Onboarding |
| 27a | Batch Site Import | `/settings/sites/batch-import` | Form + CSV upload | Can "manage sites" | WF-001 Onboarding |
| 28 | Onboarding Wizard | `/sites/{site}/onboard` | Stepper (5 steps) | Can "manage sites" | WF-001 Onboarding |
| 29 | Gateways | `/settings/sites/{site}/gateways` | CRUD table | Can "manage devices" | WF-001 Onboarding |
| 30 | Gateway Show | `/settings/sites/{site}/gateways/{gateway}` | Read-only detail | Can "manage devices" | WF-004 Device Health |
| 31 | Devices (site-scoped) | `/settings/sites/{site}/devices` | Stats + table | Can "manage devices" (add) | WF-004 Device Health |
| 32 | Device Show (site-scoped) | `/settings/sites/{site}/devices/{device}` | Read-only detail | All authenticated | WF-004 Device Health |
| 33 | Users | `/settings/users` | CRUD table | Can "manage users" | WF-009 User Mgmt |
| 34 | Alert Rules | `/settings/sites/{site}/alert-rules` | Card grid + toggle | Can "manage alert rules" | WF-003 Alert Lifecycle |
| 35 | Alert Rule Show | `/settings/sites/{site}/alert-rules/{rule}` | Read-only detail | All authenticated | WF-003 Alert Lifecycle |
| 35a | Alert Rule Create | `/sites/{site}/rules/create` | Form (RuleBuilder) | Can "manage alert rules" | WF-003 Alert Lifecycle |
| 35b | Alert Rule Edit | `/sites/{site}/rules/{rule}/edit` | Form (RuleBuilder) | Can "manage alert rules" | WF-003 Alert Lifecycle |
| 36 | Escalation Chains | `/settings/sites/{site}/escalation-chains` | CRUD table | Can "manage alert rules" | WF-003 Alert Lifecycle |
| 37 | Compliance | `/settings/compliance` | Filtered event list | Can "manage org settings" | WF-008 Compliance |
| 38 | Maintenance Windows | `/settings/sites/{site}/maintenance-windows` | Card list | Can "manage maintenance windows" | WF-004 Device Health |
| 39 | Report Schedules | `/settings/report-schedules` | Card list | Can "manage report schedules" (create) | WF-006 Summaries |
| 40 | Site Templates | `/settings/site-templates` | Card grid | All authenticated | WF-001 Onboarding |
| 41 | Export Data | `/settings/export` | Form + history | All authenticated | WF-010 Integration Export |
| 42 | Integrations | `/settings/integrations` | Card list | All authenticated | WF-010 Integration Export |
| 43 | API Keys | `/settings/api-keys` | Form + table | All authenticated | WF-010 Integration Export |
| 44 | Billing | `/settings/billing` | Subscription + invoices | Can "manage org settings" | WF-007 Billing |
| 45 | Billing Profiles | `/settings/billing/profiles` | Form + list | Can "manage org settings" | WF-007 Billing |
| 46 | Modules | `/settings/sites/{site}/modules` | Toggle cards | All authenticated | WF-011 Module & Recipe |
| 47 | Recipes | `/settings/recipes` | Read-only card grid | All authenticated | WF-011 Module & Recipe |
| 48 | Recipe Show | `/settings/recipes/{recipe}` | Detail + overrides | All authenticated | WF-011 Module & Recipe |
| **Auth** | | | | | |
| 49 | Login | `/login` | Auth form | Unauthenticated | WF-009 User Mgmt |
| 50 | Register | `/register` | Auth form | Unauthenticated | WF-009 User Mgmt |
| 51 | Forgot Password | `/forgot-password` | Auth form | Unauthenticated | WF-009 User Mgmt |
| 52 | Reset Password | `/reset-password` | Auth form | Unauthenticated | WF-009 User Mgmt |
| 53 | Verify Email | `/verify-email` | Gate | Authenticated unverified | WF-009 User Mgmt |
| 54 | Confirm Password | `/confirm-password` | Gate | Authenticated | WF-009 User Mgmt |
| 55 | Two-Factor Challenge | `/two-factor-challenge` | Dual-mode form | Authenticating | WF-009 User Mgmt |
| 56 | Privacy Accept | `/privacy/accept` | Policy gate | Authenticated | WF-009 User Mgmt |
| **Command Center** | | | | | |
| 57 | CC Index | `/command-center` | Dashboard | Astrea roles only | WF-004 Device Health |
| 58 | CC Alerts | `/command-center/alerts` | Table (read-only) | Astrea roles only | WF-003 Alert Lifecycle |
| 59 | CC Devices | `/command-center/devices` | Stats + table | Astrea roles only | WF-004 Device Health |
| 60 | CC Dispatch | `/command-center/dispatch` | Split panel + map | Astrea roles only | WF-005 WO Lifecycle |
| 61 | CC Revenue | `/command-center/revenue` | Charts + table | Astrea roles only | WF-007 Billing |
| 62 | CC Work Orders | `/command-center/work-orders` | Table | Astrea roles only | WF-005 WO Lifecycle |
| 63 | CC Org Show | `/command-center/organizations/{org}` | Detail 2-column | Astrea roles only | WF-001 Onboarding |
| 64 | Partner Portal | `/partner` | Org table + create | super_admin only | WF-001 Onboarding |
| **Modules** | | | | | |
| 65 | IAQ Dashboard | `/modules/iaq` | Module dashboard | All authenticated | WF-011 Module & Recipe |
| 66 | Industrial Dashboard | `/modules/industrial` | Module dashboard | All authenticated | WF-011 Module & Recipe |
| 67 | Welcome (DEAD) | `/welcome` | Orphaned boilerplate | — | — |
| **New Pages** | | | | | |
| 68 | Platform Status | `/status` | Public status page | All (public) | — |

---

## 2. Screen Detail — Core (21 pages)

### 2.1 Dashboard

| Field | Value |
|-------|-------|
| **URL** | `/dashboard` |
| **Pattern** | Dashboard |
| **Props** | `kpis: DashboardKPIs`, `siteStats: SiteStat[]`, `actionCards: ActionCards` |

**Content:**
- Hero header displaying current organization name
- 4 StatCards: Total Devices, Online, Active Alerts, Open Work Orders
- CircularProgress gauge for fleet health percentage
- "Needs Attention" card: unacknowledged alerts, overdue work orders, critical battery devices
- Sites section: grid/map toggle rendering SiteCards

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Toggle Grid/Map | Button | None | Re-renders sites section |
| ActionItem click | Card click | None | Filtered list (alerts/WOs/devices) |
| SiteCard click | Card click | None | `/sites/{id}` |

**Filters:** None.

**Role Differences:** None — all roles see the same dashboard scoped to their accessible sites.

**Screen States:**
- `DashboardSkeleton` — exported, shows placeholder cards
- `EmptyState` — when organization has no sites

**Navigation:**
- In: Sidebar "Dashboard" link, post-login redirect
- Out: Site cards, action items, Needs Attention links

---

### 2.2 Alerts Index

| Field | Value |
|-------|-------|
| **URL** | `/alerts` |
| **Pattern** | Index table with bulk actions |
| **Props** | `alerts: PaginatedAlerts`, `filters` |

**Content:**
- Header with severity pill counts
- Filter bar: severity select, status select, date range picker
- Table columns: checkbox, severity badge, alert name, device + zone, reading (metric:value/threshold), status badge, relative time, action buttons
- Pagination component

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Row click | Table row | None | `/alerts/{id}` |
| Acknowledge | Button per-row | Can "acknowledge alerts" | PATCH inline |
| Resolve | Button per-row | Can "acknowledge alerts" | PATCH inline |
| Dismiss | Button per-row | Can "manage alert rules" | DELETE inline |
| Bulk Acknowledge | BulkActionBar | Can "acknowledge alerts" + rows selected | PATCH batch |
| Bulk Resolve | BulkActionBar | Can "acknowledge alerts" + rows selected | PATCH batch |

**Filters:** severity, status, date range — all server-side via query params.

**Role Differences:** Dismiss button only visible to users with "manage alert rules" permission.

**Screen States:**
- `AlertIndexSkeleton` — exported
- Empty with filters applied
- Empty with no filters (no alerts at all)

**Navigation:**
- In: Sidebar "Alerts", Dashboard action cards, Site/Zone alert links
- Out: Row click to Alert Show

---

### 2.3 Alert Show

| Field | Value |
|-------|-------|
| **URL** | `/alerts/{alert}` |
| **Pattern** | Detail view, 2-column layout |
| **Props** | `alert` (with `notifications`), `userSnooze` |

**Content — Main Column:**
- Header: rule name, severity badge, status badge, snooze indicator (if snoozed)
- Trigger Details card: device name, zone, metric, measured value
- Notification Log card: channel icons (email/sms/push/whatsapp), delivery status per recipient
- Corrective Actions card (critical/high only): warning banner if none logged, log form, verify button

**Content — Sidebar:**
- Timeline: triggered → acknowledged → resolved (vertical stepper)
- Details card: alert metadata

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Back | Button | None | `/alerts` |
| Acknowledge | Button | Can "acknowledge alerts" | PATCH |
| Resolve | Button | Can "acknowledge alerts" | PATCH |
| Snooze | Dropdown | None | POST (30m/1h/2h/4h/8h options) |
| Cancel snooze | Button | Currently snoozed | DELETE snooze |
| Dismiss | Button | Can "manage alert rules" | DELETE |
| Log corrective action | Form submit | Can "log corrective actions" | POST |
| Verify corrective action | Button | Can "verify corrective actions" + different user than logger | PATCH |

**Filters:** None.

**Role Differences:** Corrective action log/verify buttons gated by separate permissions; verify requires a different user than the one who logged it.

**Screen States:**
- **No skeleton** (gap)
- Snoozed state: snooze indicator visible, cancel snooze button shown
- No notifications: hides Notification Log card entirely

**Navigation:**
- In: Alerts Index row click, Site/Zone alert cards, Alert Tuning links
- Out: Back to Alerts Index, device link to Device Show

---

### 2.4 Sites Index

| Field | Value |
|-------|-------|
| **URL** | `/sites` |
| **Pattern** | Card grid |
| **Props** | `sites: SiteRow[]` |

**Content:**
- Header with total site count
- Card grid: each card shows site name, device count, status badge, online ratio with progress bar, active alert count

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Card click | Card | None | `/sites/{id}` |

**Filters:** None.

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap)
- **No empty state** (gap)

**Navigation:**
- In: Sidebar "Sites"
- Out: Card click to Site Show

---

### 2.5 Site Show

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}` |
| **Pattern** | Detail/Dashboard, 2-column layout |
| **Props** | `site`, `kpis: SiteKPIs`, `zones: ZoneSummary[]`, `activeAlerts`, `floorPlans` |

**Content — Main Column:**
- Header: site name, status badge, timezone, report quick-links
- 5 StatCards (site-level KPIs)
- CircularProgress fleet health gauge
- FloorPlanView (if floor plans uploaded)
- Zones grid: ZoneCard with temperature reading + device progress bar

**Content — Sidebar:**
- Active Alerts list

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Temperature Report link | Button | None | `/sites/{id}/reports/temperature` |
| Summary Report link | Button | None | `/sites/{id}/reports/summary` |
| Zone card click | Card | None | `/sites/{id}/zones/{zone}` |
| Alert card click | Card | None | `/alerts/{id}` |
| View all alerts | Link | None | `/alerts` (filtered) |

**Filters:** None.

**Role Differences:** None.

**Screen States:**
- `SiteShowSkeleton` — exported
- Empty zones: message when no zones configured
- Empty alerts: message when no active alerts

**Navigation:**
- In: Sites Index card click, Dashboard SiteCard, CC Org Show site row
- Out: Zone cards, alert cards, report links

---

### 2.6 Zone Detail

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/zones/{zone}` |
| **Pattern** | Detail with chart |
| **Props** | `site`, `zone`, `devices`, `summary`, `alerts`, `chartData`, `period` |

**Content:**
- Header: zone name, device count breakdown (online/total)
- ZoneChart: Recharts AreaChart with period toggle (24h / 7d / 30d)
- Metric summary cards
- Devices table columns: name + online dot, model, status, battery %, signal strength, last seen
- Alerts sidebar

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Period toggle | Button group | None | Re-fetches chartData via Inertia visit |
| Device row click | Table row | None | `/devices/{id}` |
| Alert card click | Card | None | `/alerts/{id}` |

**Filters:** Period toggle (24h / 7d / 30d).

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap)
- Chart empty: text message when no data for period
- Alerts empty: text message

**Navigation:**
- In: Site Show zone card click
- Out: Device row to Device Show, alert card to Alert Show

---

### 2.7 Site Comparison

| Field | Value |
|-------|-------|
| **URL** | `/sites/compare` |
| **Pattern** | Analytics/ranking |
| **Props** | `rankings`, `metric`, `days`, `sites` |

**Content:**
- Summary cards: best site, average value, worst site
- Ranking table: rank circle, site name, metric value, vs-average badge (above/below)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Metric select | Dropdown | None | Re-fetches rankings |
| Period toggle | Button group | 30d / 90d / 365d | Re-fetches rankings |
| Row click | Table row | None | `/sites/{id}` |

**Filters:** Metric select, period toggle — server-side.

**Role Differences:** None.

**Screen States:**
- `SiteComparisonSkeleton` — exported
- Empty state: shown when organization has fewer than 2 sites

**Navigation:**
- In: Sidebar "Analytics > Site Comparison" (or equivalent)
- Out: Row click to Site Show

---

### 2.8 Site Timeline

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/timeline` |
| **Pattern** | Chronological feed |
| **Props** | `site`, `events`, `totalEvents`, `zones`, `filters` |

**Content:**
- Header with total event count
- Filter bar: date range picker, event type select, zone select
- Timeline: events grouped by hour, each with type icon, description, and optional "View details" link

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Date filter | DateRangePicker | None | Re-fetches events |
| Type filter | Select | None | Re-fetches events |
| Zone filter | Select | None | Re-fetches events |
| View details | Link on event | When event.link present | `event.link` (varies: alert, WO, etc.) |

**Filters:** Date range, event type, zone — all server-side.

**Role Differences:** None.

**Screen States:**
- `SiteTimelineSkeleton` — exported
- Empty state when no events match filters

**Navigation:**
- In: Site Show navigation
- Out: Event detail links to various pages (alerts, work orders, etc.)

---

### 2.9 Site Audit

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/audit` |
| **Pattern** | Compliance report |
| **Props** | `site`, `days`, `summary`, `zones`, `excursions`, `correctiveActions`, `calibrations`, `monitoringGaps` |

**Content:**
- 5 summary cards (compliance score, excursions, corrective actions, calibrations, gaps)
- Temperature Excursions table: date, zone, device, duration, max deviation
- Corrective Actions table: date, action taken, user, status
- Sensor Calibrations table: device, last calibrated, next due, status
- Monitoring Gaps table (conditional — only shown if gaps exist)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Period toggle | Button group | 90d / 180d / 365d | Re-fetches all data |
| Excursion row click | Table row | None | `/alerts/{id}` |

**Filters:** Period toggle — server-side.

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap)

**Navigation:**
- In: Site Show navigation
- Out: Excursion rows to Alert Show

---

### 2.10 Devices Index

| Field | Value |
|-------|-------|
| **URL** | `/devices` |
| **Pattern** | Index table with filters |
| **Props** | `devices: PaginatedDevices`, `sites`, `filters` |

**Content:**
- Header with total device count
- Filter bar: site select, status select, search input
- Table columns: name, model (mono font), site, zone, status badge, battery % (mono font), last seen date

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Row click | Table row | None | `/devices/{id}` |
| Site filter | Select | None | Re-fetches with filter |
| Status filter | Select | None | Re-fetches with filter |
| Search | Input | None | Re-fetches with debounced query |

**Filters:** Site, status, search — all server-side.

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap — only empty states)
- Empty with filters: "No devices match your filters"
- Empty without filters: "No devices found"

**Navigation:**
- In: Sidebar "Devices"
- Out: Row click to Device Show

---

### 2.11 Device Show

| Field | Value |
|-------|-------|
| **URL** | `/devices/{device}` |
| **Pattern** | Detail with chart, 2-column layout |
| **Props** | `device`, `chartData`, `latestReadings`, `alerts`, `availableMetrics`, `period`, `metric` |

**Content — Main Column:**
- Header: device name, model, status badge, dev_eui
- 4 StatCards: battery level, signal strength, last seen, alert count
- Chart with period/metric toggle controls (Recharts)
- Latest readings grid (metric name → current value)

**Content — Sidebar:**
- Device info card (model, firmware, zone, site)
- Alert history sidebar (recent alerts for this device)
- Replacement dialog (modal)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Period toggle | Button group | None | Re-fetches chartData |
| Metric select | Dropdown | None | Re-fetches chartData |
| Replace device | Button → dialog | Can "manage devices" | POST replacement |
| Alert history click | List item | None | `/alerts/{id}` |

**Filters:** Period, metric — server-side.

**Role Differences:** Replace button only visible with "manage devices" permission.

**Screen States:**
- `DeviceShowSkeleton` — exported
- Chart empty: message when no readings for selected period/metric
- Alert history empty: message when no alerts

**Navigation:**
- In: Devices Index row click, Zone Detail device row
- Out: Alert history links to Alert Show

---

### 2.12 Work Orders Index

| Field | Value |
|-------|-------|
| **URL** | `/work-orders` |
| **Pattern** | Index table with bulk actions |
| **Props** | `workOrders: PaginatedWorkOrders`, `filters`, `isTechnician`, `technicians` |

**Content:**
- Header with status counts
- "New Work Order" button (disabled — placeholder for future)
- Filter bar: "My WOs" toggle, status select, priority select, type select
- Table columns: checkbox, title, type badge, priority badge, status badge, assigned to, site, created date (mono font)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Row click | Table row | None | `/work-orders/{id}` |
| New Work Order | Button | Can "manage work orders" | Currently disabled |
| Bulk assign | Technician select in BulkActionBar | Rows selected + Can "manage work orders" | PATCH batch |
| My WOs toggle | Toggle | `isTechnician` | Filters to assigned WOs |

**Filters:** My WOs toggle, status, priority, type — server-side.

**Role Differences:**
- `isTechnician`: checkboxes hidden, "My WOs" toggle visible
- Can "manage work orders": New button visible (disabled), bulk assign available

**Screen States:**
- `WorkOrderIndexSkeleton` — exported
- Empty with filters
- Empty without filters

**Navigation:**
- In: Sidebar "Work Orders", Dashboard action cards
- Out: Row click to Work Order Show

---

### 2.13 Work Order Show

| Field | Value |
|-------|-------|
| **URL** | `/work-orders/{workOrder}` |
| **Pattern** | Detail with forms, 2-column layout |
| **Props** | `workOrder` (with `site`, `device`, `assigned_user`, `photos`, `notes`) |

**Content — Main Column:**
- Header: title, priority badge, status badge
- Status action buttons (contextual based on current status)
- Details card (type, description, device, site)
- Photos grid with upload dropzone
- Notes list with inline add-note form

**Content — Sidebar:**
- Timeline (status history)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Assign | Button/Select | Can "manage work orders" | PATCH |
| Start work | Button | Can "complete work orders" + status=assigned | PATCH |
| Complete | Button | Can "complete work orders" + status=in_progress | PATCH |
| Cancel | Button | Can "manage work orders" | PATCH |
| Upload photo | Dropzone | Status not completed/cancelled | POST |
| Add note | Form submit | Status not completed/cancelled | POST |

**Filters:** None.

**Role Differences:**
- Can "manage work orders": Assign and Cancel buttons
- Can "complete work orders": Start and Complete buttons
- Completed/cancelled status: hides upload and note form

**Screen States:**
- **No skeleton** (gap)

**Navigation:**
- In: Work Orders Index row click, CC Work Orders row click, CC Dispatch WO list
- Out: Device link, site link

---

### 2.14 Activity Log

| Field | Value |
|-------|-------|
| **URL** | `/activity-log` |
| **Pattern** | Chronological feed |
| **Props** | `activities` (paginated), `filters` |

**Content:**
- Header with total activity count
- Event type filter
- Timeline grouped by date, each entry with expandable change diff

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Event type filter | Select | None | Re-fetches activities |
| Refresh | Button | None | Re-fetches activities |
| Load more | Button/scroll | More pages available | Appends next page |

**Filters:** Event type — server-side.

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap — only custom EmptyState)
- Custom EmptyState when no activities match filter
- Uses `window.confirm` for destructive actions (gap — should use ConfirmationDialog)

**Navigation:**
- In: Sidebar "Activity Log"
- Out: None (self-contained)

---

### 2.15 Notifications

| Field | Value |
|-------|-------|
| **URL** | `/notifications` |
| **Pattern** | Notification feed |
| **Props** | `notifications` (paginated), `filter` |

**Content:**
- Header with total/unread counts
- "Mark all read" and "Delete read" bulk action buttons
- Filter: all / unread / read
- Notification list grouped by date

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Mark all read | Button | Unread notifications exist | PATCH batch |
| Delete read | Button | Read notifications exist | DELETE batch |
| Mark single read/unread | Button per-notification | None | PATCH |
| Delete single | Button per-notification | None | DELETE |
| Pagination | Button | More pages | Loads next page |

**Filters:** all / unread / read — client-side or query param.

**Role Differences:** None.

**Screen States:**
- Empty per filter type (different message for all/unread/read)
- Uses `window.confirm` for delete (gap — should use ConfirmationDialog)

**Navigation:**
- In: Header notification bell, Sidebar
- Out: Notification click → linked resource

---

### 2.16 Alert Tuning

| Field | Value |
|-------|-------|
| **URL** | `/analytics/alerts` |
| **Pattern** | Analytics dashboard |
| **Props** | `summary`, `noisiest_rules`, `trend`, `resolution_breakdown`, `suggested_tuning`, `sites`, `filters` |

**Content:**
- 4 KPI cards (total alerts, noise ratio, MTTR, auto-resolved %)
- Noisiest Rules table: rule name, site, fire count, false positive %, "Tune" link
- Trend chart: CSS-rendered bar chart (alerts over time)
- Resolution Breakdown: horizontal bars by resolution type
- Suggested Tuning cards: AI-generated recommendations per rule

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Site filter | Select | None | Re-fetches all data |
| Period toggle | Button group | 30d / 90d | Re-fetches all data |
| Tune link | Table link | None | `/sites/{site_id}/rules/{rule_id}` |

**Filters:** Site, period — server-side.

**Role Differences:** None.

**Screen States:**
- `EmptyState` when no alerts exist in the period

**Navigation:**
- In: Sidebar "Analytics > Alert Tuning"
- Out: Tune links to Alert Rule settings

---

### 2.17 Performance

| Field | Value |
|-------|-------|
| **URL** | `/analytics/performance` |
| **Pattern** | Analytics dashboard |
| **Props** | `summary`, `trend`, `siteBreakdown`, `days` |

**Content:**
- 4 KPI cards with target indicators (uptime, MTTR, compliance, device health)
- Trend chart: CSS-rendered bar chart
- Site Breakdown table: site name, uptime %, alerts, MTTR, compliance score

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Period toggle | Button group | 30d / 90d / 365d | Re-fetches all data |
| Row click | Table row | None | `/sites/{id}` |

**Filters:** Period — server-side.

**Role Differences:** None.

**Screen States:**
- `PerformanceSkeleton` — exported
- Empty table state

**Navigation:**
- In: Sidebar "Analytics > Performance"
- Out: Row click to Site Show

---

### 2.18 Reports Index

| Field | Value |
|-------|-------|
| **URL** | `/reports` |
| **Pattern** | Report launcher |
| **Props** | `sites` |

**Content:**
- 3 report type cards:
  1. **Temperature Report** — site select, date range, Generate button
  2. **Energy Report** — site select, date range, Generate button
  3. **Morning Summary** — site select, Generate button (no date range)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Generate Temperature | Button | Site + dates selected | Navigate to `/sites/{id}/reports/temperature?from=&to=` |
| Generate Energy | Button | Site + dates selected | Navigate to `/sites/{id}/reports/energy?from=&to=` |
| Generate Summary | Button | Site selected | Navigate to `/sites/{id}/reports/summary` |

**Filters:** None (selection controls, not filters).

**Role Differences:** None.

**Screen States:**
- `ReportsIndexSkeleton` — exported
- No sites: informational message

**Navigation:**
- In: Sidebar "Reports"
- Out: Generate navigates to respective report page

---

### 2.19 Temperature Report

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/reports/temperature` |
| **Pattern** | Report view with charts |
| **Props** | `site`, `report: TemperatureReport`, `from`, `to` |

**Content:**
- Summary cards (compliance %, excursion count, etc.)
- Compliance by Zone: horizontal bar chart
- Per-zone sections: trend line chart + device table (device name, min, max, avg, excursions)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Export PDF | Button | None | Triggers PDF generation/download |
| Date range + Generate | Controls | None | Re-fetches report with new range |

**Filters:** Date range — server-side (from, to query params).

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap)

**Navigation:**
- In: Reports Index generate, Site Show report link
- Out: Export PDF (download)

---

### 2.20 Energy Report

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/reports/energy` |
| **Pattern** | Report view with charts |
| **Props** | `site`, `report: EnergyReport`, `from`, `to` |

**Content:**
- 4 KPI cards (total kWh, total cost, avg daily, peak day)
- Daily Consumption area chart (dual axis: kWh + cost)
- Per-device table: device name, total kWh, avg daily, peak
- Daily Totals table: date, kWh, cost

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Export PDF | Button | None | Triggers PDF download |
| Export PDF (duplicate) | Button | None | **BUG**: second Export PDF button rendered |
| Date range + Generate | Controls | None | Re-fetches report |

**Filters:** Date range — server-side.

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap)

**Navigation:**
- In: Reports Index generate
- Out: Export PDF (download)

---

### 2.21 Morning Summary

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/reports/summary` |
| **Pattern** | Read-only report |
| **Props** | `site`, `summary: MorningSummary` |

**Content:**
- Fleet health score
- 4 device stat cards (total, online, offline, critical battery)
- 2 alert stat cards (active, unacknowledged)
- Zone status cards (per-zone current status)

**Actions:** None — fully read-only.

**Filters:** None.

**Role Differences:** None.

**Screen States:**
- **No skeleton** (gap)

**Navigation:**
- In: Reports Index generate, Site Show summary link
- Out: None

---

## 3. Screen Detail — Settings (27 pages)

### 3.1 Profile

| Field | Value |
|-------|-------|
| **URL** | `/settings/profile` |
| **Pattern** | Form (3 sections) |
| **Props** | User data via shared auth |

**Content — Section 1: Personal Info:**
- Fields: name, email, phone
- Submit → PATCH `/user/profile-information`

**Content — Section 2: Quiet Hours:**
- Fields: enabled toggle, start time, end time
- Submit → PATCH (same endpoint)

**Content — Section 3: Notification Preferences:**
- Channel toggles: email, SMS, push, WhatsApp per notification type
- Submit → PATCH (same endpoint)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Save each section | Form submit | Validation passes | PATCH `/user/profile-information` |

**Filters:** None.

**Role Differences:** None.

**Screen States:** Standard form states (pristine, dirty, submitting, validation errors).

**Navigation:**
- In: Sidebar "Settings > Profile", header user menu
- Out: None (stays on page after save)

---

### 3.2 Password

| Field | Value |
|-------|-------|
| **URL** | `/settings/password` |
| **Pattern** | Form |
| **Props** | None (Fortify endpoint) |

**Content:**
- Fields: current_password, password, password_confirmation
- Submit → PUT `/user/password` (Fortify)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Update password | Form submit | Validation passes | PUT `/user/password` |

**Filters:** None. **Role Differences:** None.

**Screen States:** Standard form states.

**Navigation:**
- In: Settings sidebar "Password"
- Out: None

---

### 3.3 Appearance

| Field | Value |
|-------|-------|
| **URL** | `/settings/appearance` |
| **Pattern** | Tabs |
| **Props** | None (reads from `useAppearance` hook) |

**Content:**
- Delegates entirely to `AppearanceTabs` component
- Theme options: light, dark, system

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Set theme | Card click | None | Persists to localStorage/cookie |

**Filters:** None. **Role Differences:** None. **Screen States:** Selected state on active theme card.

**Navigation:**
- In: Settings sidebar "Appearance"
- Out: None

---

### 3.4 Two-Factor Authentication

| Field | Value |
|-------|-------|
| **URL** | `/settings/two-factor` |
| **Pattern** | Setup modal flow |
| **Props** | 2FA status from shared auth |

**Content:**
- Status card: enabled/disabled indicator
- Enable flow: QR code display → TOTP code confirmation → recovery codes display
- Disable flow: confirmation → TOTP code entry → disabled
- Recovery codes: view/regenerate

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Enable 2FA | Button | 2FA not enabled | POST → shows QR modal |
| Confirm setup | Form submit | QR displayed, code entered | POST confirm |
| Disable 2FA | Button | 2FA enabled | DELETE |
| View recovery codes | Button | 2FA enabled | GET |
| Regenerate codes | Button | 2FA enabled | POST |

**Filters:** None. **Role Differences:** None.

**Screen States:** Disabled state, setup-in-progress state, enabled state.

**Navigation:**
- In: Settings sidebar "Two-Factor Authentication"
- Out: None

---

### 3.5 Organization

| Field | Value |
|-------|-------|
| **URL** | `/settings/organization` |
| **Pattern** | Form |
| **Props** | Organization data via shared `current_organization` |

**Content:**
- Fields: name, timezone select, opening_hour time input
- Branding section: primary_color color picker, secondary_color color picker, font select, logo upload

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Save | Form submit | Validation passes | PATCH organization |

**Filters:** None.

**Role Differences:** Entire page gated — Can "manage org settings" required.

**Screen States:** Standard form states.

**Navigation:**
- In: Settings sidebar "Organization"
- Out: None

---

### 3.6 Sites Settings

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites` |
| **Pattern** | CRUD table with dialog |
| **Props** | `sites` list |

**Content:**
- Table columns: name, address, timezone, status badge, device count, action buttons
- SiteForm dialog: name, address, timezone, opening_hour
- "Onboard" button per site (when status = onboarding)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Site | Button → dialog | Can "manage sites" | POST via SiteForm |
| Edit Site | Button → dialog | Can "manage sites" | PATCH via SiteForm |
| Delete Site | Button → confirm | Can "manage sites" | DELETE |
| Onboard | Button | Can "manage sites" + site.status=onboarding | Navigate to `/sites/{id}/onboard` |

**Filters:** None.

**Role Differences:** All CRUD actions gated by "manage sites" permission.

**Screen States:** Empty table state, dialog open/submitting.

**Navigation:**
- In: Settings sidebar "Sites"
- Out: Onboard button to Onboarding Wizard

---

### 3.7 Onboarding Wizard

| Field | Value |
|-------|-------|
| **URL** | `/sites/{site}/onboard` |
| **Pattern** | Stepper (5 steps) |
| **Props** | `site`, existing gateways/devices/modules |

**Content — Steps:**
1. **Gateway**: Enter serial, model → register via ChirpStack API
2. **Devices**: Enter device details (name, dev_eui, model, app_key, zone) → register
3. **Floor Plans**: Upload floor plan images, place device markers
4. **Modules**: Toggle modules (cold_chain, energy, iaq, industrial) → auto-apply recipes
5. **Complete**: Review summary → "Complete Onboarding" (validates >= 1 gateway, >= 1 device, >= 1 module)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Register Gateway | Button | Step 1, form valid | POST ChirpStack |
| Register Devices | Button | Step 2, form valid | POST |
| Upload Floor Plan | Dropzone | Step 3 | POST |
| Activate Modules | Button | Step 4, >= 1 selected | POST |
| Complete Onboarding | Button | Step 5, all requirements met | PATCH site status → active |
| Step navigation | Stepper | Previous steps completed | Client-side step change |

**Filters:** None.

**Role Differences:** Entire page gated — Can "manage sites".

**Screen States:** Per-step validation states, ChirpStack API error toasts, completion summary.

**Navigation:**
- In: Sites Settings "Onboard" button
- Out: Complete → `/sites/{id}`

---

### 3.8 Gateways

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/gateways` |
| **Pattern** | CRUD table |
| **Props** | `site`, `gateways` list |

**Content:**
- Table columns: name, serial, model, status badge, connected devices count, last seen, actions
- Gateway form dialog

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Gateway | Button → dialog | Can "manage devices" | POST |
| Edit Gateway | Button → dialog | Can "manage devices" | PATCH |
| Delete Gateway | Button → confirm | Can "manage devices" | DELETE |
| Row click | Table row | None | `/settings/sites/{site}/gateways/{gateway}` |

**Filters:** None.

**Role Differences:** All CRUD gated by "manage devices".

**Screen States:** Empty table, dialog states.

**Navigation:**
- In: Settings sidebar (site-scoped)
- Out: Row click to Gateway Show

---

### 3.9 Gateway Show

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/gateways/{gateway}` |
| **Pattern** | Read-only detail |
| **Props** | `site`, `gateway` (with connected devices) |

**Content:**
- Gateway details card: name, serial, model, firmware, status, last seen
- Connected devices table: device name, model, status, last seen

**Actions:** None (read-only).

**Filters:** None. **Role Differences:** None. **Screen States:** Empty devices table.

**Navigation:**
- In: Gateways table row click
- Out: Device links (if clickable)

---

### 3.10 Devices (Site-Scoped Settings)

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/devices` |
| **Pattern** | Stats bar + filter + table |
| **Props** | `site`, `devices`, stats |

**Content:**
- Stats bar: total, online, offline, critical battery
- Filter bar: status, search
- Table columns: name, model, status, battery, signal, last seen, actions

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Device | Button → dialog | Can "manage devices" | POST |
| Row click | Table row | None | `/settings/sites/{site}/devices/{device}` |

**Filters:** Status, search.

**Role Differences:** Add button gated by "manage devices".

**Screen States:** Empty table with/without filters.

**Navigation:**
- In: Settings sidebar (site-scoped)
- Out: Row click to Device Show (site-scoped)

---

### 3.11 Device Show (Site-Scoped Settings)

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/devices/{device}` |
| **Pattern** | Read-only detail |
| **Props** | `site`, `device` (with gateway, recipe) |

**Content:**
- Device details: name, dev_eui, model, firmware, zone, status, battery, signal
- Gateway link
- Recipe link (if assigned)

**Actions:** None (read-only).

**Filters:** None. **Role Differences:** None.

**Screen States:** Standard detail.

**Navigation:**
- In: Devices (site-scoped) row click
- Out: Gateway link, Recipe link

---

### 3.12 Users

| Field | Value |
|-------|-------|
| **URL** | `/settings/users` |
| **Pattern** | CRUD table with dialog |
| **Props** | `users`, `roles`, `sites` |

**Content:**
- Table columns: name, email, role badge, site access, app access, status, actions
- UserForm dialog: name, email, role select, site access multi-select, app access toggle

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add User | Button → dialog | Can "manage users" | POST |
| Edit User | Button → dialog | Can "manage users" | PATCH |
| Delete User | Button → confirm | Can "manage users" | DELETE |

**Filters:** None.

**Role Differences:** Entire page gated by "manage users". Role select options filtered by `RoleDefinitions.assignable` for current user's role.

**Screen States:** Empty table, dialog states.

**Navigation:**
- In: Settings sidebar "Users"
- Out: None

---

### 3.13 Alert Rules

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/alert-rules` |
| **Pattern** | Card grid with toggle/edit/delete |
| **Props** | `site`, `rules` |

**Content:**
- Card grid: each card shows rule name, metric, operator + threshold, severity badge, enabled toggle
- Edit/delete actions per card

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Rule | Button → form/dialog | Can "manage alert rules" | POST |
| Toggle enable/disable | Switch | Can "manage alert rules" | PATCH |
| Edit | Button | Can "manage alert rules" | Navigate or dialog |
| Delete | Button → confirm | Can "manage alert rules" | DELETE |
| Card click | Card | None | `/settings/sites/{site}/alert-rules/{rule}` |

**Filters:** None.

**Role Differences:** All actions gated by "manage alert rules".

**Screen States:** Empty state when no rules.

**Navigation:**
- In: Settings sidebar (site-scoped), Alert Tuning "Tune" links
- Out: Card click to Alert Rule Show

---

### 3.14 Alert Rule Show

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/alert-rules/{rule}` |
| **Pattern** | Read-only detail |
| **Props** | `site`, `rule` |

**Content:**
- Rule details: name, metric, operator, threshold, severity, hysteresis, cooldown, enabled status
- Escalation chain link (if assigned)
- **NO EDIT FORM** — edit button routes here but no inline editing exists

**Actions:** None (read-only). **BUG:** Edit action from Alert Rules grid navigates here but there is no edit form.

**Filters:** None. **Role Differences:** None.

**Screen States:** Standard detail.

**Navigation:**
- In: Alert Rules card click, Alert Tuning "Tune" link
- Out: Escalation chain link

---

### 3.15 Escalation Chains

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/escalation-chains` |
| **Pattern** | CRUD table with LevelBuilder |
| **Props** | `site`, `chains` |

**Content:**
- Table columns: name, levels count, actions
- Chain form with LevelBuilder: ordered levels, each with delay (minutes), recipients (users), channels (email/sms/push/whatsapp)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Chain | Button → form | Can "manage alert rules" | POST |
| Edit Chain | Button → form | Can "manage alert rules" | PATCH |
| Delete Chain | Button → confirm | Can "manage alert rules" | DELETE |

**Filters:** None.

**Role Differences:** All actions gated by "manage alert rules".

**Screen States:** Empty table state.

**Navigation:**
- In: Settings sidebar (site-scoped)
- Out: None

---

### 3.16 Compliance

| Field | Value |
|-------|-------|
| **URL** | `/settings/compliance` |
| **Pattern** | Client-side filtered event list |
| **Props** | `events` |

**Content:**
- Events grouped by month
- Each event: type, description, date, status
- Client-side filtering (not server-side pagination)

**Actions:** View only — no create/edit.

**Filters:** Client-side type/date filtering.

**Role Differences:** Page gated — Can "manage org settings".

**Screen States:** Empty state when no events.

**Navigation:**
- In: Settings sidebar "Compliance"
- Out: None

---

### 3.17 Maintenance Windows

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/maintenance-windows` |
| **Pattern** | Card list with dialog |
| **Props** | `site`, `windows` |

**Content:**
- Card list: each window shows title, schedule, suppress_alerts toggle, status
- WindowFormDialog: title, description, start, end, recurrence, suppress_alerts

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Window | Button → dialog | Can "manage maintenance windows" | POST |
| Edit Window | Button → dialog | Can "manage maintenance windows" | PATCH |
| Delete Window | Button → confirm | Can "manage maintenance windows" | DELETE |
| Toggle suppress | Switch | **No permission gate** (gap) | PATCH |

**Filters:** None.

**Role Differences:** CRUD gated by "manage maintenance windows", but suppress toggle is ungated.

**Screen States:** Empty state.

**Navigation:**
- In: Settings sidebar (site-scoped)
- Out: None

---

### 3.18 Report Schedules

| Field | Value |
|-------|-------|
| **URL** | `/settings/report-schedules` |
| **Pattern** | Card list |
| **Props** | `schedules`, `sites` |

**Content:**
- Card list: report type, site, frequency, recipient, enabled toggle, actions
- Schedule form: report type select, site select, frequency select, recipient email
- **Note:** Only 1 recipient captured despite model supporting array

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Add Schedule | Button → form | Can "manage report schedules" | POST |
| Toggle enable/disable | Switch | **No permission gate** (gap) | PATCH |
| Delete | Button | **No permission gate** (gap) | DELETE |

**Filters:** None.

**Role Differences:** Only create action properly gated.

**Screen States:** Empty state.

**Navigation:**
- In: Settings sidebar "Report Schedules"
- Out: None

---

### 3.19 Site Templates

| Field | Value |
|-------|-------|
| **URL** | `/settings/site-templates` |
| **Pattern** | Card grid |
| **Props** | `templates`, `sites` |

**Content:**
- Card grid: template name, source site, device count, module list
- Create from source site dialog

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Create Template | Button → dialog | None | POST (from source site) |
| Delete Template | Button | **No permission gate** (gap) | DELETE |

**Filters:** None.

**Role Differences:** No permission gates on any action.

**Screen States:** Empty state.

**Navigation:**
- In: Settings sidebar "Site Templates"
- Out: None

---

### 3.20 Export Data

| Field | Value |
|-------|-------|
| **URL** | `/settings/export` |
| **Pattern** | Form + history list |
| **Props** | `exports` (history), `sites` |

**Content:**
- Export request form: site select, data type select, date range, format (CSV/Excel)
- Export history list: requested date, site, type, format, status, download link

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Request Export | Form submit | Form valid | POST |
| Download | Link | Export status = completed | Download file |

**Filters:** None.

**Role Differences:** **No permission checks** (gap).

**Screen States:** Empty history, export in-progress state.

**Navigation:**
- In: Settings sidebar "Export Data"
- Out: Download links

---

### 3.21 Integrations

| Field | Value |
|-------|-------|
| **URL** | `/settings/integrations` |
| **Pattern** | Card list |
| **Props** | `integrations` |

**Content:**
- Integration cards:
  1. **SAP**: enabled toggle, cron schedule input
  2. **CONTPAQi**: enabled toggle, cron schedule input

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Toggle integration | Switch | None | PATCH |
| Update schedule | Input + save | None | PATCH |

**Filters:** None. **Role Differences:** None. **Screen States:** Disabled/enabled per integration.

**Navigation:**
- In: Settings sidebar "Integrations"
- Out: None

---

### 3.22 API Keys

| Field | Value |
|-------|-------|
| **URL** | `/settings/api-keys` |
| **Pattern** | Form + table |
| **Props** | `apiKeys` |

**Content:**
- Create form: name input → Generate button → displays token once
- Table columns: name, last used, created, actions (delete)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Generate Key | Form submit | Name provided | POST → shows token |
| Delete Key | Button | **No confirmation dialog** (gap) | DELETE |

**Filters:** None. **Role Differences:** None.

**Screen States:** Empty table, token display (one-time).

**Navigation:**
- In: Settings sidebar "API Keys"
- Out: None

---

### 3.23 Billing

| Field | Value |
|-------|-------|
| **URL** | `/settings/billing` |
| **Pattern** | Subscription card + invoices table |
| **Props** | `subscription`, `invoices` |

**Content:**
- Subscription card: plan name, status, monthly amount, next billing date
- Invoices table: date, amount, status badge, download link
- Generate invoice button

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Generate Invoice | Button | None | POST |
| Download Invoice | Link | Invoice exists | Download PDF |
| Manage Profiles | Link | None | Navigate to `/settings/billing/profiles` |

**Filters:** None.

**Role Differences:** Entire page gated — Can "manage org settings".

**Screen States:** Empty invoices table.

**Navigation:**
- In: Settings sidebar "Billing"
- Out: Billing Profiles link, invoice downloads

---

### 3.24 Billing Profiles

| Field | Value |
|-------|-------|
| **URL** | `/settings/billing/profiles` |
| **Pattern** | Form + list |
| **Props** | `profiles` |

**Content:**
- Profile form (Mexican fiscal fields): razon_social, RFC, regimen_fiscal, uso_CFDI, domicilio_fiscal
- Existing profiles list (read-only)
- **No edit/delete for existing profiles** (gap)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Create Profile | Form submit | Valid fiscal fields | POST |

**Filters:** None.

**Role Differences:** Gated by "manage org settings".

**Screen States:** Empty list, form validation.

**Navigation:**
- In: Billing page link
- Out: Back to Billing

---

### 3.25 Modules

| Field | Value |
|-------|-------|
| **URL** | `/settings/sites/{site}/modules` |
| **Pattern** | Toggle cards |
| **Props** | `site`, `modules` |

**Content:**
- Module cards: cold_chain, energy, iaq, industrial
- Each card: name, description, enabled toggle

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Toggle module | Switch | **No permission gate** (gap) | PATCH |

**Filters:** None.

**Role Differences:** **No permission gate** — any authenticated user can toggle modules.

**Screen States:** Enabled/disabled per module.

**Navigation:**
- In: Settings sidebar (site-scoped)
- Out: None

---

### 3.26 Recipes

| Field | Value |
|-------|-------|
| **URL** | `/settings/recipes` |
| **Pattern** | Read-only card grid |
| **Props** | `recipes` |

**Content:**
- Card grid: recipe name, module, description, threshold count
- Cards are clickable

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Card click | Card | None | `/settings/recipes/{recipe}` |

**Filters:** None. **Role Differences:** None.

**Screen States:** Empty state.

**Navigation:**
- In: Settings sidebar "Recipes"
- Out: Card click to Recipe Show

---

### 3.27 Recipe Show

| Field | Value |
|-------|-------|
| **URL** | `/settings/recipes/{recipe}` |
| **Pattern** | Detail + threshold overrides |
| **Props** | `recipe`, `editable` flag |

**Content:**
- Recipe details: name, module, description
- Default thresholds list
- Override thresholds editor (when `editable` is true): per-threshold value inputs

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Save Overrides | Form submit | `editable` flag is true | PATCH |

**Filters:** None.

**Role Differences:** `editable` flag controls whether override editor is shown.

**Screen States:** Read-only mode, editable mode.

**Navigation:**
- In: Recipes card click, Device Show (site-scoped) recipe link
- Out: Back to Recipes

---

## 4. Screen Detail — Auth (8 pages)

### 4.1 Login

| Field | Value |
|-------|-------|
| **URL** | `/login` |
| **Pattern** | Auth form |
| **Props** | `canRegister`, `status` |

**Content:**
- Fields: email, password, "Keep me signed in" checkbox
- Submit button with Spinner during processing
- Links: Forgot password, Register (if `canRegister`)
- **Note:** `canRegister` prop exists but is currently unused (registration may be disabled)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Login | Form submit | Valid credentials | POST `/login` → `/dashboard` |
| Forgot password | Link | None | `/forgot-password` |
| Register | Link | `canRegister` | `/register` |

**Screen States:** Validation errors, processing spinner, status message (e.g., after password reset).

**Navigation:**
- In: `/` redirects here, logout redirect
- Out: Success → `/dashboard`, links to register/forgot-password

---

### 4.2 Register

| Field | Value |
|-------|-------|
| **URL** | `/register` |
| **Pattern** | Auth form |
| **Props** | None |

**Content:**
- Fields: name, email, password, password_confirmation
- Submit button with Spinner

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Register | Form submit | Valid fields | POST `/register` → `/dashboard` |
| Login link | Link | None | `/login` |

**Screen States:** Validation errors, processing.

**Navigation:**
- In: Login page register link
- Out: Success → `/dashboard` (may redirect to verify-email)

---

### 4.3 Forgot Password

| Field | Value |
|-------|-------|
| **URL** | `/forgot-password` |
| **Pattern** | Auth form |
| **Props** | `status` |

**Content:**
- Fields: email
- Submit button
- **Design inconsistency:** Uses `LoaderCircle` instead of `Spinner` used in all other auth forms

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Send reset link | Form submit | Valid email | POST `/forgot-password` |
| Back to login | Link | None | `/login` |

**Screen States:** Validation errors, processing (LoaderCircle), success status message.

**Navigation:**
- In: Login "Forgot password" link
- Out: Success shows status, link back to login

---

### 4.4 Reset Password

| Field | Value |
|-------|-------|
| **URL** | `/reset-password` |
| **Pattern** | Auth form |
| **Props** | `token`, `email` |

**Content:**
- Fields: email (pre-filled, read-only), password, password_confirmation
- Hidden: token

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Reset password | Form submit | Valid fields | POST `/reset-password` → `/login` |

**Screen States:** Validation errors, processing.

**Navigation:**
- In: Email reset link (with token)
- Out: Success → `/login` with status message

---

### 4.5 Verify Email

| Field | Value |
|-------|-------|
| **URL** | `/verify-email` |
| **Pattern** | Gate |
| **Props** | `status` |

**Content:**
- Informational message about email verification requirement
- "Resend verification email" button
- Logout link

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Resend | Button | None | POST `/email/verification-notification` |
| Logout | Link | None | POST `/logout` |

**Screen States:** Standard, resend success status.

**Navigation:**
- In: Automatic redirect when email unverified
- Out: Verify via email link → `/dashboard`

---

### 4.6 Confirm Password

| Field | Value |
|-------|-------|
| **URL** | `/confirm-password` |
| **Pattern** | Re-auth gate |
| **Props** | None |

**Content:**
- Explanation text
- Fields: password
- Submit button

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Confirm | Form submit | Valid password | POST → intended route |

**Screen States:** Validation errors, processing.

**Navigation:**
- In: Automatic redirect for sensitive actions
- Out: Success → originally intended route

---

### 4.7 Two-Factor Challenge

| Field | Value |
|-------|-------|
| **URL** | `/two-factor-challenge` |
| **Pattern** | Dual-mode form |
| **Props** | None |

**Content:**
- Mode toggle: TOTP code vs Recovery code
- TOTP mode: 6-digit code input
- Recovery mode: recovery code text input

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Submit TOTP | Form submit | 6-digit code | POST `/two-factor-challenge` |
| Submit Recovery | Form submit | Recovery code | POST `/two-factor-challenge` |
| Toggle mode | Link | None | Client-side mode switch |

**Screen States:** Validation errors, processing, mode toggle.

**Navigation:**
- In: Automatic redirect after login when 2FA enabled
- Out: Success → `/dashboard`

---

### 4.8 Privacy Accept

| Field | Value |
|-------|-------|
| **URL** | `/privacy/accept` |
| **Pattern** | Policy acceptance gate |
| **Props** | Policy content |

**Content:**
- LFPDPPP (Mexican federal privacy law) policy text
- Accept checkbox
- Submit button

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Accept | Button | Checkbox checked | POST → `/dashboard` |

**Screen States:** Unchecked (button disabled), checked (button enabled), processing.

**Navigation:**
- In: Automatic redirect when privacy not accepted
- Out: Success → `/dashboard`

---

## 5. Screen Detail — Command Center (8 pages)

All Command Center pages are restricted to Astrea roles (super_admin, support, account_manager, technician).

### 5.1 CC Index

| Field | Value |
|-------|-------|
| **URL** | `/command-center` |
| **Pattern** | Dashboard |
| **Props** | KPIs, org table data, outage info, delivery health |

**Content:**
- 6 KPI cards (total orgs, total sites, total devices, active alerts, open WOs, fleet health)
- Organization table: name, sites, devices, alerts, health score
- Outage declaration dialog
- Delivery health section (notification delivery stats)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Declare Outage | Button → dialog | None | POST outage declaration |
| Org row click | Table row | None | `/command-center/organizations/{org}` |

**Filters:** None.

**Role Differences:** All Astrea roles can access; outage declaration may be further restricted.

**Screen States:** Active outage banner, normal state.

**Navigation:**
- In: Sidebar "Command Center"
- Out: Org rows to CC Org Show, sub-nav to CC sub-pages

---

### 5.2 CC Alerts

| Field | Value |
|-------|-------|
| **URL** | `/command-center/alerts` |
| **Pattern** | Paginated table (read-only) |
| **Props** | `alerts` (paginated) |

**Content:**
- Alert table: severity, alert name, organization, site, device, status, time
- Pagination

**Actions:** View-only — no acknowledge/resolve/dismiss from CC level.

**Filters:** Standard pagination.

**Role Differences:** Astrea roles only.

**Screen States:** Empty state.

**Navigation:**
- In: CC sub-navigation
- Out: None (read-only — no drill-down)

---

### 5.3 CC Devices

| Field | Value |
|-------|-------|
| **URL** | `/command-center/devices` |
| **Pattern** | Stats + paginated table |
| **Props** | Stats, `devices` (paginated) |

**Content:**
- Stats bar: total devices, online, offline, critical
- Device table: name, model, organization, site, status, battery, last seen
- **No row click action** (gap — cannot drill down to device)

**Actions:** View-only.

**Filters:** Pagination.

**Role Differences:** Astrea roles only.

**Screen States:** Empty state.

**Navigation:**
- In: CC sub-navigation
- Out: **None** (gap — rows are not clickable)

---

### 5.4 CC Dispatch

| Field | Value |
|-------|-------|
| **URL** | `/command-center/dispatch` |
| **Pattern** | Split panel (list + map) |
| **Props** | Work orders, technicians, site coordinates |

**Content — Left Panel:**
- Work order list: title, priority, status, site, assigned technician
- Technician assignment select per WO

**Content — Right Panel:**
- Leaflet map with site markers and technician locations

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Assign Technician | Select per WO | None | PATCH work order |
| WO click | List item | None | Highlights on map / expands detail |

**Filters:** None explicit.

**Role Differences:** Astrea roles only.

**Screen States:** Empty WO list, map loading.

**Navigation:**
- In: CC sub-navigation
- Out: WO details may link to Work Order Show

---

### 5.5 CC Revenue

| Field | Value |
|-------|-------|
| **URL** | `/command-center/revenue` |
| **Pattern** | Charts + table |
| **Props** | MRR data, org breakdown |

**Content:**
- MRR charts (monthly recurring revenue trends)
- Organization table: name, plan, MRR, device count, status
- Drill-down capability

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Org row click | Table row | None | Drill-down detail (inline or CC Org Show) |

**Filters:** Period selection.

**Role Differences:** Astrea roles only.

**Screen States:** Empty when no billing data.

**Navigation:**
- In: CC sub-navigation
- Out: Org drill-down

---

### 5.6 CC Work Orders

| Field | Value |
|-------|-------|
| **URL** | `/command-center/work-orders` |
| **Pattern** | Paginated table |
| **Props** | `workOrders` (paginated) |

**Content:**
- Table: title, type, priority, status, organization, site, assigned technician, created date

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Row click | Table row | None | `/work-orders/{id}` |

**Filters:** Pagination.

**Role Differences:** Astrea roles only.

**Screen States:** Empty state.

**Navigation:**
- In: CC sub-navigation
- Out: Row click to Work Order Show (main app)

---

### 5.7 CC Org Show

| Field | Value |
|-------|-------|
| **URL** | `/command-center/organizations/{org}` |
| **Pattern** | Detail, 2-column layout |
| **Props** | `organization`, sites, alerts, activities |

**Content — Main Column:**
- Organization header: name, segment, plan
- Sites table: name, status, device count, health score

**Content — Sidebar:**
- Active alerts list
- Recent activity feed

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Site row click | Table row | None | `/sites/{id}` |

**Filters:** None.

**Role Differences:** Astrea roles only.

**Screen States:** Empty sites, empty alerts, empty activity.

**Navigation:**
- In: CC Index org row click, Partner Portal org row click
- Out: Site rows to Site Show

---

### 5.8 Partner Portal

| Field | Value |
|-------|-------|
| **URL** | `/partner` |
| **Pattern** | Org table + create dialog |
| **Props** | `organizations` |

**Content:**
- Organization table: name, segment, sites count, devices count, status, MRR
- Create Organization dialog: name, segment select, plan select

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Create Organization | Button → dialog → submit | super_admin only | POST |
| Org row click | Table row | None | `/command-center/organizations/{org}` |

**Filters:** None.

**Role Differences:** super_admin only — other Astrea roles cannot access.

**Screen States:** Empty table, dialog processing state.
- **Design inconsistency:** Create dialog uses "Creating..." text instead of Spinner component

**Navigation:**
- In: Sidebar "Partner Portal"
- Out: Org row to CC Org Show

---

## 6. Screen Detail — Modules (3 pages)

### 6.1 IAQ Dashboard

| Field | Value |
|-------|-------|
| **URL** | `/modules/iaq` |
| **Pattern** | Module dashboard |
| **Props** | IAQ data, zones, chartData |

**Content:**
- IAQ score ring (overall air quality index)
- Zone cards: zone name, current AQI score, primary pollutant
- Trend chart with period toggle (Recharts)

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Period toggle | Button group | None | Re-fetches chart data |

**Filters:** Period toggle.

**Role Differences:** None (module must be enabled for site).

**Screen States:** Standard module dashboard.

**Bugs:**
- Uses `window.location.search` for reading query params — not SSR-safe (should use Inertia page props)

**Navigation:**
- In: Sidebar "Modules > IAQ" (when module enabled)
- Out: Zone cards may link to Zone Detail

---

### 6.2 Industrial Dashboard

| Field | Value |
|-------|-------|
| **URL** | `/modules/industrial` |
| **Pattern** | Module dashboard |
| **Props** | KPIs, equipment data, compressor health, chartData |

**Content:**
- KPI cards (OEE, uptime, energy efficiency, etc.)
- Equipment cards: machine name, status, current metrics
- Compressor health section
- Trend chart with period toggle

**Actions:**
| Action | Trigger | Condition | Target |
|--------|---------|-----------|--------|
| Period toggle | Button group | None | Re-fetches chart data |

**Filters:** Period toggle.

**Role Differences:** None (module must be enabled for site).

**Screen States:** Standard module dashboard.

**Bugs:**
- KPICard uses dynamic Tailwind classes (e.g., `text-${color}-500`) — will not be included in CSS purge; must use static class mapping

**Navigation:**
- In: Sidebar "Modules > Industrial" (when module enabled)
- Out: Equipment cards may link to device details

---

### 6.3 Welcome (DEAD PAGE)

| Field | Value |
|-------|-------|
| **URL** | `/welcome` |
| **Pattern** | Orphaned Laravel boilerplate |
| **Props** | None |

**Content:** Default Laravel welcome page markup.

**Status:** DEAD — `/` redirects to `/login`, this page is unreachable via normal navigation. Should be deleted.

---

## 7. Interaction Conventions

### 7.1 Layout System

| Layout | Usage | Structure |
|--------|-------|-----------|
| `AppLayout` | All authenticated pages | Sidebar + header + content area |
| `AuthLayout` | Login, register, password flows | Centered card (variants: card, simple, split) |
| `SettingsLayout` | All `/settings/*` pages | AppLayout + settings sidebar |

### 7.2 Table Patterns

| Pattern | Description | Used In |
|---------|-------------|---------|
| Index Table | Paginated, server-side filters, row click navigates | Alerts, Devices, Work Orders |
| CRUD Table | Add/edit via dialog, delete with confirm | Sites Settings, Users, Gateways, Escalation Chains |
| Bulk Action Table | Checkbox column + BulkActionBar | Alerts (ack/resolve), Work Orders (assign) |
| Read-only Table | No actions, informational | CC Alerts, CC Devices, invoices |
| Stats + Table | Stats bar above table | Devices (site-scoped), CC Devices |

**Table column conventions:**
- Mono font: `dev_eui`, model codes, battery %, dates
- Badges: severity (red/orange/yellow), status (green/gray/red), priority (similar to severity), type (blue/purple)
- Relative time: "2 hours ago" format for last seen / triggered at
- Checkbox column: always first when present

### 7.3 Card Patterns

| Pattern | Description | Used In |
|---------|-------------|---------|
| StatCard | Icon + label + value + optional trend | Dashboard, Site Show, reports |
| SiteCard | Site summary for grid display | Dashboard, Sites Index |
| ZoneCard | Zone status with temp + progress | Site Show |
| ActionCard | Clickable count + label, navigates to filtered list | Dashboard "Needs Attention" |
| ModuleCard | Name + description + enable toggle | Modules Settings |
| ReportCard | Type + form controls + Generate button | Reports Index |

### 7.4 Form Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| `useValidatedForm` + Zod | Standard forms (recommended) | Inertia `useForm` wrapped with Zod schema |
| Inertia `useForm` (plain) | Simple forms, legacy | Direct `useForm` without schema |
| `form-rhf` (React Hook Form) | Complex multi-step forms | Import from `@/components/ui/form-rhf` |

**Current inconsistency:** Some pages use `useValidatedForm` + Zod while others use plain `useForm`. Standard should be `useValidatedForm` + Zod for all new forms.

### 7.5 Dialog Patterns

| Pattern | Description | Used In |
|---------|-------------|---------|
| `ConfirmationDialog` | Destructive action confirmation | Delete actions (most pages) |
| Form Dialog | Dialog containing a form | SiteForm, UserForm, WindowFormDialog |
| Info Dialog | Read-only content in dialog | Recovery codes, token display |

**Gap:** Some destructive actions use `window.confirm` instead of `ConfirmationDialog`:
- Notifications page (mark read, delete)
- Activity log

**Gap:** API key delete has no confirmation at all.

### 7.6 Loading States

| State | Implementation | Convention |
|-------|---------------|------------|
| Page skeleton | `*Skeleton` component exported from page | Rendered by Inertia suspense |
| Button loading | `Spinner` component inside button | Shown during `processing` state |
| Inline loading | `LoaderCircle` from lucide-react | **Inconsistency** — only used in forgot-password |

**Skeleton coverage (21 of 67 pages):**
- Has skeleton: Dashboard, Alerts Index, Site Show, Site Comparison, Site Timeline, Work Orders Index, Performance, Reports Index, Device Show
- **Missing skeleton (critical gaps):** Alert Show, Sites Index, Zone Detail, Site Audit, Work Order Show, Devices Index, all reports, all CC pages, all module dashboards, all settings pages

### 7.7 Empty States

| Type | Convention |
|------|-----------|
| No data at all | Illustration + message + CTA button (when applicable) |
| No results (filters active) | Message + "Clear filters" link |
| Conditional section empty | Inline text message (e.g., "No alerts") |

**Gap:** Sites Index has no empty state at all.

### 7.8 Navigation Conventions

- **Sidebar**: Primary navigation, collapsible, configured in `resources/js/config/navigation.ts`
- **Breadcrumbs**: Present on detail pages (via `BreadcrumbItem[]` prop)
- **Back button**: Present on detail views (Alert Show, Work Order Show)
- **Row click**: Tables navigate to detail view on row click
- **Card click**: Card grids navigate to detail view on card click
- **Links**: Inline text links for cross-references (device → alert, site → zone)

### 7.9 Toast & Flash Messages

- **Server-side flash**: Automatically displayed as Sonner toasts via `useFlashMessages` hook
- **Client-side toast**: `toast` from `sonner` for immediate feedback
- **Error handling**: `handleInertiaErrors` utility for standardized error toasts

### 7.10 Permission UI Pattern

| Approach | Description | Used In |
|----------|-------------|---------|
| Hide element | Button/action not rendered | Most CRUD actions |
| Disable element | Button rendered but disabled | "New Work Order" button |
| Hide page section | Entire card/section not rendered | Corrective actions (severity-gated) |
| Gate entire page | Redirect or 403 if no permission | Organization settings, Billing |

### 7.11 Chart Conventions

- **Library**: Recharts (AreaChart, BarChart, LineChart)
- **Period toggle**: Button group with preset options (24h/7d/30d or 30d/90d/365d)
- **Metric select**: Dropdown for multi-metric charts (Device Show)
- **Empty chart**: Text message centered in chart area
- **Responsive**: Charts fill container width

### 7.12 Badge System

| Badge Type | Colors | Used For |
|------------|--------|----------|
| Severity | red (critical), orange (high), yellow (medium), blue (low) | Alerts, work order priority |
| Status | green (active/online/resolved), gray (inactive/offline), red (critical), yellow (pending) | Devices, sites, alerts, work orders |
| Type | blue, purple, teal (varies) | Work order type, report type |
| Role | Per-role color | User management |

---

## 8. Cross-Cutting Issues

### 8.1 Duplicated Utilities (Extract to Shared)

| Utility | Duplicated In | Recommended Location |
|---------|--------------|---------------------|
| `formatTimeAgo()` | 6+ page files | `@/utils/formatters.ts` |
| `isOnline()` (15-min threshold) | 5+ page files | `@/utils/deviceHelpers.ts` |
| `formatMXN()` | 2 CC files | `@/utils/formatters.ts` |
| `KPICard` component | 4+ CC files | `@/components/ui/kpi-card.tsx` |
| `SeverityBadge` | Alerts + CC pages | `@/components/ui/severity-badge.tsx` |
| `StatusBadge` | Multiple pages | `@/components/ui/status-badge.tsx` |

### 8.2 Permission Gaps

| Page | Action | Current State | Required Fix |
|------|--------|--------------|-------------|
| Modules toggle | Toggle module on/off | No permission gate | Gate with Can "manage org settings" or new permission |
| Maintenance Windows | Suppress alerts toggle | No permission gate | Gate with Can "manage maintenance windows" |
| Report Schedules | Toggle enable + Delete | No permission gate | Gate with Can "manage report schedules" |
| Site Templates | Delete template | No permission gate | Gate with Can "manage sites" or new permission |
| Export Data | All actions | No permission checks | Gate with Can "export data" |
| API Keys | Delete | No confirmation dialog | Add ConfirmationDialog |
| Notifications | Delete actions | Uses window.confirm | Replace with ConfirmationDialog |
| Activity Log | Destructive actions | Uses window.confirm | Replace with ConfirmationDialog |

### 8.3 Missing Skeleton/Loading States

**Priority 1 (high-traffic pages):**
- Sites Index — no skeleton, no empty state
- Devices Index — no skeleton
- Alert Show — no skeleton
- Work Order Show — no skeleton

**Priority 2 (moderate traffic):**
- Zone Detail — no skeleton
- Site Audit — no skeleton
- Activity Log — no skeleton
- All report pages (Temperature, Energy, Summary)

**Priority 3 (lower traffic):**
- All CC pages — no skeletons
- All module dashboards — no skeletons
- Most settings pages — no skeletons

### 8.4 Confirmed Bugs

| # | Page | Bug | Severity |
|---|------|-----|----------|
| 1 | Energy Report | Duplicate "Export PDF" button rendered | Low |
| 2 | Alert Rule Show | No edit form — edit button from Alert Rules navigates here but only shows read-only detail | Medium |
| 3 | Billing Profiles | No edit/delete for existing profiles — can only create | Medium |
| 4 | IAQ Dashboard | Uses `window.location.search` — not SSR-safe | Medium |
| 5 | Industrial Dashboard | KPICard uses dynamic Tailwind classes (`text-${color}-500`) — won't survive CSS purge | Medium |
| 6 | CC Devices | No row click action — cannot drill down to individual device | Low |
| 7 | Welcome page | Orphaned Laravel boilerplate — unreachable, should be deleted | Low |

### 8.5 Design Inconsistencies

| # | Issue | Location | Standard |
|---|-------|----------|----------|
| 1 | `LoaderCircle` instead of `Spinner` | Forgot Password form | Use `Spinner` (all other auth forms do) |
| 2 | "Creating..." text instead of `Spinner` | Partner Portal create dialog | Use `Spinner` component |
| 3 | `Select` components aliased with abbreviated names | Report Schedules | Use consistent import aliases |
| 4 | Mixed form patterns (`useValidatedForm` vs plain `useForm`) | Various settings pages | Standardize on `useValidatedForm` + Zod |
| 5 | Report Schedules only captures 1 recipient | Report Schedules | Model supports array — UI should allow multiple |

### 8.6 Recommended Improvements

1. **Create shared utility module** — Extract all duplicated formatters and helpers (Section 8.1)
2. **Audit all permission gates** — Add missing gates per Section 8.2
3. **Add skeletons to high-traffic pages** — Prioritize per Section 8.3
4. **Fix confirmed bugs** — Address all 7 bugs in Section 8.4
5. **Standardize form pattern** — Migrate all forms to `useValidatedForm` + Zod
6. **Replace all window.confirm** — Use `ConfirmationDialog` component consistently
7. **Delete Welcome page** — Remove orphaned boilerplate
8. **Add Alert Rule edit form** — Currently read-only detail with no editing capability

---

> **Document generated:** 2026-03-23
> **Pages audited:** 67 (21 Core + 27 Settings + 8 Auth + 8 Command Center + 3 Modules)
> **Audit agents:** 3 parallel agents reading all page components
> **Cross-references:** SYSTEM_BEHAVIOR_SPEC.md, ASTREA_WORKFLOWS.md, ASTREA_FEATURE_SPECS.md
