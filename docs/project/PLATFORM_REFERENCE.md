# Astrea IoT Platform Reference

> **Tier 3 Living Reference** -- for developers and AI assistants working on the codebase.
> Generated from source code. Keep in sync with actual implementations.
> Last updated: 2026-03-20 (Phase 8 — Phase 10 COMPLETE, all 17 features built)

---

## 1. Platform Overview

Astrea is a **multi-tenant LoRaWAN operations platform** that bridges physical sensors and the people who make operational decisions. It is not a technical dashboard -- it is a command center for operations teams across cold chain, energy, compliance, industrial, IAQ, and safety verticals.

### Target Market

- Retail chains (cold chain monitoring, COFEPRIS/NOM-251 compliance)
- Convenience stores (temperature, energy, door monitoring)
- Foodservice operations (hot-holding, gas leak detection)
- Industrial plants (vibration, compressed air, energy)
- Commercial real estate (IAQ/HVAC, occupancy, LEED/WELL)
- Pharmacies (temperature-sensitive storage)

### Key Principles

1. **Three interfaces, each with its purpose.** WhatsApp for emergencies and acknowledgment. Mobile app (`iot-expo` repo, in active development) for daily monitoring. Web for configuration, deep analysis, and reports.
2. **One platform, segment modules.** Cold Chain, Energy, Compliance, Industrial, IAQ, Safety, People -- activated per client.
3. **Command Center for Astrea.** Super admins see everything: all clients, all segments, all health.
4. **The client only sees their own data.** Strict multi-tenancy with org_id + site_id scoping.

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | PHP | ^8.2 | Server-side language |
| **Backend** | Laravel | 12.x | Framework: queues, jobs, broadcasting, ORM, auth |
| **Frontend** | React | 19.x | UI library (with React Compiler via babel plugin) |
| **SPA Bridge** | Inertia.js | 2.x | SPA-like UX without a separate API layer |
| **UI Components** | shadcn/ui | 3.x | Accessible, customizable component library |
| **CSS** | Tailwind CSS | 4.x | Utility-first CSS (via `@tailwindcss/vite` plugin) |
| **Charts** | Recharts | 2.x | Time-series and dashboard charts |
| **Forms** | React Hook Form + Zod | 7.x / 4.x | Validated forms with schema inference |
| **Database** | PostgreSQL 16 + TimescaleDB | -- | Relational + time-series in a single DB |
| **Cache/Queue** | Redis | -- | Laravel queues, sessions, rate limiting, hot cache |
| **Auth** | Laravel Fortify + Sanctum | 1.x / 4.x | Session auth (web), token auth (API), 2FA |
| **Permissions** | Spatie Laravel Permission | 6.x | Roles and permissions with site-level scoping |
| **Activity Log** | Spatie Activity Log | 4.x | Audit trail for compliance |
| **Real-time** | Laravel Reverb | 1.x | WebSocket server for live dashboard updates |
| **WebSocket Client** | Laravel Echo + Pusher.js | 2.x / 8.x | Frontend WebSocket consumption |
| **Network Server** | ChirpStack Cloud | Managed | LoRaWAN network server (MQTT + REST) |
| **WhatsApp** | Twilio API | -- | Alert delivery and acknowledgment via WhatsApp |
| **Billing** | Facturapi | REST | CFDI 4.0 invoice stamping (Mexican tax compliance) |
| **PDF** | barryvdh/laravel-dompdf | 3.x | Report generation |
| **Images** | Intervention Image | 3.x | Upload optimization and thumbnails |
| **Excel** | Maatwebsite Excel | 3.x | Data exports |
| **Search** | Laravel Scout | 10.x | Full-text search |
| **i18n** | laravel-react-i18n | 2.x | Spanish/English translations |
| **File Storage** | S3-compatible (Flysystem) | 3.x | PDFs, exports, floor plans |
| **Testing** | Pest | 4.x | PHP test framework |
| **Linting** | ESLint + Prettier | 9.x / 3.x | Code quality |
| **Mobile App** | Expo SDK + React Native | 54 / 0.81 | iOS/Android app (`iot-expo` repo) |
| **Mobile State** | TanStack Query + Zustand | 5.x / 5.x | Server state + client state |
| **Mobile Push** | Expo Notifications + PushNotificationService | -- | Push via Expo Push API |
| **Mobile Offline** | MMKV | 4.x | Offline cache + write queue |
| **TypeScript** | TypeScript | 5.x | Strict type checking |
| **Build** | Vite | 7.x | Frontend bundler |
| **Dev Environment** | Laravel Herd | -- | Local PHP, PostgreSQL, Redis |
| **Deployment** | Laravel Forge + DigitalOcean | -- | Production provisioning |

---

## 3. Architecture

### Backend (Laravel)

```
app/
├── Http/
│   ├── Controllers/          39 controllers (web + API)
│   ├── Middleware/            EnsureOrganizationScope, EnsureSiteAccess, ApplyOrgBranding, HandleInertiaRequests
│   └── Requests/             Form request validation
├── Models/                   40 Eloquent models
├── Services/                 29 service classes across 9 domains
├── Jobs/                     14 queued jobs
├── Events/                   3 broadcast events
├── Notifications/            SystemNotification, ActivityNotification
├── Policies/                 13 authorization policies
├── Factories/                33 model factories
├── Mail/                     7 mailables
└── Console/                  10 Artisan commands
```

### Frontend (React + Inertia)

```
resources/js/
├── pages/                    55 Inertia page components
├── components/               Custom + shadcn/ui (90+ components)
│   └── ui/                   shadcn components (kebab-case)
├── layouts/                  AppLayout, AuthLayout, SettingsLayout
├── hooks/                    18 custom hooks
├── config/                   navigation.ts (sidebar structure)
├── i18n/                     509 translation keys (en + es)
├── types/                    TypeScript definitions
├── utils/                    Utility functions
└── lib/                      cn() class merging
```

### Real-time (Laravel Reverb)

Laravel Reverb provides the WebSocket server. Three broadcast events push live data to dashboards:

- `SensorReadingReceived` -- live sensor values on site/device channels
- `AlertTriggered` -- new alerts on site channels
- `NotificationCreated` -- user-specific notification bell updates

Frontend consumes these via Laravel Echo + Pusher.js protocol.

### Data Pipeline

```
Sensors (LoRaWAN) --> Gateways (4G) --> ChirpStack Cloud (MQTT)
    --> Laravel MQTT Listener --> ProcessSensorReading job
        --> TimescaleDB (permanent storage)
        --> Redis HSET (hot cache for dashboards)
        --> EvaluateAlertRules job
            --> AlertRouter --> WhatsApp/Push/Reverb
        --> SensorReadingReceived broadcast (live dashboards)
```

### Multi-Tenancy Model

The platform uses **manual scoping** with `org_id` and `site_id` columns (not a package). Two middleware enforce isolation:

1. **`EnsureOrganizationScope`** (`org.scope`) -- binds the current organization into the container. Regular users are scoped to their `org_id`. Super admins can switch organizations via session (`current_org_id`) or header (`X-Organization-Id`).

2. **`EnsureSiteAccess`** (`site.access`) -- verifies the authenticated user can access the requested site. Super admins pass through. Org admins get all sites in their org. Other roles are checked against the `user_sites` pivot table.

### Shared Inertia Data

Every page load receives these props via `HandleInertiaRequests`:

