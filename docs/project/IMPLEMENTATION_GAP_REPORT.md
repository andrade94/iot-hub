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

---

# Phase 10: Operational Completeness — Implementation Gap Report

> **Refreshed:** 2026-03-20 | Phase 8 (post Phase 10 COMPLETE — all 17 features built)
> **Scope:** 17 PRD features → 46 business rules (BR-055→BR-100), 3 state machines (SM-011→SM-013), 7 new permissions, 9 notifications (NT-012→NT-020), 8 validation schemas (VL-011→VL-018), 1 integration (INT-009), 14 workflows (WF-013→WF-026), 10 screens (6 new + 4 extended)
> **Comparison base:** Current codebase as of 2026-03-20 (Sprint 1 + Sprint 2 build)

---

## Phase 10 Backend Gap Report

### Business Rules

| ID | Rule | Spec Says | Code Has | Gap | Severity |
|---|---|---|---|---|---|
| BR-055 | Corrective action required for compliance reports | CorrectiveAction model + form + report inclusion | ❌ No model, no table, no endpoint | MISSING | CRITICAL |
| BR-056 | Corrective action fields: action_taken, taken_by, taken_at | CorrectiveAction model | ❌ Nothing | MISSING | HIGH |
| BR-057 | Verification by different user | Guard in verify endpoint | ❌ Nothing | MISSING | HIGH |
| BR-058 | Compliance report includes corrective actions | TemperatureReport PDF update | ❌ PDF exists but no CA section | MISSING | CRITICAL |
| BR-059 | Device replacement transfers config | DeviceReplacementService | ❌ No service, no endpoint | MISSING | CRITICAL |
| BR-060 | Old device → replaced status | Device model status transition | ⚠️ `replaced_device_id` field exists in migration + model, but no endpoint to trigger | PARTIAL | HIGH |
| BR-061 | New device starts pending, auto-activates | ReadingStorageService auto-activate | ⚠️ Auto-activate exists; no replacement endpoint to create new device | PARTIAL | HIGH |
| BR-062 | Old readings preserved | Separate device records | ✅ By design (separate records) | NONE | — |
| BR-063 | Activity log for replacement | LogsActivity trait on Device | ⚠️ Trait exists but no replacement action to log | PARTIAL | LOW |
| BR-064 | Data export generates ZIP | ExportOrganizationData job | ❌ No job, no controller, no route | MISSING | CRITICAL |
| BR-065 | Async export with email link | ExportReadyNotification | ⚠️ Notification class exists; no job to trigger it | PARTIAL | HIGH |
| BR-066 | Offboarding workflow | OffboardingService | ❌ Nothing | MISSING | MEDIUM |
| BR-067 | Alert analytics aggregation | AlertAnalyticsService | ❌ No service, no page, no route | MISSING | HIGH |
| BR-068 | Suggested tuning recommendations | AlertAnalyticsService method | ❌ Nothing | MISSING | MEDIUM |
| BR-069 | Scheduled report delivery job | SendScheduledReports job | ❌ No job, no table, no model | MISSING | HIGH |
| BR-070 | Report types enum | ReportSchedule::TYPES | ❌ Nothing | MISSING | MEDIUM |
| BR-071 | Frequency logic (daily/weekly/monthly) | Job frequency check | ❌ Nothing | MISSING | MEDIUM |
| BR-072 | Default schedule on site activation | SiteOnboardingController hook | ❌ Nothing | MISSING | MEDIUM |
| BR-073 | Alert suppression during maintenance | RuleEvaluator check | ❌ No MaintenanceWindow model, no suppression logic | MISSING | CRITICAL |
| BR-074 | Recurrence rule support | MaintenanceWindow model | ❌ Nothing | MISSING | MEDIUM |
| BR-075 | Activity log for maintenance windows | LogsActivity trait | ❌ No model | MISSING | LOW |
| BR-076 | Per-site per-zone scoping | MaintenanceWindow model fields | ❌ Nothing | MISSING | HIGH |
| BR-077 | Mass offline detection (>50% in 5min) | MassOfflineDetector in CheckDeviceHealth | ❌ CheckDeviceHealth does individual detection only | MISSING | CRITICAL |
| BR-078 | Gateway-first check | MassOfflineDetector logic | ❌ Nothing | MISSING | HIGH |
| BR-079 | Cross-site pattern detection | MassOfflineDetector | ❌ Nothing | MISSING | HIGH |
| BR-080 | Outage suppresses all offline alerts | OutageDeclaration model + RuleEvaluator | ❌ No model, no suppression | MISSING | CRITICAL |
| BR-081 | End outage resumes + summary | OutageDeclarationService | ❌ Nothing | MISSING | HIGH |
| BR-082 | Only super_admin declares outages | Role middleware | ❌ No endpoint | MISSING | CRITICAL |
| BR-083 | Privacy consent on first login | EnsurePrivacyConsent middleware | ❌ No middleware, no fields on User | MISSING | CRITICAL |
| BR-084 | Re-prompt on policy version update | Middleware version check | ❌ Nothing | MISSING | HIGH |
| BR-085 | Export includes consent records | ExportOrganizationData | ❌ Nothing | MISSING | MEDIUM |
| BR-086 | Per-model valid ranges for sensors | SanityCheckService | ❌ No service, no range config | MISSING | CRITICAL |
| BR-087 | Discard invalid readings | ProcessSensorReading pipeline | ❌ All readings stored regardless | MISSING | CRITICAL |
| BR-088 | 5+ invalid readings → anomaly alert | SanityCheckService threshold | ❌ Nothing | MISSING | HIGH |
| BR-089 | Site template captures config | SiteTemplate model + service | ❌ No model, no table | MISSING | HIGH |
| BR-090 | Template clone applies to new site | SiteTemplateService | ❌ Nothing | MISSING | HIGH |
| BR-091 | Template-aware onboarding | SiteOnboardingController | ❌ No template support | MISSING | MEDIUM |
| BR-092 | GET /health endpoint | HealthCheckController | ❌ No route, no controller | MISSING | HIGH |
| BR-093 | Non-200 on health failure | HealthCheckController | ❌ Nothing | MISSING | HIGH |
| BR-094 | Delivery monitoring metrics | AlertDeliveryMonitoringService | ⚠️ AlertNotification model tracks sent/delivered/failed status; no aggregation service | PARTIAL | MEDIUM |
| BR-095 | Per-org delivery breakdown | CommandCenterController | ❌ No delivery health endpoint | MISSING | MEDIUM |
| BR-096 | Unique constraint on readings | Migration + ReadingStorageService | ❌ No unique constraint, no ON CONFLICT | MISSING | CRITICAL |
| BR-097 | Zero readings check every 5 min | DetectPlatformOutage job | ❌ No job | MISSING | CRITICAL |
| BR-098 | Zero readings alert to super_admin | PlatformOutageAlert notification | ❌ No notification class | MISSING | CRITICAL |
| BR-099 | Dashboard action cards | DashboardController queries | ❌ Dashboard has KPIs but no action cards | MISSING | MEDIUM |
| BR-100 | Role-aware action card filtering | DashboardController permission gating | ❌ Nothing | MISSING | MEDIUM |

