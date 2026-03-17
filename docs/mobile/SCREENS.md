# Screen Inventory & Specification

Every screen in the `iot-expo` app, organized by navigation group.

---

## Auth Screens

These screens are shown when no authenticated user exists. They use the `Screen` layout component (gradient background, keyboard-aware scrolling).

### Login

| Field | Value |
|-------|-------|
| **File** | `app/(auth)/login.tsx` |
| **Purpose** | Email/password login with Zod validation |
| **Params** | None |
| **API calls** | `useAuth().login(email, password)` -> `authService.login()` -> `POST /api/auth/login` |
| **Key components** | `Screen`, `Input`, `Button`, `Separator`, `Icon` (react-hook-form `Controller`) |
| **Role restrictions** | None (unauthenticated only) |
| **Notes** | Redirects to `/(tabs)` if user already exists. Dev mode shows API URL and "Fill Demo Credentials" button. Default dev values: `demo@example.com` / `password`. |

### Register

| Field | Value |
|-------|-------|
| **File** | `app/(auth)/register.tsx` |
| **Purpose** | New user registration (name, email, password, confirm) |
| **Params** | None |
| **API calls** | `useAuth().register(data)` -> `authService.register()` -> `POST /api/register` |
| **Key components** | `Screen`, `Input`, `Button`, `Icon` (react-hook-form `Controller`) |
| **Role restrictions** | None (unauthenticated only) |
| **Notes** | Zod schema validates name (min 2), email, password (min 8), and password confirmation match. |

### Forgot Password

| Field | Value |
|-------|-------|
| **File** | `app/(auth)/forgot-password.tsx` |
| **Purpose** | Send password reset link via email |
| **Params** | None |
| **API calls** | `authService.forgotPassword(email)` -> `POST /api/forgot-password` |
| **Key components** | `Screen`, `Input`, `Button`, `Icon` (react-hook-form `Controller`) |
| **Role restrictions** | None (unauthenticated only) |
| **Notes** | Shows success confirmation view after link is sent. Back-to-login link at bottom. |

---

## Tab Screens

The 4 main authenticated tabs. All use `SafeAreaView`, `LinearGradient` background, and `ScreenHeader`.

### Home (Dashboard)

| Field | Value |
|-------|-------|
| **File** | `app/(tabs)/index.tsx` |
| **Purpose** | Role-adaptive dashboard with KPIs and site overview |
| **Params** | None |
| **API calls** | `getDashboard()` -> `GET /api/dashboard` |
| **Key components** | `ScreenHeader` (greeting variant), `EmptyState`, `Icon`, pull-to-refresh via `useSimpleRefresh` |
| **Role restrictions** | Content varies by role (see below) |

**Role-based layout:**

| Role | Content shown |
|------|---------------|
| `super_admin`, `org_admin`, `site_manager` | KPI row (devices, alerts, tasks) + multi-site cards with online %, device counts, alert counts |
| `site_viewer` | KPI row + single site card (first assigned site) |
| `technician` | KPI row + quick action rows ("My Work Orders", "Active Alerts") |

Each site card navigates to `/site/{id}`. KPI row shows total_devices with online_pct, active_alerts (red when > 0), open_work_orders.

### Alerts

| Field | Value |
|-------|-------|
| **File** | `app/(tabs)/alerts.tsx` |
| **Purpose** | Paginated, filterable list of alerts |
| **Params** | None |
| **API calls** | `getAlerts(filters)` -> `GET /api/alerts?severity=&status=&page=&per_page=` |
| **Key components** | `ScreenHeader` (title variant), `FlatList`, `Chip` (severity + status filters), `EmptyState`, `Icon` |
| **Role restrictions** | All authenticated users can view |

**Filters:**
- Severity: All, Critical, High, Medium, Low (via `Chip` toggle)
- Status: Active (default), All Statuses

**Pagination:** `onEndReached` triggers next page load (20 per page). Rows display severity color stripe, device name, site name, time ago.

Tapping a row navigates to `/alert/{id}`.

### Work Orders

