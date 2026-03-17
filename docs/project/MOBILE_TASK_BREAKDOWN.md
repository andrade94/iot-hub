# Mobile App Task Breakdown

> **Phase 6 (PLAN) — Astrea IoT Mobile App**
> **Date:** 2026-03-17
> **Source:** `docs/project/MOBILE_GAP_ANALYSIS.md`
> **Mobile repo:** `/Users/andrade-mac-22/Documents/AI/iot-expo`
> **Backend repo:** `/Users/andrade-mac-22/Documents/AI/iot-hub`
> **Test Credentials:** admin@example.com / editor@example.com / user@example.com (all: `password`)
> **Staging URL:** [STAGING_URL]

---

## Summary Table

| Cycle | Theme | Tasks | Quick Win | Small | Medium | Large | Est. Days |
|-------|-------|:-----:|:---------:|:-----:|:------:|:-----:|:---------:|
| **C1** | Ship-Ready Core (P0 + critical P1) | 8 | 2 | 3 | 2 | 1 | ~4 |
| **C2** | Complete Experience (remaining P1) | 8 | 2 | 4 | 2 | 0 | ~4 |
| **C3** | Polish & Launch (P2) | 8 | 2 | 2 | 2 | 2 | ~5 |
| **Total** | | **24** | **6** | **9** | **6** | **3** | **~13** |

---

## Dependency Graph

```
C1-01 (Notification Center)
  |
  +---> C2-07 (WO tab badge) — needs notification plumbing pattern as reference
  |
  (standalone — no blockers)

C1-02 (Zone Detail)
  |
  +---> C2-03 (Site Viewer Home: zone readings) — needs zone data shape finalized
  |
  (standalone — no blockers)

C1-03 (Error handling) ──> no dependents (cross-cutting)

C1-04 (Loading states) ──> no dependents (cross-cutting)

C1-05 (Photo upload on WO Detail)
  |
  +---> C2-04 (WO Detail: photo gallery) — needs upload to produce photos for gallery
  |
  (standalone — no blockers)

C1-06 (Alert Detail: device link)
  |
  (standalone — no blockers)

C1-07 (WO Detail: device link)
  |
  (standalone — no blockers)

C1-08 (Site Manager Home: quick actions)
  |
  (standalone — no blockers)

C2-01 (Technician Home: inline WO list + devices needing attention)
  |
  (standalone — no blockers)

C2-02 (Site Viewer Home: zone readings)
  |
  +--blocked by---> C1-02 (Zone Detail — finalizes zone data pattern)

C2-03 (Create WO: device selector + assignee selector)
  |
  (standalone — no blockers)

C2-04 (WO Detail: photo gallery)
  |
  +--blocked by---> C1-05 (Photo upload — photos must exist to display gallery)

C2-05 (Alert acknowledge UX for site_viewer)
  |
  (standalone — no blockers)

C2-06 (WO tab badge)
  |
  (standalone — no blockers)

C2-07 (i18n: wire translation keys)
  |
  +--blocked by---> All C1 and C2 feature tasks (new screens must exist before wiring i18n)

C2-08 (Pull-to-refresh on detail screens)
  |
  (standalone — no blockers)

C3-01 (Migrate screens to React Query)
  |
  +---> C3-03 (Offline stale indicators) — needs useQuery's dataUpdatedAt
  |
  +---> C3-04 (Offline pending sync count) — works better with mutation tracking

C3-02 (Swipe-to-acknowledge)
  |
  (standalone — no blockers)

C3-03 (Offline stale indicators)
  |
  +--blocked by---> C3-01 (React Query migration — provides dataUpdatedAt)

C3-04 (Offline pending sync count)
  |
  (standalone — no blockers, but enhanced by C3-01)

C3-05 (Profile enhancements)
  |
  (standalone — no blockers)

C3-06 (Biometric login)
  |
  (standalone — no blockers)

C3-07 (Device readings chart)
  |
  +--blocked by---> C3-01 (React Query — chart data should use useQuery)

C3-08 (Register/forgot-password API routes)
  |
  (standalone — backend change)
```

**Critical path:** C1-05 --> C2-04 (photo upload must precede gallery) and C3-01 --> C3-03/C3-07 (React Query migration enables stale indicators and chart data fetching).

---

## Risk Callouts

| Task | Risk | Why | Mitigation |
|------|------|-----|------------|
| **C1-05** (Photo upload) | Medium-High | `expo-image-picker` requires native permissions, multipart upload to `POST /api/work-orders/{id}/photos` needs `Content-Type: multipart/form-data` which may conflict with existing axios interceptors. Image compression on older Android devices can be slow. | Test on both iOS/Android simulators. Verify the `api.ts` client supports FormData bodies. Add a 10MB size limit client-side. Use `expo-image-manipulator` for compression if needed. |
| **C2-01** (Technician Home) | Medium | "Devices needing attention" requires filtering by battery < 20% or offline > 30 min. The dashboard API (`GET /api/dashboard`) returns `SiteSummaryItem` which has aggregate counts, not per-device data. May need a new backend endpoint or extend the dashboard response. | Check if `GET /api/sites/{id}/devices` can accept `?attention=true` filter. If not, add a `GET /api/dashboard/attention-devices` endpoint to iot-hub. Fallback: fetch all site devices client-side and filter (acceptable for < 100 devices). |
| **C2-03** (Create WO: assignee selector) | Medium | No existing `GET /api/sites/{id}/users` or `GET /api/users?site_id=X` endpoint. The `createWorkOrder` service call in `astrea.ts` already accepts `assigned_to` but there is no way to fetch the list of assignable users. | Add `GET /api/sites/{site}/technicians` endpoint to iot-hub that returns users assigned to the site with technician or site_manager role. This is a ~30 min backend task. |
| **C3-01** (React Query migration) | High | This is a refactor of every data-fetching screen. Each screen currently uses `useState` + `useEffect` + manual loading/error state. Migrating to `useQuery` changes the data flow significantly. If done incorrectly, it can introduce regressions in pagination, pull-to-refresh, and offline behavior. | Migrate one screen at a time (start with simplest: Device Detail). Verify pull-to-refresh still works by passing `refetch` to `RefreshControl`. Ensure `queryKeys` match the key factory in `query-client.ts`. Write a migration checklist and follow it per screen. |
| **C3-07** (Device readings chart) | Medium | `victory-native` may not be in `package.json`. Victory Native for Expo requires `react-native-svg` and `react-native-reanimated` (already present) but also `d3-interpolate-path` and specific victory versions. Chart rendering performance on low-end Android can be poor. | Verify dependencies first: `npm ls victory-native`. If missing, install `victory-native@^41` + peer deps. Consider `react-native-wagmi-charts` as a lighter alternative if Victory is too heavy. Test on Android emulator with 100+ data points. |
| **C2-07** (i18n wiring) | Low-Medium | 8 screens need string replacement. Risk is missing strings — some translation keys may not exist in the JSON files for new content added in C1/C2. | After completing C1/C2, audit all hardcoded strings. Add missing keys to both `en/*.json` and `es/*.json` before wiring `t()` calls. Use the `useTranslation` hook with the correct namespace per screen. |