| Prop | Type | Description |
|---|---|---|
| `auth.user` | User object | Current authenticated user |
| `auth.roles` | string[] | User's role names |
| `auth.permissions` | string[] | All permissions (cached 5 min) |
| `current_organization` | object/null | Current org (id, name, slug, segment, settings, logo, branding, timezone) |
| `accessible_sites` | array | Sites the user can access (id, name, status) |
| `current_site` | object/null | Currently selected site context |
| `notifications` | array | Latest 10 database notifications |
| `unreadNotificationsCount` | int | Badge count |
| `sidebarOpen` | bool | Sidebar state from cookie |
| `locale` | string | Current language (en/es) |

---

## 4. Database Schema

40 Eloquent models organized by domain. Phase 10 added: CorrectiveAction, DeviceAnomaly (S1), MaintenanceWindow, OutageDeclaration (S2), ReportSchedule, DataExport, SiteTemplate (S3).

### Core Domain

#### Organization (`app/Models/Organization.php`)

Top-level tenant entity. Represents a client company.

| Field | Cast | Description |
|---|---|---|
| `name` | -- | Company name |
| `slug` | -- | URL-safe identifier |
| `segment` | -- | Primary segment (retail, cadena_fria, industrial, etc.) |
| `plan` | -- | Subscription plan |
| `settings` | array | JSON configuration |
| `logo` | -- | Logo path |
| `branding` | array | Branding configuration (JSON) |
| `default_opening_hour` | datetime:H:i | Default opening time for sites |
| `default_timezone` | -- | Default timezone for sites |

**Traits:** LogsActivity, SoftDeletes
**Relations:** hasMany(Site), hasMany(User), hasMany(BillingProfile), hasMany(Subscription), hasMany(Invoice)

#### User (`app/Models/User.php`)

Authenticated user or WhatsApp-only contact.

| Field | Cast | Description |
|---|---|---|
| `name` | -- | Display name |
| `email` | -- | Email address |
| `password` | hashed | Nullable for non-app users |
| `org_id` | -- | FK to organizations |
| `phone` | -- | Phone number |
| `whatsapp_phone` | -- | WhatsApp number (can differ from phone) |
| `has_app_access` | boolean | false = WhatsApp-only user |
| `escalation_level` | -- | 1, 2, or 3 |
| `email_verified_at` | datetime | -- |
| `two_factor_confirmed_at` | datetime | -- |

**Traits:** HasApiTokens, HasFactory, HasRoles, LogsActivity, Notifiable, TwoFactorAuthenticatable
**Relations:** belongsTo(Organization), belongsToMany(Site via user_sites with pivot: role, assigned_at, assigned_by)
**Key Methods:** `accessibleSites()`, `canAccessSite(int)`, `isSuperAdmin()`, `belongsToOrg(int)`

#### Site (`app/Models/Site.php`)

A physical location being monitored.

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `name` | -- | Site name |
| `address` | -- | Street address |
| `lat` | float | Latitude |
| `lng` | float | Longitude |
| `timezone` | -- | IANA timezone |
| `opening_hour` | datetime:H:i | Morning summary delivery time |
| `segment_override` | -- | Overrides org segment for this site |
| `install_date` | date | Installation date |
| `status` | -- | active, inactive, onboarding |
| `floor_plan_count` | -- | Cached count |

**Traits:** LogsActivity, SoftDeletes
**Relations:** belongsTo(Organization), belongsToMany(User via user_sites), hasMany(Gateway), hasMany(Device), hasMany(FloorPlan), belongsToMany(Module via site_modules), hasMany(SiteModule), hasMany(SiteRecipeOverride), hasMany(AlertRule), hasMany(Alert), hasMany(EscalationChain), hasMany(WorkOrder)
**Scopes:** `active()`, `forOrganization(int)`

#### File (`app/Models/File.php`)

Polymorphic file attachment (images, documents, PDFs).

| Field | Cast | Description |
|---|---|---|
| `user_id` | -- | Uploader |
| `original_name` | -- | Original filename |
| `filename` | -- | Stored filename |
| `path` | -- | Storage path |
| `disk` | -- | Storage disk (local, s3) |
| `mime_type` | -- | MIME type |
| `size` | integer | Bytes |
| `extension` | -- | File extension |
| `visibility` | -- | public or private |
| `thumbnail_path` | -- | Thumbnail path (images) |
| `metadata` | array | Additional data (JSON) |
| `fileable_type` | -- | Morphable type |
| `fileable_id` | -- | Morphable ID |

**Traits:** HasFactory, HasUuids
**Relations:** belongsTo(User), morphTo(fileable)

### IoT Domain

#### Gateway (`app/Models/Gateway.php`)

LoRaWAN gateway (e.g., Milesight UG65).

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `model` | -- | Hardware model |
| `serial` | -- | Serial number |
| `chirpstack_id` | -- | ChirpStack Cloud gateway ID |
| `last_seen_at` | datetime | Last heartbeat |
| `status` | -- | online, offline, maintenance |
| `is_addon` | boolean | true = billed as addon ($2,500/mo) |

**Traits:** HasFactory, LogsActivity
**Relations:** belongsTo(Site), hasMany(Device)
**Scopes:** `online()` (last_seen_at >= 15 min ago), `forSite(int)`

#### Device (`app/Models/Device.php`)

LoRaWAN sensor (e.g., EM300-TH, CT101, WS301).

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `gateway_id` | -- | FK to gateways |
| `model` | -- | Sensor model (EM300-TH, CT101, etc.) |
| `dev_eui` | -- | LoRaWAN Device EUI |
| `app_key` | encrypted | OTAA join key |
| `name` | -- | Human-readable name |
| `zone` | -- | Zone name (Walk-in Cooler 1, etc.) |
| `floor_id` | -- | FK to floor_plans |
| `floor_x` | -- | X position on floor plan (0-1) |
| `floor_y` | -- | Y position on floor plan (0-1) |
| `recipe_id` | -- | FK to recipes |
| `installed_at` | datetime | Installation timestamp |
| `battery_pct` | -- | Battery percentage |
| `rssi` | -- | Signal strength |
| `last_reading_at` | datetime | Last data received |
| `status` | -- | active, offline, maintenance, decommissioned |
| `provisioned_at` | datetime | When registered in ChirpStack |
| `provisioned_by` | -- | FK to users |
| `replaced_device_id` | -- | FK to devices (self-referential) |

**Traits:** HasFactory, LogsActivity
**Relations:** belongsTo(Site), belongsTo(Gateway), belongsTo(Recipe), belongsTo(FloorPlan, 'floor_id'), hasMany(SensorReading), belongsTo(Device, 'replaced_device_id'), hasMany(AlertRule), hasMany(Alert), belongsTo(User, 'provisioned_by'), hasMany(WorkOrder)
**Scopes:** `online()`, `offline()`, `lowBattery()`, `forSite(int)`
**Methods:** `isOnline()` -- checks last_reading_at >= 15 min ago

#### SensorReading (`app/Models/SensorReading.php`)

Time-series data point. Stored in a TimescaleDB hypertable.

| Field | Cast | Description |
|---|---|---|
| `time` | datetime | Measurement timestamp |
| `device_id` | -- | FK to devices |
| `metric` | -- | temperature, humidity, current, door_status, co2, etc. |
| `value` | double | Measured value |
| `unit` | -- | Unit of measurement |

**Note:** `UPDATED_AT = null` (append-only time-series table)
**Relations:** belongsTo(Device)

**TimescaleDB Configuration:**
- Hypertable with weekly chunks
- Continuous aggregates: 15m, 1h, 1d
- Compression after 7 days (90%+ reduction)
- Retention: raw 12mo, 15m 3mo, 1h 5yr, 1d 10yr