| Field | Value |
|-------|-------|
| **File** | `app/(tabs)/work-orders.tsx` |
| **Purpose** | Paginated, filterable list of work orders |
| **Params** | None |
| **API calls** | `getWorkOrders(filters)` -> `GET /api/work-orders?status=&assigned_to=&page=&per_page=` |
| **Key components** | `ScreenHeader` (title variant), `FlatList`, `Chip` (status filter), `FAB` (create), `EmptyState`, `Icon` |
| **Role restrictions** | All can view. FAB (create) visible only if `canCreateWorkOrders()` returns true (`site_manager`, `org_admin`, `super_admin`). |

**Filters:**
- Status: All, Open, In Progress, Done
- Technicians see an additional "Assigned to me" chip (defaults to on)

**Pagination:** Same pattern as Alerts (20/page, onEndReached).

Each row shows title, site, status/priority/type pills, assigned user. Tapping navigates to `/work-order/{id}`. FAB navigates to `/create-work-order` (modal).

### Profile

| Field | Value |
|-------|-------|
| **File** | `app/(tabs)/profile.tsx` |
| **Purpose** | User info, role/org display, theme toggle, language toggle, logout |
| **Params** | None |
| **API calls** | `useAuth().logout()` -> `POST /api/auth/logout` |
| **Key components** | `ScreenHeader` (profile variant), `Card`, `CardContent`, `Button`, `Separator`, `Icon` |
| **Role restrictions** | None |

**Sections:**
1. **Role & Organization** -- shows primary role label and organization name
2. **Preferences** -- dark/light toggle (via `toggleColorMode`), EN/ES language toggle (via `toggleLanguage`)
3. **Account Info** -- name, email, verification status
4. **Actions** -- destructive logout button

Role labels: super_admin -> "Super Admin", org_admin -> "Org Admin", site_manager -> "Site Manager", site_viewer -> "Site Viewer", technician -> "Technician".

---

## Stack Screens

Detail screens pushed onto the root stack from tab or other detail screens.

### Alert Detail

| Field | Value |
|-------|-------|
| **File** | `app/alert/[id].tsx` |
| **Purpose** | Full alert detail with acknowledge/resolve actions |
| **Params** | `id` (number) via `useLocalSearchParams` |
| **API calls** | `getAlert(id)` -> `GET /api/alerts/{id}`, `acknowledgeAlert(id)` -> `POST /api/alerts/{id}/acknowledge`, `resolveAlert(id)` -> `POST /api/alerts/{id}/resolve` |
| **Key components** | `ScreenHeader` (title + back), `Button`, `Icon` |
| **Role restrictions** | Acknowledge/Resolve buttons visible only if `canAcknowledgeAlerts()` returns true (`site_manager`, `technician`, `org_admin`, `super_admin`) AND alert is not already resolved/dismissed |

**Sections displayed:**
1. Severity & Status pills
2. Device info (name, model, zone)
3. Trigger data (key-value pairs from `alert.data`)
4. Rule info (name, type) if present
5. Timeline (triggered, acknowledged, resolved timestamps)
6. Notifications sent (user, channel, status)
7. Action buttons (Acknowledge if active, Resolve always)

Both actions show a native `Alert.alert` confirmation dialog before executing.

### Work Order Detail

| Field | Value |
|-------|-------|
| **File** | `app/work-order/[id].tsx` |
| **Purpose** | Full work order detail with status transitions and notes |
| **Params** | `id` (number) via `useLocalSearchParams` |
| **API calls** | `getWorkOrder(id)` -> `GET /api/work-orders/{id}`, `updateWorkOrderStatus(id, status)` -> `PUT /api/work-orders/{id}/status`, `addWorkOrderNote(id, note)` -> `POST /api/work-orders/{id}/notes` |
| **Key components** | `ScreenHeader` (title + back), `Button`, `Icon`, `TextInput` (note input) |
| **Role restrictions** | None (all authenticated users see same UI) |

**Sections displayed:**
1. Title + status/priority/type pills
2. Description (if present)
3. Details (site, device, assigned_to, created_by, created date)
4. Notes list + add-note input with Send button
5. Photos count (if any)
6. Status transition buttons (context-dependent)

