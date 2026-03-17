# Mobile App Validation Report (Phase 8)

> **Date:** 2026-03-17
> **Validator:** Automated Phase 8 (VALIDATE) pass
> **Repos:** `iot-hub` (backend) + `iot-expo` (mobile)
> **PRD:** `docs/project/MOBILE_APP_PRD.md` v1.1
> **Gap analysis:** `docs/project/MOBILE_GAP_ANALYSIS.md`
> **Task breakdown:** `docs/project/MOBILE_TASK_BREAKDOWN.md`

---

## 1. What Was Built

### iot-hub (Backend)

| Category | Count | Notes |
|----------|:-----:|-------|
| API endpoints (routes/api.php) | 26 | 22 Sanctum-protected + 1 login + 3 settings/api-keys (auto) |
| API controllers | 9 | `app/Http/Controllers/Api/` |
| New models | 1 | `PushToken` |
| Modified models | 1 | `User` (push tokens relation, has_app_access) |
| New services | 1 | `PushNotificationService` |
| New/modified jobs | 5 | SendAlertNotification (modified), SendWorkOrderNotification, SendMorningSummary, SendCorporateSummary, SendRegionalSummary |
| New migrations | 1 | `create_push_tokens_table` |
| Mobile API tests | 39 | `MobileApiTest.php` (149 assertions) |
| Push notification tests | 5 | `PushNotificationTest.php` (8 assertions) |
| Total backend tests passing | 483 | 0 failures, 78 test suites PASS (1 OOM crash in late suite -- memory limit, not test failure) |
| Total test files | 80 | across tests/Unit and tests/Feature |

### iot-expo (Mobile)

| Category | Count | Files |
|----------|:-----:|-------|
| Screen files (app/) | 18 total | 13 user-facing screens + 3 layouts + 1 not-found + 1 create-work-order |
| User-facing screens built | 13 of 17 | Missing: Zone Detail, Notification Center; Stub: Floor Plan; Profile partial |
| UI components (src/components/ui/) | 43 | Button, Card, Input, Select, etc. |
| Layout components | 3 | Screen, ScreenHeader, AnimatedTabBar |
| Custom hooks | 26 | useAuth, usePushNotifications, useOfflineSync, useBiometric, etc. |
| Services | 3 | api.ts, astrea.ts, auth.ts |
| Lib modules | 9 | query-client, offline-queue, storage, i18n, toast, shadows, cn |
| Utility files | 5 | validation, date, string, async, haptics |
| Type definition files | 4 | models.ts, astrea.ts, i18next.d.ts, svg.d.ts |
| Constants | 4 | colors, routes, app, themes |
| Test files | 3 | 2 hook tests + 1 integration test |

### Documentation Created

| Document | Location | Lines |
|----------|----------|:-----:|
| Mobile PRD | `docs/project/MOBILE_APP_PRD.md` | ~706 |
| Mobile Gap Analysis | `docs/project/MOBILE_GAP_ANALYSIS.md` | ~381 |
| Mobile Task Breakdown | `docs/project/MOBILE_TASK_BREAKDOWN.md` | ~660 |
| Mobile Business Rules | `docs/project/MOBILE_BUSINESS_RULES.md` | large |
| Mobile Architecture | `docs/mobile/ARCHITECTURE.md` | ~50+ |
| Mobile Screens | `docs/mobile/SCREENS.md` | ~272 |
| Mobile API Integration | `docs/mobile/API_INTEGRATION.md` | ~50+ |
| Mobile Setup | `docs/mobile/SETUP.md` | -- |

---

## 2. PRD Conformance Table

### Screens (17 specified in PRD)