#### FloorPlan (`app/Models/FloorPlan.php`)

2D floor plan image for sensor placement.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `name` | -- | Floor name (Planta Baja, Piso 1) |
| `floor_number` | -- | Ordering integer |
| `image_path` | -- | Storage path |
| `width_px` | -- | Image width |
| `height_px` | -- | Image height |

**Relations:** belongsTo(Site), hasMany(Device, 'floor_id')

#### Module (`app/Models/Module.php`)

Feature module (cold_chain, energy, compliance, industrial, iaq, safety, people).

| Field | Cast | Description |
|---|---|---|
| `slug` | -- | Unique identifier |
| `name` | -- | Display name |
| `description` | -- | Module description |

**Traits:** HasFactory, LogsActivity
**Relations:** hasMany(Recipe), belongsToMany(Site via site_modules)

#### SiteModule (`app/Models/SiteModule.php`)

Pivot: which modules are activated for a site.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `module_id` | -- | FK to modules |
| `activated_at` | datetime | When module was activated |
| `config` | array | Module-specific config (JSON) |

**Relations:** belongsTo(Site), belongsTo(Module)

#### Recipe (`app/Models/Recipe.php`)

Alert template for a sensor model + use case.

| Field | Cast | Description |
|---|---|---|
| `module_id` | -- | FK to modules |
| `sensor_model` | -- | Hardware model this applies to |
| `name` | -- | Recipe name |
| `default_rules` | array | Default alert rules (JSON) |
| `description` | -- | Description |
| `editable` | boolean | Whether org_admins can modify |

**Relations:** belongsTo(Module), hasMany(Device), hasMany(SiteRecipeOverride)

#### SiteRecipeOverride (`app/Models/SiteRecipeOverride.php`)

Per-site customization of a recipe's thresholds.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `recipe_id` | -- | FK to recipes |
| `overridden_rules` | array | Changed rules only (JSON) |
| `overridden_by` | -- | FK to users |

**Relations:** belongsTo(Site), belongsTo(Recipe), belongsTo(User, 'overridden_by')

#### DefrostSchedule (`app/Models/DefrostSchedule.php`)

Auto-learned defrost cycle windows per device.

| Field | Cast | Description |
|---|---|---|
| `device_id` | -- | FK to devices |
| `site_id` | -- | FK to sites |
| `status` | -- | learning, detected, confirmed, manual |
| `windows` | array | Defrost windows (JSON: [{time, duration_min, buffer_min}]) |
| `detected_at` | datetime | When pattern was detected |
| `confirmed_by` | -- | FK to users |
| `confirmed_at` | datetime | User confirmation timestamp |

**Relations:** belongsTo(Device), belongsTo(Site), belongsTo(User, 'confirmed_by')

### Alerts Domain

#### AlertRule (`app/Models/AlertRule.php`)

Configurable alert condition.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `device_id` | -- | FK to devices (nullable, site-wide if null) |
| `name` | -- | Rule name |
| `type` | -- | simple, correlation, baseline |
| `conditions` | array | Rule conditions (JSON) |
| `severity` | -- | critical, high, medium, low |
| `cooldown_minutes` | -- | Minimum time between alerts |
| `active` | boolean | Enabled/disabled |

**Traits:** HasFactory, LogsActivity
**Relations:** belongsTo(Site), belongsTo(Device), hasMany(Alert, 'rule_id')
**Scopes:** `active()`, `forSite(int)`

#### Alert (`app/Models/Alert.php`)

An alert instance triggered by a rule.

| Field | Cast | Description |
|---|---|---|
| `rule_id` | -- | FK to alert_rules |
| `site_id` | -- | FK to sites |
| `device_id` | -- | FK to devices |
| `severity` | -- | critical, high, medium, low |
| `status` | -- | active, acknowledged, resolved, dismissed |
| `triggered_at` | datetime | When alert fired |
| `acknowledged_at` | datetime | When acknowledged |
| `resolved_at` | datetime | When resolved |
| `resolved_by` | -- | FK to users |
| `resolution_type` | -- | auto, manual, work_order, dismissed |
| `data` | array | Snapshot: trigger_reading, threshold, rule_snapshot (JSON) |

**Relations:** belongsTo(AlertRule, 'rule_id'), belongsTo(Site), belongsTo(Device), belongsTo(User, 'resolved_by'), hasMany(AlertNotification)
**Methods:** `acknowledge(int userId)`, `resolve(?int userId, string type)`, `dismiss(int userId)`
**Scopes:** `active()`, `unresolved()`, `forSite(int)`

#### AlertNotification (`app/Models/AlertNotification.php`)

Audit log of every notification sent for an alert.

| Field | Cast | Description |
|---|---|---|
| `alert_id` | -- | FK to alerts |
| `user_id` | -- | FK to users |
| `channel` | -- | whatsapp, push, sms, email |
| `status` | -- | sent, delivered, failed |
| `sent_at` | datetime | When sent |
| `delivered_at` | datetime | When confirmed delivered |
| `error` | -- | Error message if failed |

**Relations:** belongsTo(Alert), belongsTo(User)

#### EscalationChain (`app/Models/EscalationChain.php`)

Defines who gets notified at each escalation level for a site.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `level` | -- | 1, 2, or 3 |
| `user_id` | -- | FK to users |
| `delay_minutes` | -- | Wait before escalating |
| `channel` | -- | whatsapp, push, sms, email |

**Relations:** belongsTo(Site), belongsTo(User)

### Operations Domain

#### WorkOrder (`app/Models/WorkOrder.php`)

Maintenance task (auto-generated from alerts or manual).

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `alert_id` | -- | FK to alerts (nullable) |
| `device_id` | -- | FK to devices (nullable) |
| `type` | -- | battery_replace, sensor_replace, maintenance, inspection, install |
| `title` | -- | Title |
| `description` | -- | Description |
| `status` | -- | open, assigned, in_progress, completed, cancelled |
| `priority` | -- | low, medium, high, urgent |
| `assigned_to` | integer | FK to users |
| `created_by` | integer | FK to users |

**Traits:** LogsActivity
**Relations:** belongsTo(Site), belongsTo(Alert), belongsTo(Device), belongsTo(User, 'assigned_to'), belongsTo(User, 'created_by'), hasMany(WorkOrderPhoto), hasMany(WorkOrderNote)
**Methods:** `assign(int)`, `start()`, `complete()`, `cancel()`
**Scopes:** `open()`, `forSite(int)`, `assignedTo(int)`

#### WorkOrderPhoto (`app/Models/WorkOrderPhoto.php`)

Photo evidence attached to a work order.

| Field | Cast | Description |
|---|---|---|
| `work_order_id` | -- | FK to work_orders |
| `photo_path` | -- | Storage path |
| `caption` | -- | Optional caption |
| `uploaded_by` | -- | FK to users |
| `uploaded_at` | datetime | Upload timestamp |

**Relations:** belongsTo(WorkOrder), belongsTo(User, 'uploaded_by')

#### WorkOrderNote (`app/Models/WorkOrderNote.php`)

Text note on a work order.

| Field | Cast | Description |
|---|---|---|
| `work_order_id` | -- | FK to work_orders |
| `user_id` | -- | FK to users |
| `note` | -- | Note text |

**Relations:** belongsTo(WorkOrder), belongsTo(User)

### Billing Domain

#### BillingProfile (`app/Models/BillingProfile.php`)

