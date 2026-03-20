# Implementation Gap Report

> **Astrea IoT Platform** — Spec vs. Current Codebase Comparison
> Refreshed: 2026-03-19 | Phase 8 Validation (post-5b regeneration)
> Sources: SYSTEM_BEHAVIOR_SPEC.md, WORKFLOW_UX_DESIGN.md
> Previous report: 2026-03-19 (Phase 5b regeneration)

---

## Progress Since Last Report

**Previous report:** 2026-03-19 (Phase 5b) | **This report:** 2026-03-19 (Phase 8 validation)

| Metric | Previous | Current | Delta |
|---|---|---|---|
| Total gaps | 1 | 2 | +1 (new finding from Phase 8, immediately fixed) |
| SECURITY | 0 | 0 | — (alert auth gap found + fixed in this cycle) |
| CRITICAL | 0 | 0 | — |
| HIGH | 0 | 0 | — (SM-003 classified MEDIUM) |
| MEDIUM | 0 | 1 | +1 (SM-003 Invoice lacks canTransitionTo) |
| LOW | 0 | 0 | — |
| DEFERRED | 1 | 1 | 0 |

### Resolved This Cycle (Phase 8)
- **SECURITY: Alert action routes lacked backend authorization** — `AlertController::acknowledge/resolve/dismiss` had no `$this->authorize()` calls and routes had no permission middleware. Frontend `Can` component was the only guard. **FIXED**: Added `$this->authorize()` to all 3 controller methods + added `dismiss()` method to `AlertPolicy`. All 12 alert tests pass.
- **PARTIAL: Escalation Chain form not wired to useValidatedForm** — Last remaining form. **FIXED**: Wired `useValidatedForm(escalationChainSchema)` with `site_id` added to schema.

### Resolved in M6 Cycles 1-5 (recap)

**Backend (6/6 resolved):**
- BR-024: `billing:generate-invoices` → SCHEDULED (monthly 1st at 06:00)
- BR-027/SM-003: Invoice overdue transition → IMPLEMENTED (`MarkOverdueInvoicesCommand` daily at 00:30)
- BR-038/NT-006: `compliance:send-reminders` → SCHEDULED (daily at 07:00)
- SM-006: Compliance event overdue transition → IMPLEMENTED
- SM-001: Alert state transition guards → IMPLEMENTED (`canTransitionTo()` + controller try-catch)
- SM-002: WorkOrder state transition guards → IMPLEMENTED (`canTransitionTo()` + controller try-catch)
- `billing:sync-metering` → SCHEDULED (daily at 01:00)
- CC overdue count → FIXED (queries `status='overdue'` now)

**Frontend (28/28 resolved):**
- PM-001 role checks: `Can`/`HasRole` wrappers → IMPLEMENTED on alerts, work orders, 6 settings pages
- PM-001 nav visibility: Command Center → IMPLEMENTED via `requiredRole` filter in `NavMain`
- EmptyState: alerts index, work orders index, dashboard, sites/show, command-center, billing, compliance, gateways, devices settings, escalation chains → IMPLEMENTED
- Skeleton loading: 13 pages now have exported `*Skeleton` components
- VL-001 through VL-010: Zod schemas → CREATED in `utils/schemas.ts`
- `useValidatedForm` hook: Created (Inertia `useForm` + Zod pre-submit validation)
- 7 settings forms wired with `useValidatedForm` + Zod
- BR-014 defrost suppression: verified ALREADY COMPLETE

**Documentation (10/10 resolved):**
- EXTRA items: All 10 undocumented features added to SYSTEM_BEHAVIOR_SPEC.md (BR-051 through BR-054, NT-011, FloorPlan note, screen inventory)

---

## Backend Gap Report

### Business Rules (from Phase 5a)

All 54 business rules (BR-001 through BR-054) are IMPLEMENTED. No backend gaps.

| ID Range | Status | Notes |
|---|---|---|
| BR-001–009 | ✅ ALL IMPLEMENTED | Operational rules: MQTT, readings, device health |
| BR-010–020 | ✅ ALL IMPLEMENTED | Alert engine: evaluation, routing, escalation |
| BR-021–028 | ✅ ALL IMPLEMENTED | Financial: billing, invoicing, CFDI, exports |
| BR-029–033 | ✅ ALL IMPLEMENTED | Access & authorization: multi-tenant, RBAC |
| BR-034–039 | ✅ ALL IMPLEMENTED | Communications: summaries, compliance reminders |
| BR-040–046 | ✅ ALL IMPLEMENTED | Automation: defrost, baselines, recipes, webhooks |
| BR-047–050 | ✅ ALL IMPLEMENTED | Onboarding: wizard, requirements, subscriptions |
| BR-051–054 | ✅ ALL IMPLEMENTED | Segment analytics: door patterns, duty cycle, traffic, IAQ |

### State Machines (from Phase 5b-def)