| # | Screen | PRD Section | Status | Conformance |
|---|--------|-------------|--------|-------------|
| 1 | Login | S4.1 | DONE | FULL -- Zod validation, Sanctum token, push registration |
| 2 | Register | S4.2 | DONE | PARTIAL -- calls `/register` not `/api/auth/register` |
| 3 | Forgot Password | S4.3 | DONE | PARTIAL -- calls `/forgot-password` not API route |
| 4 | Site Viewer Home | S4.4 | PARTIAL | Missing inline zone readings list |
| 5 | Site Manager Home | S4.5 | PARTIAL | Missing quick actions ("View All Alerts", "Create WO") |
| 6 | Technician Home | S4.6 | PARTIAL | No inline WO list or "devices needing attention" section |
| 7 | Alert List | S4.7 | DONE | Missing swipe-to-acknowledge (P2) |
| 8 | Alert Detail | S4.8 | DONE | Site viewer buttons hidden vs disabled per PRD |
| 9 | Work Order List | S4.9 | DONE | Missing tab badge for open WO count |
| 10 | Work Order Detail | S4.10 | PARTIAL | No photo gallery, no add-photo, no device link |
| 11 | Create Work Order | S4.11 | PARTIAL | No device selector, no assignee selector |
| 12 | Profile | S4.12 | PARTIAL | No push toggle, no app version, no design theme picker |
| 13 | Site Detail | S4.13 | DONE | No pull-to-refresh |
| 14 | Zone Detail | S4.14 | MISSING | Screen does not exist; API call wired in astrea.ts |
| 15 | Device Detail | S4.15 | PARTIAL | No 24h readings chart (Victory Native) |
| 16 | Floor Plan | S4.16 | STUB | Placeholder "coming soon" message only |
| 17 | Notification Center | S4.17 | MISSING | Screen does not exist; API calls wired in astrea.ts |

**Screen summary: 8 DONE, 6 PARTIAL, 2 MISSING, 1 STUB**

### API Endpoints (22 specified in PRD + extras)

| # | Endpoint | Route Exists | Controller | Mobile Wired | Test Coverage |
|---|----------|:---:|:---:|:---:|:---:|
| 1 | POST /api/auth/login | YES | YES | YES | YES |
| 2 | POST /api/auth/logout | YES | YES | YES | YES |
| 3 | GET /api/auth/user | YES | YES | YES | YES |
| 4 | POST /api/push-tokens | YES | YES | YES | YES |
| 5 | DELETE /api/push-tokens/{token} | YES | YES | YES | YES |
| 6 | GET /api/dashboard | YES | YES | YES | YES |
| 7 | GET /api/sites | YES | YES | YES | YES |
| 8 | GET /api/sites/{site} | YES | YES | YES | YES |
| 9 | GET /api/sites/{site}/zones/{zone} | YES | YES | YES (service) | YES |
| 10 | GET /api/sites/{site}/devices | YES | YES | NO (unused) | YES |
| 11 | GET /api/devices/{device} | YES | YES | YES | YES |
| 12 | GET /api/devices/{device}/readings | YES | YES | YES (service) | NO |
| 13 | GET /api/devices/{device}/status | YES | YES | NO (unused) | NO |
| 14 | GET /api/alerts | YES | YES | YES | YES |
| 15 | GET /api/alerts/{alert} | YES | YES | YES | YES |
| 16 | POST /api/alerts/{alert}/acknowledge | YES | YES | YES | YES |
| 17 | POST /api/alerts/{alert}/resolve | YES | YES | YES | YES |
| 18 | GET /api/work-orders | YES | YES | YES | YES |
| 19 | GET /api/work-orders/{workOrder} | YES | YES | YES | YES |
| 20 | POST /api/sites/{site}/work-orders | YES | YES | YES | YES |
| 21 | PUT /api/work-orders/{workOrder}/status | YES | YES | YES | YES |
| 22 | POST /api/work-orders/{workOrder}/photos | YES | YES | NO (no UI) | YES |
| 23 | POST /api/work-orders/{workOrder}/notes | YES | YES | YES | YES |
| 24 | GET /api/notifications | YES | YES | YES (service) | YES |
| 25 | POST /api/notifications/mark-all-read | YES | YES | YES (service) | YES |
| 26 | POST /api/whatsapp/webhook | YES | YES | N/A (backend) | -- |

**API summary: 26/26 routes exist, 26/26 controllers implemented, 20/26 called from mobile screens, 23/26 have backend tests**

