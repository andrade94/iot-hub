import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    roles: string[];
    permissions: string[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    items?: NavItem[];
    badge?: string;
    tooltip?: string;
}

export interface Organization {
    id: number;
    name: string;
    slug: string;
    segment: string;
    settings: Record<string, unknown>;
    logo?: string | null;
    branding?: Record<string, unknown> | null;
    default_timezone?: string | null;
    default_opening_hour?: string | null;
}

export interface Site {
    id: number;
    org_id: number;
    name: string;
    status: 'active' | 'inactive' | 'onboarding';
    timezone?: string;
}

export interface SharedData {
    name: string;
    auth: Auth;
    current_organization: Organization | null;
    accessible_sites: Pick<Site, 'id' | 'name' | 'status'>[];
    current_site: Pick<Site, 'id' | 'name' | 'status' | 'timezone'> | null;
    sidebarOpen: boolean;
    locale?: string;
    notifications: DatabaseNotification[];
    unreadNotificationsCount: number;
    flash?: {
        success?: string;
        error?: string;
        info?: string;
        warning?: string;
    };
    ziggy?: any;
    [key: string]: unknown;
}

export interface Activity {
    id: number;
    log_name: string | null;
    description: string;
    subject_type: string | null;
    event: string | null;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    properties: Record<string, any>;
    batch_uuid: string | null;
    created_at: string;
    updated_at: string;
    causer?: User;
    subject?: any;
}

export interface UploadedFile {
    id: string;
    name: string;
    filename: string;
    path: string;
    url: string;
    thumbnail_url?: string | null;
    size: number;
    formatted_size: string;
    mime_type: string;
    extension: string;
    visibility: 'public' | 'private';
    is_image: boolean;
    has_thumbnail: boolean;
    uploaded_at: string;
}

export interface FileUploadProgress {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    uploadedFile?: UploadedFile;
    error?: string;
}

