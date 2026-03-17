# Astrea Mobile App -- Business Rules Document

> **Date:** 2026-03-17
> **PRD version:** v1.1
> **Codebase commit:** iot-expo HEAD (2026-03-17)
> **Backend reference:** `docs/project/ASTREA_BUSINESS_RULES.md` (65 rules)
> **Source:** All rules derived from code analysis of the `iot-expo` repository. Implementation status verified against actual source files.

---

## 1. Access & Authorization (MA-ACC-xxx)

Rules governing how users authenticate, how roles are resolved, and how sessions/tokens are managed on the mobile device.

---

### MA-ACC-001: Login Gate -- has_app_access

**Title:** API login rejects users without mobile app access

**Description:** When a user submits credentials via the login screen, the app calls `POST /api/auth/login` with `{ email, password, device_name }`. The backend `AuthController@login` checks the `has_app_access` boolean column on the User model. If `has_app_access` is `false`, the backend returns HTTP 403 and the login fails. The mobile app displays the error message via a toast (`showErrorToast`). The `AstreaUser` type includes `has_app_access: boolean` but the mobile app does not perform a client-side check -- enforcement is purely server-side.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Mobile login call: `src/services/auth.ts:88-111` (calls `/auth/login`)
- Login screen error display: `app/(auth)/login.tsx:53-54` (catch -> showErrorToast)
- AstreaUser type: `src/types/astrea.ts:187-198` (has_app_access field)
- Backend enforcement: `app/Http/Controllers/Api/AuthController.php` (server-side)

**Backend reference:** Extends AC-001 (Authentication) from ASTREA_BUSINESS_RULES.md

---

### MA-ACC-002: Role Resolution Priority

**Title:** `getPrimaryRole()` resolves a single display role from the roles array

**Description:** The backend returns a `roles: string[]` array on the user object. The mobile app resolves a single primary role using `getPrimaryRole()` with the following priority order: `super_admin` > `org_admin` > `site_manager` > `technician` > `site_viewer`. If no recognized role is found, defaults to `site_viewer`. This primary role drives the home screen variant, FAB visibility, alert action visibility, and navigation behavior. The function uses `Array.find()` against the priority list, so the first match wins.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Function: `src/types/astrea.ts:209-211`
- Usage in Home: `app/(tabs)/index.tsx:28`
- Usage in Profile: `app/(tabs)/profile.tsx:28`
- Usage in Work Orders: `app/(tabs)/work-orders.tsx:27`

---

### MA-ACC-003: Push Token Registration on Login

**Title:** Expo push token registered with backend after successful login

**Description:** After a successful login (credentials accepted, user set in Zustand store), the `useAuth` store's `login` action fires `registerForPushNotificationsAsync()` asynchronously (non-blocking). If a token is obtained, it calls `POST /api/push-tokens` with `{ token, device_name, platform }`. The `device_name` is derived from `expo-device` (`Device.modelName` + `Device.osName`). The `platform` is `'ios'` or `'android'` based on `Platform.OS`. Push token registration failure is logged as a warning but does not block login flow. Registration requires a physical device (`Device.isDevice` check) and the `enablePushNotifications` feature flag to be `true` in `APP_CONFIG`.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Login action with push registration: `src/hooks/useAuth.ts:47-58`
- Token registration function: `src/hooks/usePushNotifications.ts:44-99`
- API call: `src/services/astrea.ts:193-198`
- Feature flag check: `src/hooks/usePushNotifications.ts:46-49` (`APP_CONFIG.features.enablePushNotifications`)
- Feature flag default: `src/constants/app.ts:43` (reads from env var `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS`)

---

### MA-ACC-004: Push Token Unregistration on Logout

**Title:** Push token unregistered from backend before logout

**Description:** When the user triggers logout, the `useAuth` store's `logout` action calls `registerForPushNotificationsAsync()` to obtain the current token, then calls `DELETE /api/push-tokens/{token}` to unregister it from the backend. This is fire-and-forget -- failure is silently caught and the logout proceeds regardless. After token unregistration, `authService.logout()` calls `POST /api/auth/logout` to revoke the Sanctum token, then clears SecureStore (`auth_token`, `refresh_token`, `user_data`).

**Implementation status:** IMPLEMENTED

**Code reference:**
- Logout action: `src/hooks/useAuth.ts:77-98`
- Token unregistration API: `src/services/astrea.ts:201-203`
- SecureStore cleanup: `src/services/auth.ts:324-328`

---

### MA-ACC-005: Session Token Storage in SecureStore

**Title:** Sanctum bearer token stored in expo-secure-store with no client-side expiration

**Description:** Upon successful login, the Sanctum API token is stored in `expo-secure-store` under the key `auth_token`. The user object is also stored under `user_data` as a JSON string. There is no client-side token expiration timer -- the token persists until the user logs out or the backend returns HTTP 401. The API client (`src/services/api.ts`) attaches the token as a `Bearer` header on every request. On 401 response, the client attempts token refresh via `POST /auth/refresh` using a stored `refresh_token`; if refresh fails, all auth data is cleared from SecureStore and the user is redirected to the login screen.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Token storage on login: `src/services/auth.ts:99-100`
- Token retrieval for requests: `src/services/api.ts:72-79`
- Bearer header attachment: `src/services/api.ts:156-161`
- 401 handling with refresh attempt: `src/services/api.ts:192-199`
- Auth data clear on unrecoverable 401: `src/services/api.ts:84-93`