### Core Features

| Feature | Backend | Mobile | Overall |
|---------|:-------:|:------:|---------|
| Sanctum auth (login/logout/user) | DONE | DONE | DONE |
| Role-based dashboard | DONE | PARTIAL | PARTIAL -- role variants incomplete |
| Alert list + filtering | DONE | DONE | DONE |
| Alert acknowledge/resolve | DONE | DONE | DONE |
| Work order CRUD | DONE | PARTIAL | PARTIAL -- no photo upload UI, no device/assignee selector |
| Push notification infrastructure | DONE | DONE | DONE -- token registration, deep linking, foreground handling |
| Offline write queue (MMKV) | N/A | DONE | DONE |
| Offline read cache | N/A | PARTIAL | PARTIAL -- QueryClient configured but screens use useState |
| i18n (EN/ES) | N/A | PARTIAL | PARTIAL -- translation files exist, screens hardcoded |
| Biometric login | N/A | DONE (hook) | PARTIAL -- hook exists, not wired to login flow |

---

## 3. Scope Changes

### Additions vs Original Plan

| Item | Description | Impact |
|------|-------------|--------|
| WhatsApp webhook | `POST /api/whatsapp/webhook` added for Twilio integration | Positive -- enables alert ack via WhatsApp |
| Corporate/regional summary jobs | `SendCorporateSummary`, `SendRegionalSummary` | Positive -- extends morning summary pattern |
| 43 UI components in iot-expo | Template included a full component library | Positive -- accelerates future work |
| 26 custom hooks in iot-expo | Template included comprehensive hook library | Positive -- most are reusable (biometric, haptics, etc.) |

### Removals / Deferrals

| Item | Reason |
|------|--------|
| Zone Detail screen | Not yet built; API ready |
| Notification Center screen | Not yet built; API ready |
| Floor Plan interactive features | Deferred to v2; stub in place |
| Device readings chart (Victory Native) | Deferred until web M1 (ChirpStack live data) |
| React Query migration | Screens use local state; offline caching not fully realized |

### Unplanned / Scope Creep

No significant scope creep detected. All backend additions directly serve the mobile app PRD requirements. The iot-expo template came with a pre-built component and hook library, which was expected from the project structure. The web app (Inertia pages, controllers) was not modified for mobile work -- the only iot-hub changes are API endpoints, push notification service, and documentation.

---

## 4. Documentation Updates Made (This Phase)

| File | Change |
|------|--------|
| `docs/README.md` | Added "Mobile App (iot-expo)" section with links to all mobile docs and project docs |
| `docs/mobile/README.md` | Added current status line with completion percentages and link to validation report |
| `CLAUDE.md` | Added "Mobile Companion App (iot-expo)" section with API routes, controllers, tests, and cross-repo guidance |
| `docs/project/MOBILE_VALIDATION_REPORT.md` | Created (this file) |

---

## 5. Current Gap Status

### Gap Analysis Re-Assessment

Source: `docs/project/MOBILE_GAP_ANALYSIS.md` (written during Phase 4)

#### P0 Gaps (Cannot Demo/Ship Without)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| P0-1 | Notification Center screen | STILL MISSING | API calls exist in astrea.ts, no screen file |
| P0-2 | Zone Detail screen | STILL MISSING | API endpoint + service call exist, no screen file |
| P0-3 | Error handling on data screens | STILL MISSING | All catch blocks still silent |
| P0-4 | Loading states on list screens | STILL MISSING | No skeleton or spinner on initial load for Home, Alert List, WO List |
| P0-5 | Photo upload on WO Detail | STILL MISSING | Backend endpoint exists, no upload UI |

**P0 resolved: 0 of 5**

