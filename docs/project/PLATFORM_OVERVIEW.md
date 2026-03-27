# Astrea IoT Platform -- Visual Overview

> **Sensor to Decision in 60 seconds**

Platform Architecture Reference -- Generated 2026-03-26

## Hero Stats

| Metric | Value |
|--------|-------|
| Models | 45 |
| Pages | 78 |
| Routes | 243 |
| Roles | 7 |

### Tech Stack

Laravel 12, React 19, Inertia.js 2, TypeScript, Tailwind v4, shadcn/ui, Fortify Auth, Reverb WS, Spatie Permissions

---

## 1. Platform Overview

### What is Astrea?

Astrea is a multi-tenant IoT monitoring platform for cold-chain logistics, food safety, and industrial environments in Mexico. It ingests LoRaWAN sensor data in real time, evaluates alert rules, dispatches notifications across three channels, and generates COFEPRIS-compliant temperature reports.

The platform serves two distinct audiences: **Astrea staff** (super admins, support, account managers, technicians) who manage the infrastructure, and **client organizations** (org admins, site managers, site viewers) who monitor their own operations.

### Business Model

B2B SaaS sold per-site with tiered plans (Starter, Professional, Enterprise). Revenue driven by device count and module activations (Cold Chain, IAQ, Industrial). Billing module built but deactivated for MVP.

### Three Interfaces

| Interface | Description |
|-----------|-------------|
| **WhatsApp Bot** | Real-time alert delivery and acknowledgment via WhatsApp Business API. Serves store managers who don't use the web app. Webhook receiver in `routes/api.php`. |
| **Mobile App (iot-expo)** | React Native / Expo SDK 54 companion app. Technician-focused: work order management, device scanning, photo evidence, push notifications. 26 API endpoints via Sanctum. |
| **Web Platform (iot-hub)** | Full-featured SPA built with React + Inertia.js. Dashboards, analytics, reporting, device management, alert configuration, compliance workflows, command center, catalog management. 78 pages, all Inertia-rendered. |

---

## 2. User Roles

Seven roles across two ownership tiers. Astrea roles manage the platform; client roles monitor their own assets.

### Super Admin
- **Tier:** Astrea Internal
- **Persona:** Astrea platform administrator
- **Description:** Full access to all organizations, all sites, all features. Can switch org context, declare outages, manage partner portal, view command center. The only role that sees cross-org data.
- **Key Pages:** Command Center, Partner Portal, All Settings, All Dashboards, Org Switching

### Support
- **Tier:** Astrea Internal
- **Persona:** Astrea support team member
- **Description:** Views all client dashboards, alerts, and device health. Creates work orders. Cannot change settings or delete organizations. Triage role for incoming issues.
- **Key Pages:** Dashboard, Alerts, Devices, Work Orders, Sites

### Account Manager
- **Tier:** Astrea Internal
- **Persona:** Astrea account manager
- **Description:** Manages client relationships, org onboarding, and account health. Views client data for assigned organizations.
- **Key Pages:** Partner Portal, Dashboard, Sites, Reports

### Technician
- **Tier:** Astrea Internal
- **Persona:** Astrea field technician
- **Description:** Work order execution, device maintenance, sensor replacement, device calibration. Primary mobile app user. Sees alerts + work orders but no admin settings.
- **Key Pages:** Work Orders, Device Detail, Site Detail, Alerts, Mobile App

### Organization Admin (`client_org_admin`)
- **Tier:** Client
- **Persona:** Client operations director
- **Description:** Manages their org, all sites, users, settings, escalation chains, compliance, and reports. Full operational control within their organization boundary. Cannot see other orgs.
- **Key Pages:** Dashboard, All Sites, Settings, Users, Reports, Analytics

### Site Manager (`client_site_manager`)
- **Tier:** Client
- **Persona:** Client regional / site manager
- **Description:** Manages assigned sites, acknowledges alerts, creates work order requests, views reports for their sites. Can manage alert rules and escalation chains for assigned sites.
- **Key Pages:** Dashboard, My Sites, Alerts, Work Orders, Reports