Mexican tax entity for invoicing (RFC).

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `name` | -- | Profile name |
| `rfc` | -- | Mexican tax ID (RFC) |
| `razon_social` | -- | Legal company name |
| `regimen_fiscal` | -- | Tax regime code |
| `direccion_fiscal` | array | Address (JSON: calle, numero, colonia, cp, etc.) |
| `uso_cfdi` | -- | CFDI usage code |
| `email_facturacion` | -- | Invoice email |
| `is_default` | boolean | Default billing profile |

**Relations:** belongsTo(Organization, 'org_id'), hasMany(Subscription), hasMany(Invoice)

#### Subscription (`app/Models/Subscription.php`)

Monthly subscription for an organization.

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `billing_profile_id` | -- | FK to billing_profiles |
| `base_fee` | decimal:2 | Monthly base fee |
| `discount_pct` | decimal:2 | Discount percentage |
| `status` | -- | active, cancelled, paused |
| `started_at` | datetime | Start date |
| `contract_type` | -- | monthly, annual |

**Relations:** belongsTo(Organization, 'org_id'), belongsTo(BillingProfile), hasMany(SubscriptionItem)
**Methods:** `calculateMonthlyTotal()` -- base_fee * (1 - discount_pct/100) + sum(items.monthly_fee)

#### SubscriptionItem (`app/Models/SubscriptionItem.php`)

Line item on a subscription (per device).

| Field | Cast | Description |
|---|---|---|
| `subscription_id` | -- | FK to subscriptions |
| `device_id` | -- | FK to devices |
| `sensor_model` | -- | Sensor model |
| `monthly_fee` | decimal:2 | Per-device monthly fee |

**Relations:** belongsTo(Subscription), belongsTo(Device)

#### Invoice (`app/Models/Invoice.php`)

Monthly invoice with CFDI support.

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `billing_profile_id` | -- | FK to billing_profiles |
| `period` | -- | Billing period (YYYY-MM) |
| `subtotal` | decimal:2 | Subtotal before tax |
| `iva` | decimal:2 | VAT (IVA) amount |
| `total` | decimal:2 | Total with tax |
| `status` | -- | draft, sent, paid, overdue |
| `cfdi_uuid` | -- | SAT CFDI UUID |
| `pdf_path` | -- | Stamped PDF path |
| `xml_path` | -- | Stamped XML path |
| `paid_at` | datetime | Payment date |
| `payment_method` | -- | spei, transfer |

**Traits:** LogsActivity
**Relations:** belongsTo(Organization, 'org_id'), belongsTo(BillingProfile)
**Scopes:** `draft()`, `overdue()`, `forOrg(int)`

### Analytics Domain

#### DoorBaseline (`app/Models/DoorBaseline.php`)

Learned door usage patterns per device (hourly averages by day of week).

| Field | Cast | Description |
|---|---|---|
| `device_id` | -- | FK to devices |
| `day_of_week` | integer | 0=Sunday through 6=Saturday |
| `hour` | integer | 0-23 |
| `avg_opens` | double | Average door opens |
| `avg_duration` | double | Average open duration |
| `std_dev_opens` | double | Standard deviation |

**Relations:** belongsTo(Device)

#### CompressorBaseline (`app/Models/CompressorBaseline.php`)

Daily compressor performance metrics per device.

| Field | Cast | Description |
|---|---|---|
| `device_id` | -- | FK to devices |
| `date` | date | Day |
| `duty_cycle_pct` | double | On-time percentage |
| `on_count` | integer | Number of on cycles |
| `avg_on_duration` | double | Average on duration |
| `avg_off_duration` | double | Average off duration |
| `degradation_score` | double | Health score (higher = worse) |

**Relations:** belongsTo(Device)

#### IaqZoneScore (`app/Models/IaqZoneScore.php`)

Daily indoor air quality score per zone.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `zone` | -- | Zone name |
| `date` | date | Day |
| `avg_co2` | double | Average CO2 (ppm) |
| `avg_temp` | double | Average temperature |
| `avg_humidity` | double | Average humidity |
| `avg_tvoc` | double | Average TVOC |
| `comfort_score` | double | Computed comfort score |

**Relations:** belongsTo(Site)

#### TrafficSnapshot (`app/Models/TrafficSnapshot.php`)

Hourly occupancy data per zone.

| Field | Cast | Description |
|---|---|---|
| `site_id` | -- | FK to sites |
| `zone` | -- | Zone name |
| `date` | date | Day |
| `hour` | integer | 0-23 |
| `occupancy_avg` | double | Average occupancy |
| `occupancy_peak` | integer | Peak occupancy |

**Relations:** belongsTo(Site)

### Integrations Domain

#### ApiKey (`app/Models/ApiKey.php`)

API key for external integrations.

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `name` | -- | Key name |
| `key_hash` | -- | Hashed API key |
| `permissions` | array | Allowed operations (JSON) |
| `rate_limit` | -- | Requests per minute |
| `last_used_at` | datetime | Last usage |
| `active` | boolean | Enabled/disabled |

**Relations:** belongsTo(Organization, 'org_id')

#### WebhookSubscription (`app/Models/WebhookSubscription.php`)

Outbound webhook for external systems.

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `url` | -- | Webhook endpoint URL |
| `events` | array | Subscribed event types (JSON) |
| `secret` | -- | HMAC signing secret |
| `active` | boolean | Enabled/disabled |
| `last_triggered_at` | datetime | Last successful dispatch |
| `failure_count` | -- | Consecutive failures |

**Relations:** belongsTo(Organization, 'org_id')

#### IntegrationConfig (`app/Models/IntegrationConfig.php`)

Configuration for ERP/accounting integrations (SAP, CONTPAQ).

| Field | Cast | Description |
|---|---|---|
| `org_id` | -- | FK to organizations |
| `type` | -- | Integration type (sap, contpaq) |
| `config` | encrypted:array | Encrypted credentials and settings |
| `schedule_cron` | -- | Export schedule |
| `last_export_at` | datetime | Last successful export |
| `active` | boolean | Enabled/disabled |

**Relations:** belongsTo(Organization, 'org_id')

---

## 5. Roles & Permissions

5 roles with 29 permissions managed by Spatie Laravel Permission. Phase 10 added 7 permissions: `log corrective actions`, `verify corrective actions`, `manage maintenance windows`, `view alert analytics`, `manage report schedules`, `manage site templates`, `export organization data`.

### Permission Matrix

| Permission | super_admin | org_admin | site_manager | site_viewer | technician |
|---|:---:|:---:|:---:|:---:|:---:|
| **Organizations** | | | | | |
| view organizations | Y | Y | -- | -- | -- |
| manage organizations | Y | -- | -- | -- | -- |
| **Sites** | | | | | |
| view sites | Y | Y | Y | Y | Y |
| manage sites | Y | Y | Y | -- | -- |
| onboard sites | Y | Y | -- | -- | -- |
| **Devices** | | | | | |
| view devices | Y | Y | Y | Y | Y |
| manage devices | Y | Y | Y | -- | -- |
| provision devices | Y | Y | -- | -- | -- |
| **Alerts** | | | | | |
| view alerts | Y | Y | Y | Y | Y |
| acknowledge alerts | Y | Y | Y | -- | Y |
| manage alert rules | Y | Y | Y | -- | -- |
| **Users** | | | | | |
| view users | Y | Y | Y | -- | -- |
| manage users | Y | Y | -- | -- | -- |
| assign site users | Y | Y | Y | -- | -- |
| **Reports** | | | | | |
| view reports | Y | Y | Y | Y | -- |
| generate reports | Y | Y | Y | -- | -- |
| **Work Orders** | | | | | |
| view work orders | Y | Y | Y | -- | Y |
| manage work orders | Y | Y | Y | -- | -- |
| complete work orders | Y | Y | -- | -- | Y |
| **Settings** | | | | | |
| manage org settings | Y | Y | -- | -- | -- |
| view activity log | Y | Y | Y | -- | -- |
| **Command Center** | | | | | |
| access command center | Y | -- | -- | -- | -- |

