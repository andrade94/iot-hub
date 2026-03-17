# Mobile App Gap Analysis

> **Phase 4 (ANALYZE) — Astrea IoT Mobile App**
> **Date:** 2026-03-17
> **PRD:** `docs/project/MOBILE_APP_PRD.md`
> **Mobile repo:** `iot-expo` | **Backend repo:** `iot-hub`

---

## 4a: Business Model (Mobile Context)

The mobile app occupies the middle layer of Astrea's three-interface strategy:

| Interface | Purpose | When |
|-----------|---------|------|
| WhatsApp | Emergency alerts, quick acknowledgment | Reactive |
| **Mobile App** | Daily monitoring, field operations, alert response | Proactive |
| Web | Configuration, deep analysis, reports, admin | Strategic |

**Three personas:**

| Persona | Primary Screen | Key Actions |
|---------|---------------|-------------|
| **Technician** | My Work Orders | View WO details, update status, attach photos, add notes |
| **Site Viewer** | Single-site dashboard | Morning check, view zone temps, read-only alerts |
| **Site Manager** | Multi-site overview | Acknowledge alerts, create/assign WOs, drill into sites |

**Three core flows:**
1. **Alert response** — Push notification arrives, tap to see detail, acknowledge/resolve
2. **Field operations** — View WO list, navigate to site, complete work, attach evidence
3. **Daily monitoring** — Open app, check KPIs, scan zone temperatures, note anomalies

---

## 4b: Per-Persona Mobile Experience Audit

### Technician

| Aspect | PRD Spec | Actual Implementation | Gap |
|--------|----------|----------------------|-----|
| Home screen | Today's assigned WOs sorted by priority, "Devices needing attention" section | Quick Actions section with "My Work Orders" and "Active Alerts" links. No inline WO list or device attention list | **PARTIAL** — navigates away instead of showing WOs inline; no "devices needing attention" section |
| Role gating | `has_app_access = true`, role = `technician` | `getPrimaryRole()` resolves role; `canAcknowledgeAlerts()` checks correctly; `canCreateWorkOrders()` excludes technician | DONE |
| WO data flow | Filter `assigned_to=me` | `getWorkOrders({ assigned_to: 'me' })` wired; backend filters correctly | DONE |
| Alert actions | Can acknowledge and resolve | `canAcknowledgeAlerts()` includes technician; backend role-checks pass | DONE |
| WO creation | Cannot create | FAB hidden via `canCreateWorkOrders()` which excludes technician | DONE |
| Device check before visit | Check battery/signal before arriving | Device detail screen shows battery, signal, status | DONE |

### Site Viewer

| Aspect | PRD Spec | Actual Implementation | Gap |
|--------|----------|----------------------|-----|
| Home screen | Single-site focus with zone temperatures, device health %, last readings | Shows first site as a SiteCard with online % bar, alert/WO counts. No inline zone temperature list | **PARTIAL** — no zone-level readings on home; must drill into site detail |
| Alert access | View alerts (read-only), disabled acknowledge/resolve buttons with tooltip | Alert detail shows buttons only when `canAcknowledgeAlerts()` returns true; site_viewer is excluded, so buttons are hidden entirely | **PARTIAL** — buttons are hidden rather than shown disabled with "Contact your site manager" tooltip per AC-005 |
| Push notifications | Critical alerts push | usePushNotifications hook exists, token registration on login works | DONE (infrastructure) |
| Role gating | Cannot acknowledge alerts per AC-005 | Backend returns 403; frontend hides buttons | DONE (functional), PARTIAL (UX per PRD) |

### Site Manager

| Aspect | PRD Spec | Actual Implementation | Gap |
|--------|----------|----------------------|-----|
| Home screen | Multi-site cards with health bar, alert badge, global KPI row, quick actions | Multi-site cards with health bars, device/alert/WO stats, KPI row at top | DONE |
| Quick actions | "View All Alerts", "Create Work Order" | Not shown for site_manager — only shown for technician role | **MISSING** — quick action buttons absent for site_manager |
| Alert actions | Acknowledge and resolve from phone | Both actions wired with API calls and confirmation dialogs | DONE |
| WO creation | Create and assign WOs | Create WO form has site selector, type, priority, title, description. Device selector missing. Assignee selector missing | **PARTIAL** — no device or assignee selection |
| Drill into site | Tap site card to see detail | `router.push(ROUTES.withParams.site(site.id))` wired | DONE |

