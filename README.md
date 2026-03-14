# Laravel + React + Inertia Starter Template

A production-ready starter template for building modern web applications with Laravel, React, and Inertia.js. This template includes 40+ battle-tested UI components, custom hooks, utilities, and comprehensive documentation.

## Features

✨ **Modern Stack**
- Laravel 12 with Fortify authentication
- React 19 with TypeScript
- Inertia 2 for seamless SPA experience
- Tailwind CSS v4 for styling
- Vite 6 for lightning-fast builds

🎨 **Rich Component Library**
- 40+ shadcn/ui components + custom enhancements
- Specialized inputs (currency, numeric, phone, searchable select, multi-select)
- Advanced date/time components (date picker, range picker, time picker)
- Data display components (tables, pagination, empty states)
- Layout components (page headers, containers, error boundaries)
- React Hook Form integration with Zod validation

🪝 **Production-Tested Hooks**
- `use-toast` - Toast notification system
- `use-appearance` - Theme management (light/dark/system)
- `use-mobile` - Responsive breakpoint detection
- `useDebounce` - Performance optimization for inputs
- `useErrorHandler` - Centralized error handling
- `use-flash-messages` - Laravel flash → toast integration

🛠️ **Developer Experience**
- One-command development: `composer dev`
- Strict TypeScript configuration
- ESLint + Prettier pre-configured
- File naming conventions enforced
- Comprehensive documentation
- AI-friendly project structure (CLAUDE.md included)

## Quick Start (< 5 minutes)

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url> my-app
cd my-app

# Install dependencies and setup
composer setup
# This runs: composer install, creates .env, generates key, runs migrations, npm install, npm run build

# Start development servers (all-in-one command)
composer dev
# Runs: Laravel server, queue worker, logs (pail), and Vite dev server
```

Visit `http://localhost:8000` - Your app is now running!

### Test Credentials

The template includes test users with different roles for immediate development:

| Email | Password | Role | Status | Purpose |
|-------|----------|------|--------|---------|
| `admin@example.com` | `password` | `admin` | Verified | Admin role testing |
| `editor@example.com` | `password` | `editor` | Verified | Editor role testing |
| `user@example.com` | `password` | `user` | Verified | Regular user testing |
| `unverified@example.com` | `password` | `user` | Unverified | Email verification testing |

**To create test users:**
```bash
php artisan db:seed
```

**To reset and reseed:**
```bash
php artisan migrate:fresh --seed
```

### Alternative: Manual Setup

```bash
# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Run migrations
php artisan migrate

# Start servers (separate terminals)
php artisan serve       # Terminal 1
php artisan queue:listen # Terminal 2
php artisan pail        # Terminal 3
npm run dev             # Terminal 4
```

## Development Commands

```bash
# Start all services (recommended)
composer dev

# Build for production
npm run build

# Code quality
npm run lint           # ESLint auto-fix
npm run format         # Prettier formatting
npm run types          # TypeScript checking
npm run format:check   # Check formatting

# Testing
composer test          # Run PHP tests
```

## Project Structure

```
app/
├── Http/Controllers/      # Laravel controllers
├── Models/               # Eloquent models
└── ...

resources/js/
├── Components/           # React components (PascalCase)
│   ├── ui/              # shadcn/ui components + custom
│   ├── app-header.tsx   # App header component
│   ├── app-sidebar.tsx  # Sidebar navigation
│   └── ...
├── Config/              # Configuration files
│   └── navigation.ts    # Navigation structure
├── Hooks/               # Custom React hooks
│   ├── use-toast.ts
│   ├── use-appearance.tsx
│   └── ...
├── Layouts/             # Page layouts
│   ├── app/            # App layouts (sidebar, header)
│   ├── auth/           # Auth layouts (card, simple, split)
│   └── settings/       # Settings layout
├── Pages/               # Inertia page components
│   ├── Auth/
│   ├── Dashboard.tsx
│   └── ...
├── Types/               # TypeScript types
│   ├── index.d.ts      # Core types
│   └── pagination.ts   # Pagination types
├── Utils/               # Utility functions
│   ├── typeHelpers.ts
│   ├── errorHandling.ts
│   └── ...
└── Lib/                 # Library code
    └── utils.ts         # cn() and utilities
```