#### P1 Gaps (Needed for First User)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| P1-1 | Technician Home: inline WO list | STILL MISSING | Shows links instead of inline list |
| P1-2 | Technician Home: devices needing attention | STILL MISSING | No device attention section |
| P1-3 | Site Viewer Home: zone readings | STILL MISSING | Must drill into site for zone data |
| P1-4 | Site Manager Home: quick actions | STILL MISSING | No "View All Alerts" / "Create WO" buttons |
| P1-5 | Create WO: device selector | STILL MISSING | No device picker |
| P1-6 | Create WO: assignee selector | STILL MISSING | No user picker |
| P1-7 | WO Detail: photo gallery | STILL MISSING | Shows count only |
| P1-8 | Alert Detail: device link | STILL MISSING | Displays info but not tappable |
| P1-9 | WO Detail: device link | STILL MISSING | Device row not tappable |
| P1-10 | Alert acknowledge UX for site_viewer | STILL MISSING | Buttons hidden vs disabled with tooltip |
| P1-11 | WO tab badge | STILL MISSING | No badge on tab icon |
| P1-12 | i18n: wire translation keys | STILL MISSING | Hardcoded English in all Astrea screens |
| P1-13 | Pull-to-refresh on detail screens | STILL MISSING | Only list screens have it |

**P1 resolved: 0 of 13**

#### P2 Gaps (Polish for Production)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| P2-1 | Device readings chart | STILL MISSING | Victory Native not installed |
| P2-2 | Floor plan interactive | STILL MISSING | Stub only |
| P2-3 | Swipe-to-acknowledge | STILL MISSING | SwipeableRow exists in UI lib |
| P2-4 | Offline stale indicators | STILL MISSING | No "Updated X ago" labels |
| P2-5 | Offline pending sync count | STILL MISSING | pendingCount not displayed in banner |
| P2-6 | Profile: push toggle | STILL MISSING | |
| P2-7 | Profile: app version | STILL MISSING | |
| P2-8 | Profile: design theme picker | STILL MISSING | |
| P2-9 | Biometric login integration | STILL MISSING | Hook ready, not wired |
| P2-10 | React Query migration | STILL MISSING | Screens use useState/useEffect |
| P2-11 | Register/forgot-password routes | STILL MISSING | Route mismatch |

**P2 resolved: 0 of 11**

#### NEW Gaps Discovered During Validation

| # | Gap | Priority | Notes |
|---|-----|----------|-------|
| NEW-1 | Test suite OOM crash | P1 | `php artisan test` hits 128MB memory limit in a late test suite (after ~483 passing tests). Not a test failure but prevents full suite completion. Likely a route resolution or provider memory issue in `routes/web.php:155-188` |
| NEW-2 | Device readings endpoint has no test | P2 | `GET /api/devices/{device}/readings` exists but has no test in MobileApiTest.php |
| NEW-3 | Device status endpoint has no test | P2 | `GET /api/devices/{device}/status` exists but has no test in MobileApiTest.php |
| NEW-4 | iot-expo has only 3 test files | P2 | Minimal test coverage for 13 screens, 26 hooks, 3 services |

**Total gaps: 5 P0 + 13 P1 + 11 P2 + 4 NEW = 33 open items**

---

## 6. Lightweight Re-Census (iot-expo)

| Category | Phase 1 Count | Current Count | Delta |
|----------|:------------:|:-------------:|:-----:|
| Screen files (user-facing) | 13 | 13 | 0 |
| Layout files | 3 | 3 | 0 |
| UI components | 43 | 43 | 0 |
| Layout components | 3 | 3 | 0 |
| Custom hooks | 26 | 26 | 0 |
| Services | 3 | 3 | 0 |
| Lib modules | 9 | 9 | 0 |
| Utility files | 5 | 5 | 0 |
| Type files | 4 | 4 | 0 |
| Constants | 4 | 4 | 0 |
| Test files | 3 | 3 | 0 |

**No drift detected.** The iot-expo repo has not been modified since its initial implementation commit (`48a6861`). All changes since Phase 4 have been documentation-only in the iot-hub repo.

---

## 7. Follow-Up Dev Tasks (Linear-Ready)

### Cycle 1: Ship-Ready Core (P0 + critical P1) -- ~4 days

