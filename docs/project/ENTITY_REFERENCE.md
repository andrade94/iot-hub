# Entity Reference -- Astrea IoT Platform

> Tier 3 Model Reference. Generated from source code in `app/Models/` and `database/migrations/`.
> 40 models across 12 domains. Last updated: 2026-03-23 (Phase 1 re-census).

---

## Table of Contents

- [Core](#core)
  - [Organization](#organization)
  - [Site](#site)
  - [User](#user)
  - [user_sites (pivot)](#user_sites-pivot)
- [IoT Infrastructure](#iot-infrastructure)
  - [Module](#module)
  - [Recipe](#recipe)
  - [SiteModule](#sitemodule)
  - [FloorPlan](#floorplan)
  - [Gateway](#gateway)
  - [Device](#device)
  - [SensorReading](#sensorreading)
  - [SiteRecipeOverride](#siterecipeoverride)
- [Alert Engine](#alert-engine)
  - [AlertRule](#alertrule)
  - [Alert](#alert)
  - [EscalationChain](#escalationchain)
  - [AlertNotification](#alertnotification)
- [Operations](#operations)
  - [WorkOrder](#workorder)
  - [WorkOrderPhoto](#workorderphoto)
  - [WorkOrderNote](#workordernote)
  - [DefrostSchedule](#defrostschedule)
- [Billing](#billing)
  - [BillingProfile](#billingprofile)
  - [Subscription](#subscription)
  - [SubscriptionItem](#subscriptionitem)
  - [Invoice](#invoice)
- [Analytics](#analytics)
  - [DoorBaseline](#doorbaseline)
  - [CompressorBaseline](#compressorbaseline)
  - [IaqZoneScore](#iaqzonescore)
  - [TrafficSnapshot](#trafficsnapshot)
- [Compliance](#compliance)
  - [ComplianceEvent](#complianceevent)
  - [CorrectiveAction](#correctiveaction)
- [Data Quality](#data-quality)
  - [DeviceAnomaly](#deviceanomaly)
- [Operational](#operational)
  - [MaintenanceWindow](#maintenancewindow)
  - [OutageDeclaration](#outagedeclaration)
  - [ReportSchedule](#reportschedule)
  - [DataExport](#dataexport)
  - [SiteTemplate](#sitetemplate)
- [Integrations](#integrations)
  - [ApiKey](#apikey)
  - [WebhookSubscription](#webhooksubscription)
  - [IntegrationConfig](#integrationconfig)
- [Mobile / Push](#mobile--push)
  - [PushToken](#pushtoken)
- [System](#system)
  - [File](#file)
- [Entity Relationship Summary](#entity-relationship-summary)

---

## Core

### Organization

**Model**: `App\Models\Organization`
**Table**: `organizations`
**Traits**: `LogsActivity`, `SoftDeletes`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| name | string | no | -- | -- | |
| slug | string | no | -- | -- | unique |
| segment | string | no | -- | -- | |
| plan | string | no | `'starter'` | -- | |
| settings | json | yes | -- | `array` | |
| logo | string | yes | -- | -- | |
| branding | json | yes | -- | `array` | Added via separate migration |
| default_opening_hour | time | yes | -- | `datetime:H:i` | |
| default_timezone | string | no | `'America/Mexico_City'` | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |
| deleted_at | timestamp | yes | -- | -- | Soft delete |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `sites()` | hasMany | Site | `org_id` |
| `users()` | hasMany | User | `org_id` |
| `billingProfiles()` | hasMany | BillingProfile | `org_id` |
| `subscriptions()` | hasMany | Subscription | `org_id` |
| `invoices()` | hasMany | Invoice | `org_id` |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isSegment(string $segment)` | `bool` | Check if org belongs to a given segment |

#### Activity Logging

Logged fields: `name`, `segment`, `plan`, `settings`. Dirty-only, no empty logs.

---

### Site

**Model**: `App\Models\Site`
**Table**: `sites`
**Traits**: `LogsActivity`, `SoftDeletes`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| name | string | no | -- | -- | |
| address | string | yes | -- | -- | |
| lat | decimal(10,7) | yes | -- | `float` | |
| lng | decimal(10,7) | yes | -- | `float` | |
| timezone | string | yes | -- | -- | |
| opening_hour | time | yes | -- | `datetime:H:i` | |
| segment_override | string | yes | -- | -- | |
| install_date | date | yes | -- | `date` | |
| status | string | no | `'onboarding'` | -- | |
| floor_plan_count | integer | no | `0` | -- | Denormalized counter |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |
| deleted_at | timestamp | yes | -- | -- | Soft delete |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |
| `users()` | belongsToMany | User | pivot `user_sites` (role, assigned_at, assigned_by) |
| `gateways()` | hasMany | Gateway | `site_id` |
| `devices()` | hasMany | Device | `site_id` |
| `floorPlans()` | hasMany | FloorPlan | `site_id` |
| `modules()` | belongsToMany | Module | pivot `site_modules` (activated_at, config) |
| `siteModules()` | hasMany | SiteModule | `site_id` |
| `recipeOverrides()` | hasMany | SiteRecipeOverride | `site_id` |
| `alertRules()` | hasMany | AlertRule | `site_id` |
| `alerts()` | hasMany | Alert | `site_id` |
| `escalationChains()` | hasMany | EscalationChain | `site_id` |
| `workOrders()` | hasMany | WorkOrder | `site_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeActive` | `status = 'active'` |
| `scopeForOrganization(int $orgId)` | `org_id = $orgId` |

#### Activity Logging

Logged fields: `name`, `address`, `status`, `timezone`. Dirty-only, no empty logs.

---

### User

**Model**: `App\Models\User`
**Table**: `users`
**Traits**: `HasApiTokens`, `HasFactory`, `HasRoles`, `LogsActivity`, `Notifiable`, `TwoFactorAuthenticatable`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| name | string | no | -- | -- | |
| email | string | no | -- | -- | unique |
| email_verified_at | timestamp | yes | -- | `datetime` | |
| password | string | yes | -- | `hashed` | Nullable (set by Astrea org migration) |
| two_factor_secret | text | yes | -- | -- | hidden |
| two_factor_recovery_codes | text | yes | -- | -- | hidden |
| two_factor_confirmed_at | timestamp | yes | -- | `datetime` | |
| remember_token | string | yes | -- | -- | hidden |
| org_id | foreignId | yes | -- | -- | FK -> organizations, null on delete |
| phone | string | yes | -- | -- | |
| whatsapp_phone | string | yes | -- | -- | |
| has_app_access | boolean | no | `true` | `boolean` | |
| escalation_level | tinyInteger | yes | -- | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |
| `sites()` | belongsToMany | Site | pivot `user_sites` (role, assigned_at, assigned_by) |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `accessibleSites()` | `Collection` | All sites user can access -- super_admin gets all (scoped by session org), org_admin gets all org sites, others get pivot sites |
| `canAccessSite(int $siteId)` | `bool` | Authorization check for a single site |
| `isSuperAdmin()` | `bool` | Checks `super_admin` role via Spatie |
| `belongsToOrg(int $orgId)` | `bool` | Checks org_id match |

#### Activity Logging

Logged fields: `name`, `email`, `org_id`, `phone`. Dirty-only, no empty logs.

---

### user_sites (pivot)

**Table**: `user_sites`
**No dedicated model** -- accessed through `User::sites()` and `Site::users()` BelongsToMany relations.

#### Fields

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | bigint (PK) | no | auto | |
| user_id | foreignId | no | -- | FK -> users, cascade delete |
| site_id | foreignId | no | -- | FK -> sites, cascade delete |
| role | string | yes | -- | |
| assigned_at | timestamp | no | `CURRENT_TIMESTAMP` | |
| assigned_by | foreignId | yes | -- | FK -> users, null on delete |

**Unique constraint**: `(user_id, site_id)`

---

## IoT Infrastructure

### Module

**Model**: `App\Models\Module`
**Table**: `modules`
**Traits**: `HasFactory`, `LogsActivity`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| slug | string | no | -- | -- | unique |
| name | string | no | -- | -- | |
| description | text | yes | -- | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `recipes()` | hasMany | Recipe | `module_id` |
| `sites()` | belongsToMany | Site | pivot `site_modules` (activated_at, config) |

#### Activity Logging

Logged fields: `slug`, `name`, `description`. Dirty-only, no empty logs.

---

### Recipe

**Model**: `App\Models\Recipe`
**Table**: `recipes`
**Traits**: `HasFactory`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| module_id | foreignId | no | -- | -- | FK -> modules, cascade delete |
| sensor_model | string | no | -- | -- | |
| name | string | no | -- | -- | |
| default_rules | json | no | -- | `array` | |
| description | text | yes | -- | -- | |
| editable | boolean | no | `true` | `boolean` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `module()` | belongsTo | Module | `module_id` |
| `devices()` | hasMany | Device | `recipe_id` |
| `overrides()` | hasMany | SiteRecipeOverride | `recipe_id` |

---

### SiteModule

**Model**: `App\Models\SiteModule`
**Table**: `site_modules`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| module_id | foreignId | no | -- | -- | FK -> modules, cascade delete |
| activated_at | timestamp | yes | -- | `datetime` | |
| config | json | yes | -- | `array` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Unique constraint**: `(site_id, module_id)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `module()` | belongsTo | Module | `module_id` |

---

### FloorPlan

**Model**: `App\Models\FloorPlan`
**Table**: `floor_plans`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| name | string | no | -- | -- | |
| floor_number | integer | no | `1` | -- | |
| image_path | string | no | -- | -- | |
| width_px | integer | yes | -- | -- | |
| height_px | integer | yes | -- | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `devices()` | hasMany | Device | `floor_id` |

---

### Gateway

**Model**: `App\Models\Gateway`
**Table**: `gateways`
**Traits**: `HasFactory`, `LogsActivity`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| model | string | no | -- | -- | |
| serial | string | no | -- | -- | |
| chirpstack_id | string | yes | -- | -- | |
| last_seen_at | timestamp | yes | -- | `datetime` | |
| status | string | no | `'offline'` | -- | |
| is_addon | boolean | no | `false` | `boolean` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `devices()` | hasMany | Device | `gateway_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeOnline` | `last_seen_at >= now() - 15 min` |
| `scopeForSite(int $siteId)` | `site_id = $siteId` |

#### Activity Logging

Logged fields: `model`, `serial`, `status`, `is_addon`. Dirty-only, no empty logs.

---

### Device

**Model**: `App\Models\Device`
**Table**: `devices`
**Traits**: `HasFactory`, `LogsActivity`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| gateway_id | foreignId | yes | -- | -- | FK -> gateways, null on delete |
| model | string | no | -- | -- | |
| dev_eui | string | no | -- | -- | unique |
| app_key | text | yes | -- | `encrypted` | |
| name | string | no | -- | -- | |
| zone | string | yes | -- | -- | |
| floor_id | foreignId | yes | -- | -- | FK -> floor_plans, null on delete |
| floor_x | integer | yes | -- | -- | X coordinate on floor plan |
| floor_y | integer | yes | -- | -- | Y coordinate on floor plan |
| recipe_id | foreignId | yes | -- | -- | FK -> recipes, null on delete |
| installed_at | timestamp | yes | -- | `datetime` | |
| battery_pct | integer | yes | -- | -- | |
| rssi | integer | yes | -- | -- | |
| last_reading_at | timestamp | yes | -- | `datetime` | |
| status | string | no | `'pending'` | -- | |
| provisioned_at | timestamp | yes | -- | `datetime` | |
| provisioned_by | unsignedBigInteger | yes | -- | -- | FK -> users (not constrained) |
| replaced_device_id | unsignedBigInteger | yes | -- | -- | Self-referencing FK (not constrained) |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `gateway()` | belongsTo | Gateway | `gateway_id` |
| `recipe()` | belongsTo | Recipe | `recipe_id` |
| `floorPlan()` | belongsTo | FloorPlan | `floor_id` |
| `readings()` | hasMany | SensorReading | `device_id` |
| `replacedDevice()` | belongsTo | Device (self) | `replaced_device_id` |
| `alertRules()` | hasMany | AlertRule | `device_id` |
| `alerts()` | hasMany | Alert | `device_id` |
| `provisionedByUser()` | belongsTo | User | `provisioned_by` |
| `workOrders()` | hasMany | WorkOrder | `device_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeOnline` | `last_reading_at >= now() - 15 min` |
| `scopeOffline` | `last_reading_at IS NULL OR last_reading_at < now() - 15 min` |
| `scopeLowBattery` | `battery_pct IS NOT NULL AND battery_pct < 20` |
| `scopeForSite(int $siteId)` | `site_id = $siteId` |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isOnline()` | `bool` | True if last_reading_at within 15 minutes |

#### Activity Logging

Logged fields: `name`, `dev_eui`, `model`, `status`, `zone`, `gateway_id`, `recipe_id`. Dirty-only, no empty logs.

---

### SensorReading

**Model**: `App\Models\SensorReading`
**Table**: `sensor_readings`

> In production, designed as a TimescaleDB hypertable on the `time` column.

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| time | timestamp | no | -- | `datetime` | indexed |
| device_id | foreignId | no | -- | -- | FK -> devices, cascade delete |
| metric | string | no | -- | -- | |
| value | double | no | -- | `double` | |
| unit | string | yes | -- | -- | |
| created_at | timestamp | yes | -- | -- | `UPDATED_AT = null` -- no updated_at column |

**Composite index**: `(device_id, metric, time)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `device()` | belongsTo | Device | `device_id` |

---

### SiteRecipeOverride

**Model**: `App\Models\SiteRecipeOverride`
**Table**: `site_recipe_overrides`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| recipe_id | foreignId | no | -- | -- | FK -> recipes, cascade delete |
| overridden_rules | json | no | -- | `array` | |
| overridden_by | unsignedBigInteger | yes | -- | -- | FK -> users (not constrained) |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Unique constraint**: `(site_id, recipe_id)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `recipe()` | belongsTo | Recipe | `recipe_id` |
| `overriddenByUser()` | belongsTo | User | `overridden_by` |

---

## Alert Engine

### AlertRule

**Model**: `App\Models\AlertRule`
**Table**: `alert_rules`
**Traits**: `HasFactory`, `LogsActivity`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| device_id | foreignId | yes | -- | -- | FK -> devices, null on delete |
| name | string | no | -- | -- | |
| type | string | no | `'simple'` | -- | |
| conditions | json | no | -- | `array` | |
| severity | string | no | -- | -- | |
| cooldown_minutes | integer | no | `30` | -- | |
| active | boolean | no | `true` | `boolean` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `device()` | belongsTo | Device | `device_id` |
| `alerts()` | hasMany | Alert | `rule_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeActive` | `active = true` |
| `scopeForSite(int $siteId)` | `site_id = $siteId` |

#### Activity Logging

Logged fields: `name`, `type`, `severity`, `conditions`, `cooldown_minutes`, `active`. Dirty-only, no empty logs.

---

### Alert

**Model**: `App\Models\Alert`
**Table**: `alerts`
**Traits**: `HasFactory`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| rule_id | foreignId | yes | -- | -- | FK -> alert_rules, null on delete |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| device_id | foreignId | yes | -- | -- | FK -> devices, null on delete |
| severity | string | no | -- | -- | |
| status | string | no | `'active'` | -- | |
| triggered_at | timestamp | no | -- | `datetime` | |
| acknowledged_at | timestamp | yes | -- | `datetime` | |
| resolved_at | timestamp | yes | -- | `datetime` | |
| resolved_by | unsignedBigInteger | yes | -- | -- | FK -> users (not constrained) |
| resolution_type | string | yes | -- | -- | |
| data | json | yes | -- | `array` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `rule()` | belongsTo | AlertRule | `rule_id` |
| `site()` | belongsTo | Site | `site_id` |
| `device()` | belongsTo | Device | `device_id` |
| `resolvedByUser()` | belongsTo | User | `resolved_by` |
| `notifications()` | hasMany | AlertNotification | `alert_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeActive` | `status = 'active'` |
| `scopeUnresolved` | `status IN ('active', 'acknowledged')` |
| `scopeForSite(int $siteId)` | `site_id = $siteId` |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `acknowledge(int $userId)` | `self` | Sets status to `acknowledged`, stamps `acknowledged_at` |
| `resolve(?int $userId, string $type = 'manual')` | `self` | Sets status to `resolved`, stamps `resolved_at` |
| `dismiss(int $userId)` | `self` | Sets status to `dismissed` with `resolution_type = 'dismissed'` |

---

### EscalationChain

**Model**: `App\Models\EscalationChain`
**Table**: `escalation_chains`
**Traits**: `HasFactory`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| level | integer | no | -- | -- | |
| user_id | foreignId | no | -- | -- | FK -> users, cascade delete |
| delay_minutes | integer | no | `5` | -- | |
| channel | string | no | `'push'` | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Unique constraint**: `(site_id, level)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `user()` | belongsTo | User | `user_id` |

---

### AlertNotification

**Model**: `App\Models\AlertNotification`
**Table**: `alert_notifications`
**Traits**: `HasFactory`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| alert_id | foreignId | no | -- | -- | FK -> alerts, cascade delete |
| user_id | foreignId | no | -- | -- | FK -> users, cascade delete |
| channel | string | no | -- | -- | |
| status | string | no | `'sent'` | -- | |
| sent_at | timestamp | yes | -- | `datetime` | |
| delivered_at | timestamp | yes | -- | `datetime` | |
| error | text | yes | -- | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `alert()` | belongsTo | Alert | `alert_id` |
| `user()` | belongsTo | User | `user_id` |

---

## Operations

### WorkOrder

**Model**: `App\Models\WorkOrder`
**Table**: `work_orders`
**Traits**: `LogsActivity`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| alert_id | foreignId | yes | -- | -- | FK -> alerts, null on delete |
| device_id | foreignId | yes | -- | -- | FK -> devices, null on delete |
| type | string | no | -- | -- | `battery_replace\|sensor_replace\|maintenance\|inspection\|install` |
| title | string | no | -- | -- | |
| description | text | yes | -- | -- | |
| status | string | no | `'open'` | -- | `open\|assigned\|in_progress\|completed\|cancelled` |
| priority | string | no | `'medium'` | -- | `low\|medium\|high\|urgent` |
| assigned_to | unsignedBigInteger | yes | -- | `integer` | FK -> users (not constrained) |
| created_by | unsignedBigInteger | yes | -- | `integer` | FK -> users (not constrained) |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `alert()` | belongsTo | Alert | `alert_id` |
| `device()` | belongsTo | Device | `device_id` |
| `assignedTo()` | belongsTo | User | `assigned_to` |
| `createdBy()` | belongsTo | User | `created_by` |
| `photos()` | hasMany | WorkOrderPhoto | `work_order_id` |
| `notes()` | hasMany | WorkOrderNote | `work_order_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeOpen` | `status = 'open'` |
| `scopeForSite(int $siteId)` | `site_id = $siteId` |
| `scopeAssignedTo(int $userId)` | `assigned_to = $userId` |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `assign(int $userId)` | `self` | Sets `assigned_to` and status to `assigned` |
| `start()` | `self` | Sets status to `in_progress` |
| `complete()` | `self` | Sets status to `completed` |
| `cancel()` | `self` | Sets status to `cancelled` |

#### Activity Logging

Logged fields: `title`, `status`, `priority`, `type`, `assigned_to`. Dirty-only, no empty logs.

---

### WorkOrderPhoto

**Model**: `App\Models\WorkOrderPhoto`
**Table**: `work_order_photos`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| work_order_id | foreignId | no | -- | -- | FK -> work_orders, cascade delete |
| photo_path | string | no | -- | -- | |
| caption | string | yes | -- | -- | |
| uploaded_by | unsignedBigInteger | yes | -- | -- | FK -> users (not constrained) |
| uploaded_at | timestamp | yes | -- | `datetime` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `workOrder()` | belongsTo | WorkOrder | `work_order_id` |
| `uploadedByUser()` | belongsTo | User | `uploaded_by` |

---

### WorkOrderNote

**Model**: `App\Models\WorkOrderNote`
**Table**: `work_order_notes`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| work_order_id | foreignId | no | -- | -- | FK -> work_orders, cascade delete |
| user_id | foreignId | no | -- | -- | FK -> users, cascade delete |
| note | text | no | -- | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `workOrder()` | belongsTo | WorkOrder | `work_order_id` |
| `user()` | belongsTo | User | `user_id` |

---

### DefrostSchedule

**Model**: `App\Models\DefrostSchedule`
**Table**: `defrost_schedules`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| device_id | foreignId | no | -- | -- | FK -> devices, cascade delete |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| status | string | no | `'learning'` | -- | `learning\|detected\|confirmed\|manual` |
| windows | json | yes | -- | `array` | |
| detected_at | timestamp | yes | -- | `datetime` | |
| confirmed_by | unsignedBigInteger | yes | -- | -- | FK -> users (not constrained) |
| confirmed_at | timestamp | yes | -- | `datetime` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `device()` | belongsTo | Device | `device_id` |
| `site()` | belongsTo | Site | `site_id` |
| `confirmedByUser()` | belongsTo | User | `confirmed_by` |

---

## Billing

### BillingProfile

**Model**: `App\Models\BillingProfile`
**Table**: `billing_profiles`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| name | string | no | -- | -- | |
| rfc | string | no | -- | -- | Mexican tax ID |
| razon_social | string | no | -- | -- | Legal business name |
| regimen_fiscal | string | yes | -- | -- | Tax regime |
| direccion_fiscal | json | yes | -- | `array` | Fiscal address |
| uso_cfdi | string | yes | -- | -- | CFDI usage code |
| email_facturacion | string | yes | -- | -- | Billing email |
| is_default | boolean | no | `false` | `boolean` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |
| `subscriptions()` | hasMany | Subscription | `billing_profile_id` |
| `invoices()` | hasMany | Invoice | `billing_profile_id` |

---

### Subscription

**Model**: `App\Models\Subscription`
**Table**: `subscriptions`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| billing_profile_id | foreignId | yes | -- | -- | FK -> billing_profiles, null on delete |
| base_fee | decimal(10,2) | no | `500` | `decimal:2` | |
| discount_pct | decimal(5,2) | no | `0` | `decimal:2` | |
| status | string | no | `'active'` | -- | `active\|paused\|cancelled` |
| started_at | timestamp | yes | -- | `datetime` | |
| contract_type | string | no | `'monthly'` | -- | `monthly\|annual` |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |
| `billingProfile()` | belongsTo | BillingProfile | `billing_profile_id` |
| `items()` | hasMany | SubscriptionItem | `subscription_id` |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `calculateMonthlyTotal()` | `float` | `base_fee * (1 - discount_pct/100) + SUM(items.monthly_fee)` |

---

### SubscriptionItem

**Model**: `App\Models\SubscriptionItem`
**Table**: `subscription_items`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| subscription_id | foreignId | no | -- | -- | FK -> subscriptions, cascade delete |
| device_id | foreignId | yes | -- | -- | FK -> devices, null on delete |
| sensor_model | string | no | -- | -- | |
| monthly_fee | decimal(10,2) | no | -- | `decimal:2` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `subscription()` | belongsTo | Subscription | `subscription_id` |
| `device()` | belongsTo | Device | `device_id` |

---

### Invoice

**Model**: `App\Models\Invoice`
**Table**: `invoices`
**Traits**: `LogsActivity`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| billing_profile_id | foreignId | yes | -- | -- | FK -> billing_profiles, null on delete |
| period | string | no | -- | -- | |
| subtotal | decimal(12,2) | no | -- | `decimal:2` | |
| iva | decimal(12,2) | no | -- | `decimal:2` | |
| total | decimal(12,2) | no | -- | `decimal:2` | |
| status | string | no | `'draft'` | -- | `draft\|sent\|paid\|overdue` |
| cfdi_uuid | string | yes | -- | -- | |
| pdf_path | string | yes | -- | -- | |
| xml_path | string | yes | -- | -- | |
| paid_at | timestamp | yes | -- | `datetime` | |
| payment_method | string | yes | -- | -- | `spei\|transfer` |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |
| `billingProfile()` | belongsTo | BillingProfile | `billing_profile_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeDraft` | `status = 'draft'` |
| `scopeOverdue` | `status = 'overdue'` |
| `scopeForOrg(int $orgId)` | `org_id = $orgId` |

#### Activity Logging

Logged fields: `status`, `cfdi_uuid`, `paid_at`, `payment_method`. Dirty-only, no empty logs.

---

## Analytics

### DoorBaseline

**Model**: `App\Models\DoorBaseline`
**Table**: `door_baselines`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| device_id | foreignId | no | -- | -- | FK -> devices, cascade delete |
| day_of_week | tinyInteger | no | -- | `integer` | 0-6 |
| hour | tinyInteger | no | -- | `integer` | 0-23 |
| avg_opens | double | no | `0` | `double` | |
| avg_duration | double | no | `0` | `double` | |
| std_dev_opens | double | no | `0` | `double` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Unique constraint**: `(device_id, day_of_week, hour)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `device()` | belongsTo | Device | `device_id` |

---

### CompressorBaseline

**Model**: `App\Models\CompressorBaseline`
**Table**: `compressor_baselines`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| device_id | foreignId | no | -- | -- | FK -> devices, cascade delete |
| date | date | no | -- | `date` | |
| duty_cycle_pct | double | no | -- | `double` | |
| on_count | integer | no | `0` | `integer` | |
| avg_on_duration | double | no | `0` | `double` | |
| avg_off_duration | double | no | `0` | `double` | |
| degradation_score | double | no | `0` | `double` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Unique constraint**: `(device_id, date)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `device()` | belongsTo | Device | `device_id` |

---

### IaqZoneScore

**Model**: `App\Models\IaqZoneScore`
**Table**: `iaq_zone_scores`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| zone | string | no | -- | -- | |
| date | date | no | -- | `date` | |
| avg_co2 | double | yes | -- | `double` | |
| avg_temp | double | yes | -- | `double` | |
| avg_humidity | double | yes | -- | `double` | |
| avg_tvoc | double | yes | -- | `double` | |
| comfort_score | double | yes | -- | `double` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Unique constraint**: `(site_id, zone, date)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |

---

### TrafficSnapshot

**Model**: `App\Models\TrafficSnapshot`
**Table**: `traffic_snapshots`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| zone | string | yes | -- | -- | |
| date | date | no | -- | `date` | |
| hour | tinyInteger | no | -- | `integer` | |
| occupancy_avg | double | no | `0` | `double` | |
| occupancy_peak | integer | no | `0` | `integer` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Composite index**: `(site_id, date, hour)`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |

---

## Compliance

### ComplianceEvent

**Model**: `App\Models\ComplianceEvent`
**Table**: `compliance_events`
**Migration**: `2026_03_17_000003_create_compliance_events_table.php`
**Traits**: `HasFactory`

**Purpose**: Tracks regulatory compliance events such as COFEPRIS audits, certificate renewals, equipment calibrations, inspections, and permit renewals. Used by the compliance calendar UI and email reminder commands.

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| type | string | no | -- | -- | cofepris_audit, certificate_renewal, calibration, inspection, permit_renewal |
| title | string | no | -- | -- | |
| description | text | yes | -- | -- | |
| due_date | date | no | -- | `date` | |
| status | string | no | `'upcoming'` | -- | upcoming, overdue, completed, cancelled |
| completed_at | date | yes | -- | `date` | |
| completed_by | string | yes | -- | -- | |
| reminders_sent | json | yes | -- | `array` | Tracks which reminders (30d, 7d, 1d) were sent |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `organization()` | belongsTo | Organization | `org_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeUpcoming` | `status = 'upcoming'` |
| `scopeOverdue` | `status = 'overdue'` |
| `scopeForSite` | `site_id = ?` |
| `scopeForOrg` | `org_id = ?` |

---

### CorrectiveAction

**Model**: `App\Models\CorrectiveAction`
**Table**: `corrective_actions`
**Migration**: `2026_03_20_000003_create_corrective_actions_table.php`
**Traits**: `LogsActivity`
**Added**: Phase 10 Sprint 1

**Purpose**: Tracks corrective actions taken in response to temperature excursions or critical/high alerts. Required for COFEPRIS compliance (NOM-251). Two-state lifecycle: logged → verified (SM-011). Verification must be by a different user than who logged the action (BR-057).

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| alert_id | foreignId | no | -- | -- | FK -> alerts, cascade delete |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| action_taken | text | no | -- | -- | min:10, max:2000 |
| notes | text | yes | -- | -- | max:1000 |
| status | string | no | `'logged'` | -- | logged, verified (SM-011) |
| taken_by | foreignId | no | -- | -- | FK -> users, cascade delete |
| taken_at | timestamp | no | -- | `datetime` | |
| verified_by | unsignedBigInteger | yes | -- | -- | FK -> users, null on delete |
| verified_at | timestamp | yes | -- | `datetime` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `alert()` | belongsTo | Alert | `alert_id` |
| `site()` | belongsTo | Site | `site_id` |
| `takenByUser()` | belongsTo | User | `taken_by` |
| `verifiedByUser()` | belongsTo | User | `verified_by` |

#### Methods

| Method | Description |
|--------|-------------|
| `verify(int $userId)` | Transitions status logged→verified. Guards: must be different user, must be 'logged' status. |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopeForAlert` | `alert_id = ?` |
| `scopePendingVerification` | `status = 'logged'` |

---

## Data Quality

### DeviceAnomaly

**Model**: `App\Models\DeviceAnomaly`
**Table**: `device_anomalies`
**Migration**: `2026_03_20_000002_create_device_anomalies_table.php`
**Added**: Phase 10 Sprint 1

**Purpose**: Logs sensor readings that fail sanity checks (physically impossible values outside manufacturer-rated ranges). Used by SanityCheckService to track anomalies and trigger hardware failure alerts after 5+ anomalies per device per hour (BR-088).

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| device_id | foreignId | no | -- | -- | FK -> devices, cascade delete |
| metric | string | no | -- | -- | e.g., temperature, humidity, co2 |
| value | double | no | -- | `float` | The invalid reading value |
| valid_min | double | no | -- | `float` | Expected minimum for this model+metric |
| valid_max | double | no | -- | `float` | Expected maximum for this model+metric |
| unit | string | yes | -- | -- | °C, %, ppm, etc. |
| recorded_at | timestamp | no | -- | `datetime` | When the invalid reading was received |
| created_at | timestamp | yes | -- | `datetime` | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `device()` | belongsTo | Device | `device_id` |

---

## Operational

### MaintenanceWindow

**Model**: `App\Models\MaintenanceWindow`
**Table**: `maintenance_windows`
**Migration**: `2026_03_20_100001_create_maintenance_windows_table.php`
**Traits**: `LogsActivity`
**Added**: Phase 10 Sprint 2

**Purpose**: Scheduled downtime periods per site/zone that suppress alert evaluation during planned maintenance (BR-073). Supports recurrence patterns: once, daily, weekly, monthly. Used by RuleEvaluator to skip evaluation during active windows.

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| site_id | foreignId | no | -- | -- | FK -> sites, cascade delete |
| zone | string | yes | -- | -- | null = entire site |
| title | string | no | -- | -- | e.g., "Walk-in cooler cleaning" |
| recurrence | string | no | `'once'` | -- | once, daily, weekly, monthly |
| day_of_week | tinyint | yes | -- | `integer` | 0=Sun..6=Sat (for weekly) |
| start_time | time | no | -- | `string` | H:i format |
| duration_minutes | smallint | no | 60 | `integer` | 15-480 range |
| suppress_alerts | boolean | no | true | `boolean` | Toggle suppression |
| created_by | foreignId | no | -- | -- | FK -> users, cascade delete |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `site()` | belongsTo | Site | `site_id` |
| `createdByUser()` | belongsTo | User | `created_by` |

#### Key Methods

| Method | Description |
|--------|-------------|
| `isActiveNow(?timezone)` | Checks if window is currently active (time + recurrence + suppress flag) |
| `isActiveForZone(siteId, zone, ?tz)` | Static: any active window for site+zone? Called from RuleEvaluator |

---

### OutageDeclaration

**Model**: `App\Models\OutageDeclaration`
**Table**: `outage_declarations`
**Migration**: `2026_03_20_100002_create_outage_declarations_table.php`
**Added**: Phase 10 Sprint 2

**Purpose**: Platform-wide upstream outage tracking (SM-013). When declared by super_admin, suppresses ALL alert evaluation and work order creation platform-wide (BR-080). Shared globally via HandleInertiaRequests for dashboard banner display.

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| reason | text | no | -- | -- | min:5, max:500 |
| affected_services | json | no | -- | `array` | chirpstack, twilio, mqtt, redis, database, other |
| status | string | no | `'active'` | -- | active, resolved (SM-013) |
| declared_by | foreignId | no | -- | -- | FK -> users |
| declared_at | timestamp | no | -- | `datetime` | |
| resolved_by | unsignedBigInteger | yes | -- | -- | FK -> users, null on delete |
| resolved_at | timestamp | yes | -- | `datetime` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `declaredByUser()` | belongsTo | User | `declared_by` |
| `resolvedByUser()` | belongsTo | User | `resolved_by` |

#### Key Methods

| Method | Description |
|--------|-------------|
| `resolve(userId)` | Transitions active→resolved. Sets resolved_by + resolved_at. |
| `isActive()` | Static: any active outage exists? First check in RuleEvaluator + CheckDeviceHealth. |
| `current()` | Static: get the active outage record (for banner display). |

---

### ReportSchedule

**Model**: `App\Models\ReportSchedule`
**Table**: `report_schedules`
**Migration**: `2026_03_20_200002_create_report_schedules_table.php`
**Added**: Phase 10 Sprint 3

**Purpose**: Automated report delivery schedules. Types: temperature_compliance, energy_summary, alert_summary, executive_overview. Frequencies: daily, weekly, monthly. Processed by `SendScheduledReports` job (daily at 06:00).

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations |
| site_id | foreignId | yes | -- | -- | FK -> sites (null = org-wide) |
| type | string | no | -- | -- | temperature_compliance, energy_summary, alert_summary, executive_overview |
| frequency | string | no | -- | -- | daily, weekly, monthly |
| day_of_week | tinyint | yes | -- | `integer` | 0-6 (for weekly) |
| time | time | no | 08:00 | -- | |
| recipients_json | json | no | -- | `array` | Array of email addresses |
| active | boolean | no | true | `boolean` | |
| created_by | foreignId | no | -- | -- | FK -> users |

---

### DataExport

**Model**: `App\Models\DataExport`
**Table**: `data_exports`
**Migration**: `2026_03_20_200003_create_data_exports_table.php`
**Added**: Phase 10 Sprint 3

**Purpose**: LFPDPPP data portability. Async ZIP export of org data (readings, alerts, users). SM-012: queued → processing → completed/failed → expired (48h).

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations |
| status | string | no | queued | -- | SM-012: queued, processing, completed, failed, expired |
| date_from | date | yes | -- | `date` | |
| date_to | date | yes | -- | `date` | |
| file_path | string | yes | -- | -- | Path in storage |
| file_size | bigint | yes | -- | `integer` | Bytes |
| attempts | tinyint | no | 0 | `integer` | Max 3 |
| error | text | yes | -- | -- | Failure reason |
| completed_at | timestamp | yes | -- | `datetime` | |
| expires_at | timestamp | yes | -- | `datetime` | 48h after completion |
| requested_by | foreignId | no | -- | -- | FK -> users |

#### Key Methods

| Method | Description |
|--------|-------------|
| `markProcessing()` | queued → processing, increments attempts |
| `markCompleted(path, size)` | processing → completed, sets expires_at=+48h |
| `markFailed(error)` | processing → failed |
| `canTransitionTo(status)` | SM-012 guard |

---

### SiteTemplate

**Model**: `App\Models\SiteTemplate`
**Table**: `site_templates`
**Migration**: `2026_03_20_200004_create_site_templates_table.php`
**Added**: Phase 10 Sprint 3

**Purpose**: Reusable site configurations for rapid onboarding at scale. Captures modules, zones, recipes, escalation structure from a "golden" source site. Applied via `SiteTemplateService::applyToSite()`.

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations |
| name | string | no | -- | -- | Unique per org |
| description | text | yes | -- | -- | |
| modules | json | no | -- | `array` | Module slugs |
| zone_config | json | yes | -- | `array` | [{name}] |
| recipe_assignments | json | yes | -- | `array` | [{zone, recipe_id}] |
| escalation_structure | json | yes | -- | `array` | Escalation chain levels |
| created_by | foreignId | no | -- | -- | FK -> users |

---

## Integrations

### ApiKey

**Model**: `App\Models\ApiKey`
**Table**: `api_keys`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| name | string | no | -- | -- | |
| key_hash | string | no | -- | -- | unique; stores hashed key |
| permissions | json | yes | -- | `array` | |
| rate_limit | integer | no | `60` | -- | Requests per minute |
| last_used_at | timestamp | yes | -- | `datetime` | |
| active | boolean | no | `true` | `boolean` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |

---

### WebhookSubscription

**Model**: `App\Models\WebhookSubscription`
**Table**: `webhook_subscriptions`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| url | string | no | -- | -- | |
| events | json | no | -- | `array` | |
| secret | string | no | -- | -- | |
| active | boolean | no | `true` | `boolean` | |
| last_triggered_at | timestamp | yes | -- | `datetime` | |
| failure_count | integer | no | `0` | -- | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |

---

### IntegrationConfig

**Model**: `App\Models\IntegrationConfig`
**Table**: `integration_configs`

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | bigint (PK) | no | auto | -- | |
| org_id | foreignId | no | -- | -- | FK -> organizations, cascade delete |
| type | string | no | -- | -- | `sap\|contpaq` |
| config | json | yes | -- | `encrypted:array` | Encrypted at model level |
| schedule_cron | string | yes | -- | -- | |
| last_export_at | timestamp | yes | -- | `datetime` | |
| active | boolean | no | `true` | `boolean` | |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `organization()` | belongsTo | Organization | `org_id` |

---

## Mobile / Push

### PushToken

**Model**: `App\Models\PushToken`

**Migration**: `2026_03_16_000001_create_push_tokens_table.php`

**Purpose**: Stores Expo push tokens for mobile app users. Each user can have multiple tokens (one per device). Used by `PushNotificationService` to deliver push notifications for alerts, work order events, and morning summaries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | bigint | PK, auto-increment | |
| `user_id` | bigint | FK -> users, cascade delete | Owner of the push token |
| `token` | string | unique | Expo push token (e.g., `ExponentPushToken[...]`) |
| `device_name` | string | nullable | Human-readable device identifier |
| `platform` | string | | `'ios'` or `'android'` |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Fillable**: `user_id`, `token`, `device_name`, `platform`

**Relationships**:

| Method | Type | Target | FK |
|--------|------|--------|-----|
| `user()` | belongsTo | User | `user_id` |

**API Endpoints**: `POST /api/push-tokens` (register), `DELETE /api/push-tokens/{token}` (unregister)

---

## System

### File

**Model**: `App\Models\File`
**Table**: `files`
**Traits**: `HasUuids`, `HasFactory`
**Primary Key**: UUID

#### Fields

| Column | Type | Nullable | Default | Cast | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid (PK) | no | auto-generated | -- | |
| user_id | foreignId | yes | -- | -- | FK -> users, null on delete |
| original_name | string | no | -- | -- | |
| filename | string | no | -- | -- | |
| path | string | no | -- | -- | |
| disk | string | no | `'public'` | -- | |
| mime_type | string | no | -- | -- | |
| size | unsignedBigInteger | no | -- | `integer` | |
| extension | string(10) | no | -- | -- | |
| visibility | enum(`public`,`private`) | no | `'public'` | -- | |
| thumbnail_path | string | yes | -- | -- | |
| metadata | json | yes | -- | `array` | |
| fileable_type | string | yes | -- | -- | Polymorphic type |
| fileable_id | string | yes | -- | -- | Polymorphic ID |
| created_at | timestamp | yes | -- | -- | |
| updated_at | timestamp | yes | -- | -- | |

**Indexes**: `(fileable_type, fileable_id)`, `visibility`, `disk`

#### Relations

| Method | Type | Related Model | FK / Pivot |
|--------|------|---------------|------------|
| `user()` | belongsTo | User | `user_id` |
| `fileable()` | morphTo | (polymorphic) | `fileable_type` + `fileable_id` |

#### Scopes

| Scope | Filter |
|-------|--------|
| `scopePublic` | `visibility = 'public'` |
| `scopePrivate` | `visibility = 'private'` |
| `scopeImages` | `mime_type LIKE 'image/%'` |
| `scopeDocuments` | `mime_type IN (pdf, docx, xlsx, txt, csv)` |
| `scopeOrphaned` | `fileable_type IS NULL AND fileable_id IS NULL` |

#### Key Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getUrlAttribute()` | `string` | Public URL or signed URL for private files (appended attribute) |
| `getThumbnailUrlAttribute()` | `?string` | Thumbnail URL if available (appended attribute) |
| `getFormattedSizeAttribute()` | `string` | Human-readable size like "1.5 MB" (appended attribute) |
| `getSignedUrl(?path, ?expiration)` | `string` | S3 temporaryUrl or local route |
| `isImage()` | `bool` | Check mime_type starts with `image/` |
| `isPdf()` | `bool` | Check for `application/pdf` |
| `isDocument()` | `bool` | Check for PDF, Word, Excel, TXT, CSV |
| `hasThumbnail()` | `bool` | Check if thumbnail_path is set |
| `getContents()` | `string` | Read file contents from storage |
| `deleteFromStorage()` | `bool` | Delete file + thumbnail from disk |

**Boot behavior**: On model `deleting` event, calls `deleteFromStorage()` automatically.

---

## Entity Relationship Summary

### Core hierarchy

```
Organization -< Site
Organization -< User
Site >-< User           (pivot: user_sites, with role/assigned_at/assigned_by)
```

### IoT device tree

```
Organization -< Site -< Gateway -< Device -< SensorReading
                  |                   |
                  |                   +--< AlertRule
                  |                   +--< Alert
                  |                   +--< WorkOrder
                  |                   +--< DoorBaseline
                  |                   +--< CompressorBaseline
                  |                   +--< DefrostSchedule
                  |                   +--< SubscriptionItem
                  |                   +--- Recipe (belongsTo)
                  |                   +--- FloorPlan (belongsTo, via floor_id)
                  |                   +--- Device (self-ref, via replaced_device_id)
                  |
                  +--< FloorPlan -< Device (via floor_id)
                  +--< AlertRule -< Alert -< AlertNotification
                  +--< EscalationChain
                  +--< WorkOrder -< WorkOrderPhoto
                  |              -< WorkOrderNote
                  +--< DefrostSchedule
                  +--< IaqZoneScore
                  +--< TrafficSnapshot
                  +--< ComplianceEvent
```

### Module / Recipe system

```
Module -< Recipe -< Device (assigned recipe)
  |          +--< SiteRecipeOverride
  |
  +->< Site  (pivot: site_modules, with activated_at/config)
```

### Alert engine flow

```
AlertRule -< Alert -< AlertNotification -> User
    |           +--- Device (belongsTo)
    |           +--- Site (belongsTo)
    |           +--- User (resolvedBy)
    +--- Device (belongsTo, nullable)
    +--- Site (belongsTo)

Site -< EscalationChain -> User (per-level notification chain)
```

### Billing chain

```
Organization -< BillingProfile -< Subscription -< SubscriptionItem -> Device
                       |
                       +-< Invoice
Organization -< Subscription
Organization -< Invoice
```

### Compliance (org + site scoped)

```
Organization -< ComplianceEvent
Site -< ComplianceEvent
```

### Integrations (all org-scoped)

```
Organization -< ApiKey
Organization -< WebhookSubscription
Organization -< IntegrationConfig
```

### Mobile / Push

```
User -< PushToken (Expo push tokens, one per device)
```

### File system (polymorphic)

```
User -< File --morphTo--> (any fileable model)
```

---

## Activity Logging Summary

Models using `Spatie\Activitylog\Traits\LogsActivity`:

| Model | Logged Fields |
|-------|---------------|
| Organization | name, segment, plan, settings |
| Site | name, address, status, timezone |
| User | name, email, org_id, phone |
| Module | slug, name, description |
| Gateway | model, serial, status, is_addon |
| Device | name, dev_eui, model, status, zone, gateway_id, recipe_id |
| AlertRule | name, type, severity, conditions, cooldown_minutes, active |
| WorkOrder | title, status, priority, type, assigned_to |
| Invoice | status, cfdi_uuid, paid_at, payment_method |

All use `logOnlyDirty()` and `dontSubmitEmptyLogs()`.
