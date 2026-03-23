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
        'technician' => [
            'label' => 'Technician',
            'owner' => 'astrea',
            'description' => 'Astrea field technician — work orders, device maintenance, sensor replacement',
        ],
        'org_admin' => [
            'label' => 'Organization Admin',
            'owner' => 'client',
            'description' => 'Client operations director — manages their org, sites, users, and settings',
        ],
        'site_manager' => [
            'label' => 'Site Manager',
            'owner' => 'client',
            'description' => 'Client regional manager — manages assigned sites, alerts, work orders',
        ],
        'site_viewer' => [
            'label' => 'Site Viewer',
            'owner' => 'client',
            'description' => 'Client store manager — read-only access to their single site',
        ],
    ];

    /** Roles that org_admin can assign (client roles only) */
    public const CLIENT_ASSIGNABLE = ['org_admin', 'site_manager', 'site_viewer'];

    /** Roles that only super_admin can assign (Astrea internal) */
    public const ASTREA_ONLY = ['super_admin', 'technician'];

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
