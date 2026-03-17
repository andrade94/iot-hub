# Mobile App Architecture Reference

Source repository: `iot-expo`
Framework: Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9 (strict)

## Directory structure

```
iot-expo/
├── app/                        # Expo Router file-based screens
│   ├── _layout.tsx             # Root layout (providers, auth guard)
│   ├── +not-found.tsx          # 404 fallback
│   ├── create-work-order.tsx   # Modal: new work order form
│   ├── (auth)/                 # Unauthenticated stack
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                 # Authenticated tab navigator
│   │   ├── _layout.tsx         # Tab bar config (AnimatedTabBar)
│   │   ├── index.tsx           # Home / Dashboard
│   │   ├── alerts.tsx          # Alerts list
│   │   ├── work-orders.tsx     # Work orders list
│   │   └── profile.tsx         # Profile & settings
│   ├── alert/[id].tsx          # Alert detail (stack)
│   ├── work-order/[id].tsx     # Work order detail (stack)
│   ├── device/[id].tsx         # Device detail (stack)
│   └── site/[id]/              # Site nested layout
│       ├── _layout.tsx
│       ├── index.tsx           # Site detail
│       └── floor-plan.tsx      # Floor plan (placeholder)
├── src/
│   ├── components/
│   │   ├── layout/             # Screen, ScreenHeader, AnimatedTabBar
│   │   └── ui/                 # 40+ reusable components (barrel: index.ts)
│   ├── config/index.ts         # Env-based configuration (API_URL, timeouts)
│   ├── constants/
│   │   ├── app.ts              # Feature flags, limits, pagination defaults
│   │   ├── colors.ts           # Color palette
│   │   ├── routes.ts           # Typed route constants & helpers
│   │   └── themes.ts           # 4 theme configs (minimal/glass x light/dark)
│   ├── hooks/                  # 27 custom hooks (barrel: index.ts)
│   ├── lib/
│   │   ├── i18n/               # i18next setup, language detector, resources
│   │   ├── offline-queue.ts    # Mutation queue for offline writes
│   │   ├── query-client.ts     # React Query client + key factory
│   │   ├── storage.ts          # AsyncStorage abstraction with sync cache
│   │   ├── shadows.ts          # Shadow utility
│   │   ├── cn.ts               # Tailwind class merging
│   │   └── toast.ts            # Toast helpers
│   ├── services/
│   │   ├── api.ts              # Fetch client (auth, retry, timeout)
│   │   ├── astrea.ts           # All iot-hub API calls
│   │   └── auth.ts             # Auth service (login, register, token refresh)
│   ├── translations/
│   │   ├── en/                 # 8 JSON namespace files
│   │   └── es/                 # 8 JSON namespace files
│   ├── types/
│   │   ├── astrea.ts           # Domain types mirroring iot-hub models
│   │   ├── models.ts           # User, LoginResponse, PaginatedResponse
│   │   ├── i18next.d.ts        # i18n type augmentation
│   │   └── svg.d.ts            # SVG module declaration
│   └── utils/                  # date, string, validation, haptics, async
├── app.config.ts               # Dynamic Expo config (env-aware names/IDs)
├── eas.json                    # EAS Build profiles (dev, preview, production)
├── tailwind.config.js          # NativeWind / Tailwind config
└── package.json
```

## Navigation architecture

Expo Router (file-based routing) with three navigation layers:

### 1. Root Stack (`app/_layout.tsx`)

The root layout wraps the entire app with providers and an auth guard.

**Provider order (outside-in):**
`GestureHandlerRootView` > `ErrorBoundary` > `QueryClientProvider` > `ToastProvider` > `RootLayoutNav`

**Auth guard logic:**
- If `user` is null and not in `(auth)` group, redirect to `/(auth)/login`
- If `user` exists and in `(auth)` group, redirect to `/(tabs)`

**Stack screens registered at root:**

| Screen | Animation | Presentation |
|--------|-----------|-------------|
| `(auth)` | none (headerShown: false) | stack |
| `(tabs)` | none (headerShown: false) | stack |
| `alert/[id]` | slide_from_right | stack |
| `work-order/[id]` | slide_from_right | stack |
| `site/[id]` | slide_from_right | stack |
| `device/[id]` | slide_from_right | stack |
| `create-work-order` | slide_from_bottom | modal |
| `+not-found` | default | stack |

### 2. Tab Navigator (`app/(tabs)/_layout.tsx`)

4 tabs with a custom `AnimatedTabBar` (spring physics, Reanimated 4):

