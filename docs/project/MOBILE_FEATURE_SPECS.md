# Mobile App Feature Specs -- P0 Gaps

> **Phase 7 (SPEC) -- Astrea IoT Mobile App**
> **Date:** 2026-03-17
> **Source:** `docs/project/MOBILE_GAP_ANALYSIS.md` (Section 4g -- P0 items)
> **Task Breakdown:** `docs/project/MOBILE_TASK_BREAKDOWN.md` (Cycle 1)
> **Business Rules:** `docs/project/MOBILE_BUSINESS_RULES.md`
> **Mobile repo:** `/Users/andrade-mac-22/Documents/AI/iot-expo`
> **Backend repo:** `/Users/andrade-mac-22/Documents/AI/iot-hub`

---

## Table of Contents

| # | Spec | Priority | Estimate | Task Ref |
|---|------|----------|----------|----------|
| 1 | [Notification Center Screen](#spec-1-notification-center-screen) | P0 | Medium (1 day) | C1-01 |
| 2 | [Zone Detail Screen](#spec-2-zone-detail-screen) | P0 | Small (0.5 day) | C1-02 |
| 3 | [Error Handling on Data Screens](#spec-3-error-handling-on-data-screens) | P0 | Small (0.5 day) | C1-03 |
| 4 | [Loading States on List Screens](#spec-4-loading-states-on-list-screens) | P0 | Small (0.5 day) | C1-04 |
| 5 | [Photo Upload on WO Detail](#spec-5-photo-upload-on-wo-detail) | P0 | Medium (1 day) | C1-05 |

---

## Spec 1: Notification Center Screen

### 1.1 Business Context

Users receive push notifications for alert triggers, work order assignments, and status changes. When they tap the bell icon on the Home screen header, nothing happens -- the `onPress` handler at `app/(tabs)/index.tsx:63` is `() => {}`. There is no in-app surface to review past notifications, mark them as read, or navigate to the referenced entity. This breaks the alert-response flow (Core Flow #1 from the gap analysis) because users who dismiss or miss a push notification have no way to find it again.

### 1.2 User Stories

| Role | Story |
|------|-------|
| **Site Manager** | As a site manager, I want to tap the bell icon and see all my notifications so I can review alerts I missed during the day. |
| **Technician** | As a technician, I want to see work order assignment notifications in a list so I can catch assignments I received while offline. |
| **Site Viewer** | As a site viewer, I want to see alert notifications so I can forward critical ones to my manager. |
| **All roles** | As any user, I want to tap a notification to navigate directly to the alert or work order so I can take action without searching. |
| **All roles** | As any user, I want a "Mark all read" button so I can clear my notification backlog. |

### 1.3 Business Rules Referenced

| Rule | Title | Relevance |
|------|-------|-----------|
| MA-PUSH-003 | Deep Linking from Push Notification | Notification tap should use the same routing logic: `data.type === 'alert'` navigates to `/alert/{alert_id}`, `data.type === 'work_order'` navigates to `/work-order/{work_order_id}` |
| MA-PUSH-004 | Foreground Notification Handling | When a notification arrives while the center is open, the list should be refreshable via pull-to-refresh |
| MA-NAV-001 | Home Screen Role Variants | The bell icon badge already shows `kpis.active_alerts`; the icon's `onPress` must navigate to the notification center |
| MA-UX-008 | Pagination Pattern | Notification list must follow the same FlatList + `onEndReached` pagination pattern as Alert List and Work Order List |

### 1.4 API Endpoints

#### GET /api/notifications

**Service function:** `getNotifications(page)` in `src/services/astrea.ts:183-185`

```typescript
// Already implemented in astrea.ts
export async function getNotifications(page = 1): Promise<PaginatedResponse<unknown>> {
  return api.get<PaginatedResponse<unknown>>(`/notifications?page=${page}`);
}
```

**Backend controller:** `NotificationApiController@index` in `app/Http/Controllers/Api/NotificationApiController.php:11-32`

**Response shape (per notification item):**
```json
{
  "id": "uuid-string",
  "type": "App\\Notifications\\AlertTriggeredNotification",
  "data": {
    "type": "alert",
    "alert_id": 42,
    "title": "Critical temperature alert",
    "body": "Device ABC exceeded 8°C threshold",
    "severity": "critical"
  },
  "read_at": "2026-03-17T10:00:00+00:00",
  "created_at": "2026-03-17T09:30:00+00:00"
}
```

Paginated with standard `meta` (`current_page`, `last_page`, `total`, `per_page`) and `links`.

#### POST /api/notifications/mark-all-read

**Service function:** `markAllNotificationsRead()` in `src/services/astrea.ts:187-189`

```typescript
// Already implemented in astrea.ts
export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/mark-all-read');
}
```

**Backend controller:** `NotificationApiController@markAllRead` in `app/Http/Controllers/Api/NotificationApiController.php:34-42`

**Response:** `{ "data": { "message": "All notifications marked as read." } }`

### 1.5 Screen Layout (Text Mockup)

```
+--------------------------------------------------+
|  <-  Notifications            [Mark all read]     |
+--------------------------------------------------+
|                                                    |
|  +----------------------------------------------+ |
|  | [!] Critical temperature alert        2h ago | |
|  |     Device ABC exceeded 8°C threshold    (o) | |  <- (o) = unread dot
|  +----------------------------------------------+ |
|  | [i] Work order assigned               5h ago | |
|  |     WO-123: Replace battery at Site B        | |
|  +----------------------------------------------+ |
|  | [!] High humidity alert              1d ago   | |
|  |     Sensor XYZ reading 92% RH                | |
|  +----------------------------------------------+ |
|  | [i] Work order completed             2d ago   | |
|  |     WO-119: Maintenance at Cold Room A       | |
|  +----------------------------------------------+ |
|                                                    |
|         (scroll for more / infinite scroll)        |
+--------------------------------------------------+
```

**Layout details:**
- `ScreenHeader` variant `"title"` with title "Notifications" and `leftAction` back arrow
- "Mark all read" as a `Pressable` text button in the `rightAction` slot (not a full `Button` to avoid visual weight)
- `FlatList` with `NotificationItem` rows
- Each row: left icon colored by notification type (alert = red `warning`, work order = blue `assignment`, summary = cyan `summarize`), title bold, body secondary color, relative timestamp top-right, unread indicator dot when `read_at === null`
- Row is tappable; tap marks as read (set `read_at` locally) and navigates based on `data.type`
- `EmptyState` with icon `"notifications-off"`, title "No notifications", description "You're all caught up."
- Pull-to-refresh via `RefreshControl`
- Infinite scroll via `onEndReached` at threshold 0.3, 20 per page

### 1.6 Component List

| Component | Source | Usage |
|-----------|--------|-------|
| `ScreenHeader` | `src/components/layout/ScreenHeader.tsx` | Title variant with back arrow and "Mark all read" right action |
| `FlatList` | React Native | Paginated notification list |
| `RefreshControl` | React Native | Pull-to-refresh |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | Zero-notification state |
| `Icon` | `src/components/ui/Icon.tsx` | Type icons (`warning`, `assignment`, `summarize`) |
| `Animated.View` | `react-native-reanimated` | `FadeInUp` entrance animation per row |
| `Pressable` | React Native | Tappable notification rows and "Mark all read" button |

### 1.7 New File & Route Changes

| Change | File | Details |
|--------|------|---------|
| New screen file | `app/notifications.tsx` | Stack screen component |
| Register route | `app/_layout.tsx` | Add `<Stack.Screen name="notifications" />` |
| Route constant | `src/constants/routes.ts` | Add `NOTIFICATION_CENTER: '/notifications'` to `STACK_ROUTES`; add `notifications: () => '/notifications' as const` to `ROUTES.withParams` |
| Wire bell icon | `app/(tabs)/index.tsx:63` | Change `onPress: () => {}` to `onPress: () => router.push('/notifications')` |

### 1.8 Notification Type Definition

Add to `src/types/astrea.ts`:

```typescript
export interface NotificationItem {
  id: string;
  type: string;
  data: {
    type?: 'alert' | 'work_order' | 'morning_summary';
    alert_id?: number;
    work_order_id?: number;
    title: string;
    body?: string;
    severity?: string;
    route?: string;
  };
  read_at: string | null;
  created_at: string;
}
```

Update `getNotifications` return type from `PaginatedResponse<unknown>` to `PaginatedResponse<NotificationItem>`.

### 1.9 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Zero notifications | Show `EmptyState` component with `icon="notifications-off"` |
| Pagination boundary | `onEndReached` checks `hasMore` before fetching; stops when `page >= meta.last_page` |
| Mixed notification types | Parse `data.type` to determine icon and navigation target; unknown types show generic icon and no navigation |
| Notification with missing `data.alert_id` | Tap shows `showErrorToast('Cannot open this notification')` and does not navigate |
| Mark all read while list is empty | Button is hidden or disabled when no unread notifications exist |
| Network failure on load | Show `showErrorToast('Could not load notifications')` per Spec 3 pattern |
| Network failure on mark-all-read | Show `showErrorToast('Could not mark notifications as read')` |
| Deep link from notification tap | Use same routing logic as `usePushNotifications.ts:131-153`: `router.push(ROUTES.withParams.alert(data.alert_id))` for alerts, `router.push(ROUTES.withParams.workOrder(data.work_order_id))` for work orders |

### 1.10 Acceptance Criteria

- [ ] Bell icon on Home screen (`app/(tabs)/index.tsx`) navigates to Notification Center
- [ ] Notification list loads with paginated data (20 per page, infinite scroll)
- [ ] Each notification row shows type icon, title, body, relative timestamp, and unread dot
- [ ] Tapping a notification navigates to the correct detail screen (alert or work order)
- [ ] Tapping a notification sets `read_at` locally (optimistic update) and removes unread dot
- [ ] "Mark all read" button calls `markAllNotificationsRead()` API and refreshes the list
- [ ] "Mark all read" is hidden/disabled when no unread notifications exist
- [ ] `EmptyState` shown when notification list is empty
- [ ] Pull-to-refresh reloads the list from page 1
- [ ] Loading indicator shown on first load (before any data is available)
- [ ] Error toast shown if API call fails (using `showErrorToast` from `src/lib/toast.ts`)
- [ ] FadeInUp animation on each notification row (matching alert list pattern)
- [ ] Screen registered as a stack screen in `app/_layout.tsx`

### 1.11 QA Test Plan

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 1 | Bell icon navigation | Login as any role. Tap bell icon on Home screen | Notification Center screen opens with header "Notifications" and back arrow |
| 2 | List loads with data | Have 5+ notifications in the database for the user | List shows notification rows with correct type icons, titles, timestamps |
| 3 | Unread indicator | Have mix of read and unread notifications | Unread notifications show cyan dot indicator; read notifications do not |
| 4 | Tap alert notification | Tap a notification where `data.type === 'alert'` and `data.alert_id` exists | Navigates to `/alert/{alert_id}`; notification unread dot disappears |
| 5 | Tap WO notification | Tap a notification where `data.type === 'work_order'` and `data.work_order_id` exists | Navigates to `/work-order/{work_order_id}` |
| 6 | Tap unknown type | Tap a notification with unknown or missing `data.type` | Error toast appears: "Cannot open this notification"; no navigation occurs |
| 7 | Mark all read | Tap "Mark all read" button | All unread dots disappear; API call succeeds; button becomes hidden/disabled |
| 8 | Empty state | User has zero notifications | `EmptyState` shown with "No notifications" message and `notifications-off` icon |
| 9 | Pagination | User has 30+ notifications | First page loads 20; scrolling to bottom loads next page; scroll stops after all loaded |
| 10 | Pull-to-refresh | Pull down on the list | Spinner shows; list refreshes from page 1 |
| 11 | Network error on load | Disable network, open Notification Center | Error toast "Could not load notifications" appears; empty state or stale data shown |
| 12 | Network error on mark-all-read | Disable network, tap "Mark all read" | Error toast "Could not mark notifications as read" appears; unread dots remain |
| 13 | Back navigation | Tap back arrow | Returns to previous screen (Home) |

### 1.12 UX Review Checklist

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Touch targets are at least 44x44 pt | |
| 2 | Loading state is visible within 100ms of screen mount | |
| 3 | Empty state has icon, title, and description | |
| 4 | Error feedback uses toast (not silent failure) | |
| 5 | Animations use FadeInUp with staggered delay matching existing screens | |
| 6 | Colors adapt to light/dark mode via `useDesignTheme` | |
| 7 | Text is readable (14+ for body, 11+ for labels, contrast ratio >= 4.5:1) | |
| 8 | Unread indicator is visually distinct (color + size) without relying solely on color | |
| 9 | Screen follows existing layout patterns (SafeAreaView, LinearGradient, ScreenHeader) | |
| 10 | Infinite scroll has visual indicator (footer spinner) when loading more | |

---

## Spec 2: Zone Detail Screen

### 2.1 Business Context

The Site Detail screen (`app/site/[id]/index.tsx`) renders zone cards showing name, online/total device bar, and up to 3 device names. But tapping a zone card does nothing -- there is no zone detail screen. Users who want to see all devices in a zone, their battery/signal levels, and zone-level metrics cannot drill down. The `getZone(siteId, zoneName)` API call exists in `src/services/astrea.ts:70-73` and the `ZoneDetail` type exists in `src/types/astrea.ts:37-43`, but no screen file consumes them.

### 2.2 User Stories

| Role | Story |
|------|-------|
| **Site Manager** | As a site manager, I want to tap a zone card and see all devices with their battery and signal status so I can plan maintenance visits. |
| **Technician** | As a technician, I want to see which devices in a zone have low battery or are offline so I know what equipment to bring. |
| **Site Viewer** | As a site viewer, I want to see zone-level device health so I can report issues to my manager. |

### 2.3 Business Rules Referenced

| Rule | Title | Relevance |
|------|-------|-----------|
| MA-NAV-001 | Home Screen Role Variants | Site Viewer sees single-site focus; drilling into zones provides the detail they need |
| MA-DAT-004 | API Base URL Configuration | Zone endpoint uses same API client and base URL |
| MA-UX-007 | Error Handling Pattern | Zone fetch must show error toast on failure (not silent catch) |

### 2.4 API Endpoint

#### GET /api/sites/{siteId}/zones/{zoneName}

**Service function:** `getZone(siteId, zoneName)` in `src/services/astrea.ts:70-73`

```typescript
// Already implemented in astrea.ts
export async function getZone(siteId: number, zoneName: string): Promise<ZoneDetail> {
  const res = await api.get<{ data: ZoneDetail }>(
    `/sites/${siteId}/zones/${encodeURIComponent(zoneName)}`
  );
  return res.data;
}
```

**Backend controller:** `SiteApiController@zone` in `app/Http/Controllers/Api/SiteApiController.php:79-130`

**Response shape:**
```json
{
  "data": {
    "zone": "Cold Room A",
    "site": { "id": 1, "name": "Warehouse North" },
    "device_count": 5,
    "online_count": 4,
    "devices": [
      {
        "id": 10,
        "name": "Temp Sensor #1",
        "model": "LHT65N",
        "dev_eui": "A84041C341XXXXXX",
        "status": "active",
        "battery_pct": 85,
        "rssi": -62,
        "last_reading_at": "2026-03-17T09:45:00+00:00",
        "online": true,
        "gateway": { "id": 3, "name": "LPS8v2", "status": "active" },
        "recipe": { "id": 2, "name": "Cold Chain Monitor" }
      }
    ]
  }
}
```

**Type:** `ZoneDetail` in `src/types/astrea.ts:37-43`:
```typescript
export interface ZoneDetail {
  zone: string;
  site: { id: number; name: string };
  device_count: number;
  online_count: number;
  devices: DeviceListItem[];
}
```

Where `DeviceListItem` extends `DeviceSummary` with `dev_eui`, `gateway`, and `recipe` (defined at `src/types/astrea.ts:66-70`).

### 2.5 Screen Layout (Text Mockup)

```
+--------------------------------------------------+
|  <-  Cold Room A                                  |
|      Warehouse North                              |
+--------------------------------------------------+
|                                                    |
|  +------------+  +------------+  +------------+   |
|  | DEVICES    |  | ONLINE     |  | HEALTH     |   |
|  |    5       |  |    4       |  |   80%      |   |
|  +------------+  +------------+  +------------+   |
|                                                    |
|  DEVICES                                           |
|  +----------------------------------------------+ |
|  | (o) Temp Sensor #1     85%  -62dBm    >     | |
|  |     LHT65N  ·  active  ·  9:45 AM           | |
|  +----------------------------------------------+ |
|  | (x) Temp Sensor #2     12%  -89dBm    >     | |
|  |     LHT65N  ·  offline ·  2h ago             | |
|  +----------------------------------------------+ |
|  | (o) Humidity Probe #1  67%  -55dBm    >     | |
|  |     S31B-LB  ·  active ·  9:44 AM           | |
|  +----------------------------------------------+ |
|                                                    |
+--------------------------------------------------+
```

**Layout details:**
- `ScreenHeader` variant `"title"` with zone name as `title` and site name as `subtitle`, `leftAction` back arrow
- KPI row: 3 cards (Devices = total count, Online = online count, Health = online percentage)
- "DEVICES" section title (uppercase label, matching Site Detail style)
- `FlatList` (or `ScrollView` if devices-per-zone is typically < 50) of `DeviceRow` items
- Each `DeviceRow`: online indicator dot (green/red), device name (bold), battery % with color coding (>50 green, >20 amber, <=20 red), signal strength in dBm, chevron-right
- Subtitle line: model, status pill, last reading time (relative)
- Tapping a row navigates to `/device/{id}`
- Loading state: fullscreen `ActivityIndicator` (matching Device Detail and Site Detail patterns)

### 2.6 Component List

| Component | Source | Usage |
|-----------|--------|-------|
| `ScreenHeader` | `src/components/layout/ScreenHeader.tsx` | Title variant with zone name/site name and back arrow |
| `ScrollView` | React Native | Scrollable content (zone has limited devices, typically < 50) |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | When zone has no devices (should not normally occur per API -- 404 is returned) |
| `Icon` | `src/components/ui/Icon.tsx` | Battery, signal, chevron, status icons |
| `Animated.View` | `react-native-reanimated` | `FadeInUp` entrance animation |
| `Pressable` | React Native | Tappable device rows |
| `ActivityIndicator` | React Native | Loading state |

### 2.7 New File & Route Changes

| Change | File | Details |
|--------|------|---------|
| New screen file | `app/zone.tsx` | Stack screen with `siteId` and `zoneName` query params via `useLocalSearchParams` |
| Register route | `app/_layout.tsx` | Add `<Stack.Screen name="zone" />` |
| Route constant | `src/constants/routes.ts` | Add `ZONE_DETAIL: '/zone'` to `STACK_ROUTES`; add `zone: (siteId: number, zoneName: string) => `/zone?siteId=${siteId}&zoneName=${encodeURIComponent(zoneName)}` as const` to `ROUTES.withParams` |
| Wire zone card tap | `app/site/[id]/index.tsx` | Make `ZoneCard` component a `Pressable` that navigates to zone detail (currently `ZoneCard` is a non-pressable `View` at line 177-209) |

### 2.8 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Zone with no devices | Backend returns 404 ("Zone not found."). Screen shows error state and back button. This is a server-enforced invariant: zones are derived from device `zone` column values, so an empty zone means no devices have that zone name |
| Device with null battery | Show "---" for battery (matching Device Detail pattern at `app/device/[id].tsx:93`) |
| Device with null RSSI | Show "---" for signal strength |
| Stale last_reading_at (> 24h) | Show "Xd ago" in red text to signal stale data |
| Zone name with special characters | `getZone()` already encodes via `encodeURIComponent` at `src/services/astrea.ts:71` |
| Network failure | Show `showErrorToast('Could not load zone details')` per Spec 3 pattern |
| Many devices (> 20 in one zone) | Use `FlatList` instead of `ScrollView` for performance; unlikely per cold-chain domain but safe |

### 2.9 Acceptance Criteria

- [ ] Tapping a zone card on Site Detail navigates to Zone Detail screen
- [ ] Zone name displayed in header title; site name displayed in header subtitle
- [ ] KPI row shows device count, online count, and online percentage
- [ ] Device list shows all devices in the zone with name, model, status, battery, signal, last reading
- [ ] Battery percentage is color-coded: >50% green, >20% amber, <=20% red
- [ ] Tapping a device row navigates to Device Detail (`/device/{id}`)
- [ ] Loading indicator shown while data is being fetched
- [ ] Error toast shown on network failure
- [ ] Back arrow returns to Site Detail
- [ ] FadeInUp animations on KPI row and device list (matching existing patterns)

### 2.10 QA Test Plan

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 1 | Navigate to zone | From Site Detail, tap a zone card | Zone Detail screen opens with correct zone name and site name |
| 2 | Device list | Zone has 5 devices | All 5 devices shown with name, model, battery %, signal dBm, status |
| 3 | Battery color coding | Zone has devices with battery at 80%, 25%, 10% | Green, amber, red battery text respectively |
| 4 | Device tap navigation | Tap a device row | Navigates to `/device/{id}` for that device |
| 5 | KPI accuracy | Zone has 5 devices, 3 online | KPI row shows "5" devices, "3" online, "60%" health |
| 6 | Offline device | Zone has an offline device with `last_reading_at` > 2 hours ago | Red status dot, "2h ago" timestamp |
| 7 | Network error | Disable network, navigate to zone | Error toast shown; loading spinner dismissed |
| 8 | Zone name with spaces | Zone named "Cold Room A" | Header shows "Cold Room A"; API call correctly encodes the space |
| 9 | Back navigation | Tap back arrow | Returns to Site Detail screen |
| 10 | Loading state | Navigate to zone on slow network | ActivityIndicator shown until data loads |

### 2.11 UX Review Checklist

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Touch targets are at least 44x44 pt for device rows | |
| 2 | Loading state matches Device Detail / Site Detail pattern (centered ActivityIndicator) | |
| 3 | Battery/signal color coding matches Device Detail screen (same `getBatteryColor` logic) | |
| 4 | Error feedback uses toast (not silent failure) | |
| 5 | FadeInUp animations match existing screen patterns | |
| 6 | Colors adapt to light/dark mode via `useDesignTheme` | |
| 7 | Header follows same pattern as Device Detail (title variant, back arrow, subtitle) | |
| 8 | KPI row matches Site Detail layout (3-column flex row with card backgrounds) | |
| 9 | Device row shows enough info to make a triage decision without tapping (name, battery, signal, status) | |
| 10 | Relative timestamps use same `formatTimeAgo` helper used across other screens | |

---

## Spec 3: Error Handling on Data Screens

### 3.1 Business Context

Every data-fetching screen catches API errors silently. The pattern across all screens is:

```typescript
try {
  const data = await fetchSomething();
  setData(data);
} catch {
  // silent
}
```

Confirmed in these files:
- `app/(tabs)/index.tsx:34` -- Home dashboard
- `app/(tabs)/alerts.tsx:43-44` -- Alert list
- `app/alert/[id].tsx:36-37` -- Alert detail
- `app/(tabs)/work-orders.tsx:50-51` -- Work order list
- `app/work-order/[id].tsx:32-33` -- Work order detail (fetch and status change at line 53-54)
- `app/site/[id]/index.tsx:30-31` -- Site detail
- `app/device/[id].tsx:29-30` -- Device detail

When a network request fails (timeout, 500, no connection), the user sees either an empty screen, stale data, or a frozen loading state with no explanation. The toast infrastructure already exists at `src/lib/toast.ts` with `showErrorToast(title, message?)` that uses Burnt for native toasts or falls back to in-app toast.

### 3.2 User Stories

| Role | Story |
|------|-------|
| **All roles** | As a user, when data fails to load, I want to see a clear error message so I know it is a network problem and not an app bug. |
| **Technician** | As a technician in the field with spotty connectivity, I want to see "Network error" feedback so I know to retry when I have signal. |
| **Site Manager** | As a site manager, when I acknowledge an alert and it fails, I want to see the failure reason so I can try again. |

### 3.3 Business Rules Referenced

| Rule | Title | Relevance |
|------|-------|-----------|
| MA-UX-007 | Error Handling Pattern -- Silent Failures | This spec directly addresses this rule. The rule documents that all data screens have silent `catch` blocks |
| MA-DAT-003 | Retry Configuration | GET requests already retry 2 times with exponential backoff in `api.ts`. The error toast fires only after all retries are exhausted |
| MA-OFF-001 | Queued Action Types | Offline actions (alert:ack, wo:status) are queued, so those specific mutations should not show error toast when offline -- the queue handles them. But data fetching (GET) is not queued and should show toast |

### 3.4 Implementation Pattern

**Toast utility (already exists):** `src/lib/toast.ts:65-71`

```typescript
export function showErrorToast(title: string, message?: string) {
  if (Burnt) {
    Burnt.toast({ title, message, preset: 'error' });
  } else {
    fallbackToast(title, message, 'error');
  }
}
```

**Change pattern for each screen:**

Replace:
```typescript
} catch {
  // silent
}
```

With:
```typescript
} catch {
  showErrorToast('Could not load [resource name]');
}
```

**Specific toast messages by screen:**

| Screen | File | Catch Location | Toast Message |
|--------|------|----------------|---------------|
| Home | `app/(tabs)/index.tsx:34` | `fetchDashboard` catch | `'Could not load dashboard'` |
| Alert List | `app/(tabs)/alerts.tsx:43-44` | `fetchAlerts` catch | `'Could not load alerts'` |
| Alert Detail | `app/alert/[id].tsx:36-37` | `fetchAlert` catch | `'Could not load alert details'` |
| Alert Detail | `app/alert/[id].tsx:59` | `handleAcknowledge` catch | `'Could not acknowledge alert'` |
| Alert Detail | `app/alert/[id].tsx:80` | `handleResolve` catch | `'Could not resolve alert'` |
| Work Order List | `app/(tabs)/work-orders.tsx:50-51` | `fetchWOs` catch | `'Could not load work orders'` |
| Work Order Detail | `app/work-order/[id].tsx:32-33` | `fetchWO` catch | `'Could not load work order'` |
| Work Order Detail | `app/work-order/[id].tsx:53-54` | `handleStatusChange` catch | `'Could not update status'` |
| Work Order Detail | `app/work-order/[id].tsx:70-71` | `handleAddNote` catch | `'Could not add note'` |
| Site Detail | `app/site/[id]/index.tsx:30-31` | `fetchSite` catch | `'Could not load site details'` |
| Device Detail | `app/device/[id].tsx:29-30` | `fetchDevice` catch | `'Could not load device details'` |

**Import to add at top of each file:**
```typescript
import { showErrorToast } from '@/src/lib/toast';
```

### 3.5 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Timeout (from api.ts TIMEOUT error code) | Same toast -- the retry logic in api.ts already retries 2 times before the error propagates to the screen |
| 401 Unauthorized | Handled by `api.ts:192-199` before the screen catch block. The API client intercepts 401, attempts token refresh, and on failure redirects to login. The screen catch never fires for 401 |
| 500 Server Error | Retried by api.ts up to 2 times. If all retries fail, screen catch fires and shows toast |
| Offline (no connection) | `api.ts` throws `NETWORK_ERROR`. Toast displays. Additionally, `NetworkBanner` component (`src/components/ui/NetworkBanner.tsx`) shows the persistent "No internet" banner at the top |
| Multiple rapid failures | Toast library (Burnt) handles deduplication -- rapid identical toasts are collapsed into one by the OS notification system |
| Mutation error while offline | For queued actions (alert:ack, alert:resolve, wo:status, wo:note), the offline queue in `src/lib/offline-queue.ts` handles these. The screen code should check `isConnected` from `useNetworkStatus` before showing mutation error toast, OR rely on the existing offline queue to enqueue the action silently |

### 3.6 What NOT to Change

- `app/create-work-order.tsx:84-85` -- Already shows `RNAlert` on error. Leave as-is.
- `app/(auth)/login.tsx:53-54` -- Already calls `showErrorToast`. Leave as-is.
- Action mutations that are queued offline (alert ack/resolve, WO status/note) -- These already go through the offline queue when offline. The error toast should only fire when the action was attempted online and failed.

### 3.7 Acceptance Criteria

- [ ] All 11 silent `catch` blocks listed above are replaced with `showErrorToast()` calls
- [ ] Each toast message clearly identifies what failed (e.g., "Could not load alerts", not generic "Error")
- [ ] `showErrorToast` is imported from `src/lib/toast.ts` (not a new implementation)
- [ ] 401 errors continue to be handled by `api.ts` interceptor (not duplicated in screens)
- [ ] Error toast appears as a native toast (Burnt) in dev client builds or in-app toast in Expo Go
- [ ] Existing data on screen is NOT cleared when a refresh fails (stale data is better than blank screen)
- [ ] Create Work Order screen is not modified (already has error handling)
- [ ] Auth screens are not modified (already have error handling)

### 3.8 QA Test Plan

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 1 | Home -- network error | Disable network. Pull-to-refresh on Home | Toast "Could not load dashboard" appears. Previous data remains visible (stale data preserved) |
| 2 | Alert List -- server error | Mock 500 response for `/api/alerts`. Open Alerts tab | Toast "Could not load alerts" appears |
| 3 | Alert Detail -- load error | Mock 500 for `/api/alerts/{id}`. Open an alert | Toast "Could not load alert details" appears. Loading spinner dismisses |
| 4 | Alert -- acknowledge error | Mock 500 for `POST /api/alerts/{id}/acknowledge`. Tap Acknowledge | Toast "Could not acknowledge alert" appears. Button re-enables |
| 5 | Alert -- resolve error | Mock 500 for `POST /api/alerts/{id}/resolve`. Tap Resolve | Toast "Could not resolve alert" appears |
| 6 | WO List -- network error | Disable network. Open Work Orders tab | Toast "Could not load work orders" appears |
| 7 | WO Detail -- load error | Mock 500 for `/api/work-orders/{id}`. Open a WO | Toast "Could not load work order" appears |
| 8 | WO -- status change error | Mock 500 for `PUT /api/work-orders/{id}/status`. Tap "Start Work" | Toast "Could not update status" appears |
| 9 | WO -- add note error | Mock 500 for `POST /api/work-orders/{id}/notes`. Tap Send | Toast "Could not add note" appears |
| 10 | Site Detail -- error | Mock 500 for `/api/sites/{id}`. Navigate to site | Toast "Could not load site details" appears |
| 11 | Device Detail -- error | Mock 500 for `/api/devices/{id}`. Navigate to device | Toast "Could not load device details" appears |
| 12 | 401 handled by api.ts | Force expired token. Open any screen | api.ts attempts refresh; if refresh fails, user redirected to login. No duplicate toast from screen |
| 13 | Offline banner + toast | Disable network. Navigate to Alert List | Both "No internet" banner (NetworkBanner) AND "Could not load alerts" toast appear. Not redundant -- banner persists, toast is ephemeral |

### 3.9 UX Review Checklist

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Error toast appears within 1 second of failure (after retries exhaust) | |
| 2 | Toast message is human-readable (no technical jargon, no HTTP codes) | |
| 3 | Toast disappears after ~3 seconds (Burnt default behavior) | |
| 4 | Stale data is preserved on screen when refresh fails | |
| 5 | Loading spinner is dismissed even on error (no infinite spinner) | |
| 6 | Toast does not block user interaction (non-modal) | |
| 7 | Toast is visible in both light and dark themes | |
| 8 | No double-toast for the same failure (e.g., offline banner + error toast is acceptable since they serve different purposes) | |
| 9 | Mutation error toasts appear immediately (not after retry delay, since mutations have retries=0 by default per `api.ts:286-290`) | |
| 10 | All toast messages use consistent phrasing: "Could not [verb] [noun]" | |

---

## Spec 4: Loading States on List Screens

### 4.1 Business Context

List screens (Home, Alert List, Work Order List) flash an empty state component briefly before data loads on first visit. The issue is that these screens show `EmptyState` or blank content when `loading` is true and `data` is empty, because the `ListEmptyComponent` only checks `!loading` but does not show a loading indicator when `loading` is true.

Current behavior in Alert List (`app/(tabs)/alerts.tsx:103-104`):
```tsx
ListEmptyComponent={
  !loading ? <EmptyState ... /> : null  // null = blank white space during load
}
```

Same pattern in Work Order List (`app/(tabs)/work-orders.tsx:110-111`) and Home (`app/(tabs)/index.tsx:86-87` with `EmptyState` inside conditional).

The `Skeleton` component exists at `src/components/ui/Skeleton.tsx` with `SkeletonList`, `SkeletonCard`, and `SkeletonText` presets, but none are used in any Astrea screen.

### 4.2 User Stories

| Role | Story |
|------|-------|
| **All roles** | As a user, when I open a list screen for the first time, I want to see a loading indicator so I know data is being fetched. |
| **Technician** | As a technician with a slow connection, I want to see skeleton cards instead of a blank screen so the app feels responsive. |

### 4.3 Business Rules Referenced

| Rule | Title | Relevance |
|------|-------|-----------|
| MA-UX-008 | Pagination Pattern | Loading state applies only to initial load (page 1, data empty), not to pagination appending |
| MA-DAT-001 | React Query Default staleTime | Currently not used (screens use manual state). Loading state is driven by the `loading` boolean state in each screen |

### 4.4 Implementation Pattern

**Option A: SkeletonList (recommended)**

Use the existing `SkeletonList` component from `src/components/ui/Skeleton.tsx:181-219`:

```tsx
import { SkeletonList } from '@/src/components/ui/Skeleton';

// In FlatList:
ListEmptyComponent={
  loading ? <SkeletonList count={5} /> : <EmptyState ... />
}
```

`SkeletonList` renders `count` shimmer rows, each with an avatar circle, two text lines, and a trailing circle -- matching a generic list item layout. It respects the current `useDesignTheme` for Glass/Minimal and light/dark theming.

**Option B: ActivityIndicator (simpler)**

```tsx
ListEmptyComponent={
  loading ? (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  ) : <EmptyState ... />
}
```

**Recommended approach:** Use `SkeletonList` for FlatList screens (Alerts, Work Orders) and `SkeletonCard` for the Home screen KPI/site section to maintain visual consistency.

### 4.5 Changes Per Screen

| Screen | File | Current Behavior | Change |
|--------|------|-----------------|--------|
| **Home** | `app/(tabs)/index.tsx` | No loading indicator; KPIs and site cards render only when `dashboard` is not null. When `loading` is true and `dashboard` is null, nothing renders | Add `SkeletonCard` + `Skeleton` rows for KPI area when `loading && !dashboard` |
| **Alert List** | `app/(tabs)/alerts.tsx:103-104` | `ListEmptyComponent={!loading ? <EmptyState /> : null}` -- null during loading | Change to `ListEmptyComponent={loading ? <SkeletonList count={5} /> : <EmptyState />}` |
| **Work Order List** | `app/(tabs)/work-orders.tsx:110-111` | `ListEmptyComponent={!loading ? <EmptyState /> : null}` -- null during loading | Change to `ListEmptyComponent={loading ? <SkeletonList count={5} /> : <EmptyState />}` |

### 4.6 Component List

| Component | Source | Usage |
|-----------|--------|-------|
| `SkeletonList` | `src/components/ui/Skeleton.tsx:181-219` | Loading placeholder for Alert List and Work Order List |
| `SkeletonCard` | `src/components/ui/Skeleton.tsx:137-179` | Loading placeholder for Home screen site cards |
| `Skeleton` | `src/components/ui/Skeleton.tsx:22-120` | Individual skeleton elements for KPI row on Home |

### 4.7 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Fast network (data loads in < 200ms) | Skeleton flashes briefly then is replaced by data. This is acceptable and preferable to a blank flash |
| Pagination loading (not first load) | `loading` is only true for first load. Pagination appending uses `hasMore && !loading` check. Skeleton should only show when `loading === true && data.length === 0` |
| Pull-to-refresh | `refreshing` state shows the `RefreshControl` spinner at the top. Skeleton should NOT show during refresh (data already exists). Condition: `loading && data.length === 0` |
| Filter change | When severity/status filter changes, `loading` is set to true and data is cleared. Skeleton should show during filter-triggered reloads. This is already handled if we check `loading && data.length === 0` |
| Screen revisit with cached data | If user navigates away and back, `loading` resets to true but data may still be in state if the component was not unmounted. If component remounts, skeleton shows correctly |

### 4.8 Acceptance Criteria

- [ ] Alert List shows `SkeletonList` (5 rows) while `loading === true` and `alerts.length === 0`
- [ ] Work Order List shows `SkeletonList` (5 rows) while `loading === true` and `workOrders.length === 0`
- [ ] Home screen shows skeleton placeholders for KPI row and site card area while `loading === true` and `dashboard === null`
- [ ] Skeleton components respect current theme (Glass/Minimal, light/dark)
- [ ] `EmptyState` is shown only when `loading === false` and data is empty (no false empty state flash)
- [ ] Pull-to-refresh does NOT trigger skeleton (data already on screen)
- [ ] Pagination does NOT trigger skeleton (only affects `onEndReached` footer)
- [ ] Skeleton shimmer animation runs at 60fps (Reanimated native thread)

### 4.9 QA Test Plan

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 1 | Alert List first load | Open Alerts tab for the first time | Skeleton list (5 shimmer rows) appears, then replaced by alert data |
| 2 | Work Order List first load | Open Work Orders tab for the first time | Skeleton list (5 shimmer rows) appears, then replaced by WO data |
| 3 | Home first load | Login and land on Home | Skeleton placeholders for KPIs and site cards appear, then replaced by dashboard data |
| 4 | Filter change on Alert List | Change severity filter from "All" to "Critical" | Skeleton shows while new filter results load (if data clears and loading is true) |
| 5 | Pull-to-refresh on Alert List | Pull down to refresh while data is on screen | RefreshControl spinner shows; skeleton does NOT appear; existing data stays visible |
| 6 | Pagination on Alert List | Scroll to bottom of 20-item list | Footer loading indicator (not skeleton) while next page loads |
| 7 | Empty state after load | Set filters that match zero alerts | After loading completes (skeleton dismisses), EmptyState component appears |
| 8 | Dark mode skeleton | Toggle to dark mode, open Alert List on first load | Skeleton uses dark theme colors from `useDesignTheme` |
| 9 | Glass theme skeleton | If Glass theme active, open Alert List on first load | Skeleton shimmer uses Glass-specific translucent colors |
| 10 | Slow network | Throttle network to 3G, open Alerts tab | Skeleton visible for several seconds; shimmer animation is smooth |

### 4.10 UX Review Checklist

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Skeleton appears within 100ms of screen mount (immediate, no delay) | |
| 2 | Skeleton row count (5) approximates a screenful of content | |
| 3 | Skeleton dimensions roughly match actual list item dimensions | |
| 4 | Shimmer animation is smooth (60fps via Reanimated native thread) | |
| 5 | No layout shift when skeleton is replaced by real data | |
| 6 | Skeleton respects theme (Glass vs Minimal, light vs dark) | |
| 7 | EmptyState is never shown during loading (no false empty flash) | |
| 8 | Pull-to-refresh uses RefreshControl, not skeleton (correct loading pattern) | |
| 9 | Pagination uses footer indicator, not skeleton (correct loading pattern) | |
| 10 | Skeleton provides visual hierarchy (different widths for title vs subtitle lines) | |

---

## Spec 5: Photo Upload on WO Detail

### 5.1 Business Context

Technicians need to attach field evidence photos to work orders -- before, during, and after maintenance work. The backend `POST /api/work-orders/{workOrder}/photos` endpoint exists and is tested (`WorkOrderApiController@storePhoto` at `app/Http/Controllers/Api/WorkOrderApiController.php:243-273`). The `ImagePickerButton` component exists at `src/components/ui/ImagePickerButton.tsx` with camera and gallery source selection. But the Work Order Detail screen (`app/work-order/[id].tsx:178-184`) only shows a text count: `"N photo(s) attached"` with no upload button and no photo gallery.

### 5.2 User Stories

| Role | Story |
|------|-------|
| **Technician** | As a technician, I want to take a photo of a damaged sensor and attach it to the work order so the manager has visual evidence. |
| **Site Manager** | As a site manager, I want to see photos that technicians attached to work orders so I can verify work was completed. |
| **Technician** | As a technician, I want to add a caption to a photo so the manager knows what it shows. |
| **All roles** | As any user, I want to tap a photo thumbnail to see it full-screen. |

### 5.3 Business Rules Referenced

| Rule | Title | Relevance |
|------|-------|-----------|
| MA-WO-005 | Photo Display Without Upload | This spec directly addresses this rule. Currently display is count-only; upload UI not built |
| MA-OFF-004 | Actions NOT Queued -- Photo Upload is Online-Only | Photo upload requires multipart form data and is too large for the offline queue. When offline, show "Upload when online" message |
| MA-WO-001 | Work Order Status Machine | Photos can be added at any status (the backend does not restrict based on WO status). Completed and cancelled WOs should still display photos but the "Add Photo" button could optionally be hidden for terminal statuses |

### 5.4 API Endpoint

#### POST /api/work-orders/{workOrder}/photos

**Backend controller:** `WorkOrderApiController@storePhoto` at `app/Http/Controllers/Api/WorkOrderApiController.php:243-273`

**Request:**
- Method: POST
- Content-Type: `multipart/form-data`
- Authorization: `Bearer {token}`
- Body fields:
  - `photo` (required): Image file, max 10MB (`max:10240` in validation)
  - `caption` (optional): String, max 500 characters

**Validation rules (from backend):**
```php
$request->validate([
    'photo' => 'required|image|max:10240',  // 10MB max
    'caption' => 'nullable|string|max:500',
]);
```

**Response (201 Created):**
```json
{
  "data": {
    "id": 7,
    "photo_path": "work-orders/42/abc123.jpg",
    "caption": "Damaged sensor housing"
  }
}
```

**Photo URL construction:** The `photo_path` is a relative path in Laravel's `public` storage disk. The full URL is `{API_BASE_URL_WITHOUT_API}/storage/{photo_path}` (e.g., `http://iot-hub.test/storage/work-orders/42/abc123.jpg`).

#### New Service Function

Add to `src/services/astrea.ts`:

```typescript
export async function uploadWorkOrderPhoto(
  workOrderId: number,
  photoUri: string,
  caption?: string,
): Promise<WorkOrderPhoto> {
  const formData = new FormData();

  // React Native FormData accepts { uri, type, name } for file uploads
  formData.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: `wo-${workOrderId}-${Date.now()}.jpg`,
  } as unknown as Blob);

  if (caption) {
    formData.append('caption', caption);
  }

  const res = await api.post<{ data: WorkOrderPhoto }>(
    `/work-orders/${workOrderId}/photos`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return res.data;
}
```

### 5.5 Screen Layout (Text Mockup)

The Photos section on the Work Order Detail screen (`app/work-order/[id].tsx`) will be replaced:

**Before (current):**
```
+----------------------------------------------+
| PHOTOS (3)                                    |
| 3 photo(s) attached                           |
+----------------------------------------------+
```

**After (new):**
```
+----------------------------------------------+
| PHOTOS (3)                        [Add Photo] |
+----------------------------------------------+
| +--------+  +--------+  +--------+           |
| |  img1  |  |  img2  |  |  img3  |           |
| | caption|  | caption|  | caption|           |
| +--------+  +--------+  +--------+           |
+----------------------------------------------+

(Tap photo -> fullscreen modal)

+--------------------------------------------------+
|                                           [X]     |
|                                                    |
|              +------------------------+            |
|              |                        |            |
|              |    Full-size photo     |            |
|              |                        |            |
|              +------------------------+            |
|                                                    |
|  "Damaged sensor housing"                          |
|  Uploaded 2h ago                                   |
+--------------------------------------------------+
```

**Layout details:**
- "Add Photo" button: Uses `Button` component with `size="sm"` and `variant="outline"`, icon `"add-a-photo"`. Positioned in the section header row.
- Photo grid: `FlatList` with `horizontal={false}`, `numColumns={3}`, gap 8. Each thumbnail is a `Pressable` wrapping `OptimizedImage` with `aspectRatio={1}`, `borderRadius={8}`.
- Caption shown below each thumbnail in small text (11px, `textMuted` color), truncated to 1 line.
- Tap thumbnail: Opens `Modal` component (from `src/components/ui/Modal.tsx`) with full-screen image, caption, and "Uploaded X ago" timestamp.
- "Add Photo" flow: Tap button -> `ImagePickerButton` action sheet (Camera / Photo Library / Cancel) -> image selected -> optional caption prompt (Alert.prompt or inline TextInput) -> upload -> refresh WO detail.

### 5.6 Component List

| Component | Source | Usage |
|-----------|--------|-------|
| `ImagePickerButton` | `src/components/ui/ImagePickerButton.tsx` | Camera/gallery source selection. Note: The existing component is designed as a standalone picker with preview. For the upload flow, we will reuse its `pickImage` logic but not the full component UI. Instead, use the `expo-image-picker` APIs directly (Camera: `ImagePicker.launchCameraAsync`, Library: `ImagePicker.launchImageLibraryAsync`) with the same permission pattern from `ImagePickerButton` (lines 56-64, 66-98) |
| `OptimizedImage` | `src/components/ui/OptimizedImage.tsx` | Photo thumbnails with loading/error states |
| `Modal` | `src/components/ui/Modal.tsx` | Full-screen photo viewer |
| `Button` | `src/components/ui/Button.tsx` | "Add Photo" button |
| `Icon` | `src/components/ui/Icon.tsx` | Camera icon on "Add Photo" button |
| `ActivityIndicator` | React Native | Upload progress indicator |
| `Alert` | React Native | Camera/Gallery selection action sheet (matching `ImagePickerButton` pattern at line 105-112) |

### 5.7 Upload Flow (Detailed)

```
1. User taps "Add Photo" button
   |
2. Alert.alert('Select Photo', 'Choose a source', [
     { text: 'Camera', onPress: () => pickFromCamera() },
     { text: 'Photo Library', onPress: () => pickFromLibrary() },
     { text: 'Cancel', style: 'cancel' },
   ])
   |
3a. Camera: requestCameraPermissionsAsync() -> launchCameraAsync({ quality: 0.8, allowsEditing: true })
3b. Library: requestMediaLibraryPermissionsAsync() -> launchImageLibraryAsync({ quality: 0.8, allowsEditing: true })
   |
4. If result.canceled -> abort
   If result.assets[0].uri -> proceed
   |
5. Check file size: if > 10MB, showErrorToast('Photo too large (max 10MB)')
   |
6. Optional: Alert.prompt('Add Caption', 'Optional caption for this photo') -> caption string
   |
7. Show upload indicator on the "Add Photo" button (loading state)
   |
8. Call uploadWorkOrderPhoto(workOrderId, uri, caption)
   |
9a. Success: showSuccessToast('Photo uploaded')
    -> Re-fetch WO detail (fetchWO())
    -> New photo appears in grid
   |
9b. Failure: showErrorToast('Could not upload photo')
    -> Button returns to normal state
   |
9c. Offline: Check isConnected from useNetworkStatus
    -> If offline before upload: showErrorToast('Connect to internet to upload photos')
    -> Do not attempt upload
```

### 5.8 Photo URL Helper

Add to `src/services/astrea.ts` or a shared utility:

```typescript
import { API_URL } from '../config';

export function getPhotoUrl(photoPath: string): string {
  // API_URL is like "http://iot-hub.test/api"
  // Storage URL is "http://iot-hub.test/storage/{path}"
  const baseUrl = API_URL.replace(/\/api$/, '');
  return `${baseUrl}/storage/${photoPath}`;
}
```

### 5.9 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Large file (> 10MB) | Client-side check before upload. `expo-image-picker` returns `assets[0].fileSize`. If > 10MB (10,485,760 bytes), show error toast and do not upload. Backend also validates: `max:10240` (KB) |
| Offline | Check `useNetworkStatus().isConnected` before attempting upload. If offline, show error toast "Connect to internet to upload photos". Per MA-OFF-004, photo upload is intentionally NOT queued |
| Camera permission denied | `ImagePickerButton` pattern: show `Alert.alert('Permission Required', 'Please grant camera access to continue.')`. Same pattern at `src/components/ui/ImagePickerButton.tsx:69-73` |
| Gallery permission denied | Same as camera: show permission alert. Same pattern at `ImagePickerButton.tsx:69-73` |
| Upload timeout | api.ts default timeout applies. After timeout + retries, error propagates to catch block which shows error toast |
| Work order with 0 photos | Show "Add Photo" button but no grid. When `wo.photos.length === 0`, show a subtle prompt: "No photos yet" |
| Terminal WO status (completed/cancelled) | "Add Photo" button is still shown. Backend does not restrict photo upload by WO status. Technicians may add completion evidence after marking complete |
| Photo path resolution | `photo_path` is a relative storage path (e.g., `work-orders/42/abc.jpg`). Use `getPhotoUrl()` helper to construct the full URL |
| Multiple rapid uploads | Disable "Add Photo" button while an upload is in progress (`uploading` state). Re-enable after success or failure |
| Photo delete | Not in scope for P0. Backend does not have a delete photo endpoint. Can be added in P2 |

### 5.10 Type Changes

The `WorkOrderPhoto` type already exists in `src/types/astrea.ts:153-158`:

```typescript
export interface WorkOrderPhoto {
  id: number;
  photo_path: string;
  caption: string | null;
  uploaded_at: string | null;
}
```

No type changes needed. The new `uploadWorkOrderPhoto` function returns this type.

### 5.11 Acceptance Criteria

- [ ] "Add Photo" button visible in the Photos section of Work Order Detail
- [ ] Tapping "Add Photo" shows Camera/Photo Library/Cancel action sheet
- [ ] Camera option requests camera permission and launches camera
- [ ] Photo Library option requests media library permission and launches gallery
- [ ] Selected photo is uploaded via `POST /api/work-orders/{id}/photos` as multipart form data
- [ ] Upload success triggers WO detail refresh; new photo appears in grid
- [ ] Upload success shows `showSuccessToast('Photo uploaded')`
- [ ] Upload failure shows `showErrorToast('Could not upload photo')`
- [ ] Photos > 10MB are rejected client-side with error toast before upload attempt
- [ ] Offline state shows error toast "Connect to internet to upload photos" instead of attempting upload
- [ ] Photo grid shows thumbnails in a 3-column layout with 8px gap
- [ ] Tapping a thumbnail opens full-screen modal with photo, caption, and timestamp
- [ ] "Add Photo" button is disabled while an upload is in progress
- [ ] Photos section shows when `wo.photos.length > 0` (grid) or always shows the "Add Photo" button
- [ ] WO with 0 photos shows "Add Photo" button with "No photos yet" text
- [ ] Permission denied shows native alert with clear message

### 5.12 QA Test Plan

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 1 | Add photo from camera | Open WO detail. Tap "Add Photo" -> Camera. Take photo. | Photo uploaded. Success toast. Photo appears in grid |
| 2 | Add photo from library | Open WO detail. Tap "Add Photo" -> Photo Library. Select photo. | Photo uploaded. Success toast. Photo appears in grid |
| 3 | Cancel photo selection | Open WO detail. Tap "Add Photo" -> Cancel. | Nothing happens. No upload. No error |
| 4 | Photo too large | Select a photo > 10MB (if available, or mock fileSize) | Error toast "Photo too large (max 10MB)". No upload attempt |
| 5 | Upload while offline | Disable network. Tap "Add Photo" -> select photo | Error toast "Connect to internet to upload photos". No upload attempt |
| 6 | Upload server error | Mock 500 for `POST /api/work-orders/{id}/photos`. Select photo | Error toast "Could not upload photo". Button re-enables |
| 7 | Camera permission denied | Deny camera permission in OS settings. Tap Camera option | Native alert: "Permission Required -- Please grant camera access" |
| 8 | Gallery permission denied | Deny gallery permission. Tap Photo Library option | Native alert: "Permission Required -- Please grant photo library access" |
| 9 | Tap thumbnail for full-screen | Upload a photo. Tap its thumbnail in the grid | Full-screen modal opens with photo, caption, timestamp. Close button works |
| 10 | Multiple photos | Upload 3 photos sequentially | All 3 appear in grid. 3-column layout. Proper spacing |
| 11 | Photo with caption | Upload a photo and enter a caption | Caption shown below thumbnail in grid. Caption shown in full-screen modal |
| 12 | WO with 0 photos initially | Open WO with no photos | "Add Photo" button visible. "No photos yet" text shown |
| 13 | Double-tap prevention | Tap "Add Photo", select photo, immediately tap "Add Photo" again | Button is disabled during upload. Second tap has no effect |
| 14 | Completed WO | Open a WO with status "completed". Check Photos section | "Add Photo" button is still visible and functional |
| 15 | Photo URL loads correctly | Upload photo. Check thumbnail loads | `OptimizedImage` renders the photo from `{baseUrl}/storage/{photo_path}` |

### 5.13 UX Review Checklist

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | "Add Photo" button touch target is at least 44x44 pt | |
| 2 | Upload progress is communicated (button loading state, not silent) | |
| 3 | Success feedback uses `showSuccessToast` (ephemeral, non-blocking) | |
| 4 | Error feedback uses `showErrorToast` (ephemeral, non-blocking) | |
| 5 | Photo thumbnails have consistent aspect ratio (1:1 square) | |
| 6 | Full-screen modal has clear close button (X) | |
| 7 | Offline state gives actionable feedback ("Connect to internet to upload") | |
| 8 | File size error gives actionable feedback ("max 10MB") | |
| 9 | Permission denied gives actionable feedback (OS settings direction) | |
| 10 | Grid layout adapts to screen width (3 columns with equal spacing) | |

---

## Cross-Cutting Notes

### Dependency Order

```
Spec 3 (Error Handling) should be implemented FIRST.
  |
  +--> Spec 1 (Notification Center) -- uses showErrorToast in catch blocks
  +--> Spec 2 (Zone Detail) -- uses showErrorToast in catch blocks
  +--> Spec 4 (Loading States) -- no dependency on Spec 3, but logical to do after
  +--> Spec 5 (Photo Upload) -- uses showErrorToast and showSuccessToast
```

Recommended implementation order:
1. **Spec 3** -- Error Handling (0.5 day) -- unblocks all others
2. **Spec 4** -- Loading States (0.5 day) -- quick win, no new files
3. **Spec 2** -- Zone Detail (0.5 day) -- new screen, simpler than Notification Center
4. **Spec 1** -- Notification Center (1 day) -- new screen, more complex
5. **Spec 5** -- Photo Upload (1 day) -- modification to existing screen, multipart upload complexity

### Shared Patterns

All new and modified screens should follow these patterns verified in the existing codebase:

| Pattern | Implementation |
|---------|---------------|
| Screen wrapper | `SafeAreaView` with `edges={['top']}`, `LinearGradient` background from `minimalGradients` |
| Header | `ScreenHeader` from `src/components/layout/ScreenHeader.tsx` with appropriate variant |
| Theme access | `const { config } = useDesignTheme(); const { colors, isDark } = config;` |
| Animations | `FadeInUp.delay(N).springify()` from `react-native-reanimated` on `Animated.View` |
| Navigation | `useRouter()` from `expo-router` with `ROUTES.withParams.xxx()` from `src/constants/routes.ts` |
| Error handling | `showErrorToast(message)` from `src/lib/toast.ts` in catch blocks |
| Loading state | `ActivityIndicator` for detail screens, `SkeletonList` for list screens |
| Empty state | `EmptyState` from `src/components/ui/EmptyState.tsx` with relevant `icon`, `title`, `description` |

### Files Touched Summary

| File | Specs | Change Type |
|------|-------|-------------|
| `app/notifications.tsx` | 1 | NEW |
| `app/zone.tsx` | 2 | NEW |
| `app/_layout.tsx` | 1, 2 | MODIFY (register new stack screens) |
| `src/constants/routes.ts` | 1, 2 | MODIFY (add route constants) |
| `src/types/astrea.ts` | 1, 5 | MODIFY (add NotificationItem type, update getNotifications return type) |
| `src/services/astrea.ts` | 5 | MODIFY (add uploadWorkOrderPhoto, getPhotoUrl) |
| `app/(tabs)/index.tsx` | 1, 3, 4 | MODIFY (wire bell icon, add error toast, add skeleton) |
| `app/(tabs)/alerts.tsx` | 3, 4 | MODIFY (add error toast, add skeleton loading) |
| `app/(tabs)/work-orders.tsx` | 3, 4 | MODIFY (add error toast, add skeleton loading) |
| `app/alert/[id].tsx` | 3 | MODIFY (add error toast to catch blocks) |
| `app/work-order/[id].tsx` | 3, 5 | MODIFY (add error toast, add photo upload UI + gallery) |
| `app/site/[id]/index.tsx` | 2, 3 | MODIFY (add error toast, wire zone card tap) |
| `app/device/[id].tsx` | 3 | MODIFY (add error toast) |