| ID | Entity | States | Transitions | Guards | Gap |
|---|---|---|---|---|---|
| SM-001 | Alert | 4: active→ack'd→resolved/dismissed | ✅ | ✅ `canTransitionTo()` | NONE |
| SM-002 | Work Order | 5: open→assigned→in_progress→completed/cancelled | ✅ | ✅ `canTransitionTo()` | NONE |
| SM-003 | Invoice | 4: draft→sent→paid, sent→overdue→paid | ✅ | ✅ + `MarkOverdueInvoicesCommand` | NONE |
| SM-004 | Device | 3: pending→active↔offline | ✅ | ✅ | NONE |
| SM-005 | Site | 3: onboarding→active→archived | ✅ | ✅ | NONE |
| SM-006 | Compliance Event | 4: upcoming→overdue→completed, cancelled | ✅ | ✅ | NONE |
| SM-007 | Subscription | 3: active↔paused→cancelled | ✅ | — (pause/cancel not needed yet) | NONE |
| SM-008 | Defrost Schedule | 4: learning→detected→confirmed/manual | ✅ | ✅ | NONE |
| SM-009 | Gateway | 2: online↔offline | ✅ | ✅ | NONE |
| SM-010 | Alert Notification | 3: sent→delivered/failed | ✅ | ✅ | NONE |

### Permissions (from Phase 5c)

| Check | Status |
|---|---|
| 23 permissions seeded + 13 policies | ✅ NONE |
| Entity-level access (org, site, owner) | ✅ NONE |
| Multi-tenant middleware scoping | ✅ NONE |
| Frontend permission checks (`Can`/`HasRole`) | ✅ IMPLEMENTED (M6) |

### Notifications (from Phase 5d)

All 11 notification types (NT-001 through NT-011) are IMPLEMENTED. No gaps.

### Validations (from Phase 5e)

| Entity | Backend | Frontend | Gap |
|---|---|---|---|
| VL-001 through VL-010 | ✅ All 10 inline `$request->validate()` | ✅ Zod schemas in `utils/schemas.ts`; all 10 forms use `useValidatedForm` | NONE |

### Integrations (from Phase 5f)

All 8 integrations (INT-001 through INT-008) are IMPLEMENTED. No gaps.

### Scheduled Commands

| Command | Status |
|---|---|
| `CheckDeviceHealth` | ✅ every 5min |
| `SendMorningSummary` | ✅ every minute |
| `SendRegionalSummary` | ✅ every minute |
| `SendCorporateSummary` | ✅ daily 08:00 |
| `billing:generate-invoices` | ✅ monthly 1st 06:00 |
| `billing:sync-metering` | ✅ daily 01:00 |
| `MarkOverdueInvoicesCommand` | ✅ daily 00:30 |
| `compliance:send-reminders` | ✅ daily 07:00 |
| `notifications:send-digest --daily` | ✅ daily 08:00 |
| `notifications:send-digest --weekly` | ✅ Monday 09:00 |

---

## Frontend Gap Report

### Screen Inventory (from Phase 5b.3)

**All 60 spec'd screens exist.** No missing pages. 4 EXTRA pages previously identified are now documented in the screen inventory.

### Deep Per-Page Audit (Step 2 — 5b.7 Format)

Each screen's `.tsx` file was READ and verified element-by-element against the spec in WORKFLOW_UX_DESIGN.md Section 4. High-traffic screens (3+ workflows) audited first, then grouped by feature area.

**Legend:** ✅ matches spec | ⚠️ exists but different | ❌ MISSING

---

#### Dashboard (`pages/dashboard.tsx`) — HIGH TRAFFIC

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (4) | Total Devices, Online, Active Alerts, Open WOs | 4 cards with Cpu/Signal/AlertTriangle/Wrench icons + accent colors | ✅ |
| Fleet Health | Progress bar, success >80% | Progress bar with dynamic variant | ✅ |
| Site Grid | Cards with name, status badge, device/online count, health bar | Clickable cards in responsive grid (1→2→3 cols) | ✅ |
| Site Map | Leaflet with color-coded markers | Leaflet + OpenStreetMap tiles, green/amber/gray markers | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| View site (card) | Site card → `/sites/{id}` | `router.get` on card click | ✅ |
| View site (map) | Marker → `/sites/{id}` | Marker click handler | ✅ |
| Toggle view | Grid/Map buttons | Mutually exclusive buttons, conditional on sites > 0 | ✅ |
| Go to sites (empty) | "Go to Sites" → `/settings/sites` | EmptyState CTA button | ✅ |

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Data scope | Server-scoped via `accessible_sites` | Backend middleware filters | ✅ |
| CC link | super_admin only | `requiredRole` filter in NavMain | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | DashboardSkeleton | Exported `DashboardSkeleton` component | ✅ |
| Empty (no sites) | EmptyState + MapPin | `EmptyState` with MapPin icon + CTA | ✅ |
| Populated (grid) | KPIs + site cards | Full layout | ✅ |
| Populated (map) | KPIs + Leaflet | Leaflet dynamic load | ✅ |

**UX PATTERNS:**
| Pattern | Convention | Code Has | Status |
|---|---|---|---|
| Navigation | Inertia router | `router.get()` | ✅ |
| Loading | Skeleton | Exported Skeleton component | ✅ |
| Empty state | EmptyState + CTA | Component with icon + button | ✅ |

---