### Site Viewer (`client_site_viewer`)
- **Tier:** Client
- **Persona:** Client site viewer
- **Description:** Read-only access to assigned sites. Views dashboards, alerts, and reports. Cannot modify any data.
- **Key Pages:** Dashboard, Alerts (read-only), Reports

---

## 3. Page Catalog

Eighteen key pages grouped by functional area. Each card describes purpose, layout pattern, data content, user actions, navigation context, and role access.

### Core Operations

---

### Dashboard (`/dashboard`)
**Layout:** Dashboard
**Purpose:** Primary landing page showing org-wide operational health at a glance with KPI stats, site cards with device health, and action prompts for unresolved items.
**Role Access:** all roles (viewer: alerts card only, technician: alerts + WOs)

**Content:**
- KPI row: total devices, online devices, active alerts, open work orders
- Action cards: unacknowledged alerts count, overdue work orders, critical battery count
- Site cards grid: per-site name, status badge, device count, online count, health percentage bar
- Map view toggle: Leaflet map showing sites by lat/lng with health markers

**Actions:**
| Action | Destination |
|--------|-------------|
| Toggle grid / map view | (in-page toggle) |
| Click site card | Site Detail (`/sites/{id}`) |
| Click action cards | Alerts Index (filtered) or Work Orders Index (filtered) |
| Site context switching | Header dropdown |

**Navigation:**
- **In:** Login (redirect), Sidebar > "Dashboard", Breadcrumb "Home"
- **Out:** Site Detail, Alerts Index (filtered), Work Orders Index (filtered)

---

### Alerts Index (`/alerts`)
**Layout:** Data Table
**Purpose:** Paginated, filterable table of all alerts across accessible sites with bulk operations and sidebar filter panel.
**Role Access:** all roles (bulk actions: site_manager+)

**Content:**
- DataTable columns: severity badge, status, device name, site, message, triggered time (relative)
- Pagination: current page, total count, next/prev links
- Filter sidebar: severity (critical/high/medium/low), status (active/acknowledged/resolved/dismissed), site dropdown, date range picker

**Actions:**
| Action | Destination |
|--------|-------------|
| Filter by severity, status, site, date range | (in-page filter) |
| Bulk select rows with checkboxes | (in-page selection) |
| Bulk acknowledge / bulk resolve | POST (bulk action) |
| Click row | Alert Detail (`/alerts/{id}`) |
| Toggle filter sidebar | (in-page toggle) |

**Navigation:**
- **In:** Sidebar > "Alerts", Dashboard action cards
- **Out:** Alert Detail (`/alerts/{id}`)

---

### Alert Detail (`/alerts/{id}`)
**Layout:** Detail View
**Purpose:** Full context for a single alert: timeline, notification delivery audit, corrective actions, snooze controls, and status management.
**Role Access:** all roles: view; acknowledge: site_manager+; corrective actions: site_manager+

**Content:**
- Alert header: ID, severity badge, status badge, message, triggered timestamp
- Alert data JSON: metric, value, threshold, device, zone, site
- Notification audit trail: channel (WhatsApp/Push/Email), delivery status, timestamps
- Corrective actions list: description, created by, verified status
- Snooze status: active/expired, expiration time

**Actions:**
| Action | Destination |
|--------|-------------|
| Acknowledge / Resolve / Dismiss alert | Status dropdown (POST) |
| Snooze alert (set duration) | Dialog |
| Add corrective action | Textarea form (POST) |
| Verify corrective action | POST |
| Navigate back | Alerts Index |

**Navigation:**
- **In:** Alerts Index row click, Site Detail active alerts, Device Detail alerts
- **Out:** Alerts Index (back), Device Detail (link), Site Detail (link)

---

### Sites Index (`/sites`)
**Layout:** Card Grid
**Purpose:** Card-based overview of all accessible sites showing device health percentage, alert counts, and status badges.
**Role Access:** all roles (scoped to accessible sites)