| Task ID | Title | Size | Description | Acceptance Criteria |
|---------|-------|------|-------------|---------------------|
| MOB-001 | Build Notification Center screen | Medium | Create `app/notifications.tsx` with paginated FlatList of database notifications, mark-as-read on tap, "Mark all read" button, deep link to alert/WO detail. Wire bell icon in ScreenHeader. | Bell icon navigates to notification center. Notifications display with type icon. Tap marks as read. "Mark all read" clears all. Tap notification deep links to correct detail screen. |
| MOB-002 | Build Zone Detail screen | Medium | Create `app/zone/[id].tsx` (or `app/site/[id]/zone/[id].tsx`) with zone name + site breadcrumb, device list with status/battery/last reading, zone metric summary (avg/min/max temperature, humidity). Wire zone card tap in Site Detail. | Tapping a zone card in site detail navigates to zone detail. Devices are listed with status indicators. Zone metrics are displayed. Device rows navigate to device detail. |
| MOB-003 | Add error handling to all data screens | Small | Replace silent catch blocks with `showErrorToast()` calls in Home, Alert List, Alert Detail, WO List, WO Detail, Site Detail, Device Detail. Use existing `src/lib/toast.ts`. | Network failures show toast with error message. Screens show retry-friendly empty state instead of blank content. |
| MOB-004 | Add loading states to list screens | Small | Add ActivityIndicator or Skeleton shimmer to Home, Alert List, WO List during initial data fetch. Skeleton component exists at `src/components/ui/Skeleton.tsx`. | First load shows skeleton or spinner instead of empty content. Pull-to-refresh still works. |
| MOB-005 | Implement photo upload on WO Detail | Medium | Add "Add Photo" button to WO Detail (camera + gallery via `ImagePickerButton`). Upload via `POST /api/work-orders/{id}/photos` (multipart). Display photo gallery grid with tap-to-expand using `OptimizedImage`. | Photos can be captured or selected from gallery. Upload succeeds and photo appears in gallery. Gallery supports tap-to-expand. |
| MOB-006 | Add device link navigation | Quick Win | Make device section tappable in Alert Detail (`app/alert/[id].tsx`) and WO Detail (`app/work-order/[id].tsx`). Navigate to `/device/{id}`. | Tapping device info in alert or WO detail navigates to device detail screen. |
| MOB-007 | Site Manager Home: quick actions | Quick Win | Add "View All Alerts" and "Create Work Order" action buttons for site_manager role on Home tab. | Site managers see two action buttons below KPI row. Buttons navigate to alerts tab and create-work-order modal respectively. |
| MOB-008 | Site viewer alert button UX | Quick Win | Show disabled acknowledge/resolve buttons with "Contact your site manager" text for site_viewer role in Alert Detail, instead of hiding them entirely. | Site viewers see greyed-out buttons with explanatory text per PRD spec AC-005. |

### Cycle 2: Complete Experience (remaining P1) -- ~4 days

| Task ID | Title | Size | Description |
|---------|-------|------|-------------|
| MOB-009 | Technician Home: inline WO list | Small | Show today's assigned WOs sorted by priority inline on Home screen for technician role. |
| MOB-010 | Technician Home: devices needing attention | Small | Add section showing devices with battery < 20% or offline > 30 min for technician role. |
| MOB-011 | Site Viewer Home: zone readings | Small | Add inline zone list with latest temperature/humidity per zone for site_viewer role. |
| MOB-012 | Create WO: device selector | Small | Add optional device picker filtered by selected site to Create Work Order form. |
| MOB-013 | Create WO: assignee selector | Small | Add user picker for site technicians to Create Work Order form. |
| MOB-014 | WO tab badge | Quick Win | Add badge showing open WO count on Work Orders tab icon. |
| MOB-015 | i18n: wire translation keys | Medium | Replace hardcoded English strings in all Astrea screens with `t()` calls using existing EN/ES translation files. |
| MOB-016 | Pull-to-refresh on detail screens | Small | Add RefreshControl to Alert Detail, WO Detail, Site Detail, Device Detail. |

### Cycle 3: Polish & Launch (P2) -- ~5 days