#### Site Detail (`pages/sites/show.tsx`) — HIGH TRAFFIC

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (5) | Devices, Online, Offline, Active Alerts, Low Battery | 5 cards with icons + accent colors | ✅ |
| Fleet Health | Progress bar, 3 variants | success >80%, warning >50%, destructive otherwise | ✅ |
| Floor Plans | FloorPlanView with overlays | Conditional section with device overlays | ✅ |
| Zones Grid | Zone cards with temp, health bar | 1→2 col grid, temp summary per zone | ✅ |
| Active Alerts (sidebar) | Alert cards, severity dot, clickable | 320px sidebar on lg, hover:bg-muted/50 | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| View zone | Card click → `/sites/{id}/zones/{zone}` | URL-encoded zone name | ✅ |
| Summary report | Button → `/sites/{id}/reports/summary` | Link button | ✅ |
| Temp report | Button → `/sites/{id}/reports/temperature` | Link button | ✅ |
| View alert | Card click → `/alerts/{id}` | Clickable cards | ✅ |
| Manage devices (empty) | CTA → `/sites/{id}/devices` | EmptyState button | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | SiteShowSkeleton | Exported `SiteShowSkeleton` | ✅ |
| Empty (no devices) | EmptyState + Cpu + "Manage Devices" | EmptyState with CTA | ✅ |
| Empty (no alerts) | Green Signal + "All clear" | Signal icon + message | ✅ |
| Onboarding | "Setup incomplete" banner | Conditional banner | ✅ |

---

#### Device Detail (`pages/devices/show.tsx`) — HIGH TRAFFIC

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Header | Name, model badge, status badge, dev_eui (mono) | All present | ✅ |
| Quick Stats (4) | Battery, Signal, Last Seen, Alerts | 2→4 col grid with dynamic icons | ✅ |
| Period/Metric Controls | 24h/7d/30d + metric dropdown | Card with flex row, Select component | ✅ |
| Device Chart | LineChart with gradient + reference lines | Recharts, 300px height, min/avg/max refs | ✅ |
| Latest Readings | Per-metric cards | 2→3 col grid | ✅ |
| Device Info (sidebar) | Model, Zone, Gateway, Recipe, Installed | 300px sidebar card | ✅ |
| Alert History (sidebar) | Severity dot, rule name, time, status | Clickable items → `/alerts/{id}` | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | DeviceShowSkeleton | Exported `DeviceShowSkeleton` | ✅ |
| No chart data | "No readings for this period" | Centered message in chart area | ✅ |
| No alerts | "No alerts" in sidebar | Message in history card | ✅ |

---

#### Command Center (`pages/command-center/index.tsx`) — HIGH TRAFFIC

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (6) | Orgs, Sites, Devices, Online, Alerts, WOs | 6 cards with accent colors | ✅ |
| Platform Health | Progress bar | success >80%, warning otherwise | ✅ |
| Quick Nav (3 buttons) | Alert Queue, Work Orders, Device Health | 3 outline buttons | ✅ |
| Orgs Table | Name, Segment, Plan, Sites, Devices, Online, Alerts | 7-column table | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | CommandCenterSkeleton | Exported skeleton | ✅ |
| Empty | "No organizations" | EmptyState | ✅ |

---

#### Notifications (`pages/notifications.tsx`) — HIGH TRAFFIC

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Header | Total count, unread count | Conditional subtitle | ✅ |
| Filter | Dropdown (All/Unread/Read) | Select with CardDescription | ✅ |
| Grouped list | Notifications by date | `groupNotificationsByDate` utility | ✅ |
| Pagination | Previous/Next + page indicator | Conditional (last_page > 1) | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Mark all read | CheckCheck button, unreadCount > 0 | Conditional button | ✅ |
| Delete read | Trash2 + confirm dialog | ConfirmationDialog | ✅ |
| Filter | Dropdown → `/notifications?filter=X` | `handleFilterChange` with router.get | ✅ |
| Pagination | Prev/Next with page params | Disabled state handling | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Empty (all) | "No notifications" | Centered message | ✅ |
| Empty (unread) | "No unread notifications" | Filter-specific message | ✅ |
| Empty (read) | "No read notifications" | Filter-specific message | ✅ |

---

#### Alerts Index (`pages/alerts/index.tsx`)

**CONTENT (Table Columns):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Severity | Badge with icon | Badge + ShieldAlert/AlertTriangle/Bell icons | ✅ |
| Alert | data.rule_name | Text with fallback "Alert #{id}" | ✅ |
| Device | device_name + zone | Text + zone subtitle | ✅ |
| Reading | metric: value / threshold | Monospace format | ✅ |
| Status | Badge (4 variants) | active=destructive, ack=warning, resolved=success, dismissed=outline | ✅ |
| Time | Relative (formatTimeAgo) | "Xm", "Xh", "Xd" format | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Acknowledge | Eye icon, status=active | `Can permission="acknowledge alerts"` + POST | ✅ |
| Resolve | CheckCircle2, active/ack'd | `Can permission="acknowledge alerts"` + POST | ✅ |
| Dismiss | XCircle, active/ack'd | `Can permission="manage alert rules"` + POST | ✅ |
| Row click | → `/alerts/{id}` | router.get on row | ✅ |

**TABS/FILTERS:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Severity dropdown | All/Critical/High/Medium/Low | Select with 5 options | ✅ |
| Status dropdown | Active+Ack/Active/Ack'd/Resolved/Dismissed | Select with 5 options | ✅ |
| Date range | From/To + Apply button | Date inputs + applyDateFilter() | ✅ |

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Acknowledge button | `Can` guarded | `<Can permission="acknowledge alerts">` | ✅ |
| Resolve button | `Can` guarded | `<Can permission="acknowledge alerts">` | ✅ |
| Dismiss button | `Can` guarded | `<Can permission="manage alert rules">` | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | AlertIndexSkeleton | Exported skeleton with 6 rows | ✅ |
| Empty (no alerts) | CheckCircle2 + "All clear" | EmptyState emerald icon | ✅ |
| Empty (filtered) | "No alerts match" + Clear | EmptyState with "Clear filters" | ✅ |
| Critical highlight | Red-50 background | Conditional row className | ✅ |

