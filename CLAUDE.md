# CLAUDE.md

Laravel 12 + React 19 + Inertia.js 2 starter template with Fortify auth, Tailwind CSS v4, shadcn/ui components, and TypeScript.

Extracted from the production **fuel-system** project at `/Users/andrade-mac-22/Documents/AI/fuel-system` (reference for advanced patterns).

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

Uses **Laravel Herd** - sites served at `http://[directory-name].test` (e.g., `http://claude-react-laravel-template.test`). No manual server setup needed.

```bash
composer dev              # Start queue workers, logs, and Vite (Herd serves the app)
npm run build             # Production build
npm run lint              # ESLint with auto-fix
npm run format            # Prettier formatting
npm run types             # TypeScript type checking
composer test             # PHP tests with Pest
```

## Architecture

### Backend (Laravel)
- **Routes**: `routes/web.php`
- **Controllers**: `app/Http/Controllers/`
- **Models**: `app/Models/`
- **Migrations**: `database/migrations/`
- **Policies**: `app/Policies/`

### Frontend (React + Inertia)
- **Pages**: `resources/js/pages/` - Correspond to routes
- **Components**: `resources/js/components/` - UI components (`ui/` has shadcn)
- **Layouts**: `resources/js/layouts/` - Page wrappers (use `AppLayout`)
- **Hooks**: `resources/js/hooks/` - Custom React hooks
- **Utils**: `resources/js/utils/` - Utility functions
- **Types**: `resources/js/types/` - TypeScript definitions
- **Config**: `resources/js/config/` - Navigation, etc.
- **CSS**: `resources/css/app.css` - Tailwind CSS v4 with `@tailwindcss/vite` plugin

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

### Key Types

- **Core** (`resources/js/types/index.d.ts`): `User`, `Auth`, `SharedData`, `BreadcrumbItem`, `NavItem`, `NavGroup`
- **Pagination** (`resources/js/types/pagination.ts`): `PaginatedResponse<T>`, `SimplePaginatedResponse<T>`

### Key Utilities

- `parseDecimalField`, `safeParseFloat` from `@/utils/typeHelpers` - Laravel decimal string to JS number
- `handleInertiaErrors` from `@/utils/errorHandling` - Standardized error handling
- `cn` from `@/lib/utils` - Tailwind class merging

## Skill & Plugin Workflow

### Required

- **`/frontend-design`** - Invoke FIRST for any frontend task (new pages, components, UI changes, anything in `resources/js/`).

### Recommended

- **`/feature-dev`** - For features spanning multiple files/layers or needing architecture decisions.
- **`/code-simplifier`** / **`/laravel-simplifier`** - After completing implementations or before PRs.
- **`/ralph-loop`** - For complex multi-step tasks that benefit from autonomous iteration.

### MCP Tools

- **shadcn**: Search registry before creating custom UI components.
- **Playwright**: Take screenshots and snapshots for visual verification of UI-heavy features.
- **Context7**: Fetch current docs when unsure about React 19, Laravel 12, Tailwind v4, or Inertia APIs. Use `resolve-library-id` then `query-docs`.
- **Sequential Thinking**: For complex debugging, architecture decisions, or multi-step reasoning.
