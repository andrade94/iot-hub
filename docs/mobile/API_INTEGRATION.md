# Mobile API Integration Guide

How the `iot-expo` mobile app connects to the `iot-hub` Laravel backend.

## Authentication flow

```
1. User enters email + password on login screen
2. useAuth.login() calls authService.login()
3. authService.login() calls api.post('/auth/login', { email, password, device_name })
4. Backend returns { data: { token, user } }
5. Token stored in SecureStore ('auth_token')
6. User JSON stored in SecureStore ('user_data')
7. Zustand state updated: set({ user, isLoading: false })
8. Root layout auth guard redirects to /(tabs)
9. Push token registered: POST /api/push-tokens { token, device_name, platform }
```

### Token storage

| Key | Store | Content |
|-----|-------|---------|
| `auth_token` | `expo-secure-store` (encrypted) | Sanctum API token string |
| `refresh_token` | `expo-secure-store` (encrypted) | Refresh token (if returned) |
| `user_data` | `expo-secure-store` (encrypted) | JSON-serialized User object |

### Token attachment

Every API request (except those with `skipAuth: true`) reads the token from SecureStore and attaches it as:
```
Authorization: Bearer {token}
```

### Token refresh on 401

When any request returns HTTP 401:
1. API client calls `attemptTokenRefresh()` (singleton -- concurrent requests share one refresh)
2. `POST /api/auth/refresh` with `{ refresh_token }` (skipAuth: true to avoid infinite loop)
3. On success: new token stored in SecureStore, original request retried with new token
4. On failure: all auth data cleared from SecureStore, user redirected to login

### Logout

```
1. useAuth.logout() called
2. Push token unregistered: unregisterPushToken(token) -> DELETE /api/push-tokens/{token}
3. authService.logout() calls api.post('/auth/logout')
4. SecureStore cleared: auth_token, refresh_token, user_data
5. Zustand state: set({ user: null })
6. Root layout auth guard redirects to /(auth)/login
```

---

## API functions reference

All functions are in `src/services/astrea.ts`. They use the `api` client from `src/services/api.ts` which handles auth, retry, and error wrapping.

### Auth

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `login(email, password, deviceName)` | POST | `/auth/login` | `{ email, password, device_name }` | `AstreaLoginResponse` (`{ token, user }`) |
| `logout()` | POST | `/auth/logout` | -- | `void` |
| `getCurrentUser()` | GET | `/auth/user` | -- | `AstreaUser` |

### Dashboard

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `getDashboard()` | GET | `/dashboard` | -- | `DashboardResponse` (`{ kpis, sites }`) |

**`DashboardResponse` shape:**
```typescript
{
  kpis: {
    total_devices: number;
    online_devices: number;
    online_pct: number;
    active_alerts: number;
    open_work_orders: number;
  };
  sites: Array<{
    id: number;
    name: string;
    address: string | null;
    total_devices: number;
    online_devices: number;
    online_pct: number;
    active_alerts: number;
    open_work_orders: number;
  }>;
}
```

### Sites

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `getSites()` | GET | `/sites` | -- | `Site[]` |
| `getSite(siteId)` | GET | `/sites/{siteId}` | -- | `SiteDetail` (includes zones, active_alerts) |
| `getZone(siteId, zoneName)` | GET | `/sites/{siteId}/zones/{zoneName}` | -- | `ZoneDetail` |

### Devices

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `getDevice(deviceId)` | GET | `/devices/{deviceId}` | -- | `DeviceDetail` |
| `getDeviceReadings(deviceId, from, to, metric?, resolution?)` | GET | `/devices/{deviceId}/readings?from=&to=&metric=&resolution=` | -- | `unknown[]` |

### Alerts

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `getAlerts(filters)` | GET | `/alerts?severity=&status=&site_id=&per_page=&page=` | -- | `PaginatedResponse<AlertListItem>` |
| `getAlert(alertId)` | GET | `/alerts/{alertId}` | -- | `AlertDetail` |
| `acknowledgeAlert(alertId)` | POST | `/alerts/{alertId}/acknowledge` | -- | `void` |
| `resolveAlert(alertId)` | POST | `/alerts/{alertId}/resolve` | -- | `void` |

**`AlertFilters`:**
```typescript
{ severity?: string; status?: string; site_id?: number; per_page?: number; page?: number }
```