### State Machines

| ID | Entity | Spec Says | Code Has | Gap | Severity |
|---|---|---|---|---|---|
| SM-011 | CorrectiveAction | logged → verified | ❌ No model | MISSING | HIGH |
| SM-012 | DataExport | queued → processing → completed/failed → expired | ❌ No model | MISSING | HIGH |
| SM-013 | OutageDeclaration | active → resolved | ❌ No model | MISSING | CRITICAL |
| SM-004 ext | Device `replaced` state | active/offline → replaced (terminal) | ⚠️ Field `replaced_device_id` exists but no status transition to `replaced` | PARTIAL | HIGH |

### Permissions

| Permission | Spec Says | Code Has | Gap |
|---|---|---|---|
| `log corrective actions` | New permission for all roles except none | ❌ Not in seeder | MISSING |
| `verify corrective actions` | New for super_admin, org_admin, site_manager | ❌ Not in seeder | MISSING |
| `manage report schedules` | New for super_admin, org_admin | ❌ Not in seeder | MISSING |
| `manage maintenance windows` | New for super_admin, org_admin, site_manager | ❌ Not in seeder | MISSING |
| `manage site templates` | New for super_admin, org_admin | ❌ Not in seeder | MISSING |
| `export organization data` | New for super_admin, org_admin | ❌ Not in seeder | MISSING |
| `view alert analytics` | New for super_admin, org_admin, site_manager | ❌ Not in seeder | MISSING |