### Role Descriptions

| Role | Site Scoping | Persona |
|---|---|---|
| `super_admin` | All sites, all orgs | Astrea internal team |
| `org_admin` | All sites in their org | Director de Operaciones (client) |
| `site_manager` | Multiple assigned sites | Gerente Regional |
| `site_viewer` | Single assigned site (read-only) | Gerente de Tienda |
| `technician` | Multiple assigned sites | Tecnico de mantenimiento |

---

## 6. Multi-Tenancy

### How Scoping Works

Data isolation is enforced at two levels:

1. **Organization level** (`org_id` column) -- Organizations, Sites, Users, BillingProfiles, Subscriptions, Invoices, ApiKeys, WebhookSubscriptions, IntegrationConfigs all carry `org_id`.

2. **Site level** (`site_id` column) -- Gateways, Devices, AlertRules, Alerts, EscalationChains, WorkOrders, FloorPlans, SiteModules, SiteRecipeOverrides, DefrostSchedules all carry `site_id`.

### Middleware Chain

Standard authenticated route:
```
auth -> verified -> org.scope -> [route-specific middleware]
```

Site-specific route:
```
auth -> verified -> org.scope -> site.access -> [permission middleware]
```

### EnsureOrganizationScope Middleware

Registered as `org.scope`. Applied to all authenticated routes.

**For regular users:**
- Reads `$user->org_id`
- Loads the Organization model
- Binds it as `app('current_organization')`
- Aborts 403 if user has no org_id

**For super_admin:**
- Reads org from `session('current_org_id')` or `X-Organization-Id` header
- If set, binds that org into the container
- If not set, passes through without org binding (allows cross-org views like Command Center)

### EnsureSiteAccess Middleware

Registered as `site.access`. Applied to routes with `{site}` parameter.

- Extracts the site from the route
- Calls `$user->canAccessSite($siteId)`:
  - `super_admin` -- always true
  - `org_admin` -- checks site belongs to their org
  - Others -- checks `user_sites` pivot table

### Super Admin Organization Switching

Super admins can switch their active organization context:
- Via session: `session(['current_org_id' => $orgId])`
- Via API header: `X-Organization-Id: {orgId}`
- When switched, `app('current_organization')` returns that org
- `accessibleSites()` returns sites for the switched org

---

## 7. Route Map

All routes organized by group with their middleware stack.

### Public Routes

| Method | URI | Name | Controller/Action |
|---|---|---|---|
| GET | `/` | home | welcome page (Inertia) |
| POST | `/locale` | locale.update | LocaleController@update |

### Auth Routes (Fortify-managed)

Login, register, forgot-password, reset-password, email verification, two-factor challenge.

### Settings Routes (`auth`)

| Method | URI | Name | Middleware |
|---|---|---|---|
| GET | `/settings/profile` | profile.edit | auth |
| PATCH | `/settings/profile` | profile.update | auth |
| DELETE | `/settings/profile` | profile.destroy | auth |
| GET | `/settings/password` | user-password.edit | auth |
| PUT | `/settings/password` | user-password.update | auth, throttle:6,1 |
| GET | `/settings/appearance` | appearance.edit | auth |
| GET | `/settings/two-factor` | two-factor.show | auth |
| GET | `/settings/organization` | organization.edit | auth, verified, org.scope, permission:manage org settings |
| PATCH | `/settings/organization` | organization.update | auth, verified, org.scope, permission:manage org settings |

### Core Platform Routes (`auth, verified, org.scope`)

#### Dashboard & Context

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/dashboard` | dashboard | -- |
| POST | `/site/switch` | site.switch | -- |

#### Activity Log

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/activity-log` | activity-log | permission:view activity log |
| GET | `/activity-log/user/{userId}` | activity-log.user | permission:view activity log |
| GET | `/activity-log/{model}/{id}` | activity-log.model | permission:view activity log |

#### File Upload

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| POST | `/upload` | upload | throttle:20,1 |
| POST | `/upload/multiple` | upload.multiple | throttle:10,1 |
| GET | `/upload/allowed-types` | upload.allowed-types | -- |
| DELETE | `/upload/{path}` | upload.delete | -- |

#### File Management

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/files/{file}` | files.show | -- |
| GET | `/files/{file}/serve` | files.serve | -- |
| GET | `/files/{file}/download` | files.download | -- |
| DELETE | `/files/{file}` | files.destroy | -- |
| PATCH | `/files/{file}/visibility` | files.visibility | -- |

#### Notifications

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/notifications` | notifications | -- |
| GET | `/notifications/unread-count` | notifications.unread-count | -- |
| POST | `/notifications/{id}/mark-as-read` | notifications.mark-as-read | -- |
| POST | `/notifications/mark-all-as-read` | notifications.mark-all-as-read | -- |
| DELETE | `/notifications/{id}` | notifications.destroy | -- |
| DELETE | `/notifications/read/delete-all` | notifications.delete-read | -- |

#### Site Onboarding (`site.access`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/onboard` | sites.onboard | site.access |
| POST | `/sites/{site}/onboard/gateway` | sites.onboard.gateway | site.access |
| POST | `/sites/{site}/onboard/devices` | sites.onboard.devices | site.access |
| POST | `/sites/{site}/onboard/modules` | sites.onboard.modules | site.access |
| POST | `/sites/{site}/onboard/complete` | sites.onboard.complete | site.access |

#### Gateways (`site.access, permission:manage devices`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/gateways` | gateways.index | site.access, permission:manage devices |
| POST | `/sites/{site}/gateways` | gateways.store | site.access, permission:manage devices |
| GET | `/sites/{site}/gateways/{gateway}` | gateways.show | site.access, permission:manage devices |
| DELETE | `/sites/{site}/gateways/{gateway}` | gateways.destroy | site.access, permission:manage devices |

#### Devices

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/devices` | devices.index | site.access |
| POST | `/sites/{site}/devices` | devices.store | site.access, permission:manage devices |
| GET | `/sites/{site}/devices/{device}` | devices.show | site.access |
| PUT | `/sites/{site}/devices/{device}` | devices.update | site.access, permission:manage devices |
| DELETE | `/sites/{site}/devices/{device}` | devices.destroy | site.access, permission:manage devices |
| GET | `/devices/{device}` | devices.show | -- (org-scoped) |

#### Floor Plans (`site.access, permission:manage devices`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| POST | `/sites/{site}/floor-plans` | floor-plans.store | site.access, permission:manage devices |
| PUT | `/sites/{site}/floor-plans/{floorPlan}` | floor-plans.update | site.access, permission:manage devices |
| DELETE | `/sites/{site}/floor-plans/{floorPlan}` | floor-plans.destroy | site.access, permission:manage devices |

#### Recipes (org-scoped)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/recipes` | recipes.index | -- |
| GET | `/recipes/{recipe}` | recipes.show | -- |

#### Site Detail (`site.access`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}` | sites.show | site.access |
| GET | `/sites/{site}/zones/{zone}` | sites.zone | site.access |