**Content:**
- Header: total sites count (mono)
- Per site card: name, status badge (active/onboarding/inactive), device count, online count, health % progress bar, active alert count with warning icon

**Actions:**
| Action | Destination |
|--------|-------------|
| Click site card | Site Detail (`/sites/{id}`) |

**Navigation:**
- **In:** Sidebar > "Sites"
- **Out:** Site Detail (`/sites/{id}`)

---

### Site Detail (`/sites/{id}`)
**Layout:** Dashboard
**Purpose:** Comprehensive single-site view: KPI stats, zone breakdown, active alerts, floor plan viewer, onboarding checklist, and work order requests.
**Role Access:** all roles with site access (WO creation: site_manager+)

**Content:**
- Site KPIs: total devices, online %, active alerts, open work orders
- Zone summary cards: zone name, device count, min/max/avg temperature, alert count
- Active alerts list: severity, message, device, time
- Floor plan viewer: uploaded plans with device pin overlays
- My work order requests list (for site managers)
- Onboarding checklist: gateway, devices, modules, escalation, reports

**Actions:**
| Action | Destination |
|--------|-------------|
| Click zone card | Zone Detail (`/sites/{id}/zones/{zone}`) |
| Click alert | Alert Detail (`/alerts/{id}`) |
| Create work order request | Dialog form (POST) |
| View floor plans with device positions | (in-page viewer) |

**Navigation:**
- **In:** Dashboard site card, Sites Index card, Breadcrumbs
- **Out:** Zone Detail (`/sites/{id}/zones/{zone}`), Alert Detail, Device Detail, Site Timeline, Audit Mode

---

### Zone Detail (`/sites/{id}/zones/{zone}`)
**Layout:** Detail View + Chart
**Purpose:** Deep dive into a single zone: device table with real-time readings, area chart showing historical metrics, and zone-level alert list.
**Role Access:** all roles with site access

**Content:**
- Zone header: zone name, site name, device count, online count
- Metric summary cards: per-metric min/max/avg/current
- Area chart: historical readings over selected period (24h/7d/30d)
- Device table: name, model, status, battery, signal, last reading value + time
- Zone alerts: active alerts for devices in this zone

**Actions:**
| Action | Destination |
|--------|-------------|
| Switch time period (24h / 7d / 30d) | (in-page toggle) |
| Click device row | Device Detail (`/devices/{id}`) |
| Navigate back | Site Detail (back button) |

**Navigation:**
- **In:** Site Detail zone card
- **Out:** Device Detail, Site Detail (back button)

---

### Devices & Work Orders

---

### Devices Index (`/devices`)
**Layout:** Data Table
**Purpose:** Paginated, searchable, filterable table of all devices across sites with status indicators and site association.
**Role Access:** all roles

**Content:**
- DataTable columns: name, model, site, zone, status badge, battery %, signal strength, last reading time
- Pagination with total count
- Filter sidebar: status (active/inactive), site dropdown, text search

**Actions:**
| Action | Destination |
|--------|-------------|
| Search by device name | (in-page filter) |
| Filter by status, site | (in-page filter) |
| Toggle filter sidebar | (in-page toggle) |
| Click row | Device Detail (`/devices/{id}`) |
| Paginate through results | (in-page pagination) |

**Navigation:**
- **In:** Sidebar > "Devices"
- **Out:** Device Detail (`/devices/{id}`)

---

### Device Detail (`/devices/{id}`)
**Layout:** Detail View + Chart
**Purpose:** Single device telemetry: live readings, historical line chart with reference lines, alert history, device metadata, and replacement workflow.
**Role Access:** all roles: view; replace: manage devices permission

**Content:**
- Header: device name, model, status badge, battery %, signal, site + zone breadcrumb
- Latest readings: per-metric value, unit, and timestamp
- Line chart: historical metric data with period selector (24h/7d/30d) and metric selector
- Alert history: recent alerts for this device
- Device metadata: DEV EUI, model, firmware, installed date