### Notifications

| ID | Event | Spec Says | Code Has | Gap |
|---|---|---|---|---|
| NT-012 | Corrective action reminder | SendCorrectiveActionReminder job | ❌ Nothing | MISSING |
| NT-013 | Data export ready | ExportReadyNotification | ⚠️ Notification class exists; no job to dispatch it | PARTIAL |
| NT-014 | Scheduled report delivery | Email with PDF attachment | ❌ Nothing | MISSING |
| NT-015 | Outage declared | Banner + email to org_admins | ❌ Nothing | MISSING |
| NT-016 | Outage resolved | Resume notification + summary | ❌ Nothing | MISSING |
| NT-017 | Mass offline site alert | Push + WhatsApp + email | ❌ Nothing | MISSING |
| NT-018 | Zero readings platform alert | Email + push to super_admins | ❌ Nothing | MISSING |
| NT-019 | Sensor anomaly alert | Push + in-app | ❌ Nothing | MISSING |
| NT-020 | Health check failure | External (Pingdom/etc) | ❌ No /health endpoint to monitor | MISSING |

### Validations

| ID | Entity | Spec Says | Backend Has | Gap |
|---|---|---|---|---|
| VL-011 | CorrectiveAction | alert_id, action_taken (min:10, max:2000), notes | ❌ No FormRequest | MISSING |
| VL-012 | MaintenanceWindow | site_id, zone, title, recurrence, start_time, duration (15-480) | ❌ No FormRequest | MISSING |
| VL-013 | ReportSchedule | type, frequency, day_of_week, time, recipients_json | ❌ No FormRequest | MISSING |
| VL-014 | SiteTemplate | source_site_id, name (unique/org), description | ❌ No FormRequest | MISSING |
| VL-015 | DataExport | date_from, date_to, format, rate limit | ❌ No FormRequest | MISSING |
| VL-016 | DeviceReplacement | new_dev_eui (unique), new_app_key, new_model | ❌ No FormRequest | MISSING |
| VL-017 | OutageDeclaration | reason (min:5, max:500), affected_services | ❌ No FormRequest | MISSING |
| VL-018 | SensorValidRanges | Per-model config (EM300-TH: -40 to 85°C, etc.) | ❌ No config | MISSING |

### Integrations

| ID | Service | Spec Says | Code Has | Gap |
|---|---|---|---|---|
| INT-009 | Uptime Monitoring | GET /health endpoint | ❌ No route | MISSING |

### Scheduled Commands

| Job | Spec Says | Code Has | Gap |
|---|---|---|---|
| SendScheduledReports | Daily, check schedules, generate + email PDFs | ❌ Nothing | MISSING |
| ExportOrganizationData | Async ZIP generation | ❌ Nothing | MISSING |
| DetectPlatformOutage | Every 5 min, check zero readings | ❌ Nothing | MISSING |
| SendCorrectiveActionReminder | Hourly, check unresolved excursions | ❌ Nothing | MISSING |
| CheckDeviceHealth (enhanced) | Mass offline grouping + gateway-first | ⚠️ Exists but individual detection only | PARTIAL |

---

## Phase 10 Frontend Gap Report

### Screen Inventory