---

## Cycle 1: Ship-Ready Core (P0 + critical P1) — ~4 days

Focus: Build missing screens, fix error handling, add loading states.

---

### C1-01: Notification Center Screen
**Priority:** P0  |  **Estimate:** Medium
**Labels:** mobile, notifications, new-screen
**Blocked by:** none

#### Objective
Build the in-app notification center screen so the bell icon on the Home header navigates somewhere. Without this, push notifications have no companion view and users cannot review past notifications.

#### Implementation
- **New file:** `app/notifications.tsx` (stack screen)
- **Route constant:** Add `NOTIFICATION_CENTER: '/notifications'` to `src/constants/routes.ts` `STACK_ROUTES` and `ROUTES.withParams`
- **Data source:** `getNotifications(page)` and `markAllNotificationsRead()` from `src/services/astrea.ts` (already wired)
- **UI structure:**
  - `ScreenHeader` with title "Notifications" and "Mark all read" button (top-right)
  - `FlatList` with `NotificationItem` components showing: icon by type (alert/work-order/summary), title, body, relative timestamp, unread dot indicator
  - Pull-to-refresh via `RefreshControl`
  - Infinite scroll pagination (same pattern as alert list)
  - `EmptyState` component for zero notifications
  - Deep link on tap: parse notification `data.type` to route to alert detail, WO detail, etc.
- **Wire bell icon:** In `app/(tabs)/index.tsx`, update the bell icon `onPress` from `() => {}` to `router.push('/notifications')`
- **Register in app layout:** Add `<Stack.Screen name="notifications" />` to `app/_layout.tsx`

#### Acceptance Criteria
- [ ] Bell icon on Home screen navigates to Notification Center
- [ ] Notification list loads with pagination (20 per page)
- [ ] "Mark all read" button calls API and refreshes list
- [ ] Tapping a notification navigates to the relevant detail screen (alert, WO)
- [ ] Empty state shown when no notifications exist
- [ ] Pull-to-refresh reloads the list
- [ ] Loading indicator shown on first load
- [ ] Error toast shown if API call fails

---

### C1-02: Zone Detail Screen
**Priority:** P0  |  **Estimate:** Small
**Labels:** mobile, sites, new-screen
**Blocked by:** none

#### Objective
Build the zone detail screen so users can drill into zone-level data from the site detail page. The API call (`getZone`) and types (`ZoneDetail`) already exist but no screen consumes them.

#### Implementation
- **New file:** `app/zone.tsx` (stack screen with `siteId` and `zoneName` query params)
- **Route constant:** Add `ZONE_DETAIL: '/zone'` to `src/constants/routes.ts` and `ROUTES.withParams.zone = (siteId: number, zoneName: string) => ...`
- **Data source:** `getZone(siteId, zoneName)` from `src/services/astrea.ts`
- **UI structure:**
  - `ScreenHeader` with zone name as title, site name as subtitle/breadcrumb
  - KPI row: device count, online count, online percentage
  - Zone metric summary card: avg/min/max temperature, humidity (derive from device readings if available in `DeviceListItem`)
  - Device list: `FlatList` of `DeviceListItem` entries with status indicator (color dot), name, model, battery %, signal strength, last reading timestamp
  - Each device row tappable → `router.push(ROUTES.withParams.device(device.id))`
  - `EmptyState` for zones with no devices
- **Wire zone navigation:** In `app/site/[id]/index.tsx`, make zone cards tappable with `router.push(ROUTES.withParams.zone(siteId, zone.name))`
- **Register in app layout:** Add `<Stack.Screen name="zone" />` to `app/_layout.tsx`

#### Acceptance Criteria
- [ ] Tapping a zone card in Site Detail navigates to Zone Detail
- [ ] Zone name and site breadcrumb shown in header
- [ ] Device list displays all devices in the zone with status, battery, signal
- [ ] Tapping a device navigates to Device Detail
- [ ] Loading indicator shown while fetching zone data
- [ ] Error toast shown if API call fails
- [ ] Empty state shown if zone has no devices

---

### C1-03: Error Handling on All Data Screens
**Priority:** P0  |  **Estimate:** Quick Win
**Labels:** mobile, ux, error-handling
**Blocked by:** none

#### Objective
Replace silent `catch` blocks with visible error feedback on all data-fetching screens. Currently, API failures produce blank screens with no user feedback. Toast infrastructure already exists in `src/lib/toast.ts`.

#### Implementation
- **Files to modify:**
  - `app/(tabs)/index.tsx` — Home/Dashboard
  - `app/(tabs)/alerts.tsx` — Alert List
  - `app/alert/[id].tsx` — Alert Detail
  - `app/(tabs)/work-orders.tsx` — Work Order List
  - `app/work-order/[id].tsx` — Work Order Detail
  - `app/site/[id]/index.tsx` — Site Detail
  - `app/device/[id].tsx` — Device Detail
- **Pattern:** In each `catch` block, replace `// silent` or `// Show empty state on failure` with:
  ```ts
  import { showErrorToast } from '@/src/lib/toast';
  // ... in catch:
  showErrorToast('Failed to load data. Please try again.');
  ```
- **Optional:** For screens with retry capability, add a "Retry" button in the error state that calls `fetchData()` again
- **Do not change:** `app/create-work-order.tsx` already has proper error handling via `RNAlert`