---

### MA-ACC-006: Auth-Based Navigation Guard

**Title:** Unauthenticated users are redirected to login; authenticated users skip auth screens

**Description:** The root layout (`app/_layout.tsx`) watches the `user` state from `useAuth` and the current route segment. If `user` is null and the current route is not in the `(auth)` group, the app navigates to `/(auth)/login`. If `user` is not null and the current route is in the `(auth)` group, the app navigates to `/(tabs)`. This check runs whenever `user`, `isLoading`, `storageReady`, or the route segment changes. The login screen also has a `Redirect` component that sends already-authenticated users to `/(tabs)`.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Root layout guard: `app/_layout.tsx:55-65`
- Login screen redirect: `app/(auth)/login.tsx:44-46`

---

## 2. Navigation & Role Gating (MA-NAV-xxx)

Rules governing which UI elements are visible or interactive based on the user's resolved role.

---

### MA-NAV-001: Home Screen Role Variants

**Title:** Home screen shows different content based on primary role

**Description:** The home screen (`app/(tabs)/index.tsx`) renders one of three variants based on `getPrimaryRole()`:

1. **Site Manager / Org Admin / Super Admin** -- Multi-site cards section. Each `SiteCard` shows site name, address, online percentage health bar, device count, alert count badge, and work order count. Tapping a card navigates to `/site/{id}`.
2. **Site Viewer** -- Single-site focus. Shows only the first site from the dashboard response as a `SiteCard` with its name as the section title.
3. **Technician** -- Quick Actions section with two `ActionRow` buttons: "My Work Orders" (navigates to work orders tab) and "Active Alerts" (navigates to alerts tab, with count subtitle).

All three variants share a top KPI row showing Devices (total + online %), Alerts (active count), and Tasks (open work order count). The bell icon in the header shows the active alerts count as a badge but the `onPress` handler is a no-op (notification center not built).

**Implementation status:** IMPLEMENTED

**Code reference:**
- Role resolution: `app/(tabs)/index.tsx:28`
- Site Manager variant: `app/(tabs)/index.tsx:83-93`
- Site Viewer variant: `app/(tabs)/index.tsx:96-101`
- Technician variant: `app/(tabs)/index.tsx:104-128`
- KPI row: `app/(tabs)/index.tsx:74-79`
- Bell icon no-op: `app/(tabs)/index.tsx:63`

---

### MA-NAV-002: FAB Visibility for Work Order Creation

**Title:** Floating Action Button on Work Orders tab is visible only for roles that can create work orders

**Description:** The Work Orders list screen renders a `FAB` component (floating action button) with a "+" icon that navigates to `/create-work-order`. The FAB is rendered conditionally based on `canCreateWorkOrders(roles)`, which returns `true` only if the user has any of: `site_manager`, `org_admin`, `super_admin`. Technicians and site viewers do not see the FAB.

**Implementation status:** IMPLEMENTED

**Code reference:**
- FAB conditional render: `app/(tabs)/work-orders.tsx:120-122`
- `canCreateWorkOrders()`: `src/types/astrea.ts:218-219`

---

### MA-NAV-003: Alert Action Visibility

**Title:** Acknowledge/resolve buttons are visible only for roles that can manage alerts

**Description:** The Alert Detail screen renders acknowledge and resolve buttons conditionally based on `canAcknowledgeAlerts(roles)`. The function returns `true` for: `site_manager`, `technician`, `org_admin`, `super_admin`. Site viewers see no action buttons at all -- the buttons are completely hidden, not disabled. The PRD specifies showing disabled buttons with a "Contact your site manager" tooltip for site viewers, but the current implementation hides them entirely.

Additionally, the acknowledge button only appears when `alert.status === 'active'` (already-acknowledged alerts skip straight to resolve). The resolve button appears when status is neither `'resolved'` nor `'dismissed'`.

**Implementation status:** PARTIAL (buttons hidden rather than disabled per PRD spec)

**Code reference:**
- `canAcknowledgeAlerts()`: `src/types/astrea.ts:214-216`
- Conditional action rendering: `app/alert/[id].tsx:191-198`
- Acknowledge only for active: `app/alert/[id].tsx:193`

**Backend reference:** Ref AC-005, AC-006 from ASTREA_BUSINESS_RULES.md

---

### MA-NAV-004: Tab Bar Configuration

**Title:** Four-tab navigation with animated tab bar

**Description:** The tab layout defines four tabs in fixed order: Home, Alerts, Work Orders, Profile. The tab bar uses a custom `AnimatedTabBar` component. Tab titles for Home and Profile use i18n translations from the `tabs` namespace (`t('home')`, `t('profile')`). Alerts and Work Orders tab titles are hardcoded English strings. There is no badge on the Work Orders tab showing the count of open WOs -- the PRD specifies this but it is not implemented.

**Implementation status:** PARTIAL (no WO tab badge; Alerts/Work Orders titles not i18n)

**Code reference:**
- Tab layout: `app/(tabs)/_layout.tsx:14-76`
- i18n titles: `app/(tabs)/_layout.tsx:46` (Home), `app/(tabs)/_layout.tsx:69` (Profile)
- Hardcoded titles: `app/(tabs)/_layout.tsx:54` ("Alerts"), `app/(tabs)/_layout.tsx:61` ("Work Orders")

---

### MA-NAV-005: Technician Default Work Order Filter