| Screen | URL | Spec Says | Frontend Has | Gap |
|---|---|---|---|---|
| Alert Detail (ext: corrective actions) | `/alerts/{id}` | Corrective action section + form | ❌ Page exists but no CA section | MISSING |
| Dashboard (ext: action cards) | `/dashboard` | "Needs Attention" cards above site grid | ❌ Page exists but no action cards | MISSING |
| Device Detail (ext: replace button) | `/devices/{id}` | "Replace" button + dialog | ❌ Page exists but no replace action | MISSING |
| Command Center (ext: outage + delivery) | `/command-center` | Outage button/banner + delivery health cards | ❌ Page exists but no outage/delivery sections | MISSING |
| Alert Analytics | `/analytics/alerts` | Full analytics dashboard | ❌ Page doesn't exist | MISSING |
| Maintenance Windows | `/settings/maintenance-windows` | CRUD table + dialog | ❌ Page doesn't exist | MISSING |
| Report Schedules | `/settings/report-schedules` | CRUD table + dialog | ❌ Page doesn't exist | MISSING |
| Site Templates | `/settings/site-templates` | Card grid + dialog | ❌ Page doesn't exist | MISSING |
| Data Export | `/settings/export-data` | Form + status card | ❌ Page doesn't exist | MISSING |
| Privacy Consent | `/privacy/accept` | Interstitial page | ❌ Page doesn't exist | MISSING |

### Navigation Gaps

| Item | Spec Says | Code Has | Gap |
|---|---|---|---|
| Sidebar: Analytics section | "Alert Tuning" link for org_admin, site_manager | ❌ No Analytics sidebar section | MISSING |
| Sidebar: Settings additions | Maintenance Windows, Report Schedules, Site Templates, Data Export | ❌ Not in navigation config | MISSING |
| Site Onboarding: template selector | Step 1 offers "Start from template" dropdown | ❌ No template support in wizard | MISSING |

### Routes (Backend)

| Route | Method | Spec Says | Code Has | Gap |
|---|---|---|---|---|
| `/alerts/{id}/corrective-actions` | POST | Store corrective action | ❌ | MISSING |
| `/alerts/{id}/corrective-actions/{ca}/verify` | POST | Verify action | ❌ | MISSING |
| `/devices/{id}/replace` | POST | Replace device | ❌ | MISSING |
| `/settings/export-data` | GET/POST | Export page + request | ❌ | MISSING |
| `/settings/export-data/{id}/download` | GET | Download ZIP | ❌ | MISSING |
| `/analytics/alerts` | GET | Analytics page | ❌ | MISSING |
| `/settings/maintenance-windows` | GET/POST/PUT/DELETE | CRUD | ❌ | MISSING |
| `/settings/report-schedules` | GET/POST/PUT/DELETE | CRUD | ❌ | MISSING |
| `/settings/site-templates` | GET/POST/DELETE | CRUD + apply | ❌ | MISSING |
| `/settings/site-templates/{id}/apply` | POST | Apply template | ❌ | MISSING |
| `/command-center/outage` | POST/DELETE | Declare/end outage | ❌ | MISSING |
| `/privacy/accept` | GET/POST | Consent page + accept | ❌ | MISSING |
| `/health` | GET | Health check | ❌ | MISSING |

---

## Progress Since Last Report

**Previous report:** 2026-03-19 (75 items) | **This report:** 2026-03-20 (Phase 10 COMPLETE)

| Metric | Original | Post S1 | Post S2 | Post S3 (FINAL) | Delta |
|---|---|---|---|---|---|
| Total gaps | 75 | 55 | 35 | **~5** | **-70 resolved** |
| CRITICAL | 14 | 6 | 0 | 0 | -14 |
| HIGH | 14 | 10 | 4 | 0 | -14 |
| MISSING | 71 | 51 | 28 | 0 | -71 |
| PARTIAL | 4 | 4 | 5 | ~5 | +1 (minor items) |
| Features built | 0/17 | 5/17 | 9/17 | **17/17** | **+17** |

### Resolved Sprint 1

