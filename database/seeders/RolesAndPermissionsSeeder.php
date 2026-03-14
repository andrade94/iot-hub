<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // User management
            'view users',
            'create users',
            'edit users',
            'delete users',

            // Content management
            'view content',
            'create content',
            'edit content',
            'delete content',
            'publish content',

            // Settings
            'manage settings',
            'view activity log',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles and assign permissions

        // Super Admin - has all permissions
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->givePermissionTo(Permission::all());

        // Admin - has most permissions
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->givePermissionTo([
            'view users',
            'create users',
            'edit users',
            'view content',
            'create content',
            'edit content',
            'delete content',
            'publish content',
            'view activity log',
        ]);

        // Editor - can manage content
        $editor = Role::firstOrCreate(['name' => 'editor']);
        $editor->givePermissionTo([
            'view content',
            'create content',
            'edit content',
            'publish content',
        ]);

        // User - basic permissions
        $user = Role::firstOrCreate(['name' => 'user']);
        $user->givePermissionTo([
            'view content',
        ]);

        $this->command->info('Roles and permissions created successfully!');
        $this->command->info('Created roles: super-admin, admin, editor, user');
        $this->command->info('Created '.count($permissions).' permissions');
    }
}
