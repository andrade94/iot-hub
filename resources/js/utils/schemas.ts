/**
 * Zod validation schemas for entity forms.
 *
 * These match the ACTUAL form fields in pages, not the abstract spec.
 * Used with useValidatedForm hook for client-side pre-submit validation.
 * Extra form fields not in the schema are passed through safely — Zod
 * only validates what's declared here.
 */

import { z } from 'zod';

// ── Site Form (settings/sites/index.tsx) ──────────────────────────

export const siteSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    address: z.string().max(500).optional(),
    lat: z.union([z.literal(''), z.coerce.number().min(-90).max(90)]).optional(),
    lng: z.union([z.literal(''), z.coerce.number().min(-180).max(180)]).optional(),
    timezone: z.string().optional(),
    opening_hour: z.string().optional(),
    status: z.string().optional(),
});

export type SiteFormData = z.infer<typeof siteSchema>;

// ── User Form (settings/users/index.tsx) ──────────────────────────

const ROLES = ['super_admin', 'client_org_admin', 'client_site_manager', 'client_site_viewer', 'technician'] as const;

export const userSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    email: z.string().email('Invalid email'),
    role: z.string().min(1, 'Required'),
    phone: z.string().max(20).optional(),
    whatsapp_phone: z.string().max(20).optional(),
    password: z.string().optional(),
    site_ids: z.array(z.number()).optional(),
    has_app_access: z.boolean().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

// ── Compliance Event Form (settings/compliance/index.tsx) ─────────

export const complianceEventSchema = z.object({
    title: z.string().min(1, 'Required').max(255),
    type: z.string().min(1, 'Required'),
    site_id: z.string().min(1, 'Required'),
    due_date: z.string().min(1, 'Required'),
    description: z.string().max(2000).optional(),
});

export type ComplianceEventFormData = z.infer<typeof complianceEventSchema>;

// ── Maintenance Window Form (settings/maintenance-windows/index.tsx) ──

export const maintenanceWindowSchema = z.object({
    site_id: z.string().min(1, 'Required'),
    zone: z.string().optional(),
    title: z.string().min(1, 'Required').max(255),
    recurrence: z.string().min(1, 'Required'),
    day_of_week: z.string().optional(),
    start_time: z.string().min(1, 'Required'),
    duration_minutes: z.string().min(1, 'Required'),
    suppress_alerts: z.boolean().optional(),
});

export type MaintenanceWindowFormData = z.infer<typeof maintenanceWindowSchema>;

// ── Billing Profile Form (settings/billing/profiles.tsx) ──────────

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const billingProfileSchema = z.object({
    name: z.string().min(1, 'Required'),
    rfc: z
        .string()
        .min(12, 'RFC must be 12-13 characters')
        .max(13, 'RFC must be 12-13 characters')
        .regex(RFC_REGEX, 'Invalid RFC format'),
    razon_social: z.string().min(1, 'Required').max(255),
    regimen_fiscal: z.string().min(1, 'Required'),
    uso_cfdi: z.string().min(1, 'Required'),
    email_facturacion: z.string().email('Invalid email'),
});

export type BillingProfileFormData = z.infer<typeof billingProfileSchema>;

// ── Gateway Form (settings/gateways/index.tsx) ────────────────────

export const gatewaySchema = z.object({
    model: z.string().min(1, 'Required'),
    serial: z.string().min(1, 'Required'),
    is_addon: z.boolean().optional(),
});

export type GatewayFormData = z.infer<typeof gatewaySchema>;

// ── API Key Form (settings/api-keys.tsx) ──────────────────────────

export const apiKeySchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    rate_limit: z.coerce.number().int().min(1).max(10000),
});

export type ApiKeyFormData = z.infer<typeof apiKeySchema>;

// ── Organization Settings Form (settings/organization.tsx) ────────

export const organizationSettingsSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    default_timezone: z.string().optional(),
    logo: z.string().optional(),
    branding: z.object({
        primary_color: z.string().optional(),
        secondary_color: z.string().optional(),
        accent_color: z.string().optional(),
        font_family: z.string().optional(),
    }).optional(),
});

export type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

// ── Work Order Form ───────────────────────────────────────────────

export const workOrderSchema = z.object({
    title: z.string().min(1, 'Required').max(255),
    type: z.enum(['battery_replace', 'sensor_replace', 'maintenance', 'inspection', 'install'], {
        message: 'Invalid type',
    }),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    description: z.string().max(2000).optional(),
    assigned_to: z.coerce.number().positive().nullable().optional(),
});

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;

// ── Device Form ───────────────────────────────────────────────────

const DEVICE_MODELS = ['EM300-TH', 'CT101', 'WS301', 'AM307', 'VS121', 'EM300-MCS', 'WS202'] as const;

export const deviceSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    dev_eui: z
        .string()
        .min(1, 'Required')
        .max(16, 'Max 16 characters')
        .regex(/^[0-9A-Fa-f]+$/, 'Must be hexadecimal'),
    model: z.enum(DEVICE_MODELS, { message: 'Invalid sensor model' }),
    app_key: z.string().max(32).optional(),
    zone: z.string().max(255).optional(),
    gateway_id: z.coerce.number().positive().nullable().optional(),
    recipe_id: z.coerce.number().positive().nullable().optional(),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

// ── Alert Rule Form ───────────────────────────────────────────────

export const alertRuleSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    type: z.enum(['threshold', 'range', 'rate_of_change'], { message: 'Invalid rule type' }),
    severity: z.enum(['critical', 'high', 'medium', 'low'], { message: 'Invalid severity' }),
    cooldown_minutes: z.coerce.number().int().min(1, 'Must be positive').default(30),
    active: z.boolean().default(false),
});

export type AlertRuleFormData = z.infer<typeof alertRuleSchema>;

// ── Escalation Chain Form ─────────────────────────────────────────

const CHANNELS = ['push', 'email', 'whatsapp'] as const;

export const escalationChainSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    site_id: z.string().min(1, 'Required'),
    levels: z
        .array(
            z.object({
                level: z.coerce.number().int().positive(),
                delay_minutes: z.coerce.number().int().min(0, 'Must be non-negative'),
                user_ids: z.array(z.coerce.number().positive()).min(1, 'At least one user required'),
                channels: z.array(z.enum(CHANNELS)).min(1, 'At least one channel required'),
            }),
        )
        .min(1, 'At least one escalation level required'),
});

export type EscalationChainFormData = z.infer<typeof escalationChainSchema>;