**Title:** Technician role defaults to "Assigned to me" filter on Work Orders list

**Description:** The Work Orders list screen initializes `myOnly` to `true` when the primary role is `technician`, which adds `assigned_to: 'me'` to the API query parameters. This filters the list to show only work orders assigned to the current user. The technician sees an "Assigned to me" toggle chip to switch the filter on/off. Non-technician roles do not see this toggle and see all work orders by default.

**Implementation status:** IMPLEMENTED

**Code reference:**
- `myOnly` default: `app/(tabs)/work-orders.tsx:37`
- Technician toggle chip: `app/(tabs)/work-orders.tsx:95-99`
- Filter application: `app/(tabs)/work-orders.tsx:43`

---

## 3. Data Fetching & Caching (MA-DAT-xxx)

Rules governing how data is fetched, cached, and refreshed across the app.

---

### MA-DAT-001: React Query Default staleTime

**Title:** Default staleTime is 5 minutes; alerts have 2 minutes

**Description:** The `QueryClient` is configured in `src/lib/query-client.ts` with a default `staleTime` of 5 minutes (300,000 ms) and a `gcTime` (garbage collection time) of 30 minutes (1,800,000 ms). Per-query staleTime overrides are defined in the `STALE_TIMES` constant:

| Query type | staleTime |
|------------|-----------|
| `dashboard` | 5 min |
| `alerts` | 2 min |
| `workOrders` | 5 min |
| `sites` | 5 min |
| `device` | 5 min |
| `user` | Infinity (until logout) |

However, these `STALE_TIMES` and `queryKeys` are defined but **not actually used** by any screen. All data-fetching screens use manual `useState` + `useEffect` + `fetch` patterns instead of `useQuery` hooks. The QueryClient configuration exists as infrastructure for a future migration.

**Implementation status:** PARTIAL (QueryClient configured; screens do not use React Query hooks)

**Code reference:**
- QueryClient config: `src/lib/query-client.ts:12-25`
- Stale times: `src/lib/query-client.ts:49-56`
- Query keys: `src/lib/query-client.ts:30-41`
- Example screen not using RQ: `app/(tabs)/index.tsx:24-39` (manual useState/useEffect)

---

### MA-DAT-002: Online Manager Network Sync

**Title:** React Query pauses queries when offline via onlineManager

**Description:** The `onlineManager` from `@tanstack/react-query` is configured to listen to `@react-native-community/netinfo` events. When the device loses connectivity (`state.isConnected` is false), React Query automatically pauses all pending queries. When connectivity is restored, queries resume automatically with `refetchOnReconnect: 'always'` (configured as a default query option). This is operational at the QueryClient level, but since screens use manual fetching rather than `useQuery`, the automatic pause/resume behavior does not apply to current screens.

**Implementation status:** PARTIAL (onlineManager wired; screens bypass it with manual fetching)

**Code reference:**
- onlineManager setup: `src/lib/query-client.ts:6-9`
- refetchOnReconnect config: `src/lib/query-client.ts:19`

---

### MA-DAT-003: Retry Configuration

**Title:** GET requests retry twice with exponential backoff; mutations retry once

**Description:** The QueryClient is configured with `retry: 2` for queries and `retry: 1` for mutations. Separately, the API client (`src/services/api.ts`) has its own retry logic: GET requests default to 2 retries with exponential backoff (base delay 500ms, max 10,000ms, plus 0-25% jitter). Retryable conditions include HTTP status codes 408, 429, 500, 502, 503, 504, plus `TIMEOUT` and `NETWORK_ERROR` error codes. POST/PUT/PATCH/DELETE requests do not retry by default (retries=0) unless explicitly specified.

**Implementation status:** IMPLEMENTED

**Code reference:**
- QueryClient retry config: `src/lib/query-client.ts:17-22`
- API client retry config: `src/services/api.ts:35-46`
- GET default retries: `src/services/api.ts:281-284`
- POST no retry default: `src/services/api.ts:286-290`
- Backoff calculation: `src/services/api.ts:51-55`

---

### MA-DAT-004: API Base URL Configuration

**Title:** API URL from environment variable with `/api` prefix

**Description:** The API base URL is read from `EXPO_PUBLIC_API_URL` environment variable, defaulting to `http://localhost:8000/api`. All API calls in `src/services/astrea.ts` use relative paths (e.g., `/auth/login`, `/alerts`, `/work-orders`) which are appended to this base URL. The API client validates the URL format on startup and warns if it points to localhost in production.

**Implementation status:** IMPLEMENTED

**Code reference:**
- URL config: `src/config/index.ts:4`
- URL validation: `src/config/index.ts:14-35`
- Usage in fetch: `src/services/api.ts:144`

---

## 4. Offline Write Queue (MA-OFF-xxx)

Rules governing how write operations are queued when offline and synced when connectivity returns.

---

### MA-OFF-001: Queued Action Types

**Title:** Four action types are queued for offline execution

**Description:** The offline write queue (`src/lib/offline-queue.ts`) supports exactly four action types:

| Type | Payload | API Call |
|------|---------|----------|
| `alert:ack` | `{ alertId: number }` | `acknowledgeAlert(alertId)` |
| `alert:resolve` | `{ alertId: number }` | `resolveAlert(alertId)` |
| `wo:status` | `{ workOrderId: number, status: string }` | `updateWorkOrderStatus(workOrderId, status)` |
| `wo:note` | `{ workOrderId: number, note: string }` | `addWorkOrderNote(workOrderId, note)` |

