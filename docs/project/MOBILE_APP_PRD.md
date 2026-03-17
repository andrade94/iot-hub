# PRD — Astrea Mobile App

> Product Requirements Document
> **Status:** v1.0
> **App:** Expo SDK 54, React Native 0.81, TypeScript
> **Backend:** iot-hub (Laravel 12 + Sanctum API tokens)
> **Repo:** `iot-expo` (separate repo, connects to iot-hub API)
> **Date:** 2026-03-16

---

## 1. Overview & Vision

**"The daily ops companion — sits between WhatsApp (reactive) and Web (deep analysis)."**

The Astrea platform has three interfaces, each with a distinct purpose:

| Interface | Purpose | When |
|-----------|---------|------|
| **WhatsApp** | Emergency alerts, quick acknowledgment | Reactive — something went wrong |
| **Mobile App** | Daily monitoring, field operations, alert response | Proactive — morning check, on-site work |
| **Web** | Configuration, deep analysis, reports, admin | Strategic — setup, trends, compliance |

The mobile app targets three field-oriented personas (Technician, Site Viewer, Site Manager) across three core flows (alert response, field operations, daily monitoring). These nine user stories define the app's scope.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Navigation | Expo Router (file-based) |
| State | React Query (TanStack Query) + Zustand |
| Offline storage | MMKV |
| Auth | Sanctum API tokens |
| Push | Expo Push Notifications + Firebase FCM |
| i18n | EN/ES (mirrors web) |
| Charts | Victory Native |

---

## 2. User Personas & Needs

### Technician

**Role:** Field worker. Installs sensors, replaces batteries, completes work orders.

| Attribute | Value |
|-----------|-------|
| Primary screen | My Work Orders (assigned to me) |
| Key flow | View WO details → navigate to site → check device status → take photo → add note → mark complete |
| Secondary | Check device battery/signal before arriving at site |
| Gate | `has_app_access = true`, role = `technician` |

**User stories:**
1. As a Technician, I want to see my assigned work orders so I can plan my day.
2. As a Technician, I want to update WO status and attach photos so the office knows the job is done.
3. As a Technician, I want to check device battery/signal before a site visit so I bring the right equipment.

### Site Viewer (Store Manager)

**Role:** Morning-check persona. Monitors their site(s). Read-only for alerts.

| Attribute | Value |
|-----------|-------|
| Primary screen | Site Dashboard (one site or a few) |
| Key view | Zone temperatures, active alerts count, device health %, last readings |
| Key action | View alert details (read-only — cannot acknowledge per AC-005 business rule) |
| Gate | `has_app_access = true`, role = `site_viewer` |

**User stories:**
4. As a Site Viewer, I want a morning dashboard showing zone temperatures and device health so I know if my store is operating normally.
5. As a Site Viewer, I want to see active alerts so I'm aware of issues even though I can't acknowledge them.
6. As a Site Viewer, I want push notifications for critical alerts so I can escalate to my regional manager immediately.

### Site Manager (Regional)

**Role:** Oversees multiple sites. Responds to alerts. Creates work orders.

| Attribute | Value |
|-----------|-------|
| Primary screen | Multi-site overview with per-site KPIs |
| Key actions | Acknowledge alerts, create work orders, drill into site/zone details |
| Secondary | Assign work orders to technicians |
| Gate | `has_app_access = true`, role = `site_manager` |

**User stories:**
7. As a Site Manager, I want a multi-site overview so I can spot which sites need attention.
8. As a Site Manager, I want to acknowledge and resolve alerts from my phone so I don't need to open a laptop.
9. As a Site Manager, I want to create and assign work orders so technicians know what to do.

---

## 3. Navigation Architecture