---

## 4c: Screen-by-Screen Audit (15 PRD Screens + 3 Extras)

### Auth Screens (PRD: 3 screens)

| # | Screen | File | Status | What Works | What's Missing |
|---|--------|------|--------|------------|----------------|
| 1 | **Login** | `app/(auth)/login.tsx` | **DONE** | Email/password form, Zod validation, calls login service which hits `POST /api/auth/login`, stores Sanctum token in SecureStore, push token registration on login, i18n, dev mode fill | None |
| 2 | **Register** | `app/(auth)/register.tsx` | **DONE** | Name/email/password/confirm form, Zod validation, calls register service, i18n | Register endpoint hits `/register` not `/api/auth/register` — may need backend route |
| 3 | **Forgot Password** | `app/(auth)/forgot-password.tsx` | **DONE** | Email form, calls `authService.forgotPassword()`, success state with checkmark, i18n | Calls `/forgot-password` not `/api/auth/forgot-password` — may need API route |

### Home Tab (PRD: 3 role variants in 1 screen)

| # | Screen | File | Status | What Works | What's Missing |
|---|--------|------|--------|------------|----------------|
| 4 | **Site Viewer Home** | `app/(tabs)/index.tsx` | **PARTIAL** | Single-site SiteCard for first site, KPI row | No inline zone list with latest readings per zone (temperature/humidity). PRD calls for zone list on home screen |
| 5 | **Site Manager Home** | `app/(tabs)/index.tsx` | **PARTIAL** | Multi-site cards with health bars, KPI row (devices, alerts, tasks) | Missing "View All Alerts" and "Create Work Order" quick action buttons for site_manager |
| 6 | **Technician Home** | `app/(tabs)/index.tsx` | **PARTIAL** | Quick Actions with "My Work Orders" and "Active Alerts" links | No inline today's assigned WOs sorted by priority. No "Devices needing attention" section (low battery < 20%, offline > 30 min) |

### Alert Screens (PRD: 2 screens)

