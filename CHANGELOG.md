# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Laravel + React + Inertia Starter Template
- 40+ production-tested UI components from shadcn/ui
- Custom specialized input components:
  - Currency input with locale formatting
  - Numeric input with validation
  - Phone input with formatting
  - Searchable select dropdown
  - Multi-select dropdown
- Advanced date/time components:
  - Date picker
  - Date range picker with presets
  - Time picker
  - Date filters
- Data display components:
  - Data table with sortable headers
  - Pagination component
  - Empty state component
- Layout components:
  - Page header
  - Page layout wrapper
  - Container component
  - Error boundary
- 9 custom React hooks:
  - `use-toast` - Toast notification system
  - `use-appearance` - Theme management (light/dark/system)
  - `use-mobile` - Responsive breakpoint detection
  - `useDebounce` - Debounce for performance optimization
  - `useErrorHandler` - Centralized error handling
  - `use-flash-messages` - Laravel flash message integration
  - `use-initials` - User initials extraction
  - `use-mobile-navigation` - Mobile sidebar state
- Utility functions:
  - Type helpers for Laravel → TypeScript conversion
  - Error handling utilities
  - Number formatting helpers
  - Date formatting utilities
  - User display utilities
- Enhanced TypeScript types:
  - Navigation types (NavItem, NavGroup, BreadcrumbItem)
  - Pagination types (PaginationMeta, PaginatedResponse)
  - Enhanced SharedData with flash messages and Ziggy
- Navigation configuration system with helper functions
- React Hook Form + Zod integration for forms
- Multiple layout variants:
  - App layouts (sidebar, header)
  - Auth layouts (card, simple, split)
  - Settings layout
- Development workflow:
  - `composer dev` command (runs all services in one command)
  - ESLint + Prettier pre-configured
  - TypeScript strict mode
  - File naming conventions enforced
- Comprehensive documentation:
  - README.md with quick start guide
  - CLAUDE.md for AI assistants
  - Coding standards documentation
  - Component library overview
  - Architecture documentation
  - Contribution guidelines
- Project templates:
  - PRD template
  - Roadmap template
  - Feature specification template

### Dependencies
- Laravel 12
- React 19 with TypeScript
- Inertia.js 2
- Tailwind CSS v4
- Vite 6
- React Hook Form 7.60
- Zod 3.25
- date-fns 4.1
- Lucide React 0.475
- shadcn/ui components
- Radix UI primitives

### Configuration
- ESLint 9 with flat config
- Prettier with plugin-organize-imports and plugin-tailwindcss
- TypeScript 5.7 in strict mode
- EditorConfig for consistent formatting
- Laravel Pint for PHP code style

## [1.0.0] - YYYY-MM-DD (When released)

### Added
- Initial public release

---

## How to Update This Changelog

When making changes to the project:

1. Add entries under `[Unreleased]` section
2. Use these categories:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for bug fixes
   - `Security` for vulnerability fixes

3. When releasing a version:
   - Move `[Unreleased]` entries to a new version section
   - Add the version number and date
   - Create a new empty `[Unreleased]` section

### Example Entry Format

```markdown
### Added
- New searchable dropdown component with keyboard navigation

### Fixed
- Currency input now properly handles negative values (#123)

### Changed
- Updated date picker to use date-fns v4 (#124)
```
