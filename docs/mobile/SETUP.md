# Development Setup Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | >= 18 | Required by Expo SDK 54 |
| **npm** | >= 9 | Comes with Node (lockfile uses npm) |
| **Expo CLI** | Latest | `npx expo` (no global install needed) |
| **EAS CLI** | >= 15 | `npm install -g eas-cli` (for builds) |
| **Xcode** | 16+ | iOS simulator; install via App Store |
| **Android Studio** | Latest | Android emulator; optional |
| **Watchman** | Latest | `brew install watchman` (recommended for macOS) |

The backend (`iot-hub`) must be running for API calls to work. It uses **Laravel Herd** and is served at `http://iot-hub.test`. See the iot-hub [CLAUDE.md](../../CLAUDE.md) for backend setup.

## Installation

```bash
# Clone the repo (if not already)
git clone <iot-expo-repo-url>
cd iot-expo

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## Environment configuration

Edit `.env` to point to your iot-hub backend:

```dotenv
# Required: iot-hub backend URL
EXPO_PUBLIC_API_URL=http://iot-hub.test/api

# Request timeout (ms)
EXPO_PUBLIC_API_TIMEOUT=30000

# Environment: development | staging | production
EXPO_PUBLIC_ENV=development

# Debug logging
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_LOG_API_CALLS=true

# Enable push notifications (requires physical device + EAS project)
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

### API URL by scenario

| Scenario | EXPO_PUBLIC_API_URL |
|----------|---------------------|
| iOS Simulator (Herd) | `http://iot-hub.test/api` |
| Android Emulator (Herd) | `http://10.0.2.2:80/api` or use ngrok |
| Physical device (local) | Use ngrok: `https://your-tunnel.ngrok-free.app/api` |
| Physical device (LAN) | `http://192.168.x.x/api` (your machine's LAN IP) |
| Production | `https://api.yourdomain.com` |

Note: iOS Simulator can resolve `.test` domains via Herd's DNS. Android emulators cannot -- use `10.0.2.2` or a tunnel.

## Running the app

### Expo Go (quickest start)

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone or press `i` for iOS Simulator / `a` for Android Emulator.

**Limitations**: Expo Go does not support custom native modules. If you need push notifications or biometrics on a physical device, use a development build.

### Development build (full native features)

```bash
# Build for iOS Simulator
npx expo run:ios

# Build for Android Emulator
npx expo run:android

# Or use EAS for a dev client
eas build --profile development --platform ios
```

Then start the dev server:

```bash
npx expo start --dev-client
```

### Available scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run dev` | Start with dev client |
| `npm run ios` | Build and run on iOS |
| `npm run android` | Build and run on Android |
| `npm run web` | Start web version |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with coverage report |

## Building with EAS

Three build profiles are configured in `eas.json`:

### Development

```bash
eas build --profile development --platform ios
# or
npm run build:dev
```

- Internal distribution
- iOS Simulator enabled
- `EXPO_PUBLIC_ENV=development`

### Preview (staging)

```bash
eas build --profile preview --platform ios
# or
npm run build:preview
```

- Internal distribution
- Preview channel for OTA updates
- `EXPO_PUBLIC_ENV=staging`

### Production

```bash
eas build --profile production --platform ios
# or
npm run build:prod
```

- App Store / Play Store distribution
- Auto-increment version
- Production channel for OTA updates
- `EXPO_PUBLIC_ENV=production`

### OTA updates

```bash
eas update --auto
# or
npm run update
```

Pushes JS bundle updates to devices without a new binary build. Channels match build profiles.

## Test credentials

After running `php artisan migrate:fresh --seed` in the iot-hub backend:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `password` | admin |
| `editor@example.com` | `password` | editor |
| `user@example.com` | `password` | user |
| `unverified@example.com` | `password` | user (unverified email) |

The login screen in dev mode pre-fills `demo@example.com` / `password`. Update these to match your seeded users.

See `docs/project/ASTREA_BUSINESS_RULES.md` for Astrea-specific roles (super_admin, org_admin, site_manager, technician, site_viewer) which are available after running the full Astrea seeder.

## Mock mode

For UI development without a running backend, enable mock auth in `src/services/auth.ts`:

```typescript
const MOCK_AUTH = true;  // line 18 — set to true
```

This bypasses all API calls with mock data. Set back to `false` when connecting to the real backend.

## Project structure notes

- **Path alias**: `@/` maps to the project root (configured in `tsconfig.json` and `babel.config.js`)
- **Typed routes**: `expo-router` typed routes are enabled (`experiments.typedRoutes: true` in `app.config.ts`)
- **New Architecture**: React Native New Architecture is enabled (`newArchEnabled: true`)
- **Styling**: NativeWind v4 (Tailwind for React Native). Config in `tailwind.config.js`, global styles in `global.css`.
- **Animation engine**: Reanimated 4 for native-thread animations. Never use the legacy `Animated` API.
