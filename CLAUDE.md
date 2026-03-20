# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Laravel 12 + React 19 + Inertia.js 2 starter template with Fortify auth, Tailwind CSS v4, shadcn/ui components, and TypeScript. Extracted from the production **fuel-system** project at `/Users/andrade-mac-22/Documents/AI/fuel-system` (reference for advanced patterns).

## Project Documents

Place PRDs, specs, briefs, and other project planning documents in `docs/project/`. Read these files at the start of any feature work to understand requirements and context.

- `docs/project/` - PRDs, feature specs, business requirements, design briefs
- `docs/architecture/` - System architecture docs
- `docs/components/` - Component documentation
- `docs/development/` - Development guides
- `docs/features/` - Feature-specific documentation
- `docs/templates/` - Document templates

When starting a new feature, always check `docs/project/` for relevant PRDs or specs before implementing.

## Rules

1. **All directories are lowercase** - `@/components/`, `@/hooks/`, `@/types/`, never `@/Components/`. Critical for Linux compatibility.
2. **Strict TypeScript** - No `any` types unless absolutely necessary.
3. **Inertia only** - Never mix traditional Laravel Blade views with Inertia pages.
4. **Use `form-rhf` for complex forms** - Import from `@/components/ui/form-rhf` (React Hook Form + Zod).
5. **Use existing hooks** - Check `resources/js/hooks/` before recreating functionality.
6. **Navigation via config** - Edit `resources/js/config/navigation.ts`, don't hardcode nav items.
7. **Check shadcn registry before creating custom UI** - Search with `mcp__shadcn__search_items_in_registries` first.

## File Naming Conventions

| Category | Convention | Examples |
|---|---|---|
| Custom components | PascalCase | `UserMenu.tsx`, `AppHeader.tsx` |
| shadcn/ui components | kebab-case | `button.tsx`, `data-table.tsx` |
| Hooks | kebab-case with `use-` prefix | `use-toast.ts`, `use-debounce.ts` |
| Utilities | camelCase | `typeHelpers.ts`, `errorHandling.ts` |
| Types | camelCase | `pagination.ts`, `navigation.ts` |

**Auto-generated directories** (gitignored, do not modify): `resources/js/actions/`, `resources/js/routes/`, `resources/js/wayfinder/`

## Development Environment

Uses **Laravel Herd** - sites served at `http://[directory-name].test` (e.g., `http://iot-hub.test`). No manual server setup needed.

```bash
# Development
composer dev              # Start queue workers, logs, Reverb (WebSocket), and Vite (Herd serves the app)
composer setup            # First-time setup: install deps, .env, key, migrate, npm install, build

# Build & Quality
npm run build             # Production build
npm run build:ssr         # Production build with SSR
npm run lint              # ESLint with auto-fix
npm run format            # Prettier formatting
npm run format:check      # Check formatting without changes
npm run types             # TypeScript type checking (tsc --noEmit)

# Testing
composer test             # PHP tests with Pest (clears config cache first)
php artisan test --filter=ExampleTest  # Run a single test class
php artisan test --filter=test_example # Run a single test method

# Database
php artisan migrate              # Run migrations
php artisan migrate:fresh --seed # Reset DB and seed all test data
php artisan db:seed              # Seed without resetting
```

### Test Credentials (after seeding)

| Email | Password | Role |
|-------|----------|------|
| `super@example.com` | `password` | super_admin |
| `admin@example.com` | `password` | org_admin |
| `manager@example.com` | `password` | site_manager |
| `viewer@example.com` | `password` | site_viewer |
| `tech@example.com` | `password` | technician |

## Architecture

### Backend (Laravel)
- **Routes**: `routes/web.php` (main), `routes/settings.php` (settings, compliance, module dashboards), `routes/api.php` (mobile API) — ~195 total routes
- **Controllers**: `app/Http/Controllers/`
- **Models**: `app/Models/` — 40 models (User, Organization, Site, Device, Gateway, Alert, WorkOrder, ComplianceEvent, CorrectiveAction, MaintenanceWindow, OutageDeclaration, DataExport, ReportSchedule, SiteTemplate, DeviceAnomaly, etc.)
- **Policies**: `app/Policies/` — 14 policies (DevicePolicy, AlertPolicy, AlertRulePolicy, WorkOrderPolicy, SitePolicy, RecipePolicy, EscalationChainPolicy, BillingPolicy, ReportPolicy, UserPolicy, FilePolicy, GatewayPolicy, NotificationPolicy, CorrectiveActionPolicy)
- **Services**: `app/Services/` — Business logic layer (SanityCheckService, MassOfflineDetector, AlertAnalyticsService, DeviceReplacementService, SiteTemplateService, etc.)
- **Notifications**: `app/Notifications/` — SystemNotification, ActivityNotification, PlatformOutageAlert, ExportReadyNotification, WelcomeNotification
- **Migrations**: `database/migrations/` (SQLite by default, in-memory for tests)

### Frontend (React + Inertia)
- **Pages**: `resources/js/pages/` — Correspond to Inertia routes
- **Components**: `resources/js/components/` — UI components (`ui/` has shadcn, 90+ components)
- **Layouts**: `resources/js/layouts/` — `AppLayout` (sidebar+header), `AuthLayout` (card/simple/split), `SettingsLayout`
- **Hooks**: `resources/js/hooks/` — 18 custom hooks
- **Utils**: `resources/js/utils/` — Utility functions
- **Types**: `resources/js/types/` — TypeScript definitions
- **Config**: `resources/js/config/` — Navigation, etc.
- **CSS**: `resources/css/app.css` — Tailwind CSS v4 with `@tailwindcss/vite` plugin