```
(auth)
├── login
├── register (if enabled)
└── forgot-password

(tabs) — 4 tabs
├── Home (dashboard)
│   ├── Site Viewer → single-site dashboard with zones + readings
│   ├── Site Manager → multi-site overview with KPIs
│   └── Technician → today's work orders + pending alerts
│
├── Alerts
│   ├── Alert list (filterable by severity/status)
│   └── Alert detail → acknowledge/resolve (role-gated)
│
├── Work Orders
│   ├── WO list (technician: "My WOs", manager: "All WOs")
│   ├── WO detail → status updates, photos, notes
│   └── Create WO (site_manager only)
│
└── Profile
    ├── User info
    ├── Push notification settings
    ├── Language (EN/ES)
    ├── Theme (Glass/Minimal × Light/Dark)
    └── Logout
```

**Stack screens** (pushed on top of tabs):

| Screen | Pushed from |
|--------|-------------|
| Site Detail | Home, Alerts, Work Orders |
| Zone Detail | Site Detail |
| Device Detail | Zone Detail, Work Orders |
| Floor Plan View | Site Detail |
| Notification Center | Header bell icon |

---

## 4. Screen Specifications (15 screens)

### Auth (3 screens) — Already built in iot-expo template

1. **Login** — Email + password. Calls `POST /api/auth/login`. Stores Sanctum token in secure storage.
2. **Register** — If enabled by org settings. Calls `POST /api/auth/register`.
3. **Forgot Password** — Email input. Calls `POST /api/auth/forgot-password`.

### Home Tab (3 role variants)

**4. Site Viewer Home**
- KPI cards: total devices, online %, active alerts, last reading age
- Zone list with latest reading per zone (temperature, humidity)
- Pull-to-refresh
- Tap zone → Zone Detail

**5. Site Manager Home**
- Multi-site cards: site name, health bar (online device %), alert count badge
- Global KPI row: total alerts, open WOs, devices offline
- Quick actions: "View All Alerts", "Create Work Order"
- Tap site card → Site Detail

**6. Technician Home**
- Today's assigned WOs (sorted by priority)
- "Devices needing attention" section (low battery < 20%, offline > 30 min)
- Tap WO → WO Detail
- Tap device → Device Detail

### Alerts Tab (2 screens)

**7. Alert List**
- Paginated, pull-to-refresh
- Filters: severity (critical/high/medium/low), status (active/acknowledged/resolved)
- Critical alerts: red left border, top of list
- Swipe-to-acknowledge (site_manager and technician only — site_viewer sees read-only)
- Tap → Alert Detail

**8. Alert Detail**
- Header: severity badge, status badge, created timestamp
- Trigger data: metric name, actual value, threshold value, device name
- Device link: tap to navigate to Device Detail
- Timeline: triggered → notified → acknowledged → resolved (with who + when)
- Notification log: who was notified, via which channel (push/WhatsApp/email)
- Action buttons (role-gated):
  - **Acknowledge** — site_manager, technician
  - **Resolve** — site_manager, technician
  - Site Viewer sees buttons disabled with tooltip "Contact your site manager"

### Work Orders Tab (3 screens)

**9. Work Order List**
- Filterable: status (open/in_progress/completed/cancelled), priority (urgent/high/normal/low), type
- Technician default view: `assigned_to = me`, status = open/in_progress
- Site Manager default view: all WOs across their sites
- Badge on tab: count of open WOs
- Tap → WO Detail

**10. Work Order Detail**
- Header: title, priority badge, status badge
- Info: description, type, assigned technician, created by, device link (if any)
- Photos gallery: grid of attached photos. Tap to expand. "Add Photo" button (camera or gallery)
- Notes timeline: chronological notes with author and timestamp. "Add Note" text input
- Status actions: Open → In Progress → Completed (status machine)
- Device link: tap to navigate to Device Detail

