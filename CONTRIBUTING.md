# Contributing to Laravel + React + Inertia Starter Template

Thank you for considering contributing to this project! This document outlines the process and guidelines for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something great together.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (PHP version, Node version, OS)
- Screenshots if applicable

### Suggesting Enhancements

Feature requests are welcome! Please open an issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the [coding standards](docs/development/coding-standards.md)
   - Write clear commit messages
   - Add tests if applicable

4. **Run quality checks**
   ```bash
   npm run lint          # Fix ESLint issues
   npm run format        # Format code
   npm run types         # Check TypeScript
   composer test         # Run PHP tests
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: Add awesome feature"
   ```

   Use conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Ensure all checks pass

## Development Setup

See [Setup Guide](docs/development/setup-guide.md) for detailed instructions.

Quick setup:
```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

## Coding Standards

### File Naming

- **Directories**: PascalCase (`Components/`, `Pages/`, `Hooks/`)
- **Components**: PascalCase (`Button.tsx`, `UserMenu.tsx`)
- **Utilities**: camelCase (`typeHelpers.ts`, `errorHandling.ts`)
- **Hooks**: camelCase with 'use' prefix (`useToast.ts`)

### Import Paths

Always use PascalCase directories with @ alias:
```typescript
import { Button } from '@/Components/ui/button';
import { useToast } from '@/Hooks/use-toast';
```

### TypeScript

- Use strict typing
- Define prop interfaces
- Avoid `any` - use `unknown` with type guards
- Use `type` keyword for type-only imports

See full [Coding Standards](docs/development/coding-standards.md).

## Component Contributions

### Adding New shadcn/ui Components

If adding a standard shadcn component:

1. Use shadcn CLI or MCP:
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. Test the component
3. Add documentation/examples if needed
4. Submit PR

### Custom Components

For custom components:

1. Create in `resources/js/Components/ui/`
2. Follow existing patterns
3. Add TypeScript types
4. Include usage example in PR description
5. Update [Component Overview](docs/components/overview.md)

## Documentation

- Update README.md for significant changes
- Update CLAUDE.md for new patterns
- Add/update docs in `docs/` directory
- Include code examples where helpful

## Testing

### PHP Tests

```bash
composer test
```

Add tests in `tests/` directory using Pest:
```php
test('user can view dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk();
});
```

### Frontend Tests

Frontend testing framework coming soon. For now, manual testing is required.

## Project Structure

Understanding the structure helps with contributions:

```
app/                    # Laravel backend
resources/js/
├── Components/         # React components
│   └── ui/            # UI component library
├── Config/            # Frontend configuration
├── Hooks/             # Custom React hooks
├── Layouts/           # Page layouts
├── Pages/             # Inertia pages
├── Types/             # TypeScript types
└── Utils/             # Utility functions
docs/                  # Documentation
```

## Need Help?

- Check [CLAUDE.md](CLAUDE.md) for project patterns
- Review [existing documentation](docs/README.md)
- Open a discussion issue
- Reference the [fuel-system](https://github.com/yourusername/fuel-system) example project

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for questions or clarifications. We're happy to help!

---

Thank you for contributing! 🎉
