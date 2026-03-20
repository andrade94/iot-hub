<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Organizations
            'view organizations',
            'manage organizations',
            // Sites
            'view sites',
            'manage sites',
            'onboard sites',
            // Devices
            'view devices',
            'manage devices',
            'provision devices',
            // Alerts
            'view alerts',
            'acknowledge alerts',
            'manage alert rules',
            // Users
            'view users',
            'manage users',
            'assign site users',
            // Reports
            'view reports',
            'generate reports',
            // Work orders
            'view work orders',
            'manage work orders',
            'complete work orders',
            // Settings
            'manage org settings',
            'view activity log',
            // Command center
            'access command center',
            // Corrective actions (Phase 10)
            'log corrective actions',
            'verify corrective actions',
            // Maintenance, analytics, reports, templates, export (Phase 10)
            'manage maintenance windows',
            'view alert analytics',
            'manage report schedules',
            'manage site templates',
            'export organization data',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Super Admin — all permissions
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin']);
        $superAdmin->givePermissionTo(Permission::all());

        // Org Admin — all except manage organizations and command center
        $orgAdmin = Role::firstOrCreate(['name' => 'org_admin']);
        $orgAdmin->givePermissionTo(
            collect($permissions)->reject(fn ($p) => in_array($p, [
                'manage organizations',
                'access command center',
            ]))->toArray()
        );

        // Site Manager
        $siteManager = Role::firstOrCreate(['name' => 'site_manager']);
        $siteManager->givePermissionTo([
            'view sites', 'manage sites',
            'view devices', 'manage devices',
            'view alerts', 'acknowledge alerts', 'manage alert rules',
            'view users', 'assign site users',
            'view reports', 'generate reports',
            'view work orders', 'manage work orders',
            'view activity log',
            'log corrective actions', 'verify corrective actions',
            'manage maintenance windows', 'view alert analytics',
        ]);

        // Site Viewer
        $siteViewer = Role::firstOrCreate(['name' => 'site_viewer']);
        $siteViewer->givePermissionTo([
            'view sites',
            'view devices',
            'view alerts',
            'view reports',
            'log corrective actions',
        ]);

        // Technician
        $technician = Role::firstOrCreate(['name' => 'technician']);
        $technician->givePermissionTo([
            'view sites',
            'view devices',
            'view alerts', 'acknowledge alerts',
            'view work orders', 'complete work orders',
            'log corrective actions',
        ]);

        $this->command->info('IoT roles and permissions created successfully!');
        $this->command->info('Created roles: super_admin, org_admin, site_manager, site_viewer, technician');
        $this->command->info('Created '.count($permissions).' permissions');
    }
}