**Actions:**
| Action | Destination |
|--------|-------------|
| Switch chart period (24h/7d/30d) | (in-page toggle) |
| Switch metric (temperature, humidity, CO2, etc.) | (in-page selector) |
| Replace device | Dialog form (new DEV EUI, APP KEY, model) |
| Navigate back | Site Detail |

**Navigation:**
- **In:** Devices Index, Zone Detail device table, Site Detail floor plan, Alert Detail device link
- **Out:** Site Detail (back), Alert Detail

---

### Work Orders Index (`/work-orders`)
**Layout:** Data Table
**Purpose:** Paginated work order list with filter sidebar, bulk assignment, and technician workload visibility.
**Role Access:** site_manager+; technician: own WOs; bulk assign: super_admin

**Content:**
- DataTable columns: title, type, priority badge, status badge, assigned technician, site, created date
- Filter sidebar: status (open/assigned/in_progress/completed/cancelled), priority, type, assignee
- Technician workload panel: per-tech open count
- Pagination with total count

**Actions:**
| Action | Destination |
|--------|-------------|
| Filter by status, priority, type, assignee | (in-page filter) |
| Bulk select and bulk assign to technician | POST (bulk action) |
| Click row | Work Order Detail (`/work-orders/{id}`) |

**Navigation:**
- **In:** Sidebar > "Work Orders", Dashboard action cards
- **Out:** Work Order Detail (`/work-orders/{id}`)

---

### Work Order Detail (`/work-orders/{id}`)
**Layout:** Detail View
**Purpose:** Full work order lifecycle view: status progression, photo evidence, technician notes timeline, and contextual links to alert/device.
**Role Access:** technician+: status actions; all viewers: read-only

**Content:**
- Header: title, priority badge, status badge, WO number (mono), site name, created date
- Detail cards: description, type, assigned technician, related alert/device
- Photo gallery: uploaded before/after photos
- Notes timeline: chronological notes with author and timestamp

**Actions:**
| Action | Destination |
|--------|-------------|
| Advance status: Assign / Start / Complete / Cancel | POST (role-dependent) |
| Upload photos | File upload |
| Add text notes | POST |
| Navigate back | Work Orders Index |

**Navigation:**
- **In:** Work Orders Index row, Mobile app deep link
- **Out:** Work Orders Index (back), Alert Detail, Device Detail

---

### Configuration

---

### Alert Rules (`/sites/{id}/rules`)
**Layout:** Card List
**Purpose:** Per-site list of configured alert rules showing active/inactive status, severity, and rule count summary.
**Role Access:** manage alert rules permission

**Content:**
- Header: site name, total rules count, active rules count (mono)
- Rule cards: name, severity badge, type, active toggle switch, condition summary

**Actions:**
| Action | Destination |
|--------|-------------|
| Toggle rule active/inactive | Switch (POST) |
| Click "New Rule" | Rule Builder (`/sites/{id}/rules/create`) |
| Delete rule | Confirmation dialog (DELETE) |
| Click rule | Rule detail view |

**Navigation:**
- **In:** Site Detail settings, Alert Tuning "edit rule" link
- **Out:** Rule Builder (`/sites/{id}/rules/create`), Rule Detail, Rule Edit

---

### Rule Builder (`/sites/{id}/rules/create`)
**Layout:** Form
**Purpose:** Multi-condition alert rule creation form with device targeting, metric/threshold/duration configuration, and severity selection.
**Role Access:** manage alert rules permission

**Content:**
- Form fields: name, severity selector, type (simple), cooldown minutes, device selector
- Conditions builder: dynamic rows with metric, condition (above/below), threshold, duration, severity
- Available device list from site

**Actions:**
| Action | Destination |
|--------|-------------|
| Fill rule name, select severity | (form input) |
| Add/remove condition rows | (dynamic form) |
| Select target device | (dropdown) |
| Configure per-condition: metric, operator, threshold, duration, severity | (form inputs) |
| Submit form | POST (create rule) |