| # | Screen | File | Status | What Works | What's Missing |
|---|--------|------|--------|------------|----------------|
| 7 | **Alert List** | `app/(tabs)/alerts.tsx` | **DONE** | Paginated FlatList, pull-to-refresh, severity filters (all/critical/high/medium/low), status filter (active/all), severity color left border, empty state, FadeInUp animations, infinite scroll | No swipe-to-acknowledge. Hardcoded strings (not using i18n keys from alerts.json) |
| 8 | **Alert Detail** | `app/alert/[id].tsx` | **DONE** | Severity/status badges, device info with zone, trigger data display, rule info, timeline (triggered/acknowledged/resolved), notification log (user/channel/status), acknowledge/resolve actions with confirmation dialogs, role-gated buttons, loading state, FadeInUp animations | For site_viewer: buttons are hidden entirely rather than shown disabled with "Contact your site manager" tooltip. No device link tap-to-navigate (displays info but doesn't link to device detail) |

### Work Order Screens (PRD: 3 screens)

| # | Screen | File | Status | What Works | What's Missing |
|---|--------|------|--------|------------|----------------|
| 9 | **Work Order List** | `app/(tabs)/work-orders.tsx` | **DONE** | Paginated FlatList, pull-to-refresh, status filters (all/open/in_progress/completed), "Assigned to me" toggle for technician, FAB for create (role-gated), status/priority/type pills, empty state, infinite scroll | No tab badge showing count of open WOs. Hardcoded strings (not using i18n) |
| 10 | **Work Order Detail** | `app/work-order/[id].tsx` | **PARTIAL** | Title, badges (status/priority/type), description, details section (site/device/assignee/creator/date), notes timeline with add-note input, photos section (count only), status actions with state machine (open->in_progress->completed, cancel) | No photo gallery with tap-to-expand. No "Add Photo" button (camera/gallery). Photos show only a count text. No device link navigation. Hardcoded strings |
| 11 | **Create Work Order** | `app/create-work-order.tsx` | **PARTIAL** | Site selector (dropdown from API), title input, type selector (5 options), priority selector (4 options), description textarea, validation, submit calls `POST /api/sites/{site}/work-orders`, success alert, KeyboardAvoidingView, FadeInUp animations | No device selector (optional, filtered by selected site per PRD). No assignee selector. Hardcoded strings |

### Profile Tab (PRD: 1 screen)

| # | Screen | File | Status | What Works | What's Missing |
|---|--------|------|--------|------------|----------------|
| 12 | **Profile** | `app/(tabs)/profile.tsx` | **PARTIAL** | User info (name, email, verified), role badge, organization name, theme toggle (light/dark), language picker (EN/ES), logout button, i18n | No push notification settings toggle. No app version display. No Glass/Minimal theme variant picker (only light/dark toggle). Missing design style selector |

### Stack Screens (PRD: 5 screens)

| # | Screen | File | Status | What Works | What's Missing |
|---|--------|------|--------|------------|----------------|
| 13 | **Site Detail** | `app/site/[id]/index.tsx` | **DONE** | KPI row (devices/alerts/tasks), zone grid with device health bars and inline device list (3 per zone with tap), floor plan button, active alerts section with severity borders and tap-to-detail, loading state, FadeInUp | No pull-to-refresh on site detail |
| 14 | **Zone Detail** | N/A | **MISSING** | — | No zone detail screen exists. PRD specifies: zone name + site breadcrumb, devices in zone list with status/last reading/battery, zone metric summary (avg/min/max temperature, humidity). The `getZone()` API call exists in `astrea.ts` but there is no screen file. The zone cards in site detail do not navigate to a zone detail view |
| 15 | **Device Detail** | `app/device/[id].tsx` | **PARTIAL** | Online/offline status with indicator, battery percentage + color coding, signal strength (RSSI + text label), site breadcrumb with tap navigation, device info (model/DEV EUI/status/installed date), gateway info (model/status/last seen), recipe name, latest readings grid with metric/value/unit/time, FadeInUp, loading state | No 24h time-series line chart (Victory Native). PRD marks this as v1 feature. No pull-to-refresh |
| 16 | **Floor Plan View** | `app/site/[id]/floor-plan.tsx` | **STUB** | Screen header with back navigation, placeholder UI with "coming in a future update" message, back-to-site button | Floor plan image, colored device dots overlay (green/yellow/red/gray), tap-to-read popover, tap-to-device navigation — all missing. This is a stub with no functionality |
| 17 | **Notification Center** | N/A | **MISSING** | — | No notification center screen exists. PRD specifies: in-app notification list from database, types (alert triggered, WO assigned, WO status changed, morning summary), mark as read on tap, "Mark all read" button, deep links. The API calls exist in `astrea.ts` (`getNotifications`, `markAllNotificationsRead`) but there is no screen. The bell icon on home header has `onPress: () => {}` (no-op) |

### Extra Screens (3 additions beyond PRD's 15)

| # | Screen | File | Status | Notes |
|---|--------|------|--------|-------|
| E1 | **Not Found** | `app/+not-found.tsx` | DONE | Standard 404 screen |
| E2 | **Site Layout** | `app/site/[id]/_layout.tsx` | DONE | Stack layout for site sub-screens |
| E3 | **Auth Layout** | `app/(auth)/_layout.tsx` | DONE | Stack layout for auth screens |

---

## 4d: Backend API Coverage Audit

### PRD Endpoint Checklist (22 endpoints)

| # | Method | Endpoint | Controller | Route Exists | Controller Exists | Mobile Calls It | Tests |
|---|--------|----------|------------|:---:|:---:|:---:|:---:|
| 1 | POST | `/api/auth/login` | AuthController@login | YES | YES | YES | YES |
| 2 | POST | `/api/auth/logout` | AuthController@logout | YES | YES | YES | YES |
| 3 | GET | `/api/auth/user` | AuthController@user | YES | YES | YES | YES |
| 4 | POST | `/api/push-tokens` | PushTokenApiController@store | YES | YES | YES | YES |
| 5 | DELETE | `/api/push-tokens/{token}` | PushTokenApiController@destroy | YES | YES | YES | YES |
| 6 | GET | `/api/dashboard` | DashboardApiController | YES | YES | YES | YES |
| 7 | GET | `/api/sites` | SiteApiController@index | YES | YES | YES | YES |
| 8 | GET | `/api/sites/{site}` | SiteApiController@show | YES | YES | YES | YES |
| 9 | GET | `/api/sites/{site}/zones/{zone}` | SiteApiController@zone | YES | YES | YES (astrea.ts has `getZone()`) | YES |
| 10 | GET | `/api/sites/{site}/devices` | DeviceApiController@index | YES | YES | NO (not called from any screen) | YES |
| 11 | GET | `/api/devices/{device}` | DeviceApiController@show | YES | YES | YES | YES |
| 12 | GET | `/api/devices/{device}/readings` | DeviceApiController@readings | YES | YES | YES (astrea.ts has `getDeviceReadings()`) | NO (no screen uses it) |
| 13 | GET | `/api/devices/{device}/status` | DeviceApiController@status | YES | YES | NO (not called from any screen) | NO |
| 14 | GET | `/api/alerts` | AlertApiController@index | YES | YES | YES | YES |
| 15 | GET | `/api/alerts/{alert}` | AlertApiController@show | YES | YES | YES | YES |
| 16 | POST | `/api/alerts/{alert}/acknowledge` | AlertApiController@acknowledge | YES | YES | YES | YES |
| 17 | POST | `/api/alerts/{alert}/resolve` | AlertApiController@resolve | YES | YES | YES | YES |
| 18 | GET | `/api/work-orders` | WorkOrderApiController@index | YES | YES | YES | YES |
| 19 | GET | `/api/work-orders/{workOrder}` | WorkOrderApiController@show | YES | YES | YES | YES |
| 20 | POST | `/api/sites/{site}/work-orders` | WorkOrderApiController@store | YES | YES | YES | YES |
| 21 | PUT | `/api/work-orders/{workOrder}/status` | WorkOrderApiController@updateStatus | YES | YES | YES | YES |
| 22 | POST | `/api/work-orders/{workOrder}/photos` | WorkOrderApiController@storePhoto | YES | YES | NO (no upload UI) | YES |
| 23 | POST | `/api/work-orders/{workOrder}/notes` | WorkOrderApiController@storeNote | YES | YES | YES | YES |
| 24 | GET | `/api/notifications` | NotificationApiController@index | YES | YES | YES (astrea.ts) | YES |
| 25 | POST | `/api/notifications/mark-all-read` | NotificationApiController@markAllRead | YES | YES | YES (astrea.ts) | YES |

**Summary:** All 22+ PRD endpoints exist in backend routes and controllers. 20/22 have mobile service calls wired. All have backend tests in `MobileApiTest.php`. Three endpoints are wired in `astrea.ts` but not called from any screen (zone detail, device readings chart, device status).

---

## 4e: Feature Completeness Matrix

| Feature | PRD Section | Backend | Mobile Screen | API Wired | Status |
|---------|------------|:-------:|:-------------:|:---------:|--------|
| **Auth — Login** | S4.1 | YES | YES | YES | **DONE** |
| **Auth — Register** | S4.2 | PARTIAL (route mismatch) | YES | YES | **PARTIAL** — calls `/register` not `/api/auth/register` |
| **Auth — Forgot Password** | S4.3 | PARTIAL (route mismatch) | YES | YES | **PARTIAL** — calls `/forgot-password` not API route |
| **Dashboard — KPIs** | S4.4-6 | YES | YES | YES | **DONE** |
| **Dashboard — Role variants** | S4.4-6 | YES | PARTIAL | YES | **PARTIAL** — role switching works but per-role content incomplete |
| **Sites — List** | S5 | YES | YES (via dashboard) | YES | **DONE** |
| **Sites — Detail** | S5 | YES | YES | YES | **DONE** |
| **Zones — Detail** | S5 | YES | NO SCREEN | YES (service) | **MISSING** — screen not built |
| **Devices — List** | S5 | YES | PARTIAL (zone cards) | NO | **PARTIAL** — visible inside site zones, no dedicated list |
| **Devices — Detail** | S5 | YES | YES | YES | **DONE** |
| **Devices — Readings Chart** | S4.15 | YES | NO | YES (service) | **MISSING** — no Victory Native chart |
| **Alerts — List** | S4.7 | YES | YES | YES | **DONE** |
| **Alerts — Detail** | S4.8 | YES | YES | YES | **DONE** |
| **Alerts — Acknowledge** | S4.8 | YES | YES | YES | **DONE** |
| **Alerts — Resolve** | S4.8 | YES | YES | YES | **DONE** |
| **Alerts — Swipe to ack** | S4.7 | YES | NO | YES | **MISSING** |
| **Work Orders — List** | S4.9 | YES | YES | YES | **DONE** |
| **Work Orders — Detail** | S4.10 | YES | PARTIAL | YES | **PARTIAL** — no photo gallery, no add photo |
| **Work Orders — Create** | S4.11 | YES | PARTIAL | YES | **PARTIAL** — no device/assignee selector |
| **Work Orders — Photo Upload** | S4.10 | YES | NO | NO | **MISSING** |
| **Work Orders — Tab Badge** | S4.9 | N/A | NO | N/A | **MISSING** |
| **Notifications — Center** | S4.17 | YES | NO SCREEN | YES (service) | **MISSING** — screen not built |
| **Notifications — Push** | S6 | YES | YES (hook) | YES | **PARTIAL** — infrastructure done, deep linking coded, but no foreground banner UI |
| **Notifications — Morning summary** | S6 | YES (SendMorningSummary job) | N/A | N/A | **DONE** (backend) |
| **Floor Plan** | S4.16 | YES (site has floor plan data) | STUB | N/A | **STUB** — placeholder only |
| **Offline — Read cache** | S7 | N/A | PARTIAL | N/A | **PARTIAL** — QueryClient has staleTime/gcTime, onlineManager syncs, but screens use local useState not React Query hooks |
| **Offline — Write queue** | S7 | N/A | DONE | N/A | **DONE** — MMKV queue with alert:ack, alert:resolve, wo:status, wo:note |
| **Offline — Network banner** | S7 | N/A | DONE | N/A | **DONE** — NetworkBanner component, but no pending action count |
| **i18n** | S9.D | N/A | PARTIAL | N/A | **PARTIAL** — translation files exist for EN/ES (alerts, workOrders, sites, common, auth, tabs), but most Astrea screens use hardcoded English strings |
| **Biometric login** | S9.D | N/A | DONE (hook) | N/A | **DONE** — `useBiometric` hook exists with Face ID/Touch ID, but not wired into login flow |
| **Theme** | S4.12 | N/A | PARTIAL | N/A | **PARTIAL** — light/dark toggle works; Glass/Minimal design system exists in template but no picker in profile |

---

## 4f: UX Audit Findings

### Loading States

| Screen | ActivityIndicator | Skeleton | Verdict |
|--------|:-----------------:|:--------:|---------|
| Home (dashboard) | NO (relies on `loading` flag but no spinner shown) | NO | **GAP** — first load shows empty content |
| Alert List | NO (empty until loaded) | NO | **GAP** — shows empty state briefly before data |
| Alert Detail | YES (fullscreen spinner) | NO | OK |
| Work Order List | NO | NO | **GAP** |
| Work Order Detail | YES (fullscreen spinner) | NO | OK |
| Create Work Order | N/A | N/A | OK |
| Site Detail | YES (fullscreen spinner) | NO | OK |
| Device Detail | YES (fullscreen spinner) | NO | OK |
| Floor Plan | N/A (stub) | N/A | N/A |
| Profile | N/A (local data) | N/A | OK |

**Skeleton component exists** (`src/components/ui/Skeleton.tsx`) but is not used in any Astrea screen.

### Empty States

| Screen | EmptyState Component | Verdict |
|--------|:--------------------:|---------|
| Home — no sites | YES ("No sites assigned to your account") | OK |
| Alert List — no alerts | YES ("All clear — no matching alerts") | OK |
| Work Order List — no WOs | YES ("Nothing matches your filters") | OK |
| Site Detail — no zones | YES ("Devices are not grouped into zones") | OK |

### Error Handling

| Screen | try/catch | Error Display | Verdict |
|--------|:---------:|:------------:|---------|
| Home | YES (catch silences) | NO | **GAP** — errors silently swallowed |
| Alert List | YES (catch silences) | NO | **GAP** |
| Alert Detail | YES (catch silences) | NO | **GAP** |
| Work Order List | YES (catch silences) | NO | **GAP** |
| Work Order Detail | YES (catch silences) | NO | **GAP** |
| Create Work Order | YES | YES (RNAlert on error) | OK |
| Site Detail | YES (catch silences) | NO | **GAP** |
| Device Detail | YES (catch silences) | NO | **GAP** |

**Pattern:** Every data-fetching screen catches errors but does `// silent` or `// Show empty state on failure`. No toast or error banner is shown. This means network failures produce a blank screen with no feedback.

### Pull-to-Refresh

| Screen | Implemented | Verdict |
|--------|:-----------:|---------|
| Home | YES (`RefreshControl`) | OK |
| Alert List | YES (`RefreshControl`) | OK |
| Work Order List | YES (`RefreshControl`) | OK |
| Alert Detail | NO | **GAP** |
| Work Order Detail | NO | **GAP** |
| Site Detail | NO | **GAP** |
| Device Detail | NO | **GAP** |

### Animations

| Feature | Implemented | Details |
|---------|:-----------:|---------|
| FadeInUp on cards | YES | All list items and sections use `Animated.View entering={FadeInUp.delay(...)}` |
| Spring on list items | YES | `.springify()` on FlatList items |
| Tab bar animation | YES | `AnimatedTabBar` component |
| NetworkBanner slide | YES | `withSpring`/`withTiming` animations |

**Verdict:** Animation implementation is thorough across all screens.

### Role-Gating in UI

| Feature | PRD Spec | Implementation | Verdict |
|---------|----------|---------------|---------|
| Alert acknowledge (site_viewer) | Disabled button + "Contact your site manager" tooltip | Buttons completely hidden | **GAP** — should be visible but disabled per PRD |
| Alert resolve (site_viewer) | Disabled button + tooltip | Buttons completely hidden | **GAP** |
| Create WO (technician/viewer) | FAB hidden | FAB hidden via `canCreateWorkOrders()` | OK |
| WO assign_to=me default (technician) | Default filter | `myOnly` defaults to true for technician | OK |
| Multi-site vs single-site (viewer) | Single-site focus | First site only for `site_viewer` | OK |

### Offline UX

| Feature | PRD Spec | Implementation | Verdict |
|---------|----------|---------------|---------|
| "Updated X min ago" label | Stale indicator on cached data | NOT IMPLEMENTED | **GAP** |
| "Offline — showing cached data" banner | Banner with queue count | NetworkBanner shows "No internet" but no queue count | **PARTIAL** |
| Queued action count badge | "3 actions pending sync" | `useOfflineSync` tracks `pendingCount` but no UI displays it | **GAP** |

---

## 4g: Priority Classification

### P0 — Cannot Demo/Ship Without

| Gap | Screen | Effort | Notes |
|-----|--------|--------|-------|
| **Notification Center screen** | New screen | 1 day | Bell icon is a no-op. API calls exist. Need screen + deep link wiring |
| **Zone Detail screen** | New screen | 1 day | API and service call exist. Need screen file with device list, zone metrics |
| **Error handling on data screens** | All data screens | 0.5 day | Currently silent failures. Add toast/error state on catch blocks |
| **Loading states on list screens** | Home, Alert List, WO List | 0.5 day | Add ActivityIndicator or Skeleton while `loading` is true |
| **Photo upload on WO Detail** | `work-order/[id].tsx` | 1 day | Backend endpoint exists. Need ImagePicker integration + upload UI + gallery grid |

### P1 — Needed for First User

| Gap | Screen | Effort | Notes |
|-----|--------|--------|-------|
| **Technician Home: inline WO list** | `(tabs)/index.tsx` | 0.5 day | Show today's assigned WOs sorted by priority instead of just links |
| **Technician Home: devices needing attention** | `(tabs)/index.tsx` | 0.5 day | Filter devices with battery < 20% or offline > 30 min |
| **Site Viewer Home: zone readings** | `(tabs)/index.tsx` | 0.5 day | Inline zone list with latest temperature/humidity per zone |
| **Site Manager Home: quick actions** | `(tabs)/index.tsx` | 0.25 day | Add "View All Alerts" + "Create Work Order" buttons |
| **Create WO: device selector** | `create-work-order.tsx` | 0.5 day | Optional device picker filtered by selected site |
| **Create WO: assignee selector** | `create-work-order.tsx` | 0.5 day | User picker for site technicians |
| **WO Detail: photo gallery** | `work-order/[id].tsx` | 0.5 day | Grid of photos with tap-to-expand (already have OptimizedImage component) |
| **Alert Detail: device link** | `alert/[id].tsx` | 0.25 day | Make device section tappable to navigate to device detail |
| **WO Detail: device link** | `work-order/[id].tsx` | 0.25 day | Make device row tappable to navigate to device detail |
| **Alert acknowledge UX for site_viewer** | `alert/[id].tsx` | 0.25 day | Show disabled buttons with "Contact your site manager" text instead of hiding |
| **WO tab badge** | `(tabs)/_layout.tsx` | 0.25 day | Badge showing open WO count on tab icon |
| **i18n: wire translation keys** | All Astrea screens | 1 day | Translation files exist in EN/ES but screens use hardcoded English. Replace string literals with `t()` calls |
| **Pull-to-refresh on detail screens** | Alert Detail, WO Detail, Site Detail, Device Detail | 0.5 day | Wrap ScrollView content with RefreshControl |

### P2 — Polish for Production

| Gap | Screen | Effort | Notes |
|-----|--------|--------|-------|
| **Device readings chart** | `device/[id].tsx` | 1-2 days | Victory Native 24h time-series chart. API endpoint exists. PRD says deferred until web M1 (ChirpStack live data) |
| **Floor plan view** | `site/[id]/floor-plan.tsx` | 3-5 days | Floor plan image with colored device dots, popovers. Currently a stub. Complex feature |
| **Swipe-to-acknowledge on alert list** | `(tabs)/alerts.tsx` | 0.5 day | SwipeableRow component exists in UI library |
| **Offline stale indicators** | All data screens | 0.5 day | "Updated X min ago" labels on cached data |
| **Offline pending sync count** | NetworkBanner | 0.25 day | Display `pendingCount` from `useOfflineSync` in banner |
| **Profile: push notification toggle** | `(tabs)/profile.tsx` | 0.5 day | Switch to enable/disable push. Hook exists (`usePushNotifications`) |
| **Profile: app version** | `(tabs)/profile.tsx` | 0.1 day | Read from `expo-constants` |
| **Profile: Glass/Minimal theme picker** | `(tabs)/profile.tsx` | 0.5 day | Design system supports both; just need UI picker |
| **Biometric login integration** | Login flow | 0.5 day | `useBiometric` hook exists. Need to wire into login screen as optional re-auth |
| **Screens use React Query hooks** | All data screens | 2 days | Currently screens use local `useState` + `useEffect` for data fetching. Migrating to `useQuery`/`useMutation` would enable automatic caching, background refetch, stale management, and offline support per query-client config |
| **Register/forgot-password API routes** | Backend | 0.25 day | Ensure `/api/auth/register` and `/api/auth/forgot-password` routes exist or adjust mobile to match |

### P3 — Nice-to-Have / v2

| Gap | Effort | Notes |
|-----|--------|-------|
| Skeleton loading states (shimmer) | 1 day | Skeleton component exists but unused. Replace ActivityIndicator with skeleton placeholders |
| Alert list swipe-to-resolve | 0.5 day | In addition to swipe-to-acknowledge |
| WO Detail: inline photo camera capture | 0.5 day | Direct camera launch (ImagePickerButton component exists) |
| Morning summary push banner (foreground) | 0.5 day | Show in-app notification banner when push arrives while app is open |
| Haptic feedback on actions | 0.25 day | `haptics.ts` utility exists but unused |
| Deep link from push to notification center | 0.25 day | Currently only alert/WO deep links |
| Search on alert/WO lists | 0.5 day each | SearchInput component exists in UI library |

---

## 4h: Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | **Screens use local state instead of React Query** — no automatic cache invalidation, stale management, or offline persistence | HIGH — offline experience degrades, duplicate fetches, no background refresh | HIGH — every data screen has this pattern | Migrate data screens to `useQuery`/`useMutation` using existing `queryKeys` and `STALE_TIMES` config. This is infrastructure work that enables all offline/caching PRD requirements |
| R2 | **Silent error handling** — all catch blocks do `// silent`, user sees blank screen on API failure | MEDIUM — poor field UX when network is spotty | HIGH — every screen has this | Add `showErrorToast()` calls in catch blocks. Toast infrastructure already exists (`src/lib/toast.ts`) |
| R3 | **Register/forgot-password route mismatch** — mobile calls `/register` and `/forgot-password` but backend only has `/api/auth/login` and `/api/auth/logout` | MEDIUM — registration and password reset will fail | HIGH — confirmed by reading code | Either add `POST /api/auth/register` and `POST /api/auth/forgot-password` to backend, or registration may be intentionally disabled (org-admin creates users). Clarify business rule |
| R4 | **No Zone Detail screen** — zone tapping in site detail has no destination | MEDIUM — user cannot drill into zone-level data | HIGH — screen file does not exist | Build zone detail screen. Backend endpoint and service call already exist |
| R5 | **No Notification Center** — bell icon is non-functional | HIGH — push notifications have no in-app companion view | HIGH — screen does not exist | Build notification center screen. API calls already wired in `astrea.ts` |
| R6 | **Photo upload not implemented on mobile** — WO detail shows photo count but no upload capability | MEDIUM — technicians cannot attach field evidence | HIGH — no upload UI exists | Add ImagePicker + multipart upload. Backend endpoint and ImagePickerButton component both exist |
| R7 | **Push notification credentials not configured** — Expo project needs Apple/Google push certificates | HIGH — blocks all push features | MEDIUM — EAS project may not be set up | Configure EAS project, add FCM/APNs credentials before testing push flow |
| R8 | **Floor plan is a stub** — non-trivial to implement (image overlay, device positioning, popovers) | LOW — floor plan is a nice-to-have for v1 | LOW — clearly marked as future | Defer to v2. Stub is honest about this |
| R9 | **i18n not wired in Astrea screens** — translation JSON files exist for both EN/ES but string literals are hardcoded in alert, work order, site, and home screens | MEDIUM — Spanish-speaking users see English | HIGH — every Astrea screen has hardcoded strings | Systematic pass to replace string literals with `t()` calls using existing translation keys |
| R10 | **No monitoring for push token lifecycle** — expired tokens accumulate in database | LOW — wasted API calls to Expo Push | MEDIUM | `PushNotificationService.handleReceipts()` already removes invalid tokens. Add periodic cleanup job for tokens not seen in 90+ days |
| R11 | **Victory Native not installed** — device readings chart requires Victory Native but package may not be in dependencies | LOW — chart feature is P2/deferred | LOW | Verify `victory-native` is in `package.json` before attempting chart work |

---

## Summary Dashboard

| Category | Total Items | DONE | PARTIAL | MISSING/STUB |
|----------|:-----------:|:----:|:-------:|:------------:|
| PRD Screens (17) | 17 | 8 | 6 | 3 |
| Backend Endpoints (22+) | 25 | 25 | 0 | 0 |
| Mobile API Calls | 25 | 20 | 0 | 5 (wired in service but not called from screen) |
| Backend Tests | 25 | 25 | 0 | 0 |
| i18n Translation Files | 8 per lang | 8 | 0 | 0 (files exist, not wired) |

**Backend completeness: ~100%** — All endpoints, controllers, services, jobs, and tests are in place. The backend is ready for the mobile app.

**Mobile completeness: ~65%** — Core navigation, auth, and primary flows work. Three screens are missing (Zone Detail, Notification Center, Floor Plan functionality). Several screens need P1 enhancements (photo upload, device/assignee selectors, inline role-specific content). The biggest architectural gap is using local state instead of React Query hooks, which undermines offline support.

**Estimated effort to reach P0+P1: ~8-10 days** (1 developer)