Each queued action has a unique `id` (timestamp + random), `type`, `payload`, and `createdAt` timestamp.

**Implementation status:** IMPLEMENTED

**Code reference:**
- QueuedAction type: `src/lib/offline-queue.ts:13-18`
- processAction switch: `src/lib/offline-queue.ts:89-111`

---

### MA-OFF-002: Queue Storage Mechanism

**Title:** Offline queue persisted via appStorage (AsyncStorage with in-memory cache)

**Description:** Queued actions are stored as a JSON array under the key `offline_queue` in `appStorage`. The `appStorage` abstraction uses `AsyncStorage` for persistence with a synchronous in-memory `Map` cache for instant reads. The queue is read synchronously from the cache via `getQueue()` and written back with both cache update and async `AsyncStorage.setItem()`. The queue is cleared on logout (not currently wired, but `clearQueue()` exists). Note: Despite the PRD referencing MMKV, the actual implementation uses AsyncStorage with the comment "for production apps, consider using MMKV which is ~30x faster."

**Implementation status:** IMPLEMENTED (using AsyncStorage, not MMKV)

**Code reference:**
- Storage key: `src/lib/offline-queue.ts:11`
- Queue read: `src/lib/offline-queue.ts:23-25`
- Queue write (enqueue): `src/lib/offline-queue.ts:37-47`
- Storage abstraction: `src/lib/storage.ts:63-122`
- MMKV note: `src/lib/storage.ts:7-11`

---

### MA-OFF-003: Sync Triggers

**Title:** Offline queue syncs on network recovery and app foreground

**Description:** The `useOfflineSync` hook triggers queue sync in two scenarios:

1. **Network recovery** -- When `isConnected` transitions from false to true (detected via `useNetworkStatus` which listens to `@react-native-community/netinfo`).
2. **App foreground** -- When the app returns to the foreground (detected via `useOnForeground` from `useAppState` hook).

Sync is guarded: it skips if already syncing or if queue count is 0. Failed actions remain in the queue for retry on the next trigger. Successfully synced actions are removed individually via `dequeue()`.

**Implementation status:** IMPLEMENTED

**Code reference:**
- useOfflineSync hook: `src/hooks/useOfflineSync.ts:11-58`
- Network recovery trigger: `src/hooks/useOfflineSync.ts:37-40`
- App foreground trigger: `src/hooks/useOfflineSync.ts:43`
- Sequential processing: `src/lib/offline-queue.ts:61-84`

---

### MA-OFF-004: Actions NOT Queued

**Title:** Photo upload and work order creation are online-only

**Description:** The following operations are NOT queued for offline execution and require a live network connection:

- **Photo upload** (`POST /api/work-orders/{id}/photos`) -- Multipart form data is too large for local queue. Additionally, no photo upload UI exists in the mobile app yet.
- **Work order creation** (`POST /api/sites/{site}/work-orders`) -- Requires server-side validation and returns a server-generated ID.

The create work order screen does not check for network status before submission; it relies on the API call failing and showing an `RNAlert` with the error message.

**Implementation status:** IMPLEMENTED (by design -- these are intentionally online-only)

**Code reference:**
- Create WO error handling: `app/create-work-order.tsx:84-85`
- No queue call in create: `app/create-work-order.tsx:74-79`

---

### MA-OFF-005: Pending Queue Count Available but Not Displayed

**Title:** useOfflineSync exposes pendingCount but no UI shows it

**Description:** The `useOfflineSync` hook returns `pendingCount` (number of actions waiting to sync), `syncing` (boolean), and `isOffline` (boolean). However, no screen or component currently reads `pendingCount` to display it. The `NetworkBanner` component shows "No internet" text with a wifi-off icon when offline but does not show the queued action count. The PRD specifies showing "3 actions pending sync" in the banner.

**Implementation status:** PARTIAL (data available, UI not wired)

**Code reference:**
- useOfflineSync return: `src/hooks/useOfflineSync.ts:51-57`
- NetworkBanner (no pending count): `src/components/ui/NetworkBanner.tsx:14-53`

---

## 5. Push Notifications (MA-PUSH-xxx)

Rules governing push notification token lifecycle, deep linking, and foreground handling.

---

### MA-PUSH-001: Token Registration Payload

**Title:** Push token registered with device name and platform identifier

**Description:** When registering a push token after login, the app sends `POST /api/push-tokens` with:
- `token`: The Expo Push Token string (e.g., `ExponentPushToken[xxxx]`)
- `device_name`: Constructed from `Device.modelName` + `Device.osName` (e.g., `"iPhone 15 Pro (iOS)"`)
- `platform`: `'ios'` or `'android'` based on `Platform.OS`

The backend stores this in the `push_tokens` table and uses it for targeted push delivery via the Expo Push API.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Registration call: `src/hooks/useAuth.ts:49-55`
- API function: `src/services/astrea.ts:193-198`
- Token acquisition: `src/hooks/usePushNotifications.ts:79-81`

---

### MA-PUSH-002: Feature Flag Controls Push Registration

**Title:** Push notification registration is gated by a feature flag

**Description:** The `registerForPushNotificationsAsync()` function checks `APP_CONFIG.features.enablePushNotifications` before proceeding. This flag reads from the `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` environment variable. If the flag is false (or the env var is not set), push registration is skipped silently. Additionally, push registration requires `Device.isDevice` to be true (simulators are excluded).

