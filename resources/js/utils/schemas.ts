/**
 * Zod validation schemas for entity forms.
 *
 * These match the backend validation rules defined in VL-001 through VL-010
 * of the SYSTEM_BEHAVIOR_SPEC. Used with form-rhf for client-side validation.
 */

import { z } from 'zod';

// ── VL-001: Site ──────────────────────────────────────────────────

export const siteSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    address: z.string().max(500).nullable().optional(),
    lat: z.coerce.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude').nullable().optional(),
    lng: z.coerce.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude').nullable().optional(),
    timezone: z.string().min(1, 'Required'),
    opening_hour: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Format: HH:MM')
        .nullable()
        .optional(),
});

export type SiteFormData = z.infer<typeof siteSchema>;

// ── VL-002: Device ────────────────────────────────────────────────

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
    zone: z.string().max(255).nullable().optional(),
    gateway_id: z.coerce.number().positive().nullable().optional(),
    recipe_id: z.coerce.number().positive().nullable().optional(),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

// ── VL-003: Alert Rule ────────────────────────────────────────────

export const alertRuleSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    type: z.enum(['threshold', 'range', 'rate_of_change'], { message: 'Invalid rule type' }),
    conditions: z.string().min(1, 'Required').refine(
        (val) => {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) || typeof parsed === 'object';
            } catch {
                return false;
            }
        },
        { message: 'Must be valid JSON' },
    ),
    severity: z.enum(['critical', 'high', 'medium', 'low'], { message: 'Invalid severity' }),
    cooldown_minutes: z.coerce.number().int().min(1, 'Must be positive').default(30),
    active: z.boolean().default(false),
});

export type AlertRuleFormData = z.infer<typeof alertRuleSchema>;

// ── VL-004: Work Order ────────────────────────────────────────────

export const workOrderSchema = z.object({
    title: z.string().min(1, 'Required').max(255),
    type: z.enum(['battery_replace', 'sensor_replace', 'maintenance', 'inspection', 'install'], {
        message: 'Invalid type',
    }),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    description: z.string().max(2000).nullable().optional(),
    assigned_to: z.coerce.number().positive().nullable().optional(),
});

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;

// ── VL-005: Organization ──────────────────────────────────────────

export const organizationSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    segment: z.enum(['cold_chain', 'energy', 'industrial', 'iaq', 'retail'], {
        message: 'Invalid segment',
    }),
    plan: z.string().max(50).nullable().optional(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

// ── VL-007: Compliance Event ──────────────────────────────────────

export const complianceEventSchema = z.object({
    type: z.enum(['cofepris_audit', 'certificate_renewal', 'calibration', 'inspection', 'permit_renewal'], {
        message: 'Invalid type',
    }),
    title: z.string().min(1, 'Required').max(255),
    description: z.string().max(2000).nullable().optional(),
    due_date: z.string().min(1, 'Required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
});

export type ComplianceEventFormData = z.infer<typeof complianceEventSchema>;

// ── VL-008: Billing Profile ───────────────────────────────────────

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const billingProfileSchema = z.object({
    rfc: z
        .string()
        .min(12, 'RFC must be 12-13 characters')
        .max(13, 'RFC must be 12-13 characters')
        .regex(RFC_REGEX, 'Invalid RFC format'),
    razon_social: z.string().min(1, 'Required').max(255),
    regimen_fiscal: z.string().min(1, 'Required'),
    direccion_fiscal: z.object({
        calle: z.string().min(1, 'Required'),
        colonia: z.string().min(1, 'Required'),
        municipio: z.string().min(1, 'Required'),
        estado: z.string().min(1, 'Required'),
        cp: z.string().regex(/^\d{5}$/, 'Must be 5 digits'),
    }),
    uso_cfdi: z.string().min(1, 'Required'),
    email_facturacion: z.string().email('Invalid email'),
});

export type BillingProfileFormData = z.infer<typeof billingProfileSchema>;

// ── VL-009: Escalation Chain ──────────────────────────────────────

const CHANNELS = ['push', 'email', 'whatsapp'] as const;

export const escalationChainSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
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

// ── VL-010: User ──────────────────────────────────────────────────

const ROLES = ['super_admin', 'org_admin', 'site_manager', 'site_viewer', 'technician'] as const;

export const userSchema = z.object({
    name: z.string().min(1, 'Required').max(255),
    email: z.string().email('Invalid email'),
    role: z.enum(ROLES, { message: 'Invalid role' }),
    phone: z.string().max(20).nullable().optional(),
    whatsapp_phone: z.string().max(20).nullable().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

// ── VL-006: Invoice (reference only — system-generated) ───────────

export const invoiceSchema = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
    payment_method: z.enum(['spei', 'transfer']).nullable().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