#### Acceptance Criteria
- [ ] All 7 data screens show a toast when API fetch fails
- [ ] Toast message is user-friendly (not raw error message)
- [ ] Screen does not crash on API failure — shows empty state gracefully
- [ ] Verify by temporarily changing API base URL and loading each screen

---

### C1-04: Loading States on List Screens
**Priority:** P0  |  **Estimate:** Quick Win
**Labels:** mobile, ux, loading
**Blocked by:** none

#### Objective
Add visible loading indicators on the three list screens that currently show empty content during first load. The `Skeleton` component exists at `src/components/ui/Skeleton.tsx` but is unused; `ActivityIndicator` is the simpler path for this cycle.

#### Implementation
- **Files to modify:**
  - `app/(tabs)/index.tsx` — Show centered `ActivityIndicator` while `loading` is true and `data` is null
  - `app/(tabs)/alerts.tsx` — Show `ActivityIndicator` above the FlatList while first page is loading
  - `app/(tabs)/work-orders.tsx` — Same pattern as alerts
- **Pattern:**
  ```tsx
  if (loading && !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  ```
- **Do not change:** Alert Detail, WO Detail, Site Detail, Device Detail already have fullscreen spinners

#### Acceptance Criteria
- [ ] Home screen shows loading spinner on first load (before dashboard data arrives)
- [ ] Alert List shows loading spinner before first page renders
- [ ] Work Order List shows loading spinner before first page renders
- [ ] Spinner uses the theme's primary color
- [ ] Spinner disappears once data loads (even if empty — show empty state instead)

---

### C1-05: Photo Upload on Work Order Detail
**Priority:** P0  |  **Estimate:** Medium
**Labels:** mobile, work-orders, camera
**Blocked by:** none

#### Objective
Enable technicians and site managers to attach photos to work orders from the field. The backend endpoint `POST /api/work-orders/{workOrder}/photos` exists and is tested. The `ImagePickerButton` component exists at `src/components/ui/ImagePickerButton.tsx`. The `usePermissions` hook handles camera/photo library permissions.

#### Implementation
- **File to modify:** `app/work-order/[id].tsx`
- **Add "Add Photo" button** below the existing photos section using `ImagePickerButton` component
- **On image selected:**
  1. Create `FormData` with the image file
  2. Upload via new function in `src/services/astrea.ts`:
     ```ts
     export async function uploadWorkOrderPhoto(
       workOrderId: number,
       photo: { uri: string; type: string; name: string },
       caption?: string,
     ): Promise<WorkOrderPhoto> {
       const formData = new FormData();
       formData.append('photo', photo as unknown as Blob);
       if (caption) formData.append('caption', caption);
       const res = await api.post<{ data: WorkOrderPhoto }>(
         `/work-orders/${workOrderId}/photos`,
         formData,
         { headers: { 'Content-Type': 'multipart/form-data' } },
       );
       return res.data;
     }
     ```
  3. Show upload progress indicator
  4. On success, append new photo to local state and show success toast
  5. On failure, show error toast
- **Permission flow:** Use `usePermissions().requestWithExplanation('camera', ...)` before launching picker
- **UI:** "Add Photo" button with camera icon, disabled while uploading, shows progress

#### Acceptance Criteria
- [ ] "Add Photo" button visible on WO Detail screen (for roles that can modify WOs)
- [ ] Tapping opens choice: Camera or Photo Library
- [ ] Camera permission requested with explanation dialog on first use
- [ ] Selected photo uploads to backend via multipart form
- [ ] Upload progress indicator shown during upload
- [ ] Uploaded photo appears in the photos section immediately
- [ ] Error toast shown if upload fails
- [ ] Photo size limited to 10MB client-side

---

### C1-06: Alert Detail — Device Link Navigation
**Priority:** P1  |  **Estimate:** Quick Win
**Labels:** mobile, alerts, navigation
**Blocked by:** none

#### Objective
Make the device information section on the Alert Detail screen tappable so users can navigate directly to the device that triggered the alert.

#### Implementation
- **File to modify:** `app/alert/[id].tsx`
- **Find** the device info display section (shows device name, model, zone)
- **Wrap** it in a `TouchableOpacity` or `Pressable`
- **Add** `onPress={() => router.push(ROUTES.withParams.device(alert.device.id))}` (only when `alert.device` is not null)
- **Add** a chevron-right icon to indicate tappability
- **Import** `ROUTES` from `src/constants/routes`

#### Acceptance Criteria
- [ ] Device section on Alert Detail is visually tappable (chevron icon)
- [ ] Tapping navigates to Device Detail screen for the correct device
- [ ] No navigation attempt when device is null (some alerts may not have a device)
- [ ] Back button from Device Detail returns to Alert Detail

---

### C1-07: Work Order Detail — Device Link Navigation
**Priority:** P1  |  **Estimate:** Quick Win
**Labels:** mobile, work-orders, navigation
**Blocked by:** none

#### Objective
Make the device row on the Work Order Detail screen tappable so users can check device status before or after completing work.

#### Implementation
- **File to modify:** `app/work-order/[id].tsx`
- **Find** the device display row in the details section (shows device name, model)
- **Wrap** in `TouchableOpacity`
- **Add** `onPress={() => router.push(ROUTES.withParams.device(workOrder.device.id))}` (only when `workOrder.device` is not null)
- **Add** chevron-right icon to indicate tappability

#### Acceptance Criteria
- [ ] Device row on WO Detail is visually tappable (chevron icon)
- [ ] Tapping navigates to Device Detail screen
- [ ] No navigation when device is null
- [ ] Back navigation returns to WO Detail

---

### C1-08: Site Manager Home — Quick Actions
**Priority:** P1  |  **Estimate:** Small
**Labels:** mobile, dashboard, role-specific
**Blocked by:** none

#### Objective
Add "View All Alerts" and "Create Work Order" quick action buttons for the site_manager role on the Home screen. Currently, quick actions only appear for the technician role.

#### Implementation
- **File to modify:** `app/(tabs)/index.tsx`
- **Find** the role-conditional rendering logic that shows Quick Actions for technician
- **Add** a similar block for `site_manager` role with two buttons:
  1. "View All Alerts" — `router.push(ROUTES.TABS.ALERTS)` with a `bell-alert` or `notifications` icon
  2. "Create Work Order" — `router.push(ROUTES.STACK.CREATE_WORK_ORDER)` with a `add-task` or `assignment` icon