**Implementation status:** IMPLEMENTED

**Code reference:**
- Feature flag check: `src/hooks/usePushNotifications.ts:46-49`
- Physical device check: `src/hooks/usePushNotifications.ts:52-54`
- Feature flag definition: `src/constants/app.ts:43`

---

### MA-PUSH-003: Deep Linking from Push Notification

**Title:** Notification tap navigates to alert detail or work order detail

**Description:** When a user taps a push notification, the `handleNotificationResponse` callback in `usePushNotifications` reads the notification `data` payload and navigates based on `type`:

| `data.type` | Condition | Navigation target |
|-------------|-----------|-------------------|
| `'alert'` | `data.alert_id` exists | `/alert/{alert_id}` |
| `'work_order'` | `data.work_order_id` exists | `/work-order/{work_order_id}` |
| (other) | `data.route` exists | `{route}?{params}` (generic deep link) |

The navigation uses `router.push()` from `expo-router`, which pushes the screen onto the stack without replacing the current state.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Deep link handler: `src/hooks/usePushNotifications.ts:131-153`
- Alert navigation: `src/hooks/usePushNotifications.ts:138`
- Work order navigation: `src/hooks/usePushNotifications.ts:140`
- Generic route navigation: `src/hooks/usePushNotifications.ts:142-149`

---

### MA-PUSH-004: Foreground Notification Handling

**Title:** Notifications received while app is in foreground show as alerts

**Description:** The `Notifications.setNotificationHandler` is configured globally (module-level in `usePushNotifications.ts`) with `shouldShowAlert: true`, `shouldPlaySound: true`, `shouldSetBadge: true`, `shouldShowBanner: true`, `shouldShowList: true`. This means when a push notification arrives while the app is in the foreground, the OS notification banner is displayed. The `addNotificationReceivedListener` also updates the hook's local state with the received notification.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Handler configuration: `src/hooks/usePushNotifications.ts:30-38`
- Foreground listener: `src/hooks/usePushNotifications.ts:166-169`

---

### MA-PUSH-005: Badge Management

**Title:** Badge count can be set, read, and cleared via hook

**Description:** The `usePushNotifications` hook exposes `getBadgeCount()`, `setBadgeCount(count)`, and `clearBadge()` methods that wrap `expo-notifications` APIs (`getBadgeCountAsync`, `setBadgeCountAsync`). However, these methods are not actively called by any screen or automation -- they are utility methods available for future use. No screen currently sets the badge count based on unread alerts or notifications.

**Implementation status:** PARTIAL (methods exist, not wired to any automatic behavior)

**Code reference:**
- getBadgeCount: `src/hooks/usePushNotifications.ts:219-221`
- setBadgeCount: `src/hooks/usePushNotifications.ts:224-226`
- clearBadge: `src/hooks/usePushNotifications.ts:229-231`

---

### MA-PUSH-006: Android Notification Channel

**Title:** Android "Default" notification channel configured with MAX importance

**Description:** On Android, after obtaining the push token, the app creates a notification channel named `'default'` with `importance: MAX`, a vibration pattern of `[0, 250, 250, 250]`, and a light color of `#0ea5e9` (cyan). This ensures push notifications appear as heads-up notifications on Android devices.

**Implementation status:** IMPLEMENTED

**Code reference:** `src/hooks/usePushNotifications.ts:86-93`

---

## 6. Alert Actions (MA-ALT-xxx)

Rules governing how alerts are acknowledged and resolved in the mobile app.

---

### MA-ALT-001: Who Can Acknowledge Alerts

**Title:** Alert acknowledgment requires site_manager, technician, org_admin, or super_admin

**Description:** The `canAcknowledgeAlerts(roles)` function returns `true` if the user's `roles` array includes any of: `site_manager`, `technician`, `org_admin`, `super_admin`. The `site_viewer` role is explicitly excluded. When `canAcknowledgeAlerts` returns false, the acknowledge and resolve buttons are not rendered on the Alert Detail screen. The backend also enforces this role check and returns HTTP 403 for unauthorized roles.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Permission function: `src/types/astrea.ts:214-216`
- Alert detail check: `app/alert/[id].tsx:26-27`
- Conditional render: `app/alert/[id].tsx:191`

**Backend reference:** Ref AC-005 from ASTREA_BUSINESS_RULES.md

---

### MA-ALT-002: Who Can Resolve Alerts

**Title:** Alert resolution uses the same role check as acknowledgment

**Description:** Alert resolution is gated by the same `canAcknowledgeAlerts()` function -- there is no separate `canResolveAlerts()` function. The same four roles that can acknowledge can also resolve. The resolve button appears for all non-terminal alert statuses (i.e., when status is not `'resolved'` and not `'dismissed'`).

**Implementation status:** IMPLEMENTED

**Code reference:**
- Resolve button condition: `app/alert/[id].tsx:191`
- Resolve handler: `app/alert/[id].tsx:67-86`
- API call: `src/services/astrea.ts:122-124`

**Backend reference:** Ref AC-006 from ASTREA_BUSINESS_RULES.md

---

### MA-ALT-003: Alert Status Transitions

**Title:** Allowed mobile transitions: active -> acknowledged, active/acknowledged -> resolved

**Description:** The Alert Detail screen shows action buttons based on the current alert status:

| Current status | Available actions |
|---------------|-------------------|
| `active` | Acknowledge, Resolve |
| `acknowledged` | Resolve |
| `resolved` | (no actions) |
| `dismissed` | (no actions) |

The acknowledge button only appears when `alert.status === 'active'`. The resolve button appears whenever the alert is not yet `resolved` or `dismissed`. There is no "reopen" or "dismiss" action in the mobile app. The backend enforces that acknowledgment of an already-acknowledged alert and resolution of an already-resolved alert return errors.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Status-based button logic: `app/alert/[id].tsx:191-198`
- Acknowledge only for active: `app/alert/[id].tsx:193`

---

### MA-ALT-004: Confirmation Dialog Before Alert Action

**Title:** Both acknowledge and resolve require user confirmation via native alert dialog

**Description:** Before sending an acknowledge or resolve API call, the app shows a native `Alert.alert()` confirmation dialog with "Cancel" and the action label. The acknowledge dialog says "Acknowledge Alert" / "Mark this alert as acknowledged?" with a non-destructive "Acknowledge" button. The resolve dialog says "Resolve Alert" / "Mark this alert as resolved?" with a `style: 'destructive'` "Resolve" button. While the API call is in progress, a `loading` state is set on the button to prevent double-taps. After success, the alert detail is re-fetched to reflect the new status.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Acknowledge dialog: `app/alert/[id].tsx:47-65`
- Resolve dialog: `app/alert/[id].tsx:67-86`
- Loading state: `app/alert/[id].tsx:30`

---

## 7. Work Order Actions (MA-WO-xxx)

Rules governing work order status transitions, creation, notes, and photos.

---

### MA-WO-001: Work Order Status Machine

**Title:** Status transitions enforced client-side via nextStatuses map

**Description:** The Work Order Detail screen defines allowed status transitions via a `nextStatuses` map:

| Current status | Allowed next statuses |
|---------------|----------------------|
| `open` | `in_progress` ("Start Work"), `cancelled` ("Cancel") |
| `assigned` | `in_progress` ("Start Work"), `cancelled` ("Cancel") |
| `in_progress` | `completed` ("Complete"), `cancelled` ("Cancel") |
| `completed` | (no actions) |
| `cancelled` | (no actions) |

Each transition shows a confirmation dialog (`Alert.alert`) before calling `PUT /api/work-orders/{id}/status` with the new status. The backend also validates transitions server-side.

**Implementation status:** IMPLEMENTED

**Code reference:**
- nextStatuses map: `app/work-order/[id].tsx:90-94`
- Status change handler with dialog: `app/work-order/[id].tsx:43-61`
- API call: `src/services/astrea.ts:165-174`

**Backend reference:** Ref WO-001 from ASTREA_BUSINESS_RULES.md

---

### MA-WO-002: Work Order Creation Role Gate

**Title:** Only site_manager, org_admin, and super_admin can create work orders

**Description:** The `canCreateWorkOrders(roles)` function returns `true` for `site_manager`, `org_admin`, `super_admin`. Technicians and site viewers cannot create work orders. This controls: (1) FAB visibility on the Work Orders list, (2) access to the Create Work Order screen. The create screen itself does not re-check the role -- it relies on the FAB being hidden and backend validation returning 403 for unauthorized roles.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Permission function: `src/types/astrea.ts:218-219`
- FAB visibility: `app/(tabs)/work-orders.tsx:120-122`
- Create WO form: `app/create-work-order.tsx:32-186`
- API call: `src/services/astrea.ts:150-163`

---

### MA-WO-003: Create Work Order Form Fields

**Title:** Form requires site, title, type, and priority; optional description

**Description:** The Create Work Order form validates and submits with:

| Field | Required | Options |
|-------|----------|---------|
| Site | Yes | Dropdown populated from `GET /api/sites` |
| Title | Yes | Text, max 255 chars |
| Type | Yes | `maintenance`, `inspection`, `install`, `battery_replace`, `sensor_replace` |
| Priority | Yes | `urgent`, `high`, `medium`, `low` (default: `medium`) |
| Description | No | Multiline text |

Validation is client-side via a `validate()` function. On success, `POST /api/sites/{siteId}/work-orders` is called and the user sees a success `RNAlert` before navigating back. The PRD specifies a device selector (optional, filtered by site) and an assignee selector -- both are missing from the current implementation.

**Implementation status:** PARTIAL (no device selector, no assignee selector)

**Code reference:**
- Form fields: `app/create-work-order.tsx:38-45`
- Type options: `app/create-work-order.tsx:17-23`
- Priority options: `app/create-work-order.tsx:25-30`
- Validation: `app/create-work-order.tsx:58-67`
- Submit: `app/create-work-order.tsx:69-89`

---

### MA-WO-004: Anyone Can Add Notes to Work Orders

**Title:** Note input is available to all authenticated users on the WO detail screen

**Description:** The Work Order Detail screen includes a text input and "Send" button for adding notes. There is no role check -- any authenticated user who can view the work order can add a note. The note is sent via `POST /api/work-orders/{id}/notes` with `{ note: string }`. After adding a note, the text input is cleared and the WO detail is re-fetched. The "Send" button is disabled when the input is empty (`!noteText.trim()`).

**Implementation status:** IMPLEMENTED

**Code reference:**
- Note input: `app/work-order/[id].tsx:154-173`
- Add note handler: `app/work-order/[id].tsx:63-75`
- API call: `src/services/astrea.ts:176-179`