**Navigation:**
- **In:** Alert Rules "New Rule" button
- **Out:** Alert Rules (on success/back)

---

### Site Onboarding Wizard (`/sites/{id}/onboard`)
**Layout:** Wizard (Stepper)
**Purpose:** Five-step wizard to configure a new site: gateway registration, device provisioning, floor plan upload, module activation, and completion.
**Role Access:** manage sites + manage devices permissions

**Content:**
- Stepper progress: Gateway > Devices > Floor Plans > Modules > Complete
- Step 1 (Gateway): gateway form with EUI, name, ChirpStack integration status
- Step 2 (Devices): device table with add/edit, DEV EUI, APP KEY, model, zone, recipe selection
- Step 3 (Floor Plans): image upload with drag-and-drop
- Step 4 (Modules): toggle cards for available modules (Cold Chain, IAQ, Industrial) with segment suggestions
- Step 5 (Complete): success summary with next steps links

**Actions:**
| Action | Destination |
|--------|-------------|
| Navigate between wizard steps | (stepper navigation) |
| Register gateway | POST |
| Add devices | POST |
| Upload floor plans | File upload |
| Activate modules | POST |
| Complete onboarding | POST |

**Navigation:**
- **In:** Site settings "Onboard" link, Site Detail onboarding checklist
- **Out:** Site Detail (on completion)

---

### Command Center

---

### Command Center (`/command-center`)
**Layout:** Dashboard
**Purpose:** Cross-organization operations dashboard for Astrea super admins: global KPIs, per-org health summary, notification delivery health, and outage management.
**Role Access:** super_admin only

**Content:**
- Global KPIs: total orgs, total sites, total devices, online %, active alerts, open work orders
- Organization table: name, segment, plan, sites, devices, online %, active alerts
- Notification delivery health: WhatsApp/Push/Email sent/delivered/failed counts
- Active outage banner (if declared)
- Sub-pages: /alerts, /work-orders, /devices, /revenue, /dispatch

**Actions:**
| Action | Destination |
|--------|-------------|
| Declare / resolve platform outage | Dialog form (POST) |
| Click org row | Org Detail (`/command-center/{org}`) |
| Navigate to CC sub-pages | CC Alerts, CC Work Orders, CC Devices, CC Revenue, CC Dispatch |

**Navigation:**
- **In:** Sidebar > "Command Center" (super_admin only)
- **Out:** CC sub-pages, Org Detail

---

### Reports & Analytics

---

### Reports Hub (`/reports`)
**Layout:** Card Grid
**Purpose:** Report launcher with four report type cards (Temperature, Energy, Morning Summary, Device Inventory), site selector, and date range configuration.
**Role Access:** all roles

**Content:**
- Report type cards: title, icon, description, accent color, default date range
- Site selector dropdown
- Date range pickers (from/to)
- Reports: Temperature Compliance (COFEPRIS), Energy Consumption, Morning Summary, Device Inventory

**Actions:**
| Action | Destination |
|--------|-------------|
| Select a site | (dropdown) |
| Adjust date range | (date pickers) |
| Click report card | Report View (generate and navigate) |

**Navigation:**
- **In:** Sidebar > "Reports"
- **Out:** Temperature Report, Energy Report, Summary Report, Inventory Report

---

### Performance & SLA (`/analytics/performance`)
**Layout:** Dashboard
**Purpose:** SLA and KPI dashboard: alert resolution rates, average response time, device uptime percentages, and per-site compliance breakdown table.
**Role Access:** all roles

**Content:**
- Summary KPIs: total alerts, resolved %, avg response minutes, device uptime %, total/online devices
- Trend data: daily alert counts over selected period
- Site breakdown table: per-site alert count, compliance %, device uptime %
- Response time target indicator (15min SLA)