**Status transitions:**

| Current status | Available actions |
|---------------|------------------|
| `open` | Start Work (-> in_progress), Cancel |
| `assigned` | Start Work (-> in_progress), Cancel |
| `in_progress` | Complete, Cancel |
| `completed` | (none) |
| `cancelled` | (none) |

### Site Detail

| Field | Value |
|-------|-------|
| **File** | `app/site/[id]/index.tsx` |
| **Purpose** | Site overview with KPIs, zones, active alerts |
| **Params** | `id` (number) via `useLocalSearchParams` |
| **API calls** | `getSite(id)` -> `GET /api/sites/{id}` |
| **Key components** | `ScreenHeader` (title + back), `EmptyState`, `Icon` |
| **Role restrictions** | None |

**Sections displayed:**
1. KPI row (online devices/total, active alerts, open work orders)
2. Zones grid -- each zone card shows name, online/total bar, top 3 device names with online status dot. Device names are tappable (-> `/device/{id}`).
3. Floor Plan button (-> `/site/{id}/floor-plan`)
4. Active Alerts list -- severity-colored left border, tappable (-> `/alert/{id}`)

### Floor Plan

| Field | Value |
|-------|-------|
| **File** | `app/site/[id]/floor-plan.tsx` |
| **Purpose** | Placeholder for future interactive floor plan |
| **Params** | `id` (number) via `useLocalSearchParams` |
| **API calls** | None |
| **Key components** | `ScreenHeader` (title + back), `Button`, `Icon` |
| **Role restrictions** | None |
| **Notes** | Displays a "coming soon" message with a dashed icon container and a "Back to Site" button. |

### Device Detail

| Field | Value |
|-------|-------|
| **File** | `app/device/[id].tsx` |
| **Purpose** | Device health, readings, gateway, recipe info |
| **Params** | `id` (number) via `useLocalSearchParams` |
| **API calls** | `getDevice(id)` -> `GET /api/devices/{id}` |
| **Key components** | `ScreenHeader` (title + back showing device name and model), `Icon` |
| **Role restrictions** | None |

**Sections displayed:**
1. Online/Offline status dot with "Last seen X ago"
2. Vitals grid -- battery % (color-coded: >50 green, >20 amber, else red), signal strength (RSSI in dBm + label: Excellent/Good/Fair/Weak)
3. Site breadcrumb (tappable -> `/site/{id}`) with zone name
4. Device Info (model, DEV EUI, status, installed date)
5. Gateway info (model, status, last seen)
6. Recipe info (name)
7. Latest Readings grid -- metric name, value with unit, timestamp

### Create Work Order

| Field | Value |
|-------|-------|
| **File** | `app/create-work-order.tsx` |
| **Purpose** | Modal form to create a new work order |
| **Params** | None |
| **API calls** | `getSites()` -> `GET /api/sites` (to populate site picker), `createWorkOrder(siteId, data)` -> `POST /api/sites/{siteId}/work-orders` |
| **Key components** | `ScreenHeader` (title + close), `Input`, `Select`, `Button`, `Icon`, `KeyboardAvoidingView` |
| **Role restrictions** | Only reachable from Work Orders tab FAB, which is gated by `canCreateWorkOrders()` |

**Form fields:**

| Field | Type | Required | Options |
|-------|------|----------|---------|
| Site | Select | Yes | Dynamic from `getSites()` |
| Title | Text input | Yes | Max 255 chars |
| Type | Select | Yes | maintenance, inspection, install, battery_replace, sensor_replace |
| Priority | Select | Yes | urgent, high, medium, low |
| Description | Multiline text | No | -- |

Client-side validation before submit. On success, shows native alert and navigates back.

---

## Not Found

| Field | Value |
|-------|-------|
| **File** | `app/+not-found.tsx` |
| **Purpose** | 404 fallback screen |
| **Params** | None |
| **API calls** | None |
| **Key components** | `Button`, `Icon` |
| **Notes** | Shows error icon, "404" heading, and a "Go Home" button linking to `/(tabs)`. |