### Work Orders

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `getWorkOrders(filters)` | GET | `/work-orders?status=&priority=&site_id=&assigned_to=&per_page=&page=` | -- | `PaginatedResponse<WorkOrderListItem>` |
| `getWorkOrder(workOrderId)` | GET | `/work-orders/{workOrderId}` | -- | `WorkOrderDetail` |
| `createWorkOrder(siteId, data)` | POST | `/sites/{siteId}/work-orders` | `{ title, type, priority, description?, device_id?, assigned_to? }` | `WorkOrderListItem` |
| `updateWorkOrderStatus(workOrderId, status)` | PUT | `/work-orders/{workOrderId}/status` | `{ status }` | `{ id, status }` |
| `addWorkOrderNote(workOrderId, note)` | POST | `/work-orders/{workOrderId}/notes` | `{ note }` | `WorkOrderNote` |

**`WOFilters`:**
```typescript
{ status?: string; priority?: string; site_id?: number; assigned_to?: string; per_page?: number; page?: number }
```

### Notifications

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `getNotifications(page)` | GET | `/notifications?page=` | -- | `PaginatedResponse<unknown>` |
| `markAllNotificationsRead()` | POST | `/notifications/mark-all-read` | -- | `void` |

### Push Tokens

| Function | Method | Endpoint | Request body | Response type |
|----------|--------|----------|-------------|---------------|
| `registerPushToken(token, deviceName, platform)` | POST | `/push-tokens` | `{ token, device_name, platform }` | `void` |
| `unregisterPushToken(token)` | DELETE | `/push-tokens/{token}` | -- | `void` |

---

## Request / response format

### Standard response envelope

All iot-hub API responses follow this pattern:
```json
{
  "data": { ... }
}
```

The `astrea.ts` functions unwrap `res.data` before returning. Paginated endpoints return:
```json
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "from": 1,
    "to": 20,
    "total": 45,
    "per_page": 20,
    "last_page": 3
  },
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": "..."
  }
}
```

### Request headers

Every request includes:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}    (unless skipAuth)
```

### Validation error (422)

```json
{
  "message": "The email field is required.",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

Mapped to `ApiError` with `code: 'VALIDATION_ERROR'` and `errors` record.

---

## Error handling patterns

### ApiError class (`src/services/api.ts`)

```typescript
class ApiError extends Error {
  status: number;       // HTTP status code (0 for network/timeout errors)
  code?: string;        // 'UNAUTHORIZED', 'VALIDATION_ERROR', 'RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR'
  errors?: Record<string, string[]>;  // Validation errors (422 only)
}
```

### Screen-level error handling

Screens typically use try/catch with silent failures (data just doesn't load) and show `EmptyState` when no data. Auth screens surface first validation error via `showErrorToast()`.

### Auth service error handling

`authService` methods catch `ApiError`, extract the first validation message if present, and re-throw as a plain `Error` with a user-friendly message.

---

## Offline queue behavior

File: `src/lib/offline-queue.ts`

### Queued action shape

```typescript
interface QueuedAction {
  id: string;                          // timestamp + random suffix
  type: 'alert:ack' | 'alert:resolve' | 'wo:status' | 'wo:note';
  payload: Record<string, unknown>;    // e.g. { alertId: 42 } or { workOrderId: 7, status: 'completed' }
  createdAt: string;                   // ISO 8601
}
```

### Queue storage

Stored as a JSON array in `appStorage` (AsyncStorage with sync cache) under key `offline_queue`.

### Processing

`syncQueue()` iterates actions sequentially. Each action maps to the corresponding `astrea.ts` function:

| Queue type | API call |
|-----------|----------|
| `alert:ack` | `acknowledgeAlert(payload.alertId)` |
| `alert:resolve` | `resolveAlert(payload.alertId)` |
| `wo:status` | `updateWorkOrderStatus(payload.workOrderId, payload.status)` |
| `wo:note` | `addWorkOrderNote(payload.workOrderId, payload.note)` |

Successfully synced actions are removed; failed actions remain for retry on next sync trigger.

### Sync triggers

Via `useOfflineSync` hook (typically mounted at app root or relevant screens):
1. Network state changes from offline to online
2. App transitions from background to foreground

---

## Push token lifecycle

```
Login
  |-> registerForPushNotificationsAsync()
  |   |-> Check feature flag (EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS)
  |   |-> Check Device.isDevice (physical device required)
  |   |-> Request notification permissions
  |   |-> Get Expo push token
  |   \-> Return token string
  |
  |-> registerPushToken(token, deviceName, platform)
  |   \-> POST /api/push-tokens { token, device_name, platform: 'ios'|'android' }
  |
  ... app usage ...
  |
Logout
  |-> registerForPushNotificationsAsync() (to get current token)
  |-> unregisterPushToken(token)
  |   \-> DELETE /api/push-tokens/{token}
  \-> Clear auth data
```

The backend stores push tokens per user and sends notifications via Expo Push API. See [ASTREA_BUSINESS_RULES.md](../project/ASTREA_BUSINESS_RULES.md) for alert notification escalation logic.