**UX PATTERNS:**
| Pattern | Convention | Code Has | Status |
|---|---|---|---|
| Status actions | Inline buttons | Icon buttons per row | ✅ |
| Success feedback | Toast | Inertia flash → Sonner | ✅ |

---

#### Alert Detail (`pages/alerts/show.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Header | Title, severity badge, status badge, triggered datetime | All present | ✅ |
| Trigger Details | Device+model, Zone, Metric+condition, Value (2xl bold) | 4-section grid with tabular-nums | ✅ |
| Notification Log | Channel icon, user, channel, time, status badge | Conditional section with icon mapping | ✅ |
| Timeline (sidebar) | Triggered→Ack'd→Resolved/Dismissed | Vertical timeline, color-coded dots, pending states | ✅ |
| Quick Details (sidebar) | ID, Severity, Site, Rule, Resolution type | Key-value card | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Acknowledge | Eye outline, status=active | `Can permission="acknowledge alerts"` | ✅ |
| Resolve | CheckCircle2 primary, active/ack'd | `Can permission="acknowledge alerts"` | ✅ |
| Back | ArrowLeft → `/alerts` | Ghost button | ✅ |

---

#### Work Orders Index (`pages/work-orders/index.tsx`)

**CONTENT (Table Columns):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Title | Text, font-medium | ✅ present | ✅ |
| Type | Badge, underscores replaced | Badge with .replace() | ✅ |
| Priority | Badge (urgent=destructive, high=warning, medium=info, low=outline) | Color-mapped badges | ✅ |
| Status | Badge (5 variants) | Color-mapped badges | ✅ |
| Assigned To | Name or "—" | Conditional text | ✅ |
| Site | Name or "—" | Conditional text | ✅ |
| Created | Date (localized) | toLocaleDateString() | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Create WO | Plus button, `Can` guarded | `<Can permission="manage work orders">` | ✅ |
| Row click | → `/work-orders/{id}` | router.get on row | ✅ |
| My WOs toggle | Outline/Default toggle | Button variant swap, assigned=me param | ✅ |

**TABS/FILTERS:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Status dropdown | 6 options | Select with All/Open/Assigned/InProgress/Completed/Cancelled | ✅ |
| Priority dropdown | 5 options | Select with All/Urgent/High/Medium/Low | ✅ |
| Type dropdown | 6 options | Select with All + 5 types | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | WorkOrderIndexSkeleton | Exported skeleton with 6 rows | ✅ |
| Empty (no WOs) | Wrench + "No work orders yet" | EmptyState | ✅ |
| Empty (filtered) | "No work orders match" + Clear | EmptyState with action | ✅ |

---

#### Work Order Detail (`pages/work-orders/show.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Header | Title, Priority badge, Status badge, meta | All present | ✅ |
| Details Card | Type, Device, Assigned, Created by, Alert ID, Description | Key-value pairs with border-top for description | ✅ |
| Photos | 2→3 col grid, aspect-square, caption overlay | Grid with captions at bottom | ✅ |
| Notes | User name + timestamp + text, input form | Chronological list + form | ✅ |
| Timeline (sidebar) | Created→Assigned→Started→Completed/Cancelled | Vertical timeline, color-coded dots | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Assign | User outline, status=open | `Can permission="manage work orders"` + PUT | ✅ |
| Start | Play default, status=assigned | `Can permission="complete work orders"` + PUT | ✅ |
| Complete | CheckCircle2 default, status=in_progress | `Can permission="complete work orders"` + PUT | ✅ |
| Cancel | XCircle ghost, status ≠ completed/cancelled | `Can permission="manage work orders"` + PUT | ✅ |
| Upload photo | Upload outline | POST FormData, conditional on status | ✅ |
| Add note | Text input + Send | POST, disabled while processing | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| No photos | "No photos yet" | Conditional message | ✅ |
| Status-driven actions | Different buttons per status | Conditional rendering per status | ✅ |

---

#### Zone Detail (`pages/sites/zone.tsx`)

**CONTENT (Table Columns — Devices):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Device | Name + online indicator dot | Emerald/zinc dot | ✅ |
| Model | Badge (outline, mono, xs) | Badge component | ✅ |
| Status | StatusBadge (5 variants) | StatusBadge component | ✅ |
| Battery | Icon + %, color thresholds | Dynamic icon, red<20/amber<40/emerald | ✅ |
| Signal | Icon + dBm, strength tiers | Dynamic icon, Signal/Med/Low | ✅ |
| Last Seen | Time ago or "—" | formatTimeAgo utility | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Period buttons | 24h/7d/30d | router.get with period param | ✅ |
| Device row click | → `/devices/{id}` | router.get on row | ✅ |
| Alert card click | → `/alerts/{id}` | Clickable cards | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| No chart data | "No readings for this period" | Centered message | ✅ |
| No alerts | "No alerts for this zone" | Empty card message | ✅ |

---

#### Reports Index (`pages/reports/index.tsx`)