---

### MA-WO-005: Photo Display Without Upload

**Title:** Work order photos are shown as a count; no upload or gallery UI exists

**Description:** The Work Order Detail screen shows a "Photos (N)" section with text "N photo(s) attached" when `wo.photos.length > 0`. There is no photo gallery grid, no tap-to-expand, and no "Add Photo" button. The backend `POST /api/work-orders/{id}/photos` endpoint exists and is tested, and an `ImagePickerButton` component exists in the UI library, but they are not wired together in the WO detail screen.

**Implementation status:** MISSING (display is count-only; upload UI not built)

**Code reference:**
- Photo count display: `app/work-order/[id].tsx:178-184`
- ImagePickerButton component (unused): `src/components/ui/ImagePickerButton.tsx`
- Photo upload API (defined but not called): no mobile call exists

---

## 8. Theme & Preferences (MA-UX-xxx)

Rules governing visual theming, language selection, and user preference persistence.

---

### MA-UX-001: Default Design Theme

**Title:** Glass style with dark mode is the default theme

**Description:** The `useDesignTheme` Zustand store initializes with `designStyle: 'glass'` and `colorMode: 'dark'`, which resolves to the `glassDarkTheme` config. This is the theme users see on first launch before any preference is stored. The theme features deep dark backgrounds (`#030712`), cyan accent color (`#22d3ee`), glassmorphism blur effects, and more expressive animations.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Default values: `src/hooks/useDesignTheme.ts:48-51`
- Glass dark theme: `src/constants/themes.ts:425-497`

---

### MA-UX-002: Light/Dark Toggle Persistence

**Title:** Color mode (light/dark) persisted to AsyncStorage via Zustand persist middleware

**Description:** The `useDesignTheme` store uses Zustand's `persist` middleware with `createJSONStorage(() => AsyncStorage)` to save `designStyle`, `colorMode`, and `designTheme` to AsyncStorage under the key `design-theme-storage`. When toggling color mode, the store updates both `colorMode` and the computed `config` (full theme object). On app restart, the `onRehydrateStorage` callback recomputes `config` from the stored `designStyle` and `colorMode`. The profile screen's theme toggle calls `toggleColorMode()`, which flips between `'light'` and `'dark'`.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Persist middleware: `src/hooks/useDesignTheme.ts:90-106`
- toggleColorMode: `src/hooks/useDesignTheme.ts:71-77`
- Rehydration: `src/hooks/useDesignTheme.ts:98-103`
- Profile toggle: `app/(tabs)/profile.tsx:80`

---

### MA-UX-003: Language Toggle Persistence

**Title:** Language preference (EN/ES) persisted to appStorage and detected on startup

**Description:** The `useLanguage` hook wraps `react-i18next` and provides `toggleLanguage()` which flips between `'en'` and `'es'`. When a language is set, it is saved to `appStorage` under the key `APP_LANGUAGE` (which maps to `'app_language'` in `StorageKeys`). On app startup, the `languageDetector` module checks:

1. `appStorage.getString('app_language')` for a stored preference
2. `getLocales()[0].languageCode` for the device locale
3. Falls back to `'en'`

Supported languages are `['en', 'es']` only.

**Implementation status:** IMPLEMENTED

**Code reference:**
- useLanguage hook: `src/hooks/useLanguage.ts:10-26`
- Language detector: `src/lib/i18n/language-detector.ts:13-39`
- Storage key: `src/lib/storage.ts:131`
- Profile toggle: `app/(tabs)/profile.tsx:91`

---

### MA-UX-004: Design Style (Glass/Minimal) Switchable but No Profile Picker

**Title:** Two design styles available via API but not exposed in profile UI

**Description:** The theme system supports two design styles (`'minimal'` and `'glass'`), each with light and dark variants (4 total themes). The `useDesignTheme` store provides `setDesignStyle(style)` to switch between them. However, the Profile screen only exposes a light/dark color mode toggle -- there is no picker for switching between Glass and Minimal design styles. The `designStyle` is persisted and would survive app restarts if changed programmatically.

Theme characteristics:
- **Minimal:** Warm stone palette, teal accent (`#0d9488`), no blur, subtle shadows, Apple-like sophistication
- **Glass:** Cool slate palette, cyan accent (`#22d3ee`), blur effects, deeper shadows, glassmorphism

**Implementation status:** PARTIAL (style system implemented; no UI picker in profile)

**Code reference:**
- setDesignStyle: `src/hooks/useDesignTheme.ts:54-60`
- Theme matrix (4 variants): `src/constants/themes.ts:504-513`
- Profile screen (only colorMode toggle, no style picker): `app/(tabs)/profile.tsx:80-87`

---

### MA-UX-005: Separate NativeWind Theme Initialization

**Title:** NativeWind color scheme initialized from appStorage on startup

**Description:** In addition to the `useDesignTheme` Zustand store, the app also initializes a NativeWind color scheme via `initializeTheme()` on startup. This reads `StorageKeys.THEME_MODE` from `appStorage` and calls `colorScheme.set(stored)` if the value is `'light'` or `'dark'`. NativeWind's `useColorScheme()` is available via the `useTheme()` hook for Tailwind CSS class-based theming (used by NativeWind `className` props). Both the Zustand design theme and the NativeWind color scheme must be kept in sync for consistent rendering.

**Implementation status:** IMPLEMENTED