## Component Library

### Specialized Input Components

```tsx
import { CurrencyInput } from '@/Components/ui/currency-input';
import { SearchableSelect } from '@/Components/ui/searchable-select';
import { MultiSelect } from '@/Components/ui/multi-select';
import { PhoneInput } from '@/Components/ui/phone-input';

// Currency input with locale formatting
<CurrencyInput
  value={amount}
  onChange={setAmount}
  currency="USD"
  locale="en-US"
/>

// Searchable dropdown
<SearchableSelect
  options={options}
  value={selected}
  onValueChange={setSelected}
  placeholder="Search..."
/>
```

### Date/Time Components

```tsx
import { DatePicker } from '@/Components/ui/date-picker';
import { DateRangePicker } from '@/Components/ui/date-range-picker';
import { TimePicker } from '@/Components/ui/time-picker';

<DatePicker value={date} onChange={setDate} />
<DateRangePicker from={startDate} to={endDate} onSelect={setRange} />
<TimePicker value={time} onChange={setTime} />
```

### Forms with React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/Components/ui/form-rhf';
import { Input } from '@/Components/ui/input';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
```

## Custom Hooks

```tsx
import { useToast } from '@/Hooks/use-toast';
import { useDebounce } from '@/Hooks/useDebounce';
import { useIsMobile } from '@/Hooks/use-mobile';

// Toast notifications
const { toast } = useToast();
toast({ title: 'Success!', description: 'Your changes have been saved.' });

// Debounce for search inputs
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

// Responsive design
const isMobile = useIsMobile();
```

## Navigation Configuration

Edit `resources/js/Config/navigation.ts` to customize your app's navigation:

```typescript
import { Home, Settings, User } from 'lucide-react';

export const navigation: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: Home },
      { title: 'Profile', href: '/profile', icon: User },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];
```

## File Naming Conventions

**CRITICAL**: All main directories use PascalCase:

- ✅ `resources/js/Components/`
- ✅ `resources/js/Pages/`
- ✅ `resources/js/Layouts/`
- ✅ `resources/js/Hooks/`
- ✅ `resources/js/Utils/`
- ✅ `resources/js/Types/`
- ✅ `resources/js/Config/`

**File Names:**
- Components: PascalCase (`Button.tsx`, `UserMenu.tsx`)
- Utilities: camelCase (`typeHelpers.ts`, `errorHandling.ts`)
- Hooks: camelCase with 'use' prefix (`useToast.ts`, `useDebounce.ts`)

**Import Paths**: Always use PascalCase
```typescript
import { Button } from '@/Components/ui/button';
import { useToast } from '@/Hooks/use-toast';
import type { User } from '@/Types';
```

## Real-World Example

This starter template is based on production patterns from the [fuel-system](https://github.com/yourusername/fuel-system) project, a real-world Laravel + React application. See fuel-system for advanced implementation examples including:

- Complex form wizards
- Data tables with sorting/filtering
- Multi-step workflows
- Permission-based navigation
- Advanced state management patterns

## Documentation

- [Component Library Guide](docs/components/overview.md)
- [Form Patterns](docs/components/forms.md)
- [Coding Standards](docs/development/coding-standards.md)
- [Architecture Overview](docs/architecture/overview.md)
- [CLAUDE.md](CLAUDE.md) - AI assistant guide

## Tech Stack

**Backend:**
- Laravel 12
- Fortify (authentication)
- Wayfinder (routing)

**Frontend:**
- React 19 (with React Compiler)
- TypeScript 5.7
- Inertia.js 2
- Tailwind CSS 4
- shadcn/ui components
- Radix UI primitives
- React Hook Form
- Zod validation
- date-fns
- Lucide React icons

**Development:**
- Vite 6
- ESLint 9
- Prettier with plugins
- Laravel Pint
- Pest (testing)
- Concurrently (dev orchestration)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is open-sourced software licensed under the [MIT license](LICENSE).

## Credits

Built with ❤️ using:
- [Laravel](https://laravel.com)
- [React](https://react.dev)
- [Inertia.js](https://inertiajs.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

Inspired by production patterns from real-world applications.