| Tab | Route | Icon | i18n key |
|-----|-------|------|----------|
| Home | `/(tabs)` (index) | `home` | `tabs:home` |
| Alerts | `/(tabs)/alerts` | `notifications` | hardcoded "Alerts" |
| Work Orders | `/(tabs)/work-orders` | `assignment` | hardcoded "Work Orders" |
| Profile | `/(tabs)/profile` | `account-circle` | `tabs:profile` |

### 3. Auth Stack (`app/(auth)/_layout.tsx`)

Simple stack with `slide_from_right` animation, headerShown: false.

Screens: `login`, `register`, `forgot-password`

### 4. Site Nested Layout (`app/site/[id]/_layout.tsx`)

Stack with `slide_from_right`, headerShown: false.

Screens: `index` (site detail), `floor-plan`

## State management

| Concern | Tool | Persistence |
|---------|------|-------------|
| Auth state (user, login, logout) | **Zustand** store (`useAuth`) | Token in `SecureStore`, user in `SecureStore` |
| Server data (alerts, sites, WOs) | **React Query** (`@tanstack/react-query`) | In-memory with 30min gcTime |
| Theme preferences | **Zustand** + `persist` middleware | `AsyncStorage` via zustand persist |
| App preferences (language, etc.) | **AsyncStorage** via `appStorage` | Synced cache in `src/lib/storage.ts` |
| Offline mutations | **Custom queue** (`src/lib/offline-queue.ts`) | MMKV/AsyncStorage via `appStorage` |
| Form state | **React Hook Form** + Zod | None (ephemeral) |

### Zustand stores

**`useAuth`** (`src/hooks/useAuth.ts`)
- State: `user`, `isLoading`, `error`
- Actions: `login()`, `register()`, `logout()`, `loadUser()`, `setUser()`, `clearError()`
- On login: registers push token with backend via `registerPushToken()`
- On logout: unregisters push token via `unregisterPushToken()`
- Initialized at app start via `initializeAuth()` which calls `loadUser()`

**`useDesignTheme`** (`src/hooks/useDesignTheme.ts`)
- State: `designStyle` (minimal | glass), `colorMode` (light | dark), `config` (ThemeConfig)
- Actions: `setDesignStyle()`, `setColorMode()`, `toggleColorMode()`
- Persisted to AsyncStorage under key `design-theme-storage`
- Default: glass style, dark mode

### React Query configuration (`src/lib/query-client.ts`)

```
staleTime:        5 min (default)
gcTime:           30 min (keeps cache for offline)
retry:            2 (queries), 1 (mutations)
refetchOnReconnect: 'always'
```

**Query key factory** (`queryKeys`): `dashboard`, `sites`, `site(id)`, `alerts(filters)`, `alert(id)`, `workOrders(filters)`, `workOrder(id)`, `device(id)`, `notifications`, `user`

**Stale time overrides** (`STALE_TIMES`): alerts = 2 min, user = Infinity

**Network awareness**: `onlineManager` synced with `@react-native-community/netinfo` -- queries auto-pause when offline and resume on reconnect.

## Theme system

2 design styles x 2 color modes = 4 themes.