**Actions:**
| Action | Destination |
|--------|-------------|
| Switch period (30d / 90d / 365d) | (in-page toggle) |
| Download/export | (future) |

**Navigation:**
- **In:** Sidebar > "Performance"
- **Out:** (standalone analytics page)

---

### Alert Tuning (`/analytics/alerts`)
**Layout:** Dashboard
**Purpose:** Alert analytics with noise detection: dismissal rates, noisiest rules, resolution breakdowns, and AI-suggested tuning recommendations.
**Role Access:** view alert analytics permission

**Content:**
- Summary: total alerts, dismissal rate, avg response minutes, auto-resolved %
- Noisiest rules table: rule name, site, alert count, dismissal rate
- Resolution breakdown: auto/manual/work order/dismissed counts
- Suggested tuning: rules with high noise, weekly rate, suggestion text
- Trend chart: daily alert volume

**Actions:**
| Action | Destination |
|--------|-------------|
| Filter by days (30/90/365) | (in-page toggle) |
| Filter by site | (dropdown) |
| Click noisy rule | Alert Rule edit page |

**Navigation:**
- **In:** Sidebar > "Alert Tuning"
- **Out:** Alert Rule edit pages

---

### Settings & Administration

---

### Settings Pages (`/settings/*`)
**Layout:** Form / Data Table
**Purpose:** Thirteen settings sub-pages for platform configuration, user management, compliance, and operational setup.
**Role Access:** varies per sub-page (see below)

**Sub-Pages:**

| Page | URL | Description |
|------|-----|-------------|
| Profile | `/settings/profile` | Name, email, avatar, locale |
| Password | `/settings/password` | Change password |
| Two-Factor | `/settings/two-factor` | Enable/disable 2FA |
| Appearance | `/settings/appearance` | Light/dark/system theme |
| Organization | `/settings/organization` | Org name, logo, branding, timezone |
| Users | `/settings/users` | CRUD users, role assignment, deactivate/reactivate |
| Site Management | `/settings/sites` | CRUD sites, batch import |
| Escalation Chains | `/settings/escalation-chains` | Multi-step alert routing |
| Compliance | `/settings/compliance` | COFEPRIS compliance calendar |
| Maintenance Windows | `/settings/maintenance-windows` | Scheduled alert suppression |
| Report Schedules | `/settings/report-schedules` | Automated report delivery |
| Site Templates | `/settings/site-templates` | Reusable site configs |
| Data Export | `/settings/export-data` | CSV/JSON data export |

---

### Partner Portal (`/partner`)
**Layout:** Data Table + Form
**Purpose:** Super admin interface for managing client organizations: create new orgs, view org health, suspend/archive organizations.
**Role Access:** super_admin only

**Content:**
- Organization table: name, slug, segment, plan, site count, device count, status
- Create org dialog: name, segment, plan, contact info

**Actions:**
| Action | Destination |
|--------|-------------|
| Create new organization | Dialog form (POST) |
| Suspend / archive organization | POST |

**Navigation:**
- **In:** Sidebar > "Partner Portal" (super_admin only)
- **Out:** Organization detail

---

### Authentication

---

### Login (`/login`)
**Layout:** Auth Form
**Purpose:** Branded sign-in page using AuthLayout with email/password form, remember-me checkbox, and forgot-password link. Redirects to dashboard on success.
**Role Access:** unauthenticated users

**Content:**
- Form: email input, password input, remember me checkbox
- Branding: "Welcome back" heading, "Sign in to your Astrea IoT Platform account"
- Forgot password link (conditional on canResetPassword)
- Status flash message (for password reset confirmation, etc.)

**Auth Flow:**
- Login > (2FA Challenge if enabled) > Privacy Consent (if needed) > Dashboard
- Other auth pages: Register, Forgot Password, Reset Password, Verify Email, Confirm Password, 2FA Challenge

**Navigation:**
- **In:** `/` (root redirect), Session expiry
- **Out:** Dashboard (on success), Forgot Password, Register (if enabled)