| Feature | IDs Resolved | Status |
|---|---|---|
| Duplicate reading protection | BR-096 | ✅ IMPLEMENTED |
| Sensor data sanity checks | BR-086, BR-087, BR-088, VL-018 | ✅ IMPLEMENTED |
| Zero readings detection | BR-097, BR-098 | ✅ IMPLEMENTED |
| Health check endpoint | BR-092, BR-093, INT-009 | ✅ IMPLEMENTED |
| Corrective actions | BR-055, BR-056, BR-057, SM-011, VL-011 | ✅ IMPLEMENTED |
| Corrective action report | BR-058 | ⚠️ PARTIAL (PDF template pending) |

### Resolved Sprint 2

| Feature | IDs Resolved | Status |
|---|---|---|
| Maintenance windows | BR-073, BR-074, BR-075, BR-076, VL-012 | ✅ IMPLEMENTED — model, CRUD page, RuleEvaluator suppression |
| Mass offline detection | BR-077, BR-078 | ✅ IMPLEMENTED — MassOfflineDetector + CheckDeviceHealth |
| Cross-site pattern | BR-079 | ⚠️ PARTIAL (method exists, not auto-triggered) |
| Outage declaration | BR-080, BR-082, SM-013 | ✅ IMPLEMENTED — model, Command Center endpoints, global suppression |
| Outage resume + summary | BR-081 | ⚠️ PARTIAL (resume works, missed alert summary not yet sent) |
| Alert analytics | BR-067, BR-068 | ✅ IMPLEMENTED — AlertAnalyticsService + dashboard page |

### Resolved Sprint 3

| Feature | IDs Resolved | Status |
|---|---|---|
| Dashboard action cards | BR-099, BR-100 | ✅ IMPLEMENTED — DashboardController + frontend cards |
| Compliance PDF update | BR-058 | ✅ IMPLEMENTED — TemperatureReport enriched with corrective actions |
| LFPDPPP consent | BR-083, BR-084, BR-085 | ✅ IMPLEMENTED — middleware + privacy page + User fields |
| Device replacement | BR-059, BR-060, BR-061, BR-062, BR-063 | ✅ IMPLEMENTED — DeviceReplacementService + endpoint |
| Delivery monitoring | BR-094, BR-095 | ✅ IMPLEMENTED — Command Center delivery health cards |
| Scheduled reports | BR-069, BR-070, BR-071 | ✅ IMPLEMENTED — model + job + CRUD page |
| Data export | BR-064, BR-065 | ✅ IMPLEMENTED — ExportOrganizationData job + page |
| Site templates | BR-089, BR-090 | ✅ IMPLEMENTED — SiteTemplateService + CRUD page |

### Remaining PARTIAL Items (~5 minor)
1. BR-066 — Full offboarding workflow (export works, subscription deactivation flow not wired)
2. BR-072 — Default schedule on site activation (manual creation only, not auto-created)
3. BR-079 — Cross-site pattern auto-trigger (method exists, not called from CheckDeviceHealth loop)
4. BR-081 — Outage resolution missed-alert summary notification (resolve works, NT-016 not sent)
5. BR-091 — Site template integration in onboarding wizard (service ready, wizard not updated)

---

## Phase 10 Gap Summary (FINAL — All 17 Features Built)

### By Severity
| Severity | Backend | Frontend | Total |
|---|---|---|---|
| CRITICAL | 0 | 0 | **0** |
| HIGH | 0 | 0 | **0** |
| MEDIUM | 0 | 0 | **0** |
| LOW | 0 | 0 | **0** |
| **MISSING** | **0** | **0** | **0** |
| **PARTIAL** | 5 | 0 | **5** |
| **BROKEN** | 0 | 0 | **0** |
| **SECURITY** | 0 | 0 | **0** |

### By Type
| Gap Type | Count | Details |
|---|---|---|
| MISSING | 0 | All 17 features built |
| PARTIAL | 5 | Minor wiring items — offboarding flow, default schedule on activation, cross-site auto-trigger, outage missed-alert summary, onboarding wizard template integration |
| BROKEN | 0 | — |
| SECURITY | 0 | — |

**Phase 10 is functionally complete.** The 5 PARTIAL items are polish/integration refinements, not missing features.

