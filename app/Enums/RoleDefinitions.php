<?php

namespace App\Enums;

/**
 * Role definitions with ownership labels.
 *
 * Astrea (internal): super_admin, technician
 * Client: org_admin, site_manager, site_viewer
 */
class RoleDefinitions
{
    public const ROLES = [
        'super_admin' => [
            'label' => 'Super Admin',
            'owner' => 'astrea',
            'description' => 'Astrea platform administrator — full access to all organizations',
        ],
        'support' => [
            'label' => 'Support',
            'owner' => 'astrea',
            'description' => 'Astrea support team — view all client dashboards, alerts, device health. Create work orders. Cannot change settings or delete orgs.',
        ],
        'account_manager' => [
            'label' => 'Account Manager',
            'owner' => 'astrea',
            'description' => 'Astrea account manager — view client health scores, SLA dashboards, usage stats. Read-only.',
        ],
        'technician' => [
            'label' => 'Technician',
            'owner' => 'astrea',
            'description' => 'Astrea field technician — work orders, device maintenance, sensor replacement',
        ],
        'client_org_admin' => [
            'label' => 'Organization Admin',
            'owner' => 'client',
            'description' => 'Client operations director — manages their org, sites, users, and settings',
        ],
        'client_site_manager' => [
            'label' => 'Site Manager',
            'owner' => 'client',
            'description' => 'Client regional manager — manages assigned sites, alerts, work orders',
        ],
        'client_site_viewer' => [
            'label' => 'Site Viewer',
            'owner' => 'client',
            'description' => 'Client store manager — read-only access to their single site',
        ],
    ];

    /** Roles that org_admin can assign (client roles only) */
    public const CLIENT_ASSIGNABLE = ['client_org_admin', 'client_site_manager', 'client_site_viewer'];

    /** Roles that only super_admin can assign (Astrea internal) */
    public const ASTREA_ONLY = ['super_admin', 'support', 'account_manager', 'technician'];

    public static function label(string $role): string
    {
        return self::ROLES[$role]['label'] ?? $role;
    }

    public static function owner(string $role): string
    {
        return self::ROLES[$role]['owner'] ?? 'unknown';
    }

    public static function isAstrea(string $role): bool
    {
        return self::owner($role) === 'astrea';
    }

    public static function isClient(string $role): bool
    {
        return self::owner($role) === 'client';
    }

    public static function clientRoles(): array
    {
        return self::CLIENT_ASSIGNABLE;
    }
}