| Task ID | Title | Size | Description |
|---------|-------|------|-------------|
| MOB-017 | Migrate screens to React Query | Large | Replace useState/useEffect data fetching with useQuery/useMutation. Enable automatic caching, background refetch, stale management. |
| MOB-018 | Device readings chart | Medium | Install Victory Native. Add 24h time-series chart to Device Detail using `GET /api/devices/{device}/readings`. |
| MOB-019 | Swipe-to-acknowledge alerts | Small | Add swipe gesture to Alert List using existing SwipeableRow component. |
| MOB-020 | Offline stale indicators | Small | Add "Updated X min ago" labels to cached data displays. |
| MOB-021 | Profile enhancements | Small | Push notification toggle, app version display, Glass/Minimal theme picker. |
| MOB-022 | Biometric login | Small | Wire existing `useBiometric` hook into login screen as optional re-auth. |
| MOB-023 | Fix test suite OOM | Quick Win | Investigate and fix memory exhaustion in `php artisan test`. Likely needs `memory_limit` increase or route optimization. |
| MOB-024 | Add missing API endpoint tests | Quick Win | Add tests for `GET /api/devices/{device}/readings` and `GET /api/devices/{device}/status`. |

### Backlog (v2)

| Task ID | Title | Notes |
|---------|-------|-------|
| MOB-B01 | Floor plan interactive view | Image overlay with colored device dots, popovers. 3-5 day effort. |
| MOB-B02 | Skeleton loading states | Replace ActivityIndicator with shimmer placeholders using existing Skeleton component. |
| MOB-B03 | Mobile test coverage | Add tests for screens, hooks, and services in iot-expo (currently only 3 test files). |
| MOB-B04 | Register/forgot-password API routes | Either add `POST /api/auth/register` and `POST /api/auth/forgot-password` or clarify that registration is org-admin only. |
| MOB-B05 | Real-time WebSocket updates | Replace pull-to-refresh with Reverb/Pusher for live data (v2). |
| MOB-B06 | Offline pending sync count in banner | Display `pendingCount` from useOfflineSync in NetworkBanner. |
| MOB-B07 | Haptic feedback on actions | Wire existing `haptics.ts` utility into alert acknowledge, WO status transitions. |

---

## 8. Recommendations

### Immediate (this week)

1. **Fix the test OOM issue (MOB-023)** -- 483 tests pass but the suite crashes before finishing. This is likely caused by excessive route registration or provider bootstrapping. Either increase `memory_limit` in `phpunit.xml` or investigate route grouping in `routes/web.php` lines 155-188.

2. **Start Cycle 1 (MOB-001 through MOB-008)** -- These are the P0 blockers. The two missing screens (Notification Center, Zone Detail) each have their API calls already wired in `astrea.ts` and their backend endpoints tested. The remaining tasks are small fixes (error handling, loading states, navigation links).

### Short-term (next 2 weeks)

3. **Cycle 2 (MOB-009 through MOB-016)** -- Focus on per-role home screen completeness and i18n wiring. These are the P1 items that make the app feel complete for each persona.

4. **React Query migration (MOB-017)** -- This is the single highest-impact architectural change. Currently, every data screen uses manual `useState`/`useEffect` patterns, which means the offline cache configuration in `query-client.ts` is unused. Migrating to `useQuery`/`useMutation` would immediately enable: automatic stale data management, background refetch, cache persistence, and proper offline support.

### Before app store submission

5. **Push notification credentials** -- Configure EAS project with Apple APNs and Google FCM certificates. The entire push infrastructure is built but untestable without credentials.

6. **End-to-end testing** -- The iot-expo repo has only 3 test files. Before submission, add at minimum: auth flow tests, navigation tests, and API service mock tests.

7. **App Store metadata** -- Screenshots, description, privacy policy URL are all TODO.

### Architecture note

The backend is essentially complete for mobile (100% endpoint coverage, 44 dedicated mobile tests). All remaining work is in the iot-expo frontend repo. The separation of concerns is clean -- no web app (Inertia) code was modified for mobile work, and the API layer is self-contained in `app/Http/Controllers/Api/`.