#### Reports (`site.access`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/reports/temperature` | reports.temperature | site.access |
| GET | `/sites/{site}/reports/energy` | reports.energy | site.access |
| GET | `/sites/{site}/reports/summary` | reports.summary | site.access |

#### Modules (`site.access, permission:manage devices`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/modules` | modules.index | site.access, permission:manage devices |
| POST | `/sites/{site}/modules/{module}/toggle` | modules.toggle | site.access, permission:manage devices |

#### Alerts

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/alerts` | alerts.index | -- |
| GET | `/alerts/{alert}` | alerts.show | -- |
| POST | `/alerts/{alert}/acknowledge` | alerts.acknowledge | -- |
| POST | `/alerts/{alert}/resolve` | alerts.resolve | -- |
| POST | `/alerts/{alert}/dismiss` | alerts.dismiss | -- |

#### Alert Rules (`site.access, permission:manage alert rules`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/rules` | rules.index | site.access, permission:manage alert rules |
| POST | `/sites/{site}/rules` | rules.store | site.access, permission:manage alert rules |
| GET | `/sites/{site}/rules/{rule}` | rules.show | site.access, permission:manage alert rules |
| PUT | `/sites/{site}/rules/{rule}` | rules.update | site.access, permission:manage alert rules |
| DELETE | `/sites/{site}/rules/{rule}` | rules.destroy | site.access, permission:manage alert rules |

#### Exports

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/exports/download` | exports.download | -- |

#### Work Orders

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/work-orders` | work-orders.index | -- |
| GET | `/work-orders/{workOrder}` | work-orders.show | -- |
| POST | `/sites/{site}/work-orders` | work-orders.store | site.access |
| PUT | `/work-orders/{workOrder}/status` | work-orders.update-status | -- |
| POST | `/work-orders/{workOrder}/photos` | work-orders.add-photo | -- |
| POST | `/work-orders/{workOrder}/notes` | work-orders.add-note | -- |

#### Command Center (`role:super_admin`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/command-center` | command-center.index | role:super_admin |
| GET | `/command-center/alerts` | command-center.alerts | role:super_admin |
| GET | `/command-center/work-orders` | command-center.work-orders | role:super_admin |
| GET | `/command-center/devices` | command-center.devices | role:super_admin |
| GET | `/command-center/revenue` | command-center.revenue | role:super_admin |
| GET | `/command-center/dispatch` | command-center.dispatch | role:super_admin |
| GET | `/command-center/{org}` | command-center.org | role:super_admin |

#### Compliance Calendar

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/settings/compliance` | compliance.index | permission:manage org settings |

#### Module Dashboards (`site.access`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/sites/{site}/modules/iaq` | modules.iaq | site.access |
| GET | `/sites/{site}/modules/industrial` | modules.industrial | site.access |

#### Billing

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/settings/billing` | billing.dashboard | -- |
| GET | `/settings/billing/profiles` | billing.profiles | -- |
| POST | `/settings/billing/profiles` | billing.profiles.store | -- |

#### API Keys (`permission:manage org settings`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/settings/api-keys` | api-keys.index | permission:manage org settings |
| POST | `/settings/api-keys` | api-keys.store | permission:manage org settings |
| DELETE | `/settings/api-keys/{apiKey}` | api-keys.destroy | permission:manage org settings |

#### Integrations (`permission:manage org settings`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/settings/integrations` | integrations.index | permission:manage org settings |
| POST | `/settings/integrations` | integrations.store | permission:manage org settings |

#### User Management (`permission:manage users`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/settings/users` | users.index | permission:manage users |
| POST | `/settings/users` | users.store | permission:manage users |
| PUT | `/settings/users/{user}` | users.update | permission:manage users |
| DELETE | `/settings/users/{user}` | users.destroy | permission:manage users |

#### Partner Portal (`role:super_admin`)

| Method | URI | Name | Extra Middleware |
|---|---|---|---|
| GET | `/partner` | partner.index | role:super_admin |

### API Routes — Mobile App (`routes/api.php`)

#### Public (throttled)

| Method | URI | Controller |
|---|---|---|
| POST | `/api/auth/login` | AuthController@login (`throttle:10,1`) |

#### Sanctum-Protected (`auth:sanctum, throttle:60,1`)

| Method | URI | Controller |
|---|---|---|
| POST | `/api/auth/logout` | AuthController@logout |
| GET | `/api/auth/user` | AuthController@user |
| GET | `/api/dashboard` | DashboardApiController (invokable) |
| GET | `/api/sites` | SiteApiController@index |
| GET | `/api/sites/{site}` | SiteApiController@show |
| GET | `/api/sites/{site}/zones/{zone}` | SiteApiController@zone |
| GET | `/api/sites/{site}/devices` | DeviceApiController@index |
| GET | `/api/devices/{device}` | DeviceApiController@show |
| GET | `/api/devices/{device}/readings` | DeviceApiController@readings |
| GET | `/api/devices/{device}/status` | DeviceApiController@status |
| GET | `/api/alerts` | AlertApiController@index |
| GET | `/api/alerts/{alert}` | AlertApiController@show |
| POST | `/api/alerts/{alert}/acknowledge` | AlertApiController@acknowledge |
| POST | `/api/alerts/{alert}/resolve` | AlertApiController@resolve |
| GET | `/api/work-orders` | WorkOrderApiController@index |
| GET | `/api/work-orders/{workOrder}` | WorkOrderApiController@show |
| POST | `/api/sites/{site}/work-orders` | WorkOrderApiController@store |
| PUT | `/api/work-orders/{workOrder}/status` | WorkOrderApiController@updateStatus |
| POST | `/api/work-orders/{workOrder}/photos` | WorkOrderApiController@storePhoto |
| POST | `/api/work-orders/{workOrder}/notes` | WorkOrderApiController@storeNote |
| GET | `/api/notifications` | NotificationApiController@index |
| POST | `/api/notifications/mark-all-read` | NotificationApiController@markAllRead |
| POST | `/api/push-tokens` | PushTokenApiController@store |
| DELETE | `/api/push-tokens/{token}` | PushTokenApiController@destroy |

### Webhook Routes (no auth)

| Method | URI | Controller |
|---|---|---|
| POST | `/api/whatsapp/webhook` | WhatsAppWebhookController (invokable) |

---

## 8. Frontend Pages

55 Inertia page components organized by domain.

### Auth Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Login | `pages/auth/login.tsx` | `auth/login` |
| Register | `pages/auth/register.tsx` | `auth/register` |
| Forgot Password | `pages/auth/forgot-password.tsx` | `auth/forgot-password` |
| Reset Password | `pages/auth/reset-password.tsx` | `auth/reset-password` |
| Confirm Password | `pages/auth/confirm-password.tsx` | `auth/confirm-password` |
| Verify Email | `pages/auth/verify-email.tsx` | `auth/verify-email` |
| Two-Factor Challenge | `pages/auth/two-factor-challenge.tsx` | `auth/two-factor-challenge` |

### Core Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Welcome | `pages/welcome.tsx` | `welcome` |
| Dashboard | `pages/dashboard.tsx` | `dashboard` |
| Notifications | `pages/notifications.tsx` | `notifications` |
| Activity Log | `pages/activity-log.tsx` | `activity-log` |

### Monitor Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Site Detail | `pages/sites/show.tsx` | `sites/show` |
| Site Zone | `pages/sites/zone.tsx` | `sites/zone` |
| Device Detail | `pages/devices/show.tsx` | `devices/show` |