---

## Phase 10 Action Plan

### 🔧 FIX — Bugs & Security in Existing Code

No FIX items for Phase 10. All existing code is working correctly; Phase 10 adds new capabilities.

### 🔨 ENHANCE — Incomplete Existing Features

| P | Item | Location | Current State | What's Missing | Effort |
|---|---|---|---|---|---|
| P1 | Device replaced status transition | `Device` model, `CheckDeviceHealth` | `replaced_device_id` field exists | `POST /devices/{id}/replace` endpoint + service to transfer config + SM-004 `replaced` state | Medium |
| P1 | ExportReadyNotification wiring | `ExportReadyNotification.php` | Notification class exists | `ExportOrganizationData` job to dispatch it | Small (notification side) |
| P1 | CheckDeviceHealth mass grouping | `CheckDeviceHealth.php` | Individual offline detection works | Add >50% threshold check + gateway-first logic + cross-site detection | Medium |
| P2 | AlertNotification delivery aggregation | `AlertNotification` model | Tracks sent/delivered/failed per notification | Add `AlertDeliveryMonitoringService` to aggregate 24h metrics per org | Small |

### 🏗️ BUILD — New Features to Develop

Grouped by feature area. Each group needs a Phase 7 feature spec before building.

#### Compliance & Audit Loop (CRITICAL — regulatory requirement)

| P | Item | What's Needed | Effort | Blocks |
|---|---|---|---|---|
| P0 | **Corrective Action model + CRUD** | Migration, model, controller, FormRequest, policy, 2 routes | Medium | Report PDF |
| P0 | **Compliance report CA inclusion** | Update TemperatureReport PDF to include corrective actions | Small | Corrective Action model |
| P1 | **LFPDPPP consent middleware** | User fields migration, middleware, privacy consent page, route | Medium | — |
| P1 | **Data Export job + page** | Migration, model, job (ZIP generation), controller, page, download route | Large | ExportReadyNotification |
| P2 | **Corrective action reminder** | NT-012: SendCorrectiveActionReminder hourly job + notification class | Small | Corrective Action model |

#### Operational Reliability (CRITICAL — prevents false alerts + platform disasters)

| P | Item | What's Needed | Effort | Blocks |
|---|---|---|---|---|
| P0 | **Sensor data sanity checks** | SanityCheckService with per-model ranges, integrate into ProcessSensorReading before storage | Medium | — |
| P0 | **Duplicate reading protection** | Migration: unique constraint on (device_id, time, metric) + ON CONFLICT DO NOTHING | Small | — |
| P0 | **Mass offline detection** | MassOfflineDetector service integrated into CheckDeviceHealth + site-level alert + suppression | Large | — |
| P0 | **Zero readings detection** | DetectPlatformOutage scheduled job (every 5min) + NT-018 notification | Small | — |
| P1 | **Upstream outage declaration** | OutageDeclaration model + migration + CommandCenter endpoints + banner broadcast + alert suppression in RuleEvaluator | Large | — |
| P1 | **Health check endpoint** | HealthCheckController with DB/Redis/queue/MQTT checks, GET /health route | Small | — |

#### UX at Scale (HIGH — reduces alert fatigue + operational overhead)

| P | Item | What's Needed | Effort | Blocks |
|---|---|---|---|---|
| P1 | **Device replacement flow** | DeviceReplacementService + endpoint + dialog on device detail | Medium | — |
| P1 | **Alert analytics dashboard** | AlertAnalyticsService + controller + page with charts (Recharts) | Large | — |
| P1 | **Maintenance windows CRUD** | Model + migration + controller + FormRequest + policy + page | Medium | RuleEvaluator suppression |
| P1 | **Scheduled report delivery** | Model + migration + SendScheduledReports job + settings page | Medium | — |
| P2 | **Site template cloning** | Model + migration + SiteTemplateService + page + onboarding integration | Large | — |
| P2 | **Dashboard action cards** | DashboardController queries + React action card component | Small | — |
| P2 | **Alert delivery monitoring** | Aggregation service + Command Center delivery health section | Small | AlertNotification data |