| Style | Color Mode | Config export | Description |
|-------|-----------|---------------|-------------|
| Minimal | Light | `minimalLightTheme` | Warm whites, teal accent (#0d9488), no blur |
| Minimal | Dark | `minimalDarkTheme` | Warm darks, brighter teal (#14b8a6), no blur |
| Glass | Light | `glassLightTheme` | Frosted surfaces, cyan accent (#0ea5e9), blur 40 |
| Glass | Dark | `glassDarkTheme` | Deep darks, vibrant cyan (#22d3ee), blur 50 |

Each `ThemeConfig` contains: `colors` (25 color tokens), `spacing`, `shadows`, `animations` (duration, spring physics, scale, easing), `useGradients`, `useBlur`.

Access via:
```tsx
const { config, designStyle, colorMode, toggleColorMode } = useDesignTheme();
const { colors, shadows, animations } = config;
```

Gradient presets are exported from `src/constants/themes.ts`: `gradients` (dark), `lightGradients`, `minimalGradients`.

## API client architecture (`src/services/api.ts`)

Custom `fetch` wrapper -- no Axios dependency.

### Request flow

1. Build URL from `API_URL` (env) + endpoint
2. Attach `Bearer` token from `SecureStore` (unless `skipAuth: true`)
3. Set headers: `Content-Type: application/json`, `Accept: application/json`
4. Create `AbortController` with configurable timeout (default 30s)
5. Execute `fetch()`
6. Handle response:
   - **401**: Attempt token refresh via `/auth/refresh` (singleton pattern prevents concurrent refreshes). On success, retry original request. On failure, clear auth data.
   - **422**: Parse validation errors into `ApiError.errors` map
   - **429**: Rate limit error with user-friendly message
   - Other non-OK: generic `ApiError`
7. On network/timeout error: wrap in `ApiError` with code `NETWORK_ERROR` or `TIMEOUT`

### Retry logic

- GET requests default to 2 retries; other methods default to 0
- Retryable conditions: status 408, 429, 500, 502, 503, 504, or codes `TIMEOUT`, `NETWORK_ERROR`
- Exponential backoff: base 500ms, max 10s, with 0-25% jitter

### Exported client

```typescript
api.get<T>(endpoint, options?)    // retries: 2 by default
api.post<T>(endpoint, body?, options?)
api.put<T>(endpoint, body?, options?)
api.patch<T>(endpoint, body?, options?)
api.delete<T>(endpoint, options?)
```

## Offline strategy

### Read path (React Query cache)

- `gcTime: 30 min` keeps stale data in memory for offline reads
- `refetchOnReconnect: 'always'` refreshes on network recovery
- Queries auto-pause when offline via `onlineManager` + NetInfo

### Write path (offline queue)

File: `src/lib/offline-queue.ts`

Supported mutation types:
- `alert:ack` -- acknowledge an alert
- `alert:resolve` -- resolve an alert
- `wo:status` -- change work order status
- `wo:note` -- add a work order note

Queue operations:
- `enqueue(type, payload)` -- add to MMKV/AsyncStorage queue
- `syncQueue()` -- process all queued actions sequentially; failed items remain in queue
- `getQueueCount()` -- pending count for UI badges
- `clearQueue()` -- wipe on logout

### Sync triggers (`useOfflineSync` hook)

1. Network recovers (was offline, now online) via `useNetworkStatus`
2. App comes to foreground via `useOnForeground`

The hook exposes: `pendingCount`, `syncing`, `sync()`, `isOffline`.

## Push notification flow

### Registration

1. User logs in successfully (`useAuth.login()`)
2. `registerForPushNotificationsAsync()` checks feature flag (`APP_CONFIG.features.enablePushNotifications`), verifies physical device, requests permission
3. Gets Expo push token via `Notifications.getExpoPushTokenAsync()`
4. Sends token + device name + platform to backend: `POST /api/push-tokens`

### Foreground handling

`Notifications.setNotificationHandler` configured to show alert, play sound, set badge for all foreground notifications.

### Tap / deep linking

`usePushNotifications` hook listens for notification responses. Deep link mapping:
- `data.type === 'alert'` + `data.alert_id` -> `/alert/{id}`
- `data.type === 'work_order'` + `data.work_order_id` -> `/work-order/{id}`
- `data.route` -> arbitrary route with optional query params

### Unregistration

On logout, the push token is unregistered: `DELETE /api/push-tokens/{token}`

## i18n setup

Library: `i18next` + `react-i18next`
Languages: English (`en`), Spanish (`es`)
Default namespace: `common`

### 8 namespaces

| Namespace | Content |
|-----------|---------|
| `common` | Buttons, labels, status messages |
| `auth` | Login, register, forgot password strings |
| `tabs` | Tab screen titles, profile labels |
| `validation` | Form validation messages |
| `errors` | Network, auth, server error messages |
| `alerts` | Alert-specific strings |
| `workOrders` | Work order-specific strings |
| `sites` | Site-specific strings |

Translation files: `src/translations/{en,es}/{namespace}.json`
Language detector: `src/lib/i18n/language-detector.ts` (device locale)
Resource loader: `src/lib/i18n/resources.ts` (static imports, no dynamic loading)

Usage:
```tsx
const { t } = useTranslation('alerts');
t('acknowledgeConfirm');
```

Language toggle available in profile screen via `useLanguage` hook.

## Key dependencies

| Package | Purpose |
|---------|---------|
| `expo-router` 6 | File-based navigation |
| `@tanstack/react-query` 5 | Server state / caching |
| `zustand` 5 | Client state (auth, theme) |
| `react-hook-form` 7 + `zod` 4 | Form validation |
| `react-native-reanimated` 4 | Native-thread animations |
| `@gorhom/bottom-sheet` 5 | Gesture-driven bottom sheets |
| `nativewind` 4 + `tailwindcss` 3 | Utility-first styling |
| `expo-secure-store` | Encrypted token storage |
| `expo-notifications` | Push notifications |
| `@react-native-community/netinfo` | Network status |
| `i18next` + `react-i18next` | Internationalization |
| `moti` | Declarative mount/unmount animations |
| `expo-updates` | OTA updates |
| `lottie-react-native` | Lottie animations |
| `date-fns` 4 | Date formatting |