### Alert Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Alert List | `pages/alerts/index.tsx` | `alerts/index` |
| Alert Detail | `pages/alerts/show.tsx` | `alerts/show` |

### Report Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Temperature Report | `pages/reports/temperature.tsx` | `reports/temperature` |
| Energy Report | `pages/reports/energy.tsx` | `reports/energy` |
| Summary Report | `pages/reports/summary.tsx` | `reports/summary` |

### Work Order Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Work Order List | `pages/work-orders/index.tsx` | `work-orders/index` |
| Work Order Detail | `pages/work-orders/show.tsx` | `work-orders/show` |

### Command Center Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Global Overview | `pages/command-center/index.tsx` | `command-center/index` |
| Alerts (cross-org) | `pages/command-center/alerts.tsx` | `command-center/alerts` |
| Work Orders (cross-org) | `pages/command-center/work-orders.tsx` | `command-center/work-orders` |
| Devices (cross-org) | `pages/command-center/devices.tsx` | `command-center/devices` |
| Revenue Dashboard | `pages/command-center/revenue.tsx` | `command-center/revenue` |
| Org Drill-down | `pages/command-center/{org}.tsx` | `command-center/{org}` |
| Field Dispatch Map | `pages/command-center/dispatch.tsx` | `command-center/dispatch` |

### Module Dashboard Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| IAQ Module | `pages/sites/{site}/modules/iaq.tsx` | `sites/{site}/modules/iaq` |
| Industrial Module | `pages/sites/{site}/modules/industrial.tsx` | `sites/{site}/modules/industrial` |

### Settings Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Profile | `pages/settings/profile.tsx` | `settings/profile` |
| Password | `pages/settings/password.tsx` | `settings/password` |
| Appearance | `pages/settings/appearance.tsx` | `settings/appearance` |
| Two-Factor | `pages/settings/two-factor.tsx` | `settings/two-factor` |
| Organization | `pages/settings/organization.tsx` | `settings/organization` |
| Site Onboarding | `pages/settings/sites/onboard.tsx` | `settings/sites/onboard` |
| Devices | `pages/settings/devices/index.tsx` | `settings/devices/index` |
| Alert Rules | `pages/settings/rules/index.tsx` | `settings/rules/index` |
| Modules | `pages/settings/modules.tsx` | `settings/modules` |
| Users | `pages/settings/users/index.tsx` | `settings/users/index` |
| Billing Dashboard | `pages/settings/billing/index.tsx` | `settings/billing/index` |
| Billing Profiles | `pages/settings/billing/profiles.tsx` | `settings/billing/profiles` |
| API Keys | `pages/settings/api-keys.tsx` | `settings/api-keys` |
| Integrations | `pages/settings/integrations.tsx` | `settings/integrations` |
| Compliance Calendar | `pages/settings/compliance.tsx` | `settings/compliance` |
| Sites Index | `pages/settings/sites/index.tsx` | `settings/sites/index` |

### Partner Pages

| Page | File Path | Inertia Render Path |
|---|---|---|
| Partner Portal | `pages/partner/index.tsx` | `partner/index` |

---

## 9. Background Jobs

14 queued jobs that handle the data pipeline, alert processing, and scheduled operations.

### Data Pipeline Jobs

| Job | Queue | Tries | Backoff | Trigger | Description |
|---|---|---|---|---|---|
| `ProcessSensorReading` | readings | 3 | 10s | MQTT uplink received | Decodes payload via `DecoderFactory`, stores to TimescaleDB + Redis cache, updates device status, dispatches `EvaluateAlertRules`, broadcasts `SensorReadingReceived` |
| `EvaluateAlertRules` | readings | 1 | -- | Dispatched by ProcessSensorReading | Loads active rules for device, runs `RuleEvaluator`, checks defrost windows, creates Alert records |
| `ProcessUploadedImage` | default | 3 | 30s | File upload | Optimizes images via `ImageOptimizationService`, generates thumbnails |

### Alert Jobs

| Job | Queue | Tries | Backoff | Trigger | Description |
|---|---|---|---|---|---|
| `SendAlertNotification` | alerts | 3 | 30s | Alert created | Sends via WhatsApp (Twilio), push, or email based on channel param. Creates `AlertNotification` audit record |
| `EscalateAlert` | alerts | 2 | 60s | Delayed dispatch (no ack within delay_minutes) | Escalates alert to next level in escalation chain via `EscalationService` |
| `CreateWorkOrder` | default | 3 | -- | Device health check / alert trigger | Auto-creates work order for battery_replace, sensor_replace, or maintenance via `WorkOrderService` |

### Scheduled Jobs

| Job | Schedule | Tries | Trigger | Description |
|---|---|---|---|---|
| `CheckDeviceHealth` | Periodic | 1 | Scheduler | Detects offline devices (no reading in 15 min), marks status. Detects low battery (<20%). Logs findings. |
| `SendMorningSummary` | Every minute | 1 | Scheduler | Checks each active site's timezone + opening_hour. When matched, generates store-level summary for site_viewer users via `MorningSummaryService` |
| `SendRegionalSummary` | Every minute | 1 | Scheduler | For each site_manager, calculates 30 min after earliest assigned site opening. Generates regional roll-up via `MorningSummaryService` |
| `SendCorporateSummary` | Daily (8 AM) | 1 | Scheduler | Generates org-wide summary for all org_admin users across all organizations via `MorningSummaryService` |
| `LearnDefrostPattern` | Per-device (hour 49) | 1 | Dispatched after 49 hours | Analyzes 48 hours of temperature data via `DefrostDetector`. Detects repeating spike patterns across two days. Creates `DefrostSchedule` if pattern found. |

### Queue Worker Configuration

| Worker | Queue | Concurrency | Purpose |
|---|---|---|---|
| mqtt-listener | mqtt | 1 | Persistent MQTT connection to ChirpStack Cloud |
| sensor-processor | readings | 3 | Decode + store + evaluate rules |
| alert-router | alerts | 2 | WhatsApp + Push + SMS delivery |
| report-generator | reports | 1 | PDF generation (CPU-intensive) |
| scheduled | default | 1 | Cron jobs, image processing, work orders |

---

## 10. External Integrations

### ChirpStack Cloud (P0 -- Network Server)

**Service:** `App\Services\ChirpStack\MqttListener`, `App\Services\ChirpStack\DeviceProvisioner`

- **MQTT:** Subscribes to ChirpStack Cloud MQTT topics for decoded uplink payloads. The listener runs as a persistent queue worker.
- **REST API:** Registers gateways and devices during provisioning.
  - `createGateway(serial, site)` -- POST /api/gateways
  - `createDevice(devEui, model, site)` -- POST /api/devices
  - `getDeviceStatus(devEui)` -- GET /api/devices/{devEui}
  - `deleteDevice(devEui)` -- DELETE /api/devices/{devEui}
- **Config:** `CHIRPSTACK_API_KEY`, `CHIRPSTACK_API_URL` in .env

### Twilio (P0 -- WhatsApp + SMS)

**Service:** `App\Services\WhatsApp\TwilioService`

- Sends WhatsApp alerts via pre-approved templates (4 templates: alert_critical, alert_high, alert_escalation, alert_resolved)
- Receives acknowledgment via webhook (`POST /api/whatsapp/webhook` -- `WhatsAppWebhookController`)
- Severity-based routing: critical/high = WhatsApp + push; medium = push; low = dashboard only
- Rate limiting for mass events (e.g., city-wide power outage)

### Facturapi (P1 -- Mexican Tax Invoicing)

**Service:** `App\Services\Billing\FacturapiService`