- **Reuse** existing Quick Action card/button style from the technician section
- **Gate** with `getPrimaryRole(user.roles) === 'site_manager'` or include `org_admin` / `super_admin`
- **Ensure** `canCreateWorkOrders(user.roles)` is checked for the Create WO button

#### Acceptance Criteria
- [ ] Site Manager sees "View All Alerts" and "Create Work Order" quick action buttons on Home
- [ ] "View All Alerts" navigates to the Alerts tab
- [ ] "Create Work Order" navigates to the Create Work Order screen
- [ ] Quick actions do NOT appear for site_viewer role
- [ ] Buttons use consistent styling with existing technician quick actions
- [ ] Org Admin and Super Admin also see these buttons

---

## Cycle 2: Complete Experience (remaining P1) — ~4 days

Focus: Role-specific content, form completions, i18n.

---

### C2-01: Technician Home — Inline WO List + Devices Needing Attention
**Priority:** P1  |  **Estimate:** Medium
**Labels:** mobile, dashboard, role-specific
**Blocked by:** none

#### Objective
Replace the technician Home screen's navigation-only Quick Actions with inline content: today's assigned work orders sorted by priority and a "Devices needing attention" section for devices with low battery or extended offline status.

#### Implementation
- **File to modify:** `app/(tabs)/index.tsx`
- **Today's WOs section:**
  - Call `getWorkOrders({ assigned_to: 'me', status: 'open,in_progress' })` on mount
  - Render a compact `FlatList` (max 5 items) with WO title, priority badge, site name, type icon
  - Each row tappable → `router.push(ROUTES.withParams.workOrder(wo.id))`
  - "See all" link at bottom → `router.push(ROUTES.TABS.WORK_ORDERS)`
  - Sort by priority: urgent > high > medium > low
- **Devices needing attention section:**
  - **Backend dependency:** May need `GET /api/dashboard/attention-devices` or extend dashboard response (see Risk Callouts)
  - If dashboard API already includes device-level data, filter for `battery_pct < 20` or `online === false` with `last_reading_at > 30 min ago`
  - Render compact list: device name, site name, issue icon (battery-low or wifi-off), value (e.g., "12% battery")
  - Each row tappable → device detail
  - If no devices need attention, show a checkmark with "All devices healthy"
- **Keep existing** "Active Alerts" quick action link below these sections

#### Acceptance Criteria
- [ ] Technician Home shows inline list of today's assigned WOs (max 5)
- [ ] WOs sorted by priority (urgent first)
- [ ] Tapping a WO navigates to WO Detail
- [ ] "See all" link navigates to Work Orders tab
- [ ] "Devices needing attention" section shows devices with battery < 20% or offline > 30 min
- [ ] Each attention device is tappable to Device Detail
- [ ] "All devices healthy" message shown when no devices need attention
- [ ] Loading state shown while fetching data

---

### C2-02: Site Viewer Home — Zone Readings Inline
**Priority:** P1  |  **Estimate:** Small
**Labels:** mobile, dashboard, role-specific
**Blocked by:** C1-02 (Zone Detail — finalizes zone data pattern)

#### Objective
Add an inline zone list with latest temperature/humidity readings on the Site Viewer Home screen, so viewers can do their morning check without drilling into multiple screens.

#### Implementation
- **File to modify:** `app/(tabs)/index.tsx`
- **Data source:** Use `getSite(firstSiteId)` which returns `SiteDetail.zones: ZoneSummary[]` — each zone has `devices: DeviceSummary[]`
- **New section** below the SiteCard for site_viewer role:
  - Section header: "Zone Readings"
  - For each zone: zone name, device count, color-coded online percentage bar
  - For each zone, show the latest reading from the first device (if `DeviceSummary` includes last reading — if not, show "N/A" and add to backlog)
  - Each zone row tappable → `router.push(ROUTES.withParams.zone(siteId, zone.name))`
- **Animation:** `FadeInUp` with staggered delays matching existing patterns

#### Acceptance Criteria
- [ ] Site Viewer Home shows "Zone Readings" section below the site card
- [ ] Each zone shows name, device count, and online percentage
- [ ] Zones are tappable and navigate to Zone Detail
- [ ] Section uses `FadeInUp` animation consistent with rest of Home
- [ ] Empty state if site has no zones
- [ ] Data refreshes with pull-to-refresh

---

### C2-03: Create Work Order — Device Selector + Assignee Selector
**Priority:** P1  |  **Estimate:** Medium
**Labels:** mobile, work-orders, forms
**Blocked by:** none

#### Objective
Add optional device and assignee selection to the Create Work Order form. The `createWorkOrder` service already accepts `device_id` and `assigned_to` fields but the UI does not expose them.

#### Implementation
- **File to modify:** `app/create-work-order.tsx`
- **Device selector:**
  - Add after the site selector
  - When a site is selected, fetch `GET /api/sites/{site}/devices` (endpoint exists, not currently called from mobile) via new service call or direct API call
  - Render as a `Select` dropdown (from `src/components/ui/Select.tsx`) with device name + model
  - Optional field — show "None (general)" as default option
  - Filter resets when site changes
- **Assignee selector:**
  - Add after device selector
  - **Backend dependency:** Need `GET /api/sites/{site}/technicians` or similar endpoint. If not available, add it to iot-hub: query `user_sites` pivot where role is technician or site_manager
  - Add `getSiteTechnicians(siteId)` to `src/services/astrea.ts`
  - Render as `Select` dropdown with user name
  - Optional field — show "Unassigned" as default option
- **Wire to submission:** Pass `device_id` and `assigned_to` to `createWorkOrder()` call
- **Validation:** No additional Zod rules needed (both optional)

#### Acceptance Criteria
- [ ] Device selector appears after site is selected
- [ ] Device list is filtered to the selected site
- [ ] Selecting a different site clears the device selection
- [ ] Assignee selector shows users with technician/site_manager role for the site
- [ ] Both fields are optional (can submit without selecting)
- [ ] Selected device_id and assigned_to are sent in the API call
- [ ] WO creation succeeds with device and assignee selected
- [ ] Loading indicators shown while fetching device/user lists