### Shared Inertia Data

The `HandleInertiaRequests` middleware shares these props on every page load:
- `auth` — Current user object with `roles` and `permissions` (cached 5min)
- `current_organization` — Active org (id, name, slug, segment, settings, logo, branding, timezones)
- `accessible_sites` — Sites the user can access (id, name, status)
- `current_site` — Currently selected site (id, name, status, timezone)
- `notifications` / `unreadNotificationsCount` — Latest 10 database notifications
- `sidebarOpen` — Navigation state (from cookie)
- `locale` — Current language (`en`/`es`)
- `active_outage` — Current outage declaration (if any) for dashboard banner

### Auth & Permissions

**Fortify** handles authentication with: registration, password reset, email verification, two-factor authentication.

**Spatie Laravel Permission** manages roles/permissions:
- Roles: `super_admin`, `org_admin`, `site_manager`, `site_viewer`, `technician`
- 29 permissions across organizations, sites, devices, alerts, users, reports, work orders, settings, corrective actions, maintenance, analytics, templates, export
- Check with `$user->hasRole('org_admin')` or `$user->hasPermissionTo('manage devices')`
- Gate checks in policies, middleware-based route protection

### Real-time

**Laravel Reverb** provides WebSocket support. Included in `composer dev`. Used for real-time notifications via `use-realtime-notifications` hook.

### i18n

`laravel-react-i18n` provides translations. Use `useLaravelReactI18n()` hook with `t('key')` for translated strings. Locale files in `lang/`.

## Project-Specific Patterns

### Creating a New Page

1. Create component in `resources/js/pages/` wrapping content with `AppLayout`:
```tsx
import AppLayout from '@/layouts/app-layout';

export default function MyPage() {
    return (
        <AppLayout title="My Page">
            <div>Content</div>
        </AppLayout>
    );
}
```

2. Add route in `routes/web.php`:
```php
Route::get('/my-page', fn() => inertia('MyPage'))->name('my-page');
```

### Flash Messages

Laravel flash messages are **automatically** displayed as Sonner toasts via the `useFlashMessages` hook. The `Toaster` component is globally mounted in `app.tsx`. Just use `toast` from `sonner` for client-side notifications.

### Confirmation Dialogs

Use `ConfirmationDialog` from `@/components/ui/confirmation-dialog` for destructive actions (delete, deactivation). Props: `open`, `onOpenChange`, `title`, `description`, `warningMessage`, `loading`, `onConfirm`, `actionLabel`. Supports optional `children` for extra content.

### Theme

```tsx
const { theme, setTheme } = useAppearance(); // from '@/hooks/use-appearance'
setTheme('dark'); // 'light' | 'dark' | 'system'
```

### Activity Logging

Models use the `LogsActivity` trait from Spatie Activity Log. Configure via `getActivitylogOptions()` on each model.

### Key Types

- **Core** (`resources/js/types/index.d.ts`): `User`, `Auth`, `SharedData`, `BreadcrumbItem`, `NavItem`, `NavGroup`
- **Pagination** (`resources/js/types/pagination.ts`): `PaginatedResponse<T>`, `SimplePaginatedResponse<T>`

### Key Utilities

- `parseDecimalField`, `safeParseFloat` from `@/utils/typeHelpers` — Laravel decimal string to JS number
- `handleInertiaErrors` from `@/utils/errorHandling` — Standardized error handling
- `cn` from `@/lib/utils` — Tailwind class merging

## Mobile Companion App (iot-expo)

The Astrea platform has a mobile companion app in a separate repository at `/Users/andrade-mac-22/Documents/AI/iot-expo`. It is a React Native / Expo SDK 54 app that connects to the iot-hub backend via Sanctum API tokens.

- **Routes**: `routes/api.php` defines 26 mobile API endpoints (22 Sanctum-protected + login + WhatsApp webhook)
- **API Controllers**: `app/Http/Controllers/Api/` (9 controllers)
- **Push Notifications**: `app/Services/Push/PushNotificationService.php` sends via Expo Push API
- **Mobile Tests**: `tests/Feature/Http/MobileApiTest.php` (39 tests), `tests/Feature/Jobs/PushNotificationTest.php` (5 tests)
- **Mobile Docs**: `docs/mobile/` (README, ARCHITECTURE, SCREENS, API_INTEGRATION, SETUP)
- **Mobile PRD**: `docs/project/MOBILE_APP_PRD.md`

When modifying API endpoints in `routes/api.php`, verify that corresponding mobile service calls in `iot-expo/src/services/astrea.ts` are updated.

## Skill & Plugin Workflow

### Required

- **`/frontend-design`** — Invoke FIRST for any frontend task (new pages, components, UI changes, anything in `resources/js/`).

### Recommended

- **`/feature-dev`** — For features spanning multiple files/layers or needing architecture decisions.
- **`/code-simplifier`** / **`/laravel-simplifier`** — After completing implementations or before PRs.
- **`/ralph-loop`** — For complex multi-step tasks that benefit from autonomous iteration.

### MCP Tools

- **shadcn**: Search registry before creating custom UI components.
- **Playwright**: Take screenshots and snapshots for visual verification of UI-heavy features.
- **Context7**: Fetch current docs when unsure about React 19, Laravel 12, Tailwind v4, or Inertia APIs. Use `resolve-library-id` then `query-docs`.
- **Sequential Thinking**: For complex debugging, architecture decisions, or multi-step reasoning.
