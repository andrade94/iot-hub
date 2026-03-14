# Permissions System

This template includes a complete permissions and role-based access control (RBAC) system powered by [Spatie Laravel Permission](https://spatie.be/docs/laravel-permission).

## Features

- ✅ Role-based access control
- ✅ Permission-based access control
- ✅ React permission gate components (`<Can>`, `<HasRole>`)
- ✅ React hooks (`usePermission`, `useRole`)
- ✅ Utility helpers for permission checks
- ✅ Route protection middleware
- ✅ Pre-seeded roles and permissions

---

## Default Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| `super-admin` | Full system access with all permissions |
| `admin` | Administrative access to most features |
| `editor` | Content management permissions |
| `user` | Basic user permissions |

### Permissions

| Permission | Description |
|------------|-------------|
| `view users` | Can view user list |
| `create users` | Can create new users |
| `edit users` | Can edit existing users |
| `delete users` | Can delete users |
| `view content` | Can view content |
| `create content` | Can create new content |
| `edit content` | Can edit existing content |
| `delete content` | Can delete content |
| `publish content` | Can publish content |
| `manage settings` | Can manage application settings |
| `view activity log` | Can view activity logs |

---

## Backend Usage

### User Model

The `User` model already includes the `HasRoles` trait:

```php
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasRoles;
}
```

### Assigning Roles

```php
// Assign a single role
$user->assignRole('admin');

// Assign multiple roles
$user->assignRole(['admin', 'editor']);

// Sync roles (replace all existing roles)
$user->syncRoles(['admin']);

// Remove a role
$user->removeRole('admin');
```

### Assigning Permissions

```php
// Give permission directly to user
$user->givePermissionTo('edit content');

// Give multiple permissions
$user->givePermissionTo(['edit content', 'delete content']);

// Revoke permission
$user->revokePermissionTo('edit content');
```

### Checking Permissions & Roles

```php
// Check if user has permission
if ($user->can('edit content')) {
    // User has permission
}

// Check if user has role
if ($user->hasRole('admin')) {
    // User is an admin
}

// Check if user has any of the given roles
if ($user->hasAnyRole(['admin', 'editor'])) {
    // User is admin or editor
}

// Check if user has all given roles
if ($user->hasAllRoles(['admin', 'editor'])) {
    // User has both roles
}
```

### Route Protection

Use middleware to protect routes:

```php
// Require a specific permission
Route::get('/users', [UserController::class, 'index'])
    ->middleware('permission:view users');

// Require a specific role
Route::get('/admin', [AdminController::class, 'index'])
    ->middleware('role:admin');

// Require either permission OR role
Route::get('/content', [ContentController::class, 'index'])
    ->middleware('role_or_permission:admin|edit content');

// Require multiple permissions
Route::post('/users', [UserController::class, 'store'])
    ->middleware('permission:create users,edit users');
```

---

## Frontend Usage

### Permission Gate Component (`<Can>`)

Conditionally render UI based on user permissions:

```tsx
import { Can } from '@/components/Can';

// Basic usage
<Can permission="edit content">
    <button>Edit Content</button>
</Can>

// With fallback
<Can
    permission="delete content"
    fallback={<p>You don't have permission to delete content</p>}
>
    <button>Delete Content</button>
</Can>

// Multiple permissions (OR logic - user needs ANY permission)
<Can permission={['edit content', 'publish content']}>
    <button>Manage Content</button>
</Can>

// Multiple permissions (AND logic - user needs ALL permissions)
<Can permission={['edit content', 'publish content']} requireAll>
    <button>Edit & Publish Content</button>
</Can>
```

### Role Gate Component (`<HasRole>`)

Conditionally render UI based on user roles:

```tsx
import { HasRole } from '@/components/HasRole';

// Basic usage
<HasRole role="admin">
    <AdminPanel />
</HasRole>

// With fallback
<HasRole
    role="admin"
    fallback={<p>Admin access required</p>}
>
    <AdminPanel />
</HasRole>

// Multiple roles (OR logic)
<HasRole role={['admin', 'editor']}>
    <ContentManager />
</HasRole>

// Multiple roles (AND logic)
<HasRole role={['admin', 'editor']} requireAll>
    <SuperContentManager />
</HasRole>
```

### Permission Hook (`usePermission`)

Use permissions imperatively in components:

```tsx
import { usePermission } from '@/components/Can';

function MyComponent() {
    const { can, cannot, permissions } = usePermission();

    // Check single permission
    if (can('edit content')) {
        // User can edit content
    }

    // Check multiple permissions (OR logic)
    if (can(['edit content', 'publish content'])) {
        // User has at least one permission
    }

    // Check multiple permissions (AND logic)
    if (can(['edit content', 'publish content'], true)) {
        // User has all permissions
    }

    // Inverse check
    if (cannot('delete content')) {
        // User cannot delete content
    }

    // Get all user permissions
    console.log(permissions); // ['view content', 'edit content']

    return <div>...</div>;
}
```

### Role Hook (`useRole`)

Use roles imperatively in components:

```tsx
import { useRole } from '@/components/HasRole';

function MyComponent() {
    const { hasRole, lacksRole, isAdmin, isSuperAdmin, roles } = useRole();

    // Check single role
    if (hasRole('admin')) {
        // User is admin
    }

    // Check multiple roles (OR logic)
    if (hasRole(['admin', 'editor'])) {
        // User has at least one role
    }

    // Check multiple roles (AND logic)
    if (hasRole(['admin', 'editor'], true)) {
        // User has all roles
    }

    // Check if user is any type of admin
    if (isAdmin()) {
        // User is super-admin or admin
    }

    // Check if user is super admin
    if (isSuperAdmin()) {
        // User is super-admin
    }

    // Get all user roles
    console.log(roles); // ['admin']

    return <div>...</div>;
}
```

### Permission Utilities

Use the permission utilities for common operations:

```tsx
import { PERMISSIONS, ROLES, hasPermission, hasRole, isAdmin } from '@/utils/permissions';
import { usePage } from '@inertiajs/react';

function MyComponent() {
    const { auth } = usePage().props;

    // Use constants for type safety
    if (hasPermission(auth.permissions, PERMISSIONS.EDIT_CONTENT)) {
        // User can edit content
    }

    // Check role
    if (hasRole(auth.roles, ROLES.ADMIN)) {
        // User is admin
    }

    // Check if admin
    if (isAdmin(auth.roles)) {
        // User is admin or super-admin
    }

    return <div>...</div>;
}
```

---

## Test Users

The template includes pre-seeded test users with different roles:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `admin@example.com` | `password` | `admin` | Most permissions |
| `editor@example.com` | `password` | `editor` | Content permissions |
| `user@example.com` | `password` | `user` | Basic permissions |

---

## Creating Custom Permissions & Roles

### Via Seeder

Edit `database/seeders/RolesAndPermissionsSeeder.php`:

```php
// Add new permission
Permission::firstOrCreate(['name' => 'manage products']);

// Add new role
$manager = Role::firstOrCreate(['name' => 'manager']);
$manager->givePermissionTo(['view content', 'edit content', 'manage products']);
```

Then run:

```bash
php artisan db:seed --class=RolesAndPermissionsSeeder
```

### Programmatically

```php
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

// Create permission
Permission::create(['name' => 'manage products']);

// Create role
$role = Role::create(['name' => 'manager']);

// Assign permissions to role
$role->givePermissionTo(['view content', 'manage products']);
```

---

## Advanced Usage

### Blade Directives (if using Blade)

```blade
@role('admin')
    <p>Admin content</p>
@endrole

@hasrole('admin')
    <p>Admin content</p>
@endhasrole

@can('edit content')
    <button>Edit</button>
@endcan
```

### Database Tables

The permission system uses these tables:

- `roles` - Stores roles
- `permissions` - Stores permissions
- `model_has_permissions` - User → Permission assignments
- `model_has_roles` - User → Role assignments
- `role_has_permissions` - Role → Permission assignments

### Caching

Permissions are cached for performance. Clear cache after making changes:

```bash
php artisan permission:cache-reset
```

Or in code:

```php
app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
```

---

## Complete Example

Here's a complete example showing different permission checks:

```tsx
import { Can, usePermission } from '@/components/Can';
import { HasRole, useRole } from '@/components/HasRole';
import { PERMISSIONS, ROLES } from '@/utils/permissions';

export default function ContentPage() {
    const { can } = usePermission();
    const { hasRole, isAdmin } = useRole();

    return (
        <div>
            <h1>Content Management</h1>

            {/* Show edit button only if user can edit */}
            <Can permission={PERMISSIONS.EDIT_CONTENT}>
                <button>Edit Content</button>
            </Can>

            {/* Show delete button only to admins */}
            <HasRole role={ROLES.ADMIN}>
                <button>Delete Content</button>
            </HasRole>

            {/* Conditional rendering */}
            {can(PERMISSIONS.PUBLISH_CONTENT) && (
                <button>Publish Content</button>
            )}

            {/* Admin-only section */}
            {isAdmin() && (
                <div className="admin-panel">
                    <h2>Admin Panel</h2>
                    {/* Admin content */}
                </div>
            )}
        </div>
    );
}
```

---

## Troubleshooting

### Permissions not updating

Clear the permission cache:

```bash
php artisan permission:cache-reset
```

### User doesn't have expected permissions

Check role assignments:

```php
// Get user's roles
$user->getRoleNames();

// Get user's permissions
$user->getAllPermissions()->pluck('name');
```

### Middleware not working

Ensure middleware is registered in `bootstrap/app.php`:

```php
$middleware->alias([
    'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
    'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
]);
```

---

## Resources

- [Spatie Laravel Permission Documentation](https://spatie.be/docs/laravel-permission)
- [GitHub Repository](https://github.com/spatie/laravel-permission)

---

**Last Updated:** 2025-10-21