---

### C2-04: Work Order Detail — Photo Gallery with Tap-to-Expand
**Priority:** P1  |  **Estimate:** Small
**Labels:** mobile, work-orders, media
**Blocked by:** C1-05 (Photo upload — photos must exist to display in gallery)

#### Objective
Replace the photo count text on WO Detail with a visual photo gallery grid. The `OptimizedImage` component exists at `src/components/ui/OptimizedImage.tsx` and `WorkOrderPhoto` type includes `photo_path` and `caption`.

#### Implementation
- **File to modify:** `app/work-order/[id].tsx`
- **Replace** the "X photos" text with a grid layout (2 or 3 columns)
- **Each cell:** Render `OptimizedImage` with the photo URL (construct from `[STAGING_URL]/storage/{photo_path}` or use API base URL)
- **Tap-to-expand:** On press, open a fullscreen modal with the image:
  - Use `Modal` component from `src/components/ui/Modal.tsx`
  - Show image full-width with pinch-to-zoom (use `react-native-gesture-handler` + `Animated` or a simple `ScrollView` with `maximumZoomScale`)
  - Show caption below image
  - Close button (X) in top-right corner
- **Empty state:** If `photos.length === 0`, show "No photos yet" with the "Add Photo" button (from C1-05) prominently
- **Photo metadata:** Show upload timestamp below each thumbnail

#### Acceptance Criteria
- [ ] Photos displayed in a 2-column or 3-column grid with thumbnails
- [ ] Tapping a photo opens fullscreen modal with larger image
- [ ] Fullscreen modal shows caption (if present)
- [ ] Close button dismisses the modal
- [ ] Empty state shown when no photos
- [ ] "Add Photo" button visible in both empty and populated states
- [ ] Grid scrolls within the WO Detail scroll view

---

### C2-05: Alert Acknowledge UX for Site Viewer
**Priority:** P1  |  **Estimate:** Quick Win
**Labels:** mobile, alerts, role-gating
**Blocked by:** none

#### Objective
Per PRD AC-005, site_viewer users should see acknowledge/resolve buttons in a disabled state with a "Contact your site manager" tooltip, rather than having them hidden entirely.

#### Implementation
- **File to modify:** `app/alert/[id].tsx`
- **Currently:** Buttons are conditionally rendered only when `canAcknowledgeAlerts(user.roles)` is true
- **Change to:** Always render the buttons, but when `!canAcknowledgeAlerts(user.roles)`:
  - Set `disabled={true}` on both Acknowledge and Resolve buttons
  - Reduce opacity to 0.5
  - On press of disabled button, show a `Tooltip` (from `src/components/ui/Tooltip.tsx`) or `Toast` with message: "Contact your site manager to acknowledge this alert"
  - Use muted colors instead of the action colors

#### Acceptance Criteria
- [ ] Site Viewer sees Acknowledge and Resolve buttons on Alert Detail (previously hidden)
- [ ] Buttons are visually disabled (reduced opacity, muted colors)
- [ ] Tapping a disabled button shows "Contact your site manager" message
- [ ] Buttons remain fully functional for site_manager, technician, org_admin roles
- [ ] No API call is made when a disabled button is tapped

---

### C2-06: Work Order Tab Badge
**Priority:** P1  |  **Estimate:** Quick Win
**Labels:** mobile, work-orders, navigation
**Blocked by:** none

#### Objective
Show a badge on the Work Orders tab icon indicating the count of open work orders, so users can see at a glance if tasks are pending.

#### Implementation
- **File to modify:** `app/(tabs)/_layout.tsx`
- **Data source:** Use the dashboard KPIs already fetched on the Home screen. The `DashboardResponse.kpis.open_work_orders` field contains the count. Store this in a shared context or use React Query cache:
  - Option A (simpler): Read from `queryClient.getQueryData(queryKeys.dashboard)` in the layout
  - Option B (context): Create a lightweight `BadgeCountContext` that the Home screen populates
- **Badge rendering:** Use the `tabBarBadge` option on the Work Orders `Tabs.Screen`:
  ```tsx
  tabBarBadge: openWOCount > 0 ? openWOCount : undefined,
  tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10 },
  ```
- **Refresh:** Badge updates when dashboard data refreshes (on Home screen pull-to-refresh or re-focus)

#### Acceptance Criteria
- [ ] Work Orders tab shows a numeric badge when open WOs > 0
- [ ] Badge disappears when open WO count is 0
- [ ] Badge count matches the dashboard KPI `open_work_orders`
- [ ] Badge updates after pull-to-refresh on Home
- [ ] Badge styling matches the app's design theme

---

### C2-07: i18n — Wire Translation Keys in All Astrea Screens
**Priority:** P1  |  **Estimate:** Small
**Labels:** mobile, i18n, cross-cutting
**Blocked by:** All C1 and C2 feature tasks (new screens should exist before i18n pass)

#### Objective
Replace hardcoded English strings with `t()` translation calls across all Astrea screens. Translation JSON files for EN/ES already exist at `src/translations/{en,es}/{alerts,workOrders,sites,common,auth,tabs}.json`.

#### Implementation
- **Files to modify (existing screens):**
  - `app/(tabs)/index.tsx` — Dashboard (use `common` and `sites` namespaces)
  - `app/(tabs)/alerts.tsx` — Alert List (use `alerts` namespace)
  - `app/alert/[id].tsx` — Alert Detail (use `alerts` namespace)
  - `app/(tabs)/work-orders.tsx` — WO List (use `workOrders` namespace)
  - `app/work-order/[id].tsx` — WO Detail (use `workOrders` namespace)
  - `app/create-work-order.tsx` — Create WO (use `workOrders` namespace)
  - `app/site/[id]/index.tsx` — Site Detail (use `sites` namespace)
  - `app/device/[id].tsx` — Device Detail (use `sites` or `common` namespace)
- **Files to modify (new screens from C1):**
  - `app/notifications.tsx` — Notification Center (add keys to `common` namespace)
  - `app/zone.tsx` — Zone Detail (use `sites` namespace)
- **Pattern per screen:**
  ```tsx
  const { t } = useTranslation('alerts'); // or 'workOrders', 'sites', 'common'
  // Replace: <Text>Active Alerts</Text>
  // With:    <Text>{t('activeAlerts')}</Text>
  ```