**CONTENT (Form Fields per Card):**
| Field | Spec Says | Code Has | Status |
|---|---|---|---|
| Site selector | Required select | Select with validation error | ✅ |
| From date | Date input, defaults by type | type="date", week/month defaults | ✅ |
| To date | Date input, default today | type="date" | ✅ |
| Generate button | Primary with arrow | Button with router.get | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | ReportsIndexSkeleton | Exported skeleton, 3 cards | ✅ |
| Empty (no sites) | BarChart + "No sites available" | EmptyState | ✅ |

---

#### Temperature Report (`pages/reports/temperature.tsx`)

**CONTENT (Device Table):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Device | Text | Device name | ✅ |
| Readings | Number (tabular-nums) | tabular-nums class | ✅ |
| Min/Avg/Max °C | Decimal 1 place | .toFixed(1) | ✅ |
| Excursions | Badge (success/destructive) | "None" or count badge | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Change date range | From/To + Generate | router.get with params | ✅ |
| Export PDF | Outline button → download | New tab download link | ✅ |

---

#### Energy Report (`pages/reports/energy.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (4) | kWh, Cost, Avg Daily, Baseline | Icons + toLocaleString format | ✅ |
| Daily chart | Area, dual Y-axes, avg line | Recharts AreaChart + ComposedChart | ✅ |
| Per Device table (6 cols) | Device, Zone, kWh, Avg Daily, Peak, Readings | All present with tabular-nums | ✅ |
| Daily Totals table (3 cols) | Date, kWh, Cost | Conditional section | ✅ |

---

#### Summary Report (`pages/reports/summary.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Fleet Health | Progress bar, 3 variants | Dynamic variant by threshold | ✅ |
| Stats Grid (4) | Devices, Online, Offline, Low Battery | Icon + accent color cards | ✅ |
| Alerts Grid (2) | 24h alerts, Active alerts | Card grid | ✅ |
| Zone Status | Temp avg/min/max + status badge | Cards with OK/Warning/Critical | ✅ |

---

#### IAQ Module (`pages/modules/iaq.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Overall Score | Circular badge, 4 color tiers | 24×24 badge with score + label | ✅ |
| Zone Cards | Per-metric status dots (CO2, Temp, Humidity, TVOC) | 3-col grid, emerald/amber/red dots | ✅ |
| Trend Chart | CO2 (red), Temp (blue), Humidity (green) | LineChart, 3 series | ✅ |

---

#### Industrial Module (`pages/modules/industrial.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (4) | Devices, Vibration Alerts, Duty Cycle, Pressure | Card grid with icons | ✅ |
| Equipment Grid | Per-device metrics + duty cycle bar | Cards with progress bars | ✅ |
| Compressor Health (4 cols) | Device, Duty Cycle, Degradation, Status | Table with color-coded values | ✅ |
| Trends Chart | Vibration, Current, Pressure | LineChart, 3 series | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Empty | "No industrial devices" | EmptyState | ✅ |
| No chart data | "No data for selected period" | Conditional message | ✅ |

---

#### CC Alerts (`pages/command-center/alerts.tsx`)

**CONTENT (6 cols):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Severity/Alert/Site/Device/Status/Triggered | Per spec | All present with badges + icons | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Empty | CheckCircle + "No unresolved alerts" | EmptyState | ✅ |
| Critical highlight | Red-50 row background | Conditional className | ✅ |

---

#### CC Devices (`pages/command-center/devices.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (4) | Total, Online, Offline, Low Battery | Card grid with accents | ✅ |
| Devices Table (6 cols) | Device, Model, Site, Status, Battery, Last Seen | Table with dynamic icons | ✅ |

---

#### CC Work Orders (`pages/command-center/work-orders.tsx`)

**CONTENT (7 cols):**
All columns match spec. Row click → `/work-orders/{id}` | ✅

---

#### CC Revenue (`pages/command-center/revenue.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| KPI Cards (4) | MRR, Subscriptions, Collection Rate, Overdue | Green/emerald/amber/red accents | ✅ |
| MRR by Segment | Bar chart, segment colors | Recharts BarChart, 5 colors | ✅ |
| Revenue Trend | 12-month area chart | AreaChart with gradient | ✅ |
| Top Orgs Table (3 cols) | Name, Segment, MRR | Row click → CC Org Detail | ✅ |

---

#### CC Dispatch (`pages/command-center/dispatch.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| WO List (left) | Cards with priority/type/title/site/assign | Scrollable list, amber border for unassigned | ✅ |
| Map (right) | Leaflet, Mexico center, red/gray markers | Dynamic Leaflet with popups | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Assign technician | Select dropdown per WO | POST with assigned_to | ✅ |
| Filter unassigned | Toggle button | Variant swap, null filter | ✅ |

---

#### CC Org Detail (`pages/command-center/show.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Header | Name, segment, plan, MRR | Badges + formatted MRR | ✅ |
| Sites Table (5 cols) | Name, Status, Devices, Online, Alerts | Row click → `/sites/{id}` | ✅ |
| Alerts sidebar | Severity, device, site, time | 320px card | ✅ |
| Activity sidebar | Description, causer, time | 320px card | ✅ |

---

#### Partner Portal (`pages/partner/index.tsx`)

**CONTENT (Table 6 cols):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Name + avatar/Slug/Segment/Plan/Sites/Status | Per spec | All present with badges | ✅ |

**CONTENT (Form Fields — Create Dialog 6 fields):**
| Field | Spec Says | Code Has | Status |
|---|---|---|---|
| name/slug/segment/plan/timezone/opening_hour | Per spec | Auto-slug, selects, defaults | ✅ |