- CFDI 4.0 invoice stamping (XML + PDF sellado)
- Integrates with BillingProfile model for RFC, razon_social, regimen_fiscal
- Generates SAT-compliant invoices with UUID tracking

### SAP (P3 -- ERP Export)

**Service:** `App\Services\Integrations\SapExportService`

- Exports operational data to SAP via webhook or CSV
- Configurable per organization via `IntegrationConfig` model
- Schedule via `schedule_cron` field

### CONTPAQ (P3 -- Accounting Export)

**Service:** `App\Services\Integrations\ContpaqExportService`

- Exports billing/accounting data to CONTPAQ
- Configurable per organization via `IntegrationConfig` model
- Schedule via `schedule_cron` field

### Payload Decoders

**Service:** `App\Services\Decoders\DecoderFactory`, `App\Services\Decoders\MilesightDecoder`

Supported sensor models: EM300-TH, CT101, WS301, GS101, EM300-PT, EM310-UDL, AM307, AM103L. ChirpStack Cloud decodes the raw LoRaWAN bytes; MilesightDecoder normalizes and validates the decoded JSON.

### Webhook Dispatcher

**Service:** `App\Services\Api\WebhookDispatcher`

Dispatches events to external systems via `WebhookSubscription` configurations. Signs payloads with HMAC using the subscription's secret.

---

## 11. Events & Broadcasting

3 broadcast events using Laravel Reverb (WebSocket server).

### SensorReadingReceived

**File:** `app/Events/SensorReadingReceived.php`
**Implements:** `ShouldBroadcast`
**Broadcast Name:** `sensor.reading`

| Channel | Type | Description |
|---|---|---|
| `site.{site_id}` | PrivateChannel | All devices on a site (site detail page) |
| `device.{device_id}` | PrivateChannel | Single device (device detail page) |

**Payload:**
```json
{
    "device_id": 123,
    "dev_eui": "A84041...",
    "name": "Walk-in Cooler 1",
    "readings": [{"metric": "temperature", "value": -15.2, "unit": "C"}],
    "time": "2026-03-15T10:30:00Z"
}
```

**Dispatched by:** `ProcessSensorReading` job (non-blocking -- broadcast failure does not fail the job)

### AlertTriggered

**File:** `app/Events/AlertTriggered.php`
**Implements:** `ShouldBroadcast`
**Broadcast Name:** `alert.triggered`

| Channel | Type | Description |
|---|---|---|
| `site.{site_id}` | PrivateChannel | Alert feed on site dashboard |

**Payload:**
```json
{
    "id": 456,
    "severity": "critical",
    "status": "active",
    "device_id": 123,
    "data": {"trigger_reading": {...}, "threshold": -12, "condition": "above"},
    "triggered_at": "2026-03-15T10:30:00Z"
}
```

### NotificationCreated

**File:** `app/Events/NotificationCreated.php`
**Implements:** `ShouldBroadcast`
**Broadcast Name:** `notification.created`

| Channel | Type | Description |
|---|---|---|
| `App.Models.User.{user_id}` | PrivateChannel | User-specific notification bell |

**Payload:**
```json
{
    "id": "uuid",
    "type": "App\\Notifications\\SystemNotification",
    "data": {"title": "...", "message": "..."},
    "read_at": null,
    "created_at": "2026-03-15T10:30:00Z"
}
```

---

## 12. Navigation Structure

Sidebar navigation defined in `resources/js/config/navigation.ts`. Four groups with 14 items total.

### Overview Group

| Item | Icon | Route | Tooltip |
|---|---|---|---|
| Dashboard | LayoutGrid | `/dashboard` | Platform overview |
| Alerts | Bell | `/alerts` | Alert center |
| Activity | Activity | `/activity-log` | View activity log |

### Monitor Group

| Item | Icon | Route | Tooltip |
|---|---|---|---|
| Sites | MapPin | `/sites` | Manage sites |
| Devices | Cpu | `/devices` | Manage devices |

### Account Group

| Item | Icon | Route | Tooltip |
|---|---|---|---|
| Profile | User | `/settings/profile` | Manage your profile |
| Security | Shield | `/settings/password` | Security settings |
| Appearance | Palette | `/settings/appearance` | Theme settings |

### Administration Group

| Item | Icon | Route | Tooltip |
|---|---|---|---|
| Organization | Building2 | `/settings/organization` | Organization settings |
| Sites | MapPin | `/settings/sites` | Manage sites |
| Gateways | Radio | `/settings/gateways` | Manage gateways |
| Recipes | BookOpen | `/recipes` | Sensor recipes |
| Users | Users | `/settings/users` | Manage users |

### Navigation Utilities

The navigation config also exports:
- `getAllNavigationItems()` -- flatten all groups into a single array
- `findActiveNavItem(url)` -- match current URL to nav item (exact then prefix match)
- `buildBreadcrumbs(url)` -- generate breadcrumb trail from URL
- `markActiveNavigation(url)` -- return nav groups with `isActive` flags set

---

## 13. Service Layer

29 service classes organized across 9 domains.

| Domain | Services | Purpose |
|---|---|---|
| **ChirpStack** | MqttListener, DeviceProvisioner | MQTT subscription, device registration via REST API |
| **Decoders** | DecoderFactory, MilesightDecoder | Payload normalization by sensor model |
| **Readings** | ReadingStorageService, ReadingQueryService, ChartDataService | Store to TimescaleDB + Redis; query with auto-resolution selection; chart data formatting |
| **RulesEngine** | RuleEvaluator, DefrostDetector, BaselineService | Alert condition evaluation, defrost cycle learning, normal pattern learning |
| **Alerts** | AlertRouter, EscalationService | Channel routing (WhatsApp/push/Reverb), escalation chain processing |
| **WhatsApp** | TwilioService | Twilio API integration for WhatsApp message delivery |
| **Reports** | MorningSummaryService, TemperatureReport, EnergyReport | Morning summaries (store/regional/corporate), COFEPRIS PDF, energy analysis PDF |
| **Billing** | SubscriptionService, InvoiceService, FacturapiService | Subscription management, invoice generation, CFDI stamping |
| **Analytics** | DoorPatternService, CompressorDutyCycleService | Door usage patterns, compressor degradation tracking |
| **WorkOrders** | WorkOrderService | Auto-create from triggers, lifecycle management |
| **Api** | WebhookDispatcher | Outbound webhook delivery |
| **Integrations** | SapExportService, ContpaqExportService | ERP/accounting data exports |
| **Files** | FileStorageService, FileValidationService, ImageOptimizationService, PdfService | Upload handling, validation, image optimization, PDF generation |

### ReadingQueryService Auto-Resolution

Automatically selects the optimal data source based on requested time range:

| Time Range | Data Source | Points per Sensor |
|---|---|---|
| Last 1h | Raw sensor_readings | Full detail |
| Last 24h | sensor_readings_15m | ~96 points |
| Last 7d | sensor_readings_1h | ~168 points |
| Last 30d | sensor_readings_1h | ~720 points |
| Last 1y | sensor_readings_1d | ~365 points |

### Redis Hot Cache

90% of dashboard queries hit Redis, not TimescaleDB:

```
On every new reading (ProcessSensorReading):
  HSET device:{device_id}:latest  metric value time timestamp
  EXPIRE device:{device_id}:latest 900  (15 min TTL)

Dashboard load:
  HGETALL device:{device_id}:latest  (< 1ms)

Device list page:
  MGET for all devices in site  (< 5ms for 30 sensors)
```