**11. Create Work Order** (site_manager only)
- Form fields:
  - Site selector (dropdown of user's sites)
  - Device selector (optional, filtered by selected site)
  - Type (installation/maintenance/repair/inspection)
  - Priority (urgent/high/normal/low)
  - Title (text input)
  - Description (multiline text)
- Submit → `POST /api/sites/{site}/work-orders`

### Profile Tab (1 screen)

**12. Profile**
- User info: name, email, role badge, organization name
- Push notification settings: toggle on/off
- Language picker: EN / ES
- Theme picker: Glass/Minimal × Light/Dark
- App version
- Logout button

### Stack Screens (5 screens)

**13. Site Detail**
- KPI row: devices, online %, alerts, last reading age
- Zone grid: cards showing zone name + key metric + device count
- Active alerts sidebar/section: list of unresolved alerts for this site
- Floor plan button → Floor Plan View
- Mirrors web `settings/sites/show.tsx` layout adapted for mobile

**14. Zone Detail**
- Zone name + site breadcrumb
- Devices in zone: list with status icon, last reading, battery
- Zone metric summary: avg temperature, min/max, humidity
- Tap device → Device Detail

**15. Device Detail**
- Status: online/offline indicator, last seen timestamp
- Battery: percentage + icon (green/yellow/red)
- Signal: RSSI value + strength bars
- Last reading: metric values with units and timestamp
- Gateway: name + status
- Recipe: applied recipe name
- Readings chart: 24h time-series line chart (Victory Native)
- Actions: none in v1 (configuration is web-only)

**16. Floor Plan View**
- Floor plan image (lazy-loaded, cached)
- Colored dots overlaid on device positions:
  - Green = online, normal
  - Yellow = warning (low battery, weak signal)
  - Red = alert active
  - Gray = offline
- Tap dot → reading popover (device name, last reading, battery)
- Tap popover → Device Detail

**17. Notification Center**
- In-app notification list (database notifications from backend)
- Types: alert triggered, WO assigned, WO status changed, morning summary
- Mark as read on tap
- "Mark all read" button
- Tap notification → deep link to relevant screen (alert detail, WO detail)

---

## 5. API Endpoints (Backend Work)

The iot-hub backend currently has **3 Sanctum-protected API endpoints** in `routes/api.php`:

```
GET /api/sites/{site}/devices      → DeviceApiController@index
GET /api/devices/{device}/readings → DeviceApiController@readings
GET /api/devices/{device}/status   → DeviceApiController@status
```

The mobile app needs **~20 additional endpoints**:

### Auth

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/auth/login` | Authenticate, return Sanctum token + user | Reject if `has_app_access = false` |
| POST | `/api/auth/logout` | Revoke current token | |
| GET | `/api/auth/user` | Current user + roles + permissions + sites | |

### Push Tokens

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/push-tokens` | Register Expo push token | `{ token, device_name, platform }` |
| DELETE | `/api/push-tokens/{token}` | Unregister push token | On logout or token refresh |

### Dashboard

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | `/api/dashboard` | Role-scoped KPIs + site stats | Returns different shape per role |

### Sites & Zones

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | `/api/sites` | User's accessible sites with KPIs | Paginated, includes health % |
| GET | `/api/sites/{site}` | Site detail + zones + KPIs | |
| GET | `/api/sites/{site}/zones/{zone}` | Zone detail + devices + readings | |

### Devices (extend existing)

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | `/api/sites/{site}/devices` | Paginated devices | **Exists** — may need additional fields |
| GET | `/api/devices/{device}` | Device detail + gateway + recipe | **New** |
| GET | `/api/devices/{device}/readings` | Time-series readings | **Exists** — may need date range params |
| GET | `/api/devices/{device}/status` | Latest status | **Exists** |

### Alerts

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | `/api/alerts` | Paginated, filterable | `?severity=critical&status=active&site_id=1` |
| GET | `/api/alerts/{alert}` | Alert detail + notifications timeline | |
| POST | `/api/alerts/{alert}/acknowledge` | Acknowledge alert | Role-gated: site_manager, technician |
| POST | `/api/alerts/{alert}/resolve` | Resolve alert | Role-gated: site_manager, technician |

### Work Orders

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | `/api/work-orders` | Filterable list | `?status=open&assigned_to=me&site_id=1` |
| GET | `/api/work-orders/{workOrder}` | Detail + photos + notes | |
| POST | `/api/sites/{site}/work-orders` | Create work order | site_manager only |
| PUT | `/api/work-orders/{workOrder}/status` | Update status | `{ status: 'in_progress' }` |
| POST | `/api/work-orders/{workOrder}/photos` | Upload photo | Multipart form data |
| POST | `/api/work-orders/{workOrder}/notes` | Add note | `{ body: '...' }` |

### Notifications

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| GET | `/api/notifications` | Database notifications | Paginated |
| POST | `/api/notifications/mark-all-read` | Mark all as read | |

---

## 6. Push Notification Service (New Backend)

### Infrastructure Required

1. **Migration:** `push_tokens` table

```
id              bigint PK
user_id         bigint FK → users
token           string (Expo push token, unique)
device_name     string nullable
platform        enum('ios', 'android')
created_at      timestamp
updated_at      timestamp
```

2. **Model:** `PushToken` — belongs to User. User has many PushTokens.

3. **Service:** `PushNotificationService`
   - Sends via [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
   - Accepts: `user_id`, `title`, `body`, `data` (deep link info)
   - Resolves user's push tokens, sends to all registered devices
   - Handles expired/invalid tokens (remove from DB)

4. **Job:** `SendPushNotification`
   - Dispatched by `AlertRouter` when escalation channel = `'push'`
   - Dispatched by `WorkOrder` events (assigned, status changed)
   - Queued on `notifications` queue

5. **Wire into EscalationChain:** Add `'push'` as a recognized channel alongside `'whatsapp'`, `'email'`, `'sms'`.

### Push Notification Types

| Type | Trigger | Priority | Recipients |
|------|---------|----------|------------|
| Alert triggered (critical/high) | Alert created, severity ≥ high | Immediate | Escalation chain targets |
| Alert triggered (medium) | Alert created, severity = medium | Batched (5 min) | Escalation chain targets |
| Work order assigned | WO created/reassigned | Immediate | Assigned technician |
| Work order status changed | WO status updated | Normal | WO creator |
| Morning summary | Cron: 7:00 AM site timezone | Scheduled | site_viewer, site_manager |

---

## 7. Offline Support Strategy

### Read Cache (MMKV + React Query)

| Data | Cache Strategy | Stale Indicator |
|------|----------------|-----------------|
| Dashboard / site KPIs | Cache last response, `staleTime: 5 min` | "Updated 12 min ago" label |
| Device list | Cache per site, `staleTime: 5 min` | Stale badge |
| Alert list | Cache last page, `staleTime: 2 min` | "Offline — showing cached data" banner |
| Work order list | Cache, `staleTime: 5 min` | Stale badge |
| User profile + roles | Cache indefinitely until logout | — |

### Write Queue (MMKV)

Queued actions when offline, synced on reconnect:

| Action | Queue Key | Sync Trigger |
|--------|-----------|--------------|
| Acknowledge alert | `queue:alert:ack` | Network recovery + `useOnForeground()` |
| Resolve alert | `queue:alert:resolve` | Network recovery + `useOnForeground()` |
| Update WO status | `queue:wo:status` | Network recovery + `useOnForeground()` |
| Add WO note | `queue:wo:note` | Network recovery + `useOnForeground()` |

### Online-Only (Not Cached)

- Photo upload (too large for queue)
- Create work order (needs server-side validation)
- Floor plan images (lazy-loaded, cached by RN image cache — not MMKV)

### Network Status

- `useNetworkStatus()` hook — already exists in iot-expo template
- `NetworkBanner` component — shows at top when offline
- Queued action count badge shown in banner: "3 actions pending sync"

---

## 8. Data Types (Expo Side)

Extend `src/types/models.ts` in iot-expo with Astrea domain types. Mirror the web app's `resources/js/types/index.d.ts`:

```typescript
// Core
interface Site {
  id: number;
  name: string;
  organization_id: number;
  address: string | null;
  timezone: string;
  zones: Zone[];
  kpis: SiteKPIs;
}

interface Zone {
  id: number;
  site_id: number;
  name: string;
  floor_plan_id: number | null;
  devices: Device[];
}

interface Device {
  id: number;
  site_id: number;
  zone_id: number | null;
  dev_eui: string;
  name: string;
  model: string;
  status: 'pending' | 'provisioned' | 'active' | 'inactive' | 'maintenance';
  battery_pct: number | null;
  rssi: number | null;
  last_reading_at: string | null;
  gateway_id: number | null;
  gateway: Gateway | null;
  recipe: Recipe | null;
}

interface Gateway {
  id: number;
  site_id: number;
  name: string;
  status: 'online' | 'offline';
  last_seen_at: string | null;
}

interface Recipe {
  id: number;
  name: string;
  module_id: number;
  metrics: RecipeMetric[];
}

// Alert Engine
interface Alert {
  id: number;
  alert_rule_id: number;
  device_id: number;
  site_id: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved' | 'auto_resolved';
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  resolved_at: string | null;
  resolved_by: number | null;
  trigger_value: number;
  threshold_value: number;
  metric: string;
  device: Device;
  notifications: AlertNotification[];
}

interface AlertNotification {
  id: number;
  alert_id: number;
  user_id: number;
  channel: 'push' | 'whatsapp' | 'email' | 'sms';
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

// Operations
interface WorkOrder {
  id: number;
  site_id: number;
  device_id: number | null;
  assigned_to: number | null;
  created_by: number;
  type: 'installation' | 'maintenance' | 'repair' | 'inspection';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  title: string;
  description: string | null;
  completed_at: string | null;
  photos: WorkOrderPhoto[];
  notes: WorkOrderNote[];
  device: Device | null;
  site: Site;
  assignee: User | null;
  creator: User;
}

interface WorkOrderPhoto {
  id: number;
  work_order_id: number;
  file_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  uploaded_by: number;
  created_at: string;
}

interface WorkOrderNote {
  id: number;
  work_order_id: number;
  user_id: number;
  body: string;
  created_at: string;
  user: User;
}

// Readings
interface SensorReading {
  time: string;
  device_id: number;
  metric: string;
  value: number;
  unit: string;
}

// KPIs
interface SiteKPIs {
  total_devices: number;
  online_devices: number;
  online_pct: number;
  active_alerts: number;
  open_work_orders: number;
  last_reading_at: string | null;
}

interface ZoneSummary {
  zone_id: number;
  zone_name: string;
  device_count: number;
  avg_temperature: number | null;
  min_temperature: number | null;
  max_temperature: number | null;
  avg_humidity: number | null;
}
```

---

## 9. Implementation Phases

### Phase A: API Layer (iot-hub backend) — 1 week

| Task | Details |
|------|---------|
| Auth endpoints | Login (with `has_app_access` check), logout, user profile |
| Push token model + migration | `push_tokens` table, `PushToken` model |
| `PushNotificationService` | Expo Push API integration |
| Dashboard endpoint | Role-scoped KPIs aggregation |
| Site/Zone endpoints | Site list, site detail, zone detail |
| Device detail endpoint | Extend existing API controller |
| Alert endpoints | CRUD + acknowledge/resolve with role gating |
| Work order endpoints | CRUD + photos + notes |
| Notification endpoints | List + mark-all-read |
| Rate limiting | `throttle:60,1` for mobile endpoints |
| API tests | Feature tests for all new endpoints |

### Phase B: Core Screens (iot-expo) — 2 weeks

| Task | Details |
|------|---------|
| Navigation setup | Replace template tabs with 4 Astrea tabs |
| Auth flow | Wire login/logout to Sanctum API |
| Home screen | 3 role-variant dashboards |
| Alert screens | List + detail with role-gated actions |
| Work order screens | List + detail + create form |
| Stack screens | Site, Zone, Device, Floor Plan detail |
| API client | Configure React Query + auth interceptor |
| Role gating | `useAuth()` hook checks for action permissions |

### Phase C: Push Notifications — 1 week

| Task | Details |
|------|---------|
| Token registration | Register Expo push token on login |
| Foreground handling | Show in-app notification banner |
| Background handling | Badge count update |
| Deep linking | Notification tap → alert/WO detail screen |
| `SendPushNotification` job | Wire into AlertRouter + WO events |
| Morning summary | Scheduled job at 7:00 AM per site timezone |

### Phase D: Offline + Polish — 1 week

| Task | Details |
|------|---------|
| React Query cache config | `staleTime`, `gcTime` per query type |
| Offline write queue | MMKV queue + sync on reconnect |
| NetworkBanner | Offline indicator + pending action count |
| i18n | Add `sites`, `alerts`, `workOrders`, `devices` namespaces (EN/ES) |
| Biometric login | Optional, via `useBiometric()` hook |
| App Store metadata | Screenshots, description, privacy policy URL |

**Total estimated effort: ~5 weeks** (1 full-stack developer)

---

## 10. Verification Criteria

### Functional

- [ ] All ~20 API endpoints return correct data scoped to authenticated user
- [ ] `has_app_access = false` users are rejected at API login
- [ ] Each of the 15 screens renders with real data from the API
- [ ] Role gating enforced: site_viewer cannot acknowledge alerts, technician cannot create WOs
- [ ] Push notifications arrive on iOS and Android (critical/high = immediate)
- [ ] Deep linking from push notification opens correct screen
- [ ] Morning summary push delivered at 7:00 AM site timezone
- [ ] Offline: cached data displays with stale indicator
- [ ] Offline: queued actions sync on reconnect
- [ ] Photo upload attaches to work order and displays in gallery
- [ ] i18n: all user-facing strings available in EN and ES
- [ ] Floor plan view shows colored device dots with tap-to-read popover

### Non-Functional

- [ ] API response time < 500ms (p95) for list endpoints
- [ ] App cold start < 2 seconds
- [ ] 445+ existing backend tests still pass after API additions
- [ ] No regression in web app functionality

---

## 11. Dependencies & Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Push notifications need Expo project + Apple/Google credentials | Blocks Phase C | Medium | Set up EAS project early in Phase A |
| Web milestone M1 (ChirpStack live data) not done yet | No live readings charts | High | Mobile shows device metadata, alerts, WOs — charts deferred until M1 |
| `has_app_access` flag doesn't exist on User model yet | Auth gate broken | Low | Add migration in Phase A (boolean, default false) |
| Floor plan images may be large | Slow load on mobile | Medium | Use cached image component with progressive loading |
| Work order photo upload needs S3/storage | Upload fails without config | Low | `FileStorageService` already exists — expose via API endpoint |
| Expo Push API rate limits | Dropped notifications at scale | Low | Batch sends, respect 600 req/sec limit, use receipts API |

---

## 12. Out of Scope (v1)

- Org Admin features (user management, device provisioning, billing)
- Super Admin / Command Center
- Charts with historical sensor data (depends on web M2 chart work)
- Map view with site locations (Leaflet — web only for v1)
- Compliance reports / PDF generation
- Real-time WebSocket updates (pull-to-refresh for v1, add Reverb in v2)
- Sensor drag-drop on floor plan (web-only feature)
- QR code scanning for device identification (v2 candidate)
- Geofencing for auto-check-in at sites (v2 candidate)

---

## 13. Appendix: Business Rule References

Key business rules from `ASTREA_BUSINESS_RULES.md` that affect the mobile app:

| Rule | Summary | Mobile Impact |
|------|---------|---------------|
| AC-005 | Alert acknowledgment requires site_manager or technician role | site_viewer sees disabled acknowledge button |
| AC-006 | Alert resolution requires site_manager or technician role | site_viewer sees disabled resolve button |
| AC-003 | Alerts auto-resolve when metric returns to normal range | Mobile shows `auto_resolved` status, no action needed |
| WO-001 | Work order status machine: open → in_progress → completed | Mobile enforces same state transitions |
| OP-005 | Device auto-activates on first reading | Mobile shows real-time status updates |
| SC-001 | Users only see sites they are assigned to | All API endpoints scope by user-site assignments |