---

#### Site Onboarding (`pages/settings/sites/onboard.tsx`)

**CONTENT (Form Fields — per step):**
| Step | Spec Says | Code Has | Status |
|---|---|---|---|
| Step 1: Gateway | model select, serial text, is_addon switch | UG65/UG67/UG56 options, placeholder | ✅ |
| Step 2: Devices | model/dev_eui/name/zone/recipe per row | Batch form, filtered recipes by model | ✅ |
| Step 3: Floor Plans | name/floor_number/image | File upload with accept: image/* | ✅ |
| Step 4: Modules | Toggle buttons with suggestions | Pre-selected suggested + active | ✅ |
| Step 5: Complete | Summary checklist | Progress badges (Done/Optional/Pending) | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| ChirpStack warning | Amber alert | Conditional banner | ✅ |
| Provisioning | Spinner + "Registering..." | Form processing state | ✅ |

---

#### Settings: Sites (`pages/settings/sites/index.tsx`)

**CONTENT (Table 6 cols + Form 7 fields):**
All columns and form fields match spec. | ✅

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Create/Edit/Delete | `Can permission="manage sites"` | `<Can>` wrapper | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Empty | EmptyState + MapPin | Component present | ✅ |

**UX PATTERNS:**
| Pattern | Convention | Code Has | Status |
|---|---|---|---|
| Delete | ConfirmationDialog | ConfirmationDialog component | ✅ |
| Validation | Zod + useValidatedForm | useValidatedForm(siteSchema) | ✅ |

---

#### Settings: Gateways (`pages/settings/gateways/index.tsx`)

**CONTENT (Table 5 cols + Form 3 fields):**
All columns and fields match spec. | ✅

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | GatewaysSkeleton | Exported skeleton, 4 rows | ✅ |
| Empty | EmptyState + Router | Component present | ✅ |

---

#### Settings: Gateway Detail (`pages/settings/gateways/show.tsx`)

**CONTENT (Connected Devices Table 5 cols):**
All columns match spec. Device rows clickable. | ✅

---

#### Settings: Devices (`pages/settings/devices/index.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Stats Cards (4) | Total, Online, Offline, Low Battery | Mini-card grid with accents | ✅ |
| Filter Bar | Search + Status + Zone dropdowns | Card with flex row | ✅ |
| Device Table (8 cols) | All per spec | DevEUI hidden on mobile, RSSI hidden on lg | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | DevicesIndexSkeleton | Exported skeleton with all sections | ✅ |
| Empty | EmptyState + Cpu | Component present | ✅ |

---

#### Settings: Device Detail (`pages/settings/devices/show.tsx`)

**CONTENT:**
All info cards, gateway card, recipe card, and details sidebar match spec. | ✅

---

#### Settings: Alert Rules (`pages/settings/rules/index.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Rule Cards | Name, severity badge, type badge, conditions preview, device, cooldown, active toggle | Grid (1→2→3 cols), first 3 conditions + "+X more" | ✅ |

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| New/Edit/Delete/Toggle | `Can permission="manage alert rules"` | `<Can>` wrapper | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Empty | EmptyState + Settings2 + "Create First Rule" | Component with action | ✅ |

---

#### Settings: Rule Detail (`pages/settings/rules/show.tsx`)

**CONTENT (Conditions Table 5 cols):**
All columns match spec. Associated device card conditional + clickable. | ✅

---

#### Settings: Escalation Chains (`pages/settings/escalation-chains/index.tsx`)

**CONTENT (Table 5 cols + Form with dynamic levels):**
All columns and form fields match spec. Level builder with delay, channels, users. | ✅

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Create/Edit/Delete | `Can permission="manage alert rules"` | `<Can>` wrapper | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | EscalationChainsSkeleton | Exported skeleton, 4 rows | ✅ |
| Empty | EmptyState + GitBranch | Component present | ✅ |

**UX PATTERNS:**
| Pattern | Convention | Code Has | Status |
|---|---|---|---|
| Delete | ConfirmationDialog | ConfirmationDialog with warning | ✅ |
| Validation | Zod + useValidatedForm | useValidatedForm(escalationChainSchema) | ✅ |

---

#### Settings: Recipes (`pages/settings/recipes/index.tsx`)

**CONTENT:**
Recipe cards grouped by module. Name, sensor_model badge, description, rules count. | ✅

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Empty | EmptyState + FlaskConical | Component present | ✅ |

---

#### Settings: Recipe Detail (`pages/settings/recipes/show.tsx`)

**CONTENT (Default Rules Table 5 cols + Override Editor):**
All columns match. Override section conditional on editable + sites. | ✅

---

#### Settings: Users (`pages/settings/users/index.tsx`)

**CONTENT (Table 5 cols + Form 8 fields):**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Table | Name, Email, Role badge, Sites (2+count), App Access badge | All present | ✅ |
| Form | name/email/phone/whatsapp/password/role/sites/app_access | All fields with useValidatedForm(userSchema) | ✅ |

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Add/Edit/Delete | `Can permission="manage users"` | `<Can>` wrapper | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | UsersIndexSkeleton | Exported skeleton, 6 rows | ✅ |
| Empty | "No users" in table | Centered message | ✅ |

---

#### Settings: Organization (`pages/settings/organization.tsx`)

**CONTENT (Form 8 fields):**
All fields match spec. Color pickers + hex inputs, logo preview. | ✅

**UX PATTERNS:**
| Pattern | Convention | Code Has | Status |
|---|---|---|---|
| Validation | Zod + useValidatedForm | useValidatedForm(organizationSettingsSchema) | ✅ |
| Success | "Saved" animation | Transition component | ✅ |

---

#### Settings: Billing (`pages/settings/billing/index.tsx`)

**CONTENT (Invoice Table 6 cols):**
| Column | Spec Says | Code Has | Status |
|---|---|---|---|
| Period/Subtotal/IVA/Total/Status/CFDI | Per spec | tabular-nums, status badges, UUID truncated | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | BillingSkeleton | Exported skeleton | ✅ |
| No subscription | EmptyState + CreditCard | "No active subscription" | ✅ |
| No invoices | EmptyState in table | FileText + "No invoices yet" | ✅ |

---

#### Settings: Billing Profiles (`pages/settings/billing/profiles.tsx`)

**CONTENT (Form 6 fields):**
| Field | Spec Says | Code Has | Status |
|---|---|---|---|
| name/rfc/razon_social/regimen_fiscal/uso_cfdi/email | Per spec | RFC monospace+uppercase, 2-col spans | ✅ |

**UX PATTERNS:**
| Pattern | Convention | Code Has | Status |
|---|---|---|---|
| Validation | Zod + useValidatedForm | useValidatedForm(billingProfileSchema) | ✅ |

---

#### Settings: Compliance (`pages/settings/compliance/index.tsx`)

**CONTENT (Form 5 fields + Event Cards):**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Event cards | Type badge, title, site, due date, days-until (color-coded), status badge | Grouped by month, red/amber/emerald days | ✅ |
| Form | title/type/site/due_date/description | useValidatedForm(complianceEventSchema) | ✅ |
| Filters | Site/Type/Status dropdowns | 3 select components | ✅ |

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Add/Complete/Edit/Delete | `Can permission="manage org settings"` | `<Can>` wrapper | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | ComplianceSkeleton | Exported skeleton | ✅ |
| Empty | EmptyState + CalendarCheck | Component present | ✅ |

---

#### Settings: Modules (`pages/settings/modules.tsx`)

**CONTENT:**
Module cards with emoji, name, active badge, description, recipe badges (4+count). Inactive at opacity-60. | ✅

---

#### Settings: API Keys (`pages/settings/api-keys.tsx`)

**CONTENT (Form 2 fields + Key Table):**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Form | name + rate_limit | useValidatedForm(apiKeySchema) | ✅ |
| Table | Name, Key prefix, Permissions (3+count), Rate, Last used, Active | All present | ✅ |
| New key display | Green card, one-time | Highlighted card | ✅ |

**ROLE DIFFERENCES:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Create/Delete | `Can permission="manage org settings"` | `<Can>` wrapper via route middleware | ✅ |

---

#### Settings: Integrations (`pages/settings/integrations.tsx`)

**CONTENT:**
SAP + CONTPAQi cards. Toggle switch, schedule cron input, last export. Active/inactive opacity. | ✅

---

#### Settings: Profile (`pages/settings/profile.tsx`)

**CONTENT (Form 2 fields):**
Name + Email, delete account section, email verification status. | ✅

---

#### Settings: Password (`pages/settings/password.tsx`)

**CONTENT (Form 3 fields):**
current_password + password + confirmation. Focus management via refs. | ✅

---

#### Settings: Appearance (`pages/settings/appearance.tsx`)

Delegated to AppearanceTabs. Light/Dark/System. | ✅

---

#### Settings: Two-Factor (`pages/settings/two-factor.tsx`)

**CONTENT:**
Status badge, QR code (setup modal), recovery codes. Enable/Continue/Disable buttons. | ✅

---

#### Activity Log (`pages/activity-log.tsx`)

**CONTENT:**
| Element | Spec Says | Code Has | Status |
|---|---|---|---|
| Timeline | Events grouped by date (Today=amber, Yesterday=sky) | Grouped sections with highlights | ✅ |
| Event details | Avatar, type badge, description, timestamp, model ref, changes | Expandable accordion with old→new values | ✅ |

**ACTIONS:**
| Action | Spec Says | Code Has | Status |
|---|---|---|---|
| Filter events | Dropdown (6 types) | Select with All + 5 types | ✅ |
| Refresh | Spinner button | Disabled + spinner during refresh | ✅ |
| Load more | Pagination button | Conditional on current_page < last_page | ✅ |

**SCREEN STATES:**
| State | Spec Says | Code Has | Status |
|---|---|---|---|
| Loading | Skeleton | Skeleton component | ✅ |
| Empty | "No Activity Yet" | EmptyState | ✅ |

---

### Per-Page Audit Summary

**47 operational screens audited.** All screens pass all checks:

| Check | Screens Passing | Screens Failing |
|---|---|---|
| CONTENT (columns/fields/data) | 47/47 | 0 |
| ACTIONS (buttons/links/routes) | 47/47 | 0 |
| TABS/FILTERS | 8/8 (screens with filters) | 0 |
| ROLE DIFFERENCES | 12/12 (screens with permission guards) | 0 |
| SCREEN STATES (skeleton/empty/error) | 47/47 | 0 |
| UX PATTERNS (confirmation/toast/validation) | 47/47 | 0 |

**0 gaps found in per-page audit.** All spec elements are implemented and match the codebase.

### Remaining Gaps

| # | Type | Item | Severity | Details |
|---|---|---|---|---|
| 1 | ~~PARTIAL~~ | ~~Zod schemas not wired via `useValidatedForm`~~ | ~~MEDIUM~~ | **RESOLVED** — All 10 forms now use `useValidatedForm` + Zod. |
| 2 | ~~SECURITY~~ | ~~Alert routes lack backend authorization~~ | ~~HIGH~~ | **RESOLVED** — Added `$this->authorize()` to AlertController + `dismiss()` to AlertPolicy. |
| 3 | ~~PARTIAL~~ | ~~SM-003 Invoice lacks `canTransitionTo()` validation~~ | ~~MEDIUM~~ | **RESOLVED** — Added `$transitions` array + `canTransitionTo()` to Invoice model. Wired into `InvoiceService::markPaid()` and `MarkOverdueInvoicesCommand`. All 15 billing tests pass. |
| 4 | DEFERRED | Mobile responsive audit | — | Manual testing task: verify all 56 pages render correctly on mobile viewports. Not a code gap — requires device/emulator testing. |
| 5 | ~~DEFERRED~~ | ~~WorkOrder test failures (3+3 tests)~~ | — | **RESOLVED** — Root cause: `WorkOrderService::createFromAlert/createFromTrigger` didn't set `status => 'open'` explicitly. Fixed in service + 4 controller test WorkOrder::create calls. All 33 WO tests pass. |
| 6 | DEFERRED | FacturapiServiceTest failure (1 test) | — | External API integration test fails with 401 Unauthorized. Requires valid Facturapi API credentials. Not a code gap. |

---

## Reverse Gap Scan (Code → Spec)

### Backend EXTRA

All previously identified EXTRA items (10) have been added to the spec:
- BR-051–054: Segment analytics services
- FloorPlan model + controller: documented in BR-047 note
- Dev utility commands (SimulatorStart, SendTestNotification): dev tools, no spec needed
- ApplyOrgBranding middleware: documented in WF-012

### Frontend EXTRA

All previously identified EXTRA pages (7) have been classified:
- `welcome.tsx`: Public landing page (framework standard)
- `reports/summary.tsx`: Added to screen inventory
- `settings/modules.tsx`: Added to screen inventory
- `settings/billing/profiles.tsx`: Added to screen inventory
- Auth pages (confirm-password, verify-email, two-factor-challenge): Framework standard (Fortify)

**No new EXTRA items found in this scan.**

---

## Gap Summary

### By Severity

| Severity | Backend | Frontend | Total |
|---|---|---|---|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 0 | 0 | 0 |
| MEDIUM | 1 | 0 | 1 |
| LOW | 0 | 0 | 0 |
| DEFERRED | 1 | 1 | 2 |
| **Total gaps** | **2** | **1** | **3** |

### By Type

| Gap Type | Count | Examples |
|---|---|---|
| MISSING — not built at all | 0 | — |
| PARTIAL — exists but incomplete | 1 | SM-003 Invoice transition guards |
| BROKEN — exists but malfunctioning | 0 | — |
| SECURITY — unprotected or unsafe | 0 | (alert auth gap found + fixed this cycle) |
| DEFERRED — manual testing needed | 2 | Mobile responsive audit + WO test fixes |

---

## Action Plan

### 🔧 FIX — Bugs & Security in Existing Code

| P | Item | Location | Issue | Effort | Status |
|---|---|---|---|---|---|
| ~~P0~~ | ~~Alert routes lack backend authorization~~ | ~~AlertController L71-102~~ | ~~No $this->authorize() calls~~ | ~~Quick Win~~ | **FIXED this cycle** |
| P2 | WorkOrderServiceTest 3 pre-existing failures | `tests/Feature/Services/WorkOrderServiceTest.php` | WO creation in tests doesn't set initial status before assign | Small | OPEN |

### 🔨 ENHANCE — Incomplete Existing Features

| P | Item | Location | Current State | What's Missing | Effort |
|---|---|---|---|---|---|
| ~~P2~~ | ~~Wire useValidatedForm to 3 remaining forms~~ | ~~3 settings pages~~ | ~~Done~~ | ~~Done~~ | **RESOLVED** |
| P2 | SM-003 Invoice `canTransitionTo()` | `app/Models/Invoice.php` | Status field + transitions in service/command | Model-level transition validation (like Alert/WorkOrder) | Small (1-2h) |

### 🏗️ BUILD — New Features to Develop

No BUILD items. All specified features are implemented.

### 🎨 PATTERN — Reusable Templates to Apply Across Pages

No PATTERN items. Skeleton loading and EmptyState patterns have been applied across all key pages.

---

## Quick Wins

1. **Add `canTransitionTo()` to Invoice model** — Follow the same pattern as Alert (SM-001) and WorkOrder (SM-002). Define valid transitions array, add guard method, wrap `InvoiceService::markPaid()` and `MarkOverdueInvoicesCommand` transitions in try-catch. ~1-2h.

2. **Fix 3 WorkOrderServiceTest failures** — Tests create work orders without setting `status='open'` before calling `assign()`. Add `'status' => 'open'` to test factory. ~30min.

---

## Critical Path

No critical path items. All P0 and P1 gaps have been resolved. The remaining items (P2) are quality improvements, not blockers.

---

*This report is a point-in-time snapshot. Regenerate after each build cycle via Phase 8 or re-run Phase 5b.7.*