- **Missing keys:** Add any new keys to both `en/*.json` and `es/*.json` files
- **Do not change:** Auth screens (already have i18n), Profile screen (already uses `t()`)

#### Acceptance Criteria
- [ ] All 10+ Astrea screens use `t()` for user-facing strings
- [ ] Switching language in Profile reflects changes across all screens
- [ ] Both EN and ES translation files have all required keys (no missing translations)
- [ ] No hardcoded English strings remain in Astrea screens (excluding error messages from API)
- [ ] Tab layout uses `t()` for "Alerts" and "Work Orders" tab titles (currently hardcoded)

---

### C2-08: Pull-to-Refresh on Detail Screens
**Priority:** P1  |  **Estimate:** Small
**Labels:** mobile, ux, refresh
**Blocked by:** none

#### Objective
Add pull-to-refresh to the four detail screens that currently lack it: Alert Detail, Work Order Detail, Site Detail, and Device Detail. List screens already have it.

#### Implementation
- **Files to modify:**
  - `app/alert/[id].tsx`
  - `app/work-order/[id].tsx`
  - `app/site/[id]/index.tsx`
  - `app/device/[id].tsx`
- **Pattern:** Each screen already has a `ScrollView` wrapping the content. Add `RefreshControl`:
  ```tsx
  import { RefreshControl } from 'react-native';

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(); // existing data fetch function
    setRefreshing(false);
  };

  <ScrollView
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
  >
  ```
- **Use** `useRefreshControl` hook from `src/hooks/useRefreshControl.ts` if it simplifies the pattern

#### Acceptance Criteria
- [ ] Pull-to-refresh works on Alert Detail
- [ ] Pull-to-refresh works on Work Order Detail
- [ ] Pull-to-refresh works on Site Detail
- [ ] Pull-to-refresh works on Device Detail
- [ ] Refresh indicator uses theme primary color
- [ ] Data visibly updates after refresh completes
- [ ] No duplicate fetch calls during refresh

---

## Cycle 3: Polish & Launch (P2) — ~5 days

Focus: Offline improvements, charts, platform quality.

---

### C3-01: Migrate Screens to React Query Hooks
**Priority:** P2  |  **Estimate:** Large
**Labels:** mobile, architecture, offline
**Blocked by:** none

#### Objective
Migrate all data-fetching screens from local `useState` + `useEffect` to `useQuery`/`useMutation` from `@tanstack/react-query`. This enables automatic caching, background refetch, stale-while-revalidate, and offline data persistence. The `queryClient`, `queryKeys`, and `STALE_TIMES` are already configured in `src/lib/query-client.ts`.

#### Implementation
- **Files to migrate (one at a time, in this order):**
  1. `app/device/[id].tsx` — simplest, single entity fetch
  2. `app/alert/[id].tsx` — single entity + mutations (acknowledge/resolve)
  3. `app/work-order/[id].tsx` — single entity + mutations (status, notes, photos)
  4. `app/site/[id]/index.tsx` — single entity
  5. `app/(tabs)/index.tsx` — dashboard (single fetch)
  6. `app/(tabs)/alerts.tsx` — paginated list with filters (use `useInfiniteQuery`)
  7. `app/(tabs)/work-orders.tsx` — paginated list with filters
  8. `app/zone.tsx` — single entity (new screen from C1-02)
  9. `app/notifications.tsx` — paginated list (new screen from C1-01)
- **Pattern per screen:**
  ```tsx
  // Before:
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchData(); }, []);

  // After:
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.device(id),
    queryFn: () => getDevice(id),
    staleTime: STALE_TIMES.device,
  });
  ```
- **Mutations:** Convert action calls (acknowledge, resolve, update status, add note, upload photo) to `useMutation` with `onSuccess` cache invalidation
- **Pull-to-refresh:** Pass `refetch` directly to `RefreshControl.onRefresh`
- **Pagination:** Convert `usePagination` + local state to `useInfiniteQuery` for list screens
- **Error handling:** `useQuery` exposes `error` — display via toast or inline error state

#### Acceptance Criteria
- [ ] All 9 data screens use `useQuery` or `useInfiniteQuery` instead of `useState` + `useEffect`
- [ ] All mutations (acknowledge, resolve, status update, add note, upload photo) use `useMutation`
- [ ] `queryKeys` from `query-client.ts` are used consistently
- [ ] Pull-to-refresh still works on all screens
- [ ] Pagination still works on list screens (alerts, work orders, notifications)
- [ ] Going offline shows cached data instead of blank screens
- [ ] Background refetch occurs when returning to a stale screen
- [ ] No regressions in loading states, error handling, or empty states

---

### C3-02: Swipe-to-Acknowledge on Alert List
**Priority:** P2  |  **Estimate:** Small
**Labels:** mobile, alerts, gestures
**Blocked by:** none

#### Objective
Enable swipe-to-acknowledge gesture on alert list items for a faster alert response workflow. The `SwipeableRow` component already exists at `src/components/ui/SwipeableRow.tsx`.

#### Implementation
- **File to modify:** `app/(tabs)/alerts.tsx`
- **Wrap** each alert FlatList item with `SwipeableRow`:
  ```tsx
  <SwipeableRow
    rightActions={[
      {
        label: 'Acknowledge',
        color: '#d97706', // amber
        icon: 'check-circle',
        onPress: () => handleAcknowledge(alert.id),
      },
    ]}
    enabled={canAcknowledgeAlerts(user.roles) && alert.status === 'active'}
  >
    <AlertListItem alert={alert} />
  </SwipeableRow>
  ```
- **Action handler:** Call `acknowledgeAlert(alertId)` from `src/services/astrea.ts`, show success toast, refresh list
- **Role gating:** Only enable swipe for roles that can acknowledge (`canAcknowledgeAlerts`)
- **Status gating:** Only enable for `active` alerts (not already acknowledged/resolved)
- **Haptic feedback:** Import from `src/utils/haptics.ts` and trigger on swipe threshold

#### Acceptance Criteria
- [ ] Swiping left on an active alert reveals "Acknowledge" action
- [ ] Tapping the action acknowledges the alert and refreshes the list
- [ ] Swipe is disabled for site_viewer role
- [ ] Swipe is disabled for already acknowledged/resolved alerts
- [ ] Haptic feedback triggers on swipe threshold
- [ ] Success toast shown after acknowledge
- [ ] Error toast shown if acknowledge fails