**Code reference:**
- initializeTheme: `src/hooks/useTheme.ts:10-16`
- Called on startup: `app/_layout.tsx:41`
- useTheme hook: `src/hooks/useTheme.ts:29-59`

---

### MA-UX-006: Network Status Banner

**Title:** Animated "No internet" banner slides in when offline

**Description:** The `NetworkBanner` component is mounted globally in the root layout (`app/_layout.tsx:74`). It subscribes to `useNetworkStatus()` which listens to `@react-native-community/netinfo`. When `isConnected` becomes false, a red banner slides in from the top with a wifi-off icon and "No internet" text (i18n key: `noInternet`). When connectivity is restored, the banner slides out. The animation uses `withSpring` for the slide-in (damping: 8, stiffness: 50) and `withTiming` for the slide-out (duration: 200ms). Additionally, `useNetworkStatus` shows toast notifications on connectivity transitions: error toast for "No internet" and success toast for "Back online" (skipping the initial event to avoid a toast on app launch).

**Implementation status:** IMPLEMENTED

**Code reference:**
- NetworkBanner component: `src/components/ui/NetworkBanner.tsx:14-53`
- Global mount: `app/_layout.tsx:74`
- Toast on transitions: `src/hooks/useNetworkStatus.ts:36-39`

---

### MA-UX-007: Error Handling Pattern -- Silent Failures

**Title:** Data-fetching screens catch errors silently with no user feedback

**Description:** Every data-fetching screen (Home, Alert List, Alert Detail, Work Order List, Work Order Detail, Site Detail, Device Detail) follows the same pattern: `try { await fetchData() } catch { /* silent */ }`. No toast, error state, or retry prompt is shown to the user when an API call fails. The only exception is the Create Work Order screen, which shows an `RNAlert` on submission failure. The `showErrorToast` and `showSuccessToast` utilities exist in `src/lib/toast.ts` but are not used in data-fetching error handlers.

**Implementation status:** MISSING (error feedback not implemented for data screens)

**Code reference:**
- Example silent catch: `app/(tabs)/index.tsx:34` ("Show empty state on failure")
- Example silent catch: `app/(tabs)/alerts.tsx:43-44`
- Example silent catch: `app/alert/[id].tsx:36-37`
- Create WO exception: `app/create-work-order.tsx:84-85` (does show RNAlert)
- Unused toast utility: `src/lib/toast.ts`

---

### MA-UX-008: Pagination Pattern

**Title:** List screens use cursor-based infinite scroll with manual state management

**Description:** Alert List and Work Order List implement infinite scroll pagination using `FlatList` with `onEndReached`. Each maintains local state for `page`, `hasMore`, and data array. When the user scrolls to 30% from the bottom (`onEndReachedThreshold={0.3}`), the next page is fetched and appended to the existing data. Pull-to-refresh resets to page 1. The default page size is 20 (`per_page: 20`). Both screens support filter changes, which reset the list to page 1.

**Implementation status:** IMPLEMENTED

**Code reference:**
- Alert pagination: `app/(tabs)/alerts.tsx:32-48` (fetchAlerts), `app/(tabs)/alerts.tsx:61-63` (onEndReached)
- WO pagination: `app/(tabs)/work-orders.tsx:39-55` (fetchWOs), `app/(tabs)/work-orders.tsx:68-70` (onEndReached)
- Threshold: `app/(tabs)/alerts.tsx:102` (`onEndReachedThreshold={0.3}`)

---

## Summary

| Section | Total Rules | IMPLEMENTED | PARTIAL | MISSING |
|---------|:-----------:|:-----------:|:-------:|:-------:|
| Access & Authorization (MA-ACC) | 6 | 6 | 0 | 0 |
| Navigation & Role Gating (MA-NAV) | 5 | 3 | 2 | 0 |
| Data Fetching & Caching (MA-DAT) | 4 | 2 | 2 | 0 |
| Offline Write Queue (MA-OFF) | 5 | 3 | 1 | 1 |
| Push Notifications (MA-PUSH) | 6 | 5 | 1 | 0 |
| Alert Actions (MA-ALT) | 4 | 4 | 0 | 0 |
| Work Order Actions (MA-WO) | 5 | 3 | 1 | 1 |
| Theme & Preferences (MA-UX) | 8 | 5 | 2 | 1 |
| **TOTAL** | **43** | **31** | **9** | **3** |

### Key PARTIAL Items

| Rule | Issue |
|------|-------|
| MA-NAV-003 | Alert action buttons hidden for site_viewer instead of disabled with tooltip |
| MA-NAV-004 | No WO tab badge; Alerts/Work Orders tab titles not i18n |
| MA-DAT-001 | QueryClient configured but screens use manual state, not React Query hooks |
| MA-DAT-002 | onlineManager wired but bypassed by manual fetching |
| MA-OFF-005 | Pending sync count available in hook but no UI displays it |
| MA-PUSH-005 | Badge methods exist but not wired to automatic behavior |
| MA-WO-003 | Create WO form missing device and assignee selectors |
| MA-UX-004 | Glass/Minimal style system exists but no picker in profile |
| MA-UX-007 | Silent error handling on all data screens |

### Key MISSING Items

| Rule | Issue |
|------|-------|
| MA-OFF-004 | Photo upload intentionally not queued (by design) |
| MA-WO-005 | Photo gallery and upload UI not built |
| MA-UX-007 | Error feedback for data screens not implemented |