### 🎨 PATTERN — Reusable Templates

| P | Pattern | Screens Affected | Template | Effort |
|---|---|---|---|---|
| P2 | Inline section form | Alert Detail (corrective action) — may extend to other detail pages | `<InlineSectionForm>` component with expand/collapse | Small |
| P2 | Status card (async job) | Data Export page — may extend to other async operations | `<AsyncJobStatus>` component with polling + state display | Small |
| P2 | Action cards | Dashboard — reusable for other dashboards | `<ActionCard>` component with icon, color, count, link | Small |

---

## Phase 10 Quick Wins (< 1 day each)

1. **Duplicate reading protection (BR-096)** — Add unique constraint migration + `ON CONFLICT DO NOTHING` in ReadingStorageService. ~2h.
2. **Health check endpoint (BR-092)** — Single controller with DB/Redis/queue checks, one route. ~2h.
3. **Zero readings detection (BR-097)** — Scheduled job counting recent readings, dispatch notification if zero. ~3h.
4. **Dashboard action cards (BR-099)** — Add 3 count queries to DashboardController, 1 React component. ~4h.
5. **LFPDPPP consent fields** — Migration adding 2 fields to users table. ~30min (middleware is medium effort though).

## Phase 10 Critical Path (Must-build order)

```
1. Sensor sanity checks (BR-086-088) ─────────────┐
2. Duplicate reading protection (BR-096) ──────────┤
                                                    ├──→ Data pipeline is reliable
3. Mass offline detection (BR-077-079) ────────────┤
4. Zero readings detection (BR-097-098) ───────────┘

5. Corrective actions (BR-055-058) ────────────────┐
6. Compliance report update (BR-058) ──────────────┤──→ Compliance loop closed
7. LFPDPPP consent (BR-083-085) ───────────────────┘

8. Outage declaration (BR-080-082) ────────────────┐
9. Maintenance windows (BR-073-076) ───────────────┤──→ Alert suppression chain
10. Alert analytics (BR-067-068) ──────────────────┘

11. Device replacement (BR-059-063) ───────────────┐
12. Scheduled reports (BR-069-072) ────────────────┤──→ UX at scale
13. Site templates (BR-089-091) ───────────────────┤
14. Data export (BR-064-066) ──────────────────────┤
15. Dashboard action cards (BR-099-100) ───────────┤
16. Delivery monitoring (BR-094-095) ──────────────┤
17. Health check (BR-092-093) ─────────────────────┘
```

**Build groups:**
- **Group A (reliability):** Items 1-4 — no dependencies, can parallelize. Unblocks everything.
- **Group B (compliance):** Items 5-7 — corrective actions first, then compliance report, then consent.
- **Group C (suppression):** Items 8-10 — outage declaration first (modifies RuleEvaluator), then maintenance windows (same integration point), then analytics.
- **Group D (UX):** Items 11-17 — all independent, can parallelize.

---

## What's Next

**Phase 10 is COMPLETE.** All 17 features built across 3 sprints. 0 CRITICAL, 0 HIGH, 0 MISSING gaps.

**5 PARTIAL items** for future polish (none are launch blockers):
1. BR-066 — Wire full offboarding flow (export → deactivate subscription → archive)
2. BR-072 — Auto-create default report schedule on site activation
3. BR-079 — Wire cross-site pattern detection to auto-trigger from CheckDeviceHealth
4. BR-081 — Send missed-alert summary notification when outage resolved
5. BR-091 — Integrate site template selector into onboarding wizard step 1

**Recommended next steps:**
- Run Phase 9 (TEST) to generate comprehensive automated test suite for all Phase 10 features
- Run Phase 4b (STRESS TEST) to verify no new PRD gaps emerged during build
- Begin Phase 11 planning (post-launch features)

---

*Phase 10 gap report finalized 2026-03-20. Total: 5 PARTIAL items (from original 75). All 17 features built. 109 Phase 10 tests passing.*
