# Using This Template

This document explains how to use this repository as a template for new Laravel + React + Inertia projects.

## Creating a New Project from This Template

### On GitHub

1. **Click "Use this template"** button at the top of this repository
2. **Fill in details**:
   - Repository name: `your-new-project`
   - Description: Your project description
   - Public or Private
3. **Click "Create repository from template"**
4. **Clone your new repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/your-new-project.git
   cd your-new-project
   ```

### Initial Setup

Run the automated setup:
```bash
composer setup
```

This will:
- Install PHP dependencies
- Create `.env` file
- Generate application key
- Run database migrations
- Install Node dependencies
- Build frontend assets

## Customization Checklist

After creating a new project from this template, customize these files:

### 1. Application Identity

- [ ] **composer.json**
  ```json
  "name": "your-org/your-project",
  "description": "Your project description",
  ```

- [ ] **package.json**
  ```json
  "name": "your-project",
  ```

- [ ] **.env**
  ```env
  APP_NAME="Your Project Name"
  APP_URL=http://your-project.test
  DB_DATABASE=your_project
  ```

### 2. Branding & Content

- [ ] **resources/js/Components/app-logo.tsx** - Replace with your logo
- [ ] **resources/js/Components/app-logo-icon.tsx** - Replace with your icon
- [ ] **public/favicon.ico** - Add your favicon
- [ ] **README.md** - Replace template README with your project README

### 3. Navigation

- [ ] **resources/js/Config/navigation.ts** - Customize navigation menu
  ```typescript
  export const navigation: NavGroup[] = [
      {
          title: 'Main',
          items: [
              { title: 'Dashboard', href: '/dashboard', icon: Home },
              // Add your menu items
          ],
      },
  ];
  ```

### 4. Theme & Colors (Optional)

- [ ] **resources/css/app.css** - Customize CSS variables for colors
- [ ] **tailwind.config.js** - Adjust Tailwind configuration if needed

### 5. Documentation

- [ ] **CLAUDE.md** - Update with project-specific patterns
- [ ] **CONTRIBUTING.md** - Customize contribution guidelines
- [ ] **docs/** - Add project-specific documentation

### 6. Remove Template-Specific Files (Optional)

After you're comfortable with the template, you can remove:
- [ ] **TEMPLATE-USAGE.md** (this file)
- [ ] **IMPLEMENTATION-SUMMARY.md** (implementation notes)

## Development Workflow

### Start Development Servers (All-in-one)

```bash
composer dev
```

This runs:
- Laravel development server (http://localhost:8000)
- Queue worker
- Log viewer (pail)
- Vite dev server (HMR)

### Individual Commands

If you prefer to run services separately:

```bash
# Terminal 1
php artisan serve

# Terminal 2
php artisan queue:listen

# Terminal 3
php artisan pail

# Terminal 4
npm run dev
```

### Code Quality

```bash
npm run lint           # ESLint with auto-fix
npm run format         # Prettier formatting
npm run types          # TypeScript checking
composer test          # PHP tests
```

## First Features to Build

1. **Update Dashboard** (`resources/js/Pages/dashboard.tsx`)
   - Replace welcome content with your dashboard

2. **Create Your First Model**
   ```bash
   php artisan make:model YourModel -mfs
   # Creates: Model, Migration, Factory, Seeder
   ```

3. **Create a CRUD Resource**
   - Controller: `php artisan make:controller YourModelController --resource`
   - Page: Create in `resources/js/Pages/YourModels/`
   - Use existing components for forms and tables

4. **Customize Navigation**
   - Edit `resources/js/Config/navigation.ts`
   - Add routes in `routes/web.php`

## Available Components

This template includes 40+ ready-to-use components. See:
- [Component Overview](docs/components/overview.md)
- [Form Patterns](docs/components/forms.md)
- UI components in `resources/js/Components/ui/`

### Commonly Used Components

```tsx
// Forms
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { SearchableSelect } from '@/Components/ui/searchable-select';
import { CurrencyInput } from '@/Components/ui/currency-input';
import { DatePicker } from '@/Components/ui/date-picker';

// Data Display
import { Table } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { EmptyState } from '@/Components/ui/empty-state';

// Layout
import { Card } from '@/Components/ui/card';
import { PageHeader } from '@/Components/ui/page-header';

// Feedback
import { useToast } from '@/Hooks/use-toast';
```

## Adding More Components

### From shadcn/ui (via MCP or CLI)

```bash
npx shadcn@latest add [component-name]
```

### From fuel-system Reference

Copy components from the fuel-system example project:
```bash
cp /Users/andrade-mac-22/Documents/AI/fuel-system/resources/js/Components/ui/[component].tsx \
   resources/js/components/ui/
```

## Database Setup

### SQLite (Default for Development)

Already configured in `.env.example`:
```env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

Database file is auto-created on first migration.

### MySQL/PostgreSQL

Update `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

Then run:
```bash
php artisan migrate
```

## Deployment

See [Deployment Guide](docs/development/deployment.md) for production deployment instructions.

Quick checklist:
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false`
- [ ] Generate new `APP_KEY`
- [ ] Configure production database
- [ ] Run `npm run build`
- [ ] Run `php artisan migrate --force`
- [ ] Set up queue worker
- [ ] Configure caching (Redis/Memcached)
- [ ] Set up SSL certificate

## Getting Help

- **Template Documentation**: See [docs/](docs/README.md)
- **CLAUDE.md**: AI assistant guide with patterns
- **Laravel Docs**: https://laravel.com/docs
- **Inertia Docs**: https://inertiajs.com
- **React Docs**: https://react.dev
- **shadcn/ui**: https://ui.shadcn.com

## Updating From Template

This template doesn't auto-update. To get new features from the template:

1. Check the template repository for updates
2. Manually copy new components/features you want
3. Review CHANGELOG.md in the template for changes

## Questions?

If you find issues with the template itself, please open an issue in the template repository.

For project-specific questions, refer to the documentation or your team.

---

**Happy coding!** 🚀