---

### C3-03: Offline Stale Indicators
**Priority:** P2  |  **Estimate:** Small
**Labels:** mobile, offline, ux
**Blocked by:** C3-01 (React Query migration — provides `dataUpdatedAt`)

#### Objective
Show "Updated X min ago" labels on cached data so users know when data was last refreshed, especially when offline.

#### Implementation
- **Create** a small reusable component `src/components/astrea/StaleIndicator.tsx`:
  ```tsx
  interface StaleIndicatorProps {
    dataUpdatedAt: number; // from useQuery
    isStale: boolean;      // from useQuery
  }
  ```
  - Renders: "Updated 3 min ago" in muted text below the screen header
  - When stale and offline: show in warning color with wifi-off icon
  - Use `formatDistanceToNow` from `date-fns` or custom relative time formatter from `src/utils/date.ts`
- **Add to screens:**
  - `app/(tabs)/index.tsx` — below KPI row
  - `app/(tabs)/alerts.tsx` — above filter chips
  - `app/(tabs)/work-orders.tsx` — above filter chips
  - Detail screens: below header
- **Requires** `useQuery` to be in place (from C3-01) for `dataUpdatedAt` and `isStale` properties

#### Acceptance Criteria
- [ ] "Updated X min ago" label visible on all data screens
- [ ] Label updates as time passes (relative time)
- [ ] Warning styling (amber text + wifi-off icon) when offline and data is stale
- [ ] Normal styling (muted text) when online
- [ ] Label hidden during initial load (no previous data)

---

### C3-04: Offline Pending Sync Count in NetworkBanner
**Priority:** P2  |  **Estimate:** Quick Win
**Labels:** mobile, offline, ux
**Blocked by:** none

#### Objective
Display the number of queued offline actions in the `NetworkBanner` so users know how many actions are waiting to sync when connectivity returns. The `useOfflineSync` hook already tracks `pendingCount`.

#### Implementation
- **File to modify:** `src/components/ui/NetworkBanner.tsx`
- **Import** `useOfflineSync` from `src/hooks/useOfflineSync`
- **Show count:** When `pendingCount > 0`, append to the banner message:
  - Current: "No internet connection"
  - Updated: "No internet connection — 3 actions pending sync"
- **Sync animation:** When connection returns and sync starts, show "Syncing 3 actions..." with a small spinner

#### Acceptance Criteria
- [ ] NetworkBanner shows pending action count when offline and actions are queued
- [ ] Count updates as new actions are queued offline
- [ ] "Syncing X actions..." message shown when reconnecting
- [ ] Count disappears after all actions sync successfully
- [ ] Banner still shows "No internet connection" with zero pending actions

---

### C3-05: Profile Enhancements — Push Toggle, App Version, Theme Picker
**Priority:** P2  |  **Estimate:** Small
**Labels:** mobile, profile, settings
**Blocked by:** none

#### Objective
Add three missing settings to the Profile screen: push notification toggle, app version display, and Glass/Minimal theme design picker.

#### Implementation
- **File to modify:** `app/(tabs)/profile.tsx`
- **Push notification toggle:**
  - Add a `Switch` component (from `src/components/ui/Switch.tsx`)
  - Use `usePushNotifications` hook to read current registration status
  - On toggle ON: call `registerPushToken()` via the hook
  - On toggle OFF: call `unregisterPushToken()` via the hook
  - Label: "Push Notifications"
- **App version:**
  - Import `Constants` from `expo-constants`
  - Display `Constants.expoConfig?.version` in a row at the bottom of the settings list
  - Label: "App Version" | Value: "1.0.0" (or whatever is in `app.json`)
- **Theme design picker:**
  - Below the existing light/dark toggle
  - Two-option selector: "Glass" and "Minimal"
  - Use `SegmentedControl` from `src/components/ui/SegmentedControl.tsx`
  - Wire to `useDesignTheme` hook (already supports both design systems)
  - Label: "Design Style"

#### Acceptance Criteria
- [ ] Push notification toggle appears in Profile settings
- [ ] Toggling push ON requests permission (if not yet granted) and registers token
- [ ] Toggling push OFF unregisters the push token
- [ ] App version displayed at bottom of Profile (e.g., "v1.0.0")
- [ ] Glass/Minimal theme picker appears below light/dark toggle
- [ ] Selecting a design style applies immediately across all screens
- [ ] Settings persist across app restarts (stored in MMKV/AsyncStorage)

---

### C3-06: Biometric Login Integration
**Priority:** P2  |  **Estimate:** Small
**Labels:** mobile, auth, security
**Blocked by:** none

#### Objective
Wire the existing `useBiometric` hook into the login flow so returning users can authenticate with Face ID or Touch ID instead of re-entering credentials.

#### Implementation
- **File to modify:** `app/(auth)/login.tsx`
- **Hook:** `useBiometric` from `src/hooks/useBiometric.ts` (already implements Face ID/Touch ID check and prompt)
- **Flow:**
  1. On login screen mount, check if biometric is available and credentials are stored
  2. If yes, show a "Login with Face ID" / "Login with Touch ID" button below the password field
  3. On tap: prompt biometric, on success retrieve stored credentials from SecureStore, call `login()` service
  4. On first successful email/password login, offer to save credentials for biometric: "Enable Face ID for faster login?"
  5. Store encrypted credentials in SecureStore via `expo-secure-store`
- **Settings integration:** Add "Biometric Login" toggle in Profile (C3-05) to enable/disable after initial setup
- **Fallback:** Always show email/password form — biometric is optional shortcut

#### Acceptance Criteria
- [ ] "Login with Face ID" button appears when biometric is available and credentials are stored
- [ ] Biometric prompt authenticates and logs in without typing credentials
- [ ] After first email/password login, user is prompted to enable biometric
- [ ] Biometric can be disabled from Profile settings
- [ ] Falls back to email/password if biometric fails or is cancelled
- [ ] Credentials stored securely in SecureStore (not AsyncStorage)
- [ ] Works with both Face ID (iOS) and fingerprint (Android)

---