export interface DatabaseNotification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: NotificationData;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationData {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    icon?: string;
    action_url?: string;
    action_text?: string;
    [key: string]: any;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    org_id?: number | null;
    phone?: string | null;
    whatsapp_phone?: string | null;
    has_app_access?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

// IoT Platform Types

export interface Module {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    recipes?: Recipe[];
}

export interface Recipe {
    id: number;
    module_id: number;
    sensor_model: string;
    name: string;
    default_rules: AlertRuleCondition[];
    description: string | null;
    editable: boolean;
    created_at: string;
    updated_at: string;
    module?: Module;
}

export interface AlertRuleCondition {
    metric: string;
    condition: 'above' | 'below' | 'equals';
    threshold: number;
    duration_minutes: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Gateway {
    id: number;
    site_id: number;
    model: string;
    serial: string;
    chirpstack_id: string | null;
    last_seen_at: string | null;
    status: 'online' | 'offline' | 'registered';
    is_addon: boolean;
    created_at: string;
    updated_at: string;
    devices_count?: number;
    devices?: Device[];
}

export interface Device {
    id: number;
    site_id: number;
    gateway_id: number | null;
    model: string;
    dev_eui: string;
    name: string;
    zone: string | null;
    floor_id: number | null;
    floor_x: number | null;
    floor_y: number | null;
    recipe_id: number | null;
    installed_at: string | null;
    battery_pct: number | null;
    rssi: number | null;
    last_reading_at: string | null;
    status: 'pending' | 'provisioned' | 'active' | 'offline' | 'maintenance';
    provisioned_at: string | null;
    provisioned_by: number | null;
    replaced_device_id: number | null;
    created_at: string;
    updated_at: string;
    site?: Site;
    gateway?: Gateway;
    recipe?: Recipe;
    floor_plan?: FloorPlan;
}

export interface FloorPlan {
    id: number;
    site_id: number;
    name: string;
    floor_number: number;
    image_path: string;
    width_px: number | null;
    height_px: number | null;
    created_at: string;
    updated_at: string;
    devices?: Device[];
}

export interface SensorReading {
    time: string;
    device_id: number;
    metric: string;
    value: number;
    unit: string | null;
}

export interface SiteRecipeOverride {
    id: number;
    site_id: number;
    recipe_id: number;
    overridden_rules: AlertRuleCondition[];
    overridden_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface OnboardingStep {
    label: string;
    completed: boolean;
}

// Phase 2: Alert Engine Types

export interface AlertRule {
    id: number;
    site_id: number;
    device_id: number | null;
    name: string;
    type: 'simple' | 'correlation' | 'baseline';
    conditions: AlertRuleCondition[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    cooldown_minutes: number;
    active: boolean;
    created_at: string;
    updated_at: string;
    device?: Device;
}

export interface Alert {
    id: number;
    rule_id: number | null;
    site_id: number;
    device_id: number | null;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
    triggered_at: string;
    acknowledged_at: string | null;
    resolved_at: string | null;
    resolved_by: number | null;
    resolution_type: 'auto' | 'manual' | 'work_order' | 'dismissed' | null;
    data: AlertData | null;
    created_at: string;
    updated_at: string;
    rule?: AlertRule;
    site?: Site;
    device?: Device;
    resolved_by_user?: User;
    notifications?: AlertNotificationRecord[];
}

export interface AlertData {
    metric: string;
    value: number;
    threshold: number | null;
    condition: string;
    rule_name: string;
    device_name: string;
    device_model: string;
    zone: string | null;
}

export interface EscalationChain {
    id: number;
    site_id: number;
    name: string;
    levels: EscalationLevel[];
    site?: Site;
    created_at: string;
    updated_at: string;
}

export interface EscalationLevel {
    level: number;
    delay_minutes: number;
    user_ids: number[];
    channels: ('whatsapp' | 'push' | 'email')[];
}

export interface AlertNotificationRecord {
    id: number;
    alert_id: number;
    user_id: number;
    channel: string;
    status: 'sent' | 'delivered' | 'failed';
    sent_at: string | null;
    delivered_at: string | null;
    error: string | null;
    created_at: string;
    user?: User;
}

// Phase 3-5: Dashboard, Cold Chain, Energy Types

export interface SiteKPIs {
    total_devices: number;
    online_count: number;
    offline_count: number;
    active_alerts: number;
    low_battery_count: number;
}

export interface ZoneSummary {
    name: string;
    devices: Device[];
    summary: ZoneMetricSummary[];
    device_count: number;
    online_count: number;
}

export interface ZoneMetricSummary {
    metric: string;
    current: number;
    min: number;
    max: number;
    avg: number;
    unit: string;
}

export interface ChartDataPoint {
    time: string;
    value?: number;
    avg_value?: number;
    min_value?: number;
    max_value?: number;
    reading_count?: number;
    bucket?: string;
}

export interface DefrostSchedule {
    id: number;
    device_id: number;
    site_id: number;
    status: 'learning' | 'detected' | 'confirmed' | 'manual';
    windows: DefrostWindow[] | null;
    detected_at: string | null;
    confirmed_by: number | null;
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
    device?: Device;
}

export interface DefrostWindow {
    start_time: string;
    end_time: string;
    avg_peak: number;
    avg_duration: number;
}

export interface TemperatureReport {
    site: { id: number; name: string };
    from: string;
    to: string;
    per_zone: TemperatureReportZone[];
    summary: {
        total_readings: number;
        total_excursions: number;
        compliance_pct: number;
    };
}

export interface TemperatureReportZone {
    zone: string;
    devices: TemperatureReportDevice[];
}

export interface TemperatureReportDevice {
    name: string;
    readings_count: number;
    min_temp: number;
    max_temp: number;
    avg_temp: number;
    excursions: TemperatureExcursion[];
}

export interface TemperatureExcursion {
    start: string;
    end: string;
    peak: number;
    duration_minutes: number;
}

export interface EnergyReport {
    site: { id: number; name: string };
    period: { from: string; to: string };
    per_device: EnergyReportDevice[];
    daily_totals: { date: string; total_kwh: number; cost_mxn: number }[];
    summary: {
        total_kwh: number;
        total_cost: number;
        avg_daily_cost: number;
        baseline_comparison_pct: number | null;
    };
}

export interface EnergyReportDevice {
    name: string;
    model: string;
    zone: string | null;
    total_kwh: number;
    avg_daily_kwh: number;
    peak_current: number;
    readings_count: number;
}

export interface MorningSummary {
    site: { id: number; name: string };
    generated_at: string;
    alerts_24h: number;
    active_alerts: number;
    devices: {
        total: number;
        online: number;
        offline: number;
        low_battery: number;
    };
    zones: MorningSummaryZone[];
}

export interface MorningSummaryZone {
    name: string;
    temp_min: number | null;
    temp_max: number | null;
    temp_avg: number | null;
    status: 'ok' | 'warning' | 'critical';
}

// Phase 6: Work Orders + Command Center

export interface WorkOrder {
    id: number;
    site_id: number;
    alert_id: number | null;
    device_id: number | null;
    type: 'battery_replace' | 'sensor_replace' | 'maintenance' | 'inspection' | 'install';
    title: string;
    description: string | null;
    status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to: number | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    site?: Site;
    alert?: Alert;
    device?: Device;
    assigned_user?: User;
    created_by_user?: User;
    photos?: WorkOrderPhoto[];
    notes?: WorkOrderNote[];
}

export interface WorkOrderPhoto {
    id: number;
    work_order_id: number;
    photo_path: string;
    caption: string | null;
    uploaded_by: number | null;
    uploaded_at: string | null;
}

export interface WorkOrderNote {
    id: number;
    work_order_id: number;
    user_id: number;
    note: string;
    created_at: string;
    user?: User;
}

export interface CommandCenterKPIs {
    total_organizations: number;
    total_sites: number;
    total_devices: number;
    online_devices: number;
    active_alerts: number;
    open_work_orders: number;
}

// Phase 7: Billing

export interface BillingProfile {
    id: number;
    org_id: number;
    name: string;
    rfc: string;
    razon_social: string;
    regimen_fiscal: string | null;
    direccion_fiscal: Record<string, string> | null;
    uso_cfdi: string | null;
    email_facturacion: string | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface Subscription {
    id: number;
    org_id: number;
    billing_profile_id: number | null;
    base_fee: number;
    discount_pct: number;
    status: 'active' | 'paused' | 'cancelled';
    started_at: string | null;
    contract_type: 'monthly' | 'annual';
    created_at: string;
    updated_at: string;
    items?: SubscriptionItem[];
    billing_profile?: BillingProfile;
}

export interface SubscriptionItem {
    id: number;
    subscription_id: number;
    device_id: number | null;
    sensor_model: string;
    monthly_fee: number;
}

export interface Invoice {
    id: number;
    org_id: number;
    billing_profile_id: number | null;
    period: string;
    subtotal: number;
    iva: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    cfdi_uuid: string | null;
    pdf_path: string | null;
    xml_path: string | null;
    paid_at: string | null;
    payment_method: 'spei' | 'transfer' | null;
    created_at: string;
    updated_at: string;
}

// Phase 9: Advanced

export interface ApiKeyRecord {
    id: number;
    org_id: number;
    name: string;
    key_prefix: string;
    permissions: string[] | null;
    rate_limit: number;
    last_used_at: string | null;
    active: boolean;
    created_at: string;
}

export interface WebhookSubscriptionRecord {
    id: number;
    org_id: number;
    url: string;
    events: string[];
    active: boolean;
    last_triggered_at: string | null;
    failure_count: number;
}

export interface IntegrationConfigRecord {
    id: number;
    org_id: number;
    type: 'sap' | 'contpaq';
    schedule_cron: string | null;
    last_export_at: string | null;
    active: boolean;
}

export interface OrgBranding {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
    app_name?: string;
    domain?: string;
}