---

## 4. Data Model

43 Eloquent models. Below are the key entities and their relationships powering the platform.

### Entities

#### Organization
- `id` (PK), name, slug
- segment, plan, status
- settings (JSON)
- logo, branding (JSON)
- timezone

#### User
- `id` (PK), name, email
- `organization_id` (FK)
- roles[], permissions[]
- site_ids[] (pivot)
- 2fa_secret, locale

#### Site
- `id` (PK), name
- `organization_id` (FK)
- status, timezone
- latitude, longitude
- settings (JSON)

#### Device
- `id` (PK), name, dev_eui
- `site_id` (FK), `gateway_id` (FK)
- model, zone, status
- battery_pct, signal_rssi
- last_reading_at

#### Gateway
- `id` (PK), name, eui
- `site_id` (FK)
- status, model
- last_seen_at

#### SensorReading
- `id` (PK)
- `device_id` (FK)
- metric, value, unit
- recorded_at

#### Alert
- `id` (PK)
- `device_id` (FK), `site_id` (FK)
- `rule_id` (FK)
- severity, status
- data (JSON), message

#### AlertRule
- `id` (PK)
- `site_id` (FK), `device_id` (FK)
- name, severity, type
- conditions (JSON)
- active, cooldown_min

#### WorkOrder
- `id` (PK), title
- `site_id` (FK), `alert_id` (FK)
- type, priority, status
- assigned_to, description
- notes[], photos[]

#### EscalationChain
- `id` (PK)
- `organization_id` (FK)
- name, steps (JSON)
- channels, delay_min

#### Recipe
- `id` (PK), name
- model, metrics (JSON)
- thresholds (JSON)
- calibration_config

#### Module
- `id` (PK), key, name
- description
- pivot: SiteModule (enabled, activated_at)

### Relationships

```
Organization --< has many  Site       --< has many  Device    --< has many  SensorReading
     |                        |                        |
     |-- has many User        |-- has many Gateway     |-- has many Alert
     |-- has many EscalChain  |-- has many AlertRule   |-- has many DeviceAnomaly
     |-- has many BillingProf |-- has many WorkOrder   |-- belongs to Gateway
     |-- has many DataExport  |-- has many FloorPlan
                              |-- many:many Module

User --< many:many Site  (pivot table -- site access)
User --< many:many Role  (Spatie Permission)
Alert --< has many CorrectiveAction
Alert --< has many AlertNotification (delivery audit)
Alert --< has one  AlertSnooze (per user)
```

---

## 5. Navigation Map

Sidebar groups, key user flows, and page-to-page connections.

### Sidebar Groups

#### Overview
| Item | URL |
|------|-----|
| Dashboard | `/dashboard` |
| Alerts | `/alerts` |
| Reports | `/reports` |
| Performance | `/analytics/performance` |
| Compare Sites | `/sites/compare` |

#### Operations
| Item | URL |
|------|-----|
| Work Orders | `/work-orders` |
| Command Center | `/command-center` |
| Partner Portal | `/partner` |

#### Catalogs
| Item | URL | Access |
|------|-----|--------|
| Organizations | `/settings/organizations` | super_admin |
| Sites | `/sites` | All |
| Users | `/settings/users` | manage users |
| Devices | `/devices` | All |
| Gateways | `/settings/gateways` | All |
| Recipes | `/recipes` | All |
| Modules | `/settings/modules-catalog` | super_admin |
| Sensor Models | `/settings/sensor-models` | super_admin |
| Segments | `/settings/segments` | super_admin |

#### Analytics
| Item | URL |
|------|-----|
| Alert Tuning | `/analytics/alerts` |
| Activity Log | `/activity-log` |

#### Administration
| Item | URL |
|------|-----|
| Organization | `/settings/organization` |
| Users | `/settings/users` |
| Site Mgmt | `/settings/sites` |
| Escalations | `/settings/escalation-chains` |
| Compliance | `/settings/compliance` |
| Maintenance | `/settings/maintenance-windows` |
| Report Sched. | `/settings/report-schedules` |
| Templates | `/settings/site-templates` |
| Data Export | `/settings/export-data` |