### C3-07: Device Readings Chart (Victory Native)
**Priority:** P2  |  **Estimate:** Large
**Labels:** mobile, devices, charts
**Blocked by:** C3-01 (React Query — chart data should use `useQuery`)

#### Objective
Add a 24-hour time-series line chart to the Device Detail screen showing temperature (and optionally other metrics). The backend endpoint `GET /api/devices/{device}/readings` exists, and `getDeviceReadings()` is wired in `src/services/astrea.ts`.

#### Implementation
- **File to modify:** `app/device/[id].tsx`
- **Dependencies:** Install `victory-native` (+ peer deps: `react-native-svg`, `d3-interpolate-path` if not present). Verify with `npx expo install victory-native`.
- **Data fetching:**
  ```tsx
  const { data: readings } = useQuery({
    queryKey: ['deviceReadings', deviceId, '24h'],
    queryFn: () => getDeviceReadings(deviceId, twentyFourHoursAgo, now, 'temperature', '1h'),
    staleTime: STALE_TIMES.device,
  });
  ```
- **Chart component:**
  - Place below the "Latest Readings" section
  - `VictoryChart` with `VictoryLine` for the time-series
  - X-axis: hours (formatted "HH:mm")
  - Y-axis: temperature in degrees (with unit from device metric config)
  - Color: theme primary color
  - Min/max reference lines if available
  - Touch tooltip showing exact value + time on press
- **Period selector:** `SegmentedControl` with options: 24h, 7d, 30d
  - Adjust `from`, `to`, and `resolution` params per selection
  - 24h → resolution: `1h` (24 points)
  - 7d → resolution: `6h` (~28 points)
  - 30d → resolution: `1d` (30 points)
- **Empty state:** "No readings available" if the device has no data
- **Loading:** Show `ActivityIndicator` inside chart area while loading

#### Acceptance Criteria
- [ ] 24h temperature chart renders on Device Detail below latest readings
- [ ] Chart shows time on X-axis and temperature on Y-axis
- [ ] Period selector toggles between 24h, 7d, 30d
- [ ] Chart data refreshes when period changes
- [ ] Touch interaction shows value tooltip
- [ ] Empty state shown when device has no readings
- [ ] Chart renders in both light and dark themes
- [ ] Performance: chart renders within 500ms for 100 data points

---

### C3-08: Register & Forgot Password API Routes
**Priority:** P2  |  **Estimate:** Quick Win
**Labels:** backend, auth, api
**Blocked by:** none

#### Objective
Ensure the mobile app's register and forgot-password screens can successfully call the backend. Currently, mobile calls `/register` and `/forgot-password` (Fortify web routes) instead of API-prefixed routes, which may fail due to CSRF/session requirements.

#### Implementation
- **Backend file to modify:** `routes/api.php` in iot-hub
- **Add routes:**
  ```php
  // In api.php — no CSRF required for mobile
  Route::post('/auth/register', [AuthController::class, 'register']);
  Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
  ```
- **Controller:** Add `register()` and `forgotPassword()` methods to the existing `AuthController` (or create a dedicated `AuthApiController` if preferred):
  - `register()`: Validate name/email/password/password_confirmation, create user, return token (same pattern as login)
  - `forgotPassword()`: Validate email, dispatch password reset notification, return success message
- **Mobile adjustment (if needed):** Update `src/services/auth.ts` in iot-expo to use `/api/auth/register` and `/api/auth/forgot-password` URLs
- **Business rule check:** Confirm whether self-registration should be allowed or if org_admin creates all users. If admin-only, return a clear error message and disable the register screen in mobile.

#### Acceptance Criteria
- [ ] `POST /api/auth/register` creates a user and returns a Sanctum token
- [ ] `POST /api/auth/forgot-password` sends a password reset email
- [ ] Both endpoints validate input and return structured error responses
- [ ] Mobile register screen successfully creates an account (or shows "Registration disabled" if intentional)
- [ ] Mobile forgot-password screen successfully triggers reset email
- [ ] Both endpoints have Pest tests

---

## Appendix: Execution Notes

### Test Strategy

Each cycle should conclude with manual QA on both iOS simulator and Android emulator:

| Screen | iOS | Android | Credentials |
|--------|:---:|:-------:|-------------|
| Home (site_manager) | [ ] | [ ] | admin@example.com |
| Home (technician) | [ ] | [ ] | editor@example.com |
| Home (site_viewer) | [ ] | [ ] | user@example.com |
| Alert List + Detail | [ ] | [ ] | any |
| WO List + Detail + Create | [ ] | [ ] | admin@example.com |
| Site Detail + Zone Detail | [ ] | [ ] | any |
| Device Detail | [ ] | [ ] | any |
| Notification Center | [ ] | [ ] | any |
| Profile settings | [ ] | [ ] | any |

### Backend Tasks Required (for iot-hub repo)

These tasks are backend prerequisites identified during mobile planning:

| Task | Mobile Dependency | Effort | File |
|------|-------------------|--------|------|
| `GET /api/sites/{site}/technicians` | C2-03 (assignee selector) | 30 min | `routes/api.php` + `SiteApiController` |
| `GET /api/dashboard/attention-devices` (or extend dashboard) | C2-01 (devices needing attention) | 1 hr | `DashboardApiController` |
| `POST /api/auth/register` | C3-08 | 30 min | `routes/api.php` + `AuthController` |
| `POST /api/auth/forgot-password` | C3-08 | 30 min | `routes/api.php` + `AuthController` |
| Add `notifications` namespace translations | C1-01, C2-07 | 15 min | `src/translations/{en,es}/notifications.json` |

### Definition of Done per Cycle

- [ ] All tasks in the cycle are complete
- [ ] Error toasts show on API failures (no silent catches)
- [ ] Loading states visible on all screens
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] No ESLint errors (`npx eslint . --ext .tsx,.ts` passes)
- [ ] Manual QA on iOS simulator with all 3 test accounts
- [ ] Manual QA on Android emulator with admin account
- [ ] PR created against main with cycle summary

---

*Generated from MOBILE_GAP_ANALYSIS.md. All estimates assume 1 mobile developer familiar with Expo, React Native, and the Astrea codebase. Cycle boundaries are flexible — tasks within a cycle can be reordered as long as dependency constraints are respected.*