### Key User Flows

#### Alert Resolution Flow
```
Dashboard -> Alerts Index -> Alert Detail -> Acknowledge -> Add Corrective Action -> Resolve
```

#### Site Drill-Down Flow
```
Dashboard -> Site Detail -> Zone Detail -> Device Detail -> Chart / Readings
```

#### Work Order Lifecycle
```
Site Manager creates WO -> WO Index -> Assign Tech -> WO Detail -> Start -> Add Photos/Notes -> Complete
```

#### Site Onboarding Flow
```
Partner Portal -> Create Org -> Site Mgmt: Create Site -> Onboarding Wizard -> Gateway -> Devices -> Modules -> Site Detail
```

#### Catalog Chain
```
Segments -> Modules -> Recipes -> Sensor Models
(Industry verticals define which modules are relevant; modules contain recipes; recipes target sensor models)
```

#### Report Generation Flow
```
Reports Hub -> Select Site + Dates -> Report View -> Download PDF/CSV
```

---

## 6. Design Language

"Industrial Precision" -- the visual system powering every page of the Astrea platform.

### Color Palette

| Swatch | Name | Hex |
|--------|------|-----|
| Navy 900 | Dark background | `#0f172a` |
| Navy 800 | Card background (dark) | `#1e293b` |
| Navy 700 | Secondary dark | `#334155` |
| Navy 500 | Muted text | `#64748b` |
| Emerald | Primary accent | `#10b981` |
| Emerald Dark | CTA hover | `#059669` |

- **Primary accent:** `#10b981` emerald for CTAs, active states, KPI values
- **Navy spectrum** for backgrounds, text, borders
- **Semantic:** red for critical/destructive, amber for warnings, blue for info

### Typography

| Usage | Font | Notes |
|-------|------|-------|
| Display / Headings | Instrument Serif | `font-display` class for all page headings |
| Data / Code / Numbers | JetBrains Mono | `font-mono tabular-nums` for all numeric data, KPIs, counts |
| Body / UI | Inter (system) | Body text, labels, UI elements |

- Eyebrow pattern: 0.6875rem, semibold, uppercase, tracking-widest, muted

### Layout Patterns

- **Floating sidebar**: collapsible, persists via cookie state
- **Page header card**: rounded-xl, border, bg-dots overlay, shadow-elevation-1
- **ContentWithSidebar**: main content + collapsible filter panel (Alerts, Devices, WOs)
- **Card grid**: responsive grid with hover lift animation (Sites, Dashboard)
- **DataTable**: shadcn table with sorting, pagination, row selection
- **Stepper**: multi-step wizard with progress (Onboarding)
- **DetailCard**: labeled key-value pairs for detail views

### Animation

- **FadeIn** component: direction (down/up), duration (300-400ms), staggered delay
- Card hover: `-translate-y-0.5` + shadow-elevation-2
- Transitions: 200ms ease for all interactive elements
- Skeleton loaders for async data states
- EmptyState component for zero-data views

### Component System

- **90+ shadcn/ui** components in `components/ui/`
- Custom: StatCard, DetailCard, MetricCard, BulkActionBar, FilterToolbar, ConfirmationDialog
- Badge variants: outline-success, outline-warning, destructive, warning, info
- ButtonGroup for period selectors (24h/7d/30d)
- CircularProgress for health percentages
- FloorPlanView for interactive site maps

### Elevation & Spacing

- `shadow-elevation-1`: default card elevation (subtle)
- `shadow-elevation-2`: hover / focus state (medium)
- `border-border/50`: semi-transparent borders for layered feel
- Page padding: `p-4 md:p-6`
- Card padding: `p-5` to `p-6 md:p-8`
- Grid gaps: `gap-4` to `gap-6`
- Rounded corners: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for inner elements
