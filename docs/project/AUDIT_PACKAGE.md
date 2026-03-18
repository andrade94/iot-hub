# Astrea IoT Platform -- Audit Package (Tier 3 Inventory)

Generated: 2026-03-18
Codebase: `iot-hub` (Laravel 12 + React 19 + Inertia.js 2)

---

## 1. Route Inventory

Total routes: **173** (139 web + 24 API + 10 Fortify/auth implicit)

### 1a. Public Routes

| Method | URI | Name | Controller/Action | Middleware |
|--------|-----|------|-------------------|------------|
| GET | `/` | `home` | Closure (Inertia `welcome`) | -- |
| POST | `/locale` | `locale.update` | `LocaleController@update` | -- |
| POST | `/api/whatsapp/webhook` | -- | `WhatsAppWebhookController@__invoke` | -- |

### 1b. Auth Routes (Fortify-managed)

| Method | URI | Name | Controller/Action | Middleware |
|--------|-----|------|-------------------|------------|
| GET | `/login` | `login` | Fortify (Inertia `auth/login`) | `guest` |
| POST | `/login` | -- | Fortify | `guest` |
| POST | `/logout` | `logout` | Fortify | `auth` |
| GET | `/register` | `register` | Fortify (Inertia `auth/register`) | `guest` |
| POST | `/register` | -- | Fortify | `guest` |
| GET | `/forgot-password` | `password.request` | Fortify (Inertia `auth/forgot-password`) | `guest` |
| POST | `/forgot-password` | `password.email` | Fortify | `guest` |
| GET | `/reset-password/{token}` | `password.reset` | Fortify (Inertia `auth/reset-password`) | `guest` |
| POST | `/reset-password` | `password.update` | Fortify | `guest` |
| GET | `/email/verify` | `verification.notice` | Fortify (Inertia `auth/verify-email`) | `auth` |
| GET | `/email/verify/{id}/{hash}` | `verification.verify` | Fortify | `auth`, `signed` |
| POST | `/email/verification-notification` | `verification.send` | Fortify | `auth`, `throttle:6,1` |
| GET | `/user/confirm-password` | `password.confirm` | Fortify (Inertia `auth/confirm-password`) | `auth` |
| POST | `/user/confirm-password` | -- | Fortify | `auth` |
| GET | `/two-factor-challenge` | `two-factor.login` | Fortify (Inertia `auth/two-factor-challenge`) | `guest` |
| POST | `/two-factor-challenge` | -- | Fortify | `guest` |

### 1c. Settings Routes (auth required)

| Method | URI | Name | Controller/Action | Middleware |
|--------|-----|------|-------------------|------------|
| GET | `/settings` | -- | Redirect to `/settings/profile` | `auth` |
| GET | `/settings/profile` | `profile.edit` | `Settings\ProfileController@edit` | `auth` |
| PATCH | `/settings/profile` | `profile.update` | `Settings\ProfileController@update` | `auth` |
| DELETE | `/settings/profile` | `profile.destroy` | `Settings\ProfileController@destroy` | `auth` |
| GET | `/settings/password` | `user-password.edit` | `Settings\PasswordController@edit` | `auth` |
| PUT | `/settings/password` | `user-password.update` | `Settings\PasswordController@update` | `auth`, `throttle:6,1` |
| GET | `/settings/appearance` | `appearance.edit` | Closure (Inertia `settings/appearance`) | `auth` |
| GET | `/settings/two-factor` | `two-factor.show` | `Settings\TwoFactorAuthenticationController@show` | `auth` |
| GET | `/settings/organization` | `organization.edit` | `OrganizationSettingsController@edit` | `auth`, `verified`, `org.scope`, `permission:manage org settings` |
| PATCH | `/settings/organization` | `organization.update` | `OrganizationSettingsController@update` | `auth`, `verified`, `org.scope`, `permission:manage org settings` |

### 1d. Authenticated App Routes (auth + verified + org.scope)

| Method | URI | Name | Controller/Action | Extra Middleware |
|--------|-----|------|-------------------|-----------------|
| GET | `/dashboard` | `dashboard` | Closure (Inertia `dashboard`) | -- |
| POST | `/site/switch` | `site.switch` | Closure | -- |
| GET | `/activity-log` | `activity-log` | `ActivityLogController@index` | `permission:view activity log` |
| GET | `/activity-log/user/{userId}` | `activity-log.user` | `ActivityLogController@userActivity` | `permission:view activity log` |
| GET | `/activity-log/{model}/{id}` | `activity-log.model` | `ActivityLogController@modelActivity` | `permission:view activity log` |
| POST | `/upload` | `upload` | `FileUploadController@upload` | `throttle:20,1` |
| POST | `/upload/multiple` | `upload.multiple` | `FileUploadController@uploadMultiple` | `throttle:10,1` |
| GET | `/upload/allowed-types` | `upload.allowed-types` | `FileUploadController@allowedTypes` | -- |
| DELETE | `/upload/{path}` | `upload.delete` | `FileUploadController@delete` | -- |
| GET | `/files/{file}` | `files.show` | `FileController@show` | -- |
| GET | `/files/{file}/serve` | `files.serve` | `FileController@serve` | -- |
| GET | `/files/{file}/download` | `files.download` | `FileController@download` | -- |
| DELETE | `/files/{file}` | `files.destroy` | `FileController@destroy` | -- |
| PATCH | `/files/{file}/visibility` | `files.visibility` | `FileUploadController@updateVisibility` | -- |
| GET | `/notifications` | `notifications` | `NotificationController@index` | -- |
| GET | `/notifications/unread-count` | `notifications.unread-count` | `NotificationController@unreadCount` | -- |
| POST | `/notifications/{id}/mark-as-read` | `notifications.mark-as-read` | `NotificationController@markAsRead` | -- |
| POST | `/notifications/mark-all-as-read` | `notifications.mark-all-as-read` | `NotificationController@markAllAsRead` | -- |
| DELETE | `/notifications/{id}` | `notifications.destroy` | `NotificationController@destroy` | -- |
| DELETE | `/notifications/read/delete-all` | `notifications.delete-read` | `NotificationController@deleteRead` | -- |
| GET | `/sites/{site}/onboard` | `sites.onboard` | `SiteOnboardingController@show` | `site.access` |
| POST | `/sites/{site}/onboard/gateway` | `sites.onboard.gateway` | `SiteOnboardingController@storeGateway` | `site.access` |
| POST | `/sites/{site}/onboard/devices` | `sites.onboard.devices` | `SiteOnboardingController@storeDevices` | `site.access` |
| POST | `/sites/{site}/onboard/modules` | `sites.onboard.modules` | `SiteOnboardingController@activateModules` | `site.access` |
| POST | `/sites/{site}/onboard/complete` | `sites.onboard.complete` | `SiteOnboardingController@complete` | `site.access` |
| GET | `/sites/{site}/gateways` | `gateways.index` | `GatewayController@index` | `site.access`, `permission:manage devices` |
| POST | `/sites/{site}/gateways` | `gateways.store` | `GatewayController@store` | `site.access`, `permission:manage devices` |
| GET | `/sites/{site}/gateways/{gateway}` | `gateways.show` | `GatewayController@show` | `site.access`, `permission:manage devices` |
| DELETE | `/sites/{site}/gateways/{gateway}` | `gateways.destroy` | `GatewayController@destroy` | `site.access`, `permission:manage devices` |
| GET | `/sites/{site}/devices` | `devices.index` | `DeviceController@index` | `site.access` |
| POST | `/sites/{site}/devices` | `devices.store` | `DeviceController@store` | `site.access`, `permission:manage devices` |
| GET | `/sites/{site}/devices/{device}` | `devices.show` | `DeviceController@show` | `site.access` |
| PUT | `/sites/{site}/devices/{device}` | `devices.update` | `DeviceController@update` | `site.access`, `permission:manage devices` |
| DELETE | `/sites/{site}/devices/{device}` | `devices.destroy` | `DeviceController@destroy` | `site.access`, `permission:manage devices` |
| POST | `/sites/{site}/floor-plans` | `floor-plans.store` | `FloorPlanController@store` | `site.access`, `permission:manage devices` |
| PUT | `/sites/{site}/floor-plans/{floorPlan}` | `floor-plans.update` | `FloorPlanController@update` | `site.access`, `permission:manage devices` |
| DELETE | `/sites/{site}/floor-plans/{floorPlan}` | `floor-plans.destroy` | `FloorPlanController@destroy` | `site.access`, `permission:manage devices` |
| GET | `/recipes` | `recipes.index` | `RecipeController@index` | -- |
| GET | `/recipes/{recipe}` | `recipes.show` | `RecipeController@show` | -- |
| GET | `/sites/{site}` | `sites.show` | `SiteDetailController@show` | `site.access` |
| GET | `/sites/{site}/zones/{zone}` | `sites.zone` | `SiteDetailController@zone` | `site.access` |
| GET | `/devices/{device}` | `devices.show` | `DeviceDetailController@show` | -- |
| GET | `/sites/{site}/reports/temperature` | `reports.temperature` | `ReportController@temperature` | `site.access` |
| GET | `/sites/{site}/reports/energy` | `reports.energy` | `ReportController@energy` | `site.access` |
| GET | `/sites/{site}/reports/summary` | `reports.summary` | `ReportController@summary` | `site.access` |
| GET | `/sites/{site}/modules` | `modules.index` | `ModuleController@index` | `site.access`, `permission:manage devices` |
| POST | `/sites/{site}/modules/{module}/toggle` | `modules.toggle` | `ModuleController@toggle` | `site.access`, `permission:manage devices` |
| GET | `/alerts` | `alerts.index` | `AlertController@index` | -- |
| GET | `/alerts/{alert}` | `alerts.show` | `AlertController@show` | -- |
| POST | `/alerts/{alert}/acknowledge` | `alerts.acknowledge` | `AlertController@acknowledge` | -- |
| POST | `/alerts/{alert}/resolve` | `alerts.resolve` | `AlertController@resolve` | -- |
| POST | `/alerts/{alert}/dismiss` | `alerts.dismiss` | `AlertController@dismiss` | -- |
| GET | `/sites/{site}/rules` | `rules.index` | `AlertRuleController@index` | `site.access`, `permission:manage alert rules` |
| POST | `/sites/{site}/rules` | `rules.store` | `AlertRuleController@store` | `site.access`, `permission:manage alert rules` |
| GET | `/sites/{site}/rules/{rule}` | `rules.show` | `AlertRuleController@show` | `site.access`, `permission:manage alert rules` |
| PUT | `/sites/{site}/rules/{rule}` | `rules.update` | `AlertRuleController@update` | `site.access`, `permission:manage alert rules` |
| DELETE | `/sites/{site}/rules/{rule}` | `rules.destroy` | `AlertRuleController@destroy` | `site.access`, `permission:manage alert rules` |
| GET | `/exports/download` | `exports.download` | Closure | -- |
| GET | `/work-orders` | `work-orders.index` | `WorkOrderController@index` | -- |
| GET | `/work-orders/{workOrder}` | `work-orders.show` | `WorkOrderController@show` | -- |
| POST | `/sites/{site}/work-orders` | `work-orders.store` | `WorkOrderController@store` | `site.access` |
| PUT | `/work-orders/{workOrder}/status` | `work-orders.update-status` | `WorkOrderController@updateStatus` | -- |
| POST | `/work-orders/{workOrder}/photos` | `work-orders.add-photo` | `WorkOrderController@addPhoto` | -- |
| POST | `/work-orders/{workOrder}/notes` | `work-orders.add-note` | `WorkOrderController@addNote` | -- |
| GET | `/command-center` | `command-center.index` | `CommandCenterController@index` | `role:super_admin` |
| GET | `/command-center/alerts` | `command-center.alerts` | `CommandCenterController@alerts` | `role:super_admin` |
| GET | `/command-center/work-orders` | `command-center.work-orders` | `CommandCenterController@workOrders` | `role:super_admin` |
| GET | `/command-center/devices` | `command-center.devices` | `CommandCenterController@devices` | `role:super_admin` |
| GET | `/command-center/revenue` | `command-center.revenue` | `CommandCenterController@revenue` | `role:super_admin` |
| GET | `/command-center/dispatch` | `command-center.dispatch` | `CommandCenterController@dispatch` | `role:super_admin` |
| GET | `/command-center/{org}` | `command-center.org` | `CommandCenterController@org` | `role:super_admin` |
| GET | `/settings/compliance` | `compliance.index` | `ComplianceController@index` | `permission:manage org settings` |
| GET | `/sites/{site}/modules/iaq` | `modules.iaq` | `ModuleDashboardController@iaq` | `site.access` |
| GET | `/sites/{site}/modules/industrial` | `modules.industrial` | `ModuleDashboardController@industrial` | `site.access` |
| GET | `/settings/billing` | `billing.dashboard` | `BillingController@dashboard` | -- |
| GET | `/settings/billing/profiles` | `billing.profiles` | `BillingController@profiles` | -- |
| POST | `/settings/billing/profiles` | `billing.profiles.store` | `BillingController@storeProfile` | -- |
| GET | `/settings/api-keys` | `api-keys.index` | `ApiKeyController@index` | `permission:manage org settings` |
| POST | `/settings/api-keys` | `api-keys.store` | `ApiKeyController@store` | `permission:manage org settings` |
| DELETE | `/settings/api-keys/{apiKey}` | `api-keys.destroy` | `ApiKeyController@destroy` | `permission:manage org settings` |
| GET | `/settings/integrations` | `integrations.index` | `IntegrationController@index` | `permission:manage org settings` |
| POST | `/settings/integrations` | `integrations.store` | `IntegrationController@store` | `permission:manage org settings` |
| GET | `/settings/users` | `users.index` | `UserManagementController@index` | `permission:manage users` |
| POST | `/settings/users` | `users.store` | `UserManagementController@store` | `permission:manage users` |
| PUT | `/settings/users/{user}` | `users.update` | `UserManagementController@update` | `permission:manage users` |
| DELETE | `/settings/users/{user}` | `users.destroy` | `UserManagementController@destroy` | `permission:manage users` |
| GET | `/partner` | `partner.index` | `PartnerController@index` | `role:super_admin` |

### 1e. API Routes (auth:sanctum)

| Method | URI | Name | Controller/Action | Middleware |
|--------|-----|------|-------------------|------------|
| GET | `/api/sites/{site}/devices` | -- | `Api\DeviceApiController@index` | `auth:sanctum` |
| GET | `/api/devices/{device}/readings` | -- | `Api\DeviceApiController@readings` | `auth:sanctum` |
| GET | `/api/devices/{device}/status` | -- | `Api\DeviceApiController@status` | `auth:sanctum` |

---

## 2. Page Inventory

Total pages: **55**

### auth/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `auth/confirm-password.tsx` | `password.confirm` | Fortify | Working |
| `auth/forgot-password.tsx` | `password.request` | Fortify | Working |
| `auth/login.tsx` | `login` | Fortify | Working |
| `auth/register.tsx` | `register` | Fortify | Working |
| `auth/reset-password.tsx` | `password.reset` | Fortify | Working |
| `auth/two-factor-challenge.tsx` | `two-factor.login` | Fortify | Working |
| `auth/verify-email.tsx` | `verification.notice` | Fortify | Working |

### settings/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `settings/appearance.tsx` | `appearance.edit` | Closure | Working |
| `settings/password.tsx` | `user-password.edit` | `Settings\PasswordController` | Working |
| `settings/profile.tsx` | `profile.edit` | `Settings\ProfileController` | Working |
| `settings/two-factor.tsx` | `two-factor.show` | `Settings\TwoFactorAuthenticationController` | Working |
| `settings/organization.tsx` | `organization.edit` | `OrganizationSettingsController` | Working |
| `settings/users/index.tsx` | `users.index` | `UserManagementController` | Working |
| `settings/api-keys.tsx` | `api-keys.index` | `ApiKeyController` | Working |
| `settings/integrations.tsx` | `integrations.index` | `IntegrationController` | Working |
| `settings/modules.tsx` | `modules.index` | `ModuleController` | Working |
| `settings/rules/index.tsx` | `rules.index` | `AlertRuleController` | Working |
| `settings/sites/onboard.tsx` | `sites.onboard` | `SiteOnboardingController` | Working |
| `settings/devices/index.tsx` | `devices.index` | `DeviceController` | Working |
| `settings/billing/index.tsx` | `billing.dashboard` | `BillingController` | Stub |
| `settings/billing/profiles.tsx` | `billing.profiles` | `BillingController` | Stub |

### sites/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `sites/show.tsx` | `sites.show` | `SiteDetailController` | Working |
| `sites/zone.tsx` | `sites.zone` | `SiteDetailController` | Working |

### devices/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `devices/show.tsx` | `devices.show` | `DeviceDetailController` | Working |

### alerts/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `alerts/index.tsx` | `alerts.index` | `AlertController` | Working |
| `alerts/show.tsx` | `alerts.show` | `AlertController` | Working |

### reports/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `reports/temperature.tsx` | `reports.temperature` | `ReportController` | Working |
| `reports/energy.tsx` | `reports.energy` | `ReportController` | Working |
| `reports/summary.tsx` | `reports.summary` | `ReportController` | Working |

### work-orders/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `work-orders/index.tsx` | `work-orders.index` | `WorkOrderController` | Working |
| `work-orders/show.tsx` | `work-orders.show` | `WorkOrderController` | Working |

### command-center/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `command-center/index.tsx` | `command-center.index` | `CommandCenterController` | Working |

### partner/

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `partner/index.tsx` | `partner.index` | `PartnerController` | Working |

### Root-level pages

| Page Path | Route Name | Controller | Status |
|-----------|-----------|------------|--------|
| `welcome.tsx` | `home` | Closure | Working |
| `dashboard.tsx` | `dashboard` | Closure | Working |
| `activity-log.tsx` | `activity-log` | `ActivityLogController` | Working |
| `notifications.tsx` | `notifications` | `NotificationController` | Working |

### Routes with NO corresponding page file (rendered by controller but page file missing)

| Route Name | Controller renders | Page file exists? |
|------------|-------------------|-------------------|
| `rules.show` | `settings/rules/show` | NO |
| `devices.show` (site-scoped) | `settings/devices/show` | NO |
| `gateways.index` | `settings/gateways/index` | NO |
| `gateways.show` | `settings/gateways/show` | NO |
| `recipes.index` | `settings/recipes/index` | NO |
| `recipes.show` | `settings/recipes/show` | NO |
| `api-keys.index` | `settings/api-keys/index` | NO -- controller renders `settings/api-keys/index` but page is `settings/api-keys.tsx` |
| `integrations.index` | `settings/integrations/index` | NO -- controller renders `settings/integrations/index` but page is `settings/integrations.tsx` |
| `billing.dashboard` | `settings/billing/dashboard` | NO -- controller renders `settings/billing/dashboard` but page is `settings/billing/index.tsx` |
| `command-center.alerts` | `command-center/alerts` | NO |
| `command-center.work-orders` | `command-center/work-orders` | NO |
| `command-center.devices` | `command-center/devices` | NO |

---

## 3. Controller Inventory

Total controllers: **39** (36 app + 2 API + 1 base)

| Controller | Methods | Route Count | Has Policy | Has Tests |
|------------|---------|-------------|------------|-----------|
| `Controller` (base) | 0 | 0 | -- | -- |
| `ActivityLogController` | 3 (`index`, `userActivity`, `modelActivity`) | 3 | No | Yes |
| `AlertController` | 5 (`index`, `show`, `acknowledge`, `resolve`, `dismiss`) | 5 | No | Yes |
| `AlertRuleController` | 5 (`index`, `store`, `show`, `update`, `destroy`) | 5 | No | Yes |
| `ApiKeyController` | 3 (`index`, `store`, `destroy`) | 3 | No | Yes |
| `BillingController` | 3 (`dashboard`, `profiles`, `storeProfile`) | 3 | No | Yes |
| `CommandCenterController` | 4 (`index`, `alerts`, `workOrders`, `devices`) | 4 | No | Yes |
| `DeviceController` | 5 (`index`, `store`, `show`, `update`, `destroy`) | 5 | No | Yes |
| `DeviceDetailController` | 1 (`show`) | 1 | No | Yes |
| `FileController` | 4 (`show`, `serve`, `download`, `destroy`) | 4 | Yes (FilePolicy) | No |
| `FileUploadController` | 6 (`upload`, `uploadMultiple`, `destroy`, `delete`, `updateVisibility`, `allowedTypes`) | 5 | Yes (FilePolicy) | No |
| `FloorPlanController` | 3 (`store`, `update`, `destroy`) | 3 | No | Yes |
| `GatewayController` | 4 (`index`, `store`, `show`, `destroy`) | 4 | Yes (GatewayPolicy) | Yes |
| `IntegrationController` | 2 (`index`, `store`) | 2 | No | Yes |
| `LocaleController` | 1 (`update`) | 1 | No | No |
| `ModuleController` | 2 (`index`, `toggle`) | 2 | No | Yes |
| `NotificationController` | 6 (`index`, `unreadCount`, `markAsRead`, `markAllAsRead`, `destroy`, `deleteRead`) | 6 | Yes (NotificationPolicy) | Yes |
| `OrganizationSettingsController` | 2 (`edit`, `update`) | 2 | No | No |
| `PartnerController` | 1 (`index`) | 1 | No | Yes |
| `RecipeController` | 2 (`index`, `show`) | 2 | No | Yes |
| `ReportController` | 3 (`temperature`, `energy`, `summary`) | 3 | No | Yes |
| `SiteDetailController` | 2 (`show`, `zone`) | 2 | No | Yes |
| `SiteOnboardingController` | 5 (`show`, `storeGateway`, `storeDevices`, `activateModules`, `complete`) | 5 | No | Yes |
| `UserManagementController` | 4 (`index`, `store`, `update`, `destroy`) | 4 | No | No |
| `WorkOrderController` | 6 (`index`, `show`, `store`, `updateStatus`, `addPhoto`, `addNote`) | 6 | No | Yes |
| `Settings\PasswordController` | 2 (`edit`, `update`) | 2 | No | Yes |
| `Settings\ProfileController` | 3 (`edit`, `update`, `destroy`) | 3 | No | Yes |
| `Settings\TwoFactorAuthenticationController` | 1 (`show`) | 1 | No | Yes |
| `Api\DeviceApiController` | 3 (`index`, `readings`, `status`) | 3 | No | Yes |
| `Api\WhatsAppWebhookController` | 1 (`__invoke`) | 1 | No | Yes |

---

## 4. Component Inventory

### 4a. shadcn/ui Components (92)

| # | Component | File Path |
|---|-----------|-----------|
| 1 | accordion | `resources/js/components/ui/accordion.tsx` |
| 2 | activity-log-item | `resources/js/components/ui/activity-log-item.tsx` |
| 3 | activity-timeline | `resources/js/components/ui/activity-timeline.tsx` |
| 4 | alert | `resources/js/components/ui/alert.tsx` |
| 5 | alert-dialog | `resources/js/components/ui/alert-dialog.tsx` |
| 6 | announcement-banner | `resources/js/components/ui/announcement-banner.tsx` |
| 7 | avatar | `resources/js/components/ui/avatar.tsx` |
| 8 | avatar-group | `resources/js/components/ui/avatar-group.tsx` |
| 9 | badge | `resources/js/components/ui/badge.tsx` |
| 10 | breadcrumb | `resources/js/components/ui/breadcrumb.tsx` |
| 11 | button | `resources/js/components/ui/button.tsx` |
| 12 | calendar | `resources/js/components/ui/calendar.tsx` |
| 13 | card | `resources/js/components/ui/card.tsx` |
| 14 | carousel | `resources/js/components/ui/carousel.tsx` |
| 15 | chart | `resources/js/components/ui/chart.tsx` |
| 16 | checkbox | `resources/js/components/ui/checkbox.tsx` |
| 17 | code-block | `resources/js/components/ui/code-block.tsx` |
| 18 | collapsible | `resources/js/components/ui/collapsible.tsx` |
| 19 | command | `resources/js/components/ui/command.tsx` |
| 20 | confirmation-dialog | `resources/js/components/ui/confirmation-dialog.tsx` |
| 21 | container | `resources/js/components/ui/container.tsx` |
| 22 | context-menu | `resources/js/components/ui/context-menu.tsx` |
| 23 | copy-button | `resources/js/components/ui/copy-button.tsx` |
| 24 | currency-input | `resources/js/components/ui/currency-input.tsx` |
| 25 | data-table-column-header | `resources/js/components/ui/data-table-column-header.tsx` |
| 26 | date-filter | `resources/js/components/ui/date-filter.tsx` |
| 27 | date-picker | `resources/js/components/ui/date-picker.tsx` |
| 28 | date-presets | `resources/js/components/ui/date-presets.tsx` |
| 29 | date-range-picker | `resources/js/components/ui/date-range-picker.tsx` |
| 30 | dialog | `resources/js/components/ui/dialog.tsx` |
| 31 | drawer | `resources/js/components/ui/drawer.tsx` |
| 32 | dropdown-menu | `resources/js/components/ui/dropdown-menu.tsx` |
| 33 | empty-state | `resources/js/components/ui/empty-state.tsx` |
| 34 | error-boundary | `resources/js/components/ui/error-boundary.tsx` |
| 35 | fade-in | `resources/js/components/ui/fade-in.tsx` |
| 36 | file-preview | `resources/js/components/ui/file-preview.tsx` |
| 37 | file-upload | `resources/js/components/ui/file-upload.tsx` |
| 38 | form | `resources/js/components/ui/form.tsx` |
| 39 | form-rhf | `resources/js/components/ui/form-rhf.tsx` |
| 40 | heading | `resources/js/components/ui/heading.tsx` |
| 41 | heading-small | `resources/js/components/ui/heading-small.tsx` |
| 42 | hover-card | `resources/js/components/ui/hover-card.tsx` |
| 43 | icon | `resources/js/components/ui/icon.tsx` |
| 44 | input | `resources/js/components/ui/input.tsx` |
| 45 | input-otp | `resources/js/components/ui/input-otp.tsx` |
| 46 | kbd | `resources/js/components/ui/kbd.tsx` |
| 47 | label | `resources/js/components/ui/label.tsx` |
| 48 | language-switcher | `resources/js/components/ui/language-switcher.tsx` |
| 49 | loading-overlay | `resources/js/components/ui/loading-overlay.tsx` |
| 50 | menubar | `resources/js/components/ui/menubar.tsx` |
| 51 | multi-select | `resources/js/components/ui/multi-select.tsx` |
| 52 | navigation-menu | `resources/js/components/ui/navigation-menu.tsx` |
| 53 | notification-bell | `resources/js/components/ui/notification-bell.tsx` |
| 54 | notification-dropdown | `resources/js/components/ui/notification-dropdown.tsx` |
| 55 | notification-item | `resources/js/components/ui/notification-item.tsx` |
| 56 | number-input | `resources/js/components/ui/number-input.tsx` |
| 57 | numeric-input | `resources/js/components/ui/numeric-input.tsx` |
| 58 | page-header | `resources/js/components/ui/page-header.tsx` |
| 59 | page-layout | `resources/js/components/ui/page-layout.tsx` |
| 60 | page-transition | `resources/js/components/ui/page-transition.tsx` |
| 61 | pagination | `resources/js/components/ui/pagination.tsx` |
| 62 | phone-input | `resources/js/components/ui/phone-input.tsx` |
| 63 | placeholder-pattern | `resources/js/components/ui/placeholder-pattern.tsx` |
| 64 | popover | `resources/js/components/ui/popover.tsx` |
| 65 | progress | `resources/js/components/ui/progress.tsx` |
| 66 | radio-group | `resources/js/components/ui/radio-group.tsx` |
| 67 | resizable | `resources/js/components/ui/resizable.tsx` |
| 68 | scroll-area | `resources/js/components/ui/scroll-area.tsx` |
| 69 | search-input | `resources/js/components/ui/search-input.tsx` |
| 70 | searchable-select | `resources/js/components/ui/searchable-select.tsx` |
| 71 | select | `resources/js/components/ui/select.tsx` |
| 72 | separator | `resources/js/components/ui/separator.tsx` |
| 73 | sheet | `resources/js/components/ui/sheet.tsx` |
| 74 | sidebar | `resources/js/components/ui/sidebar.tsx` |
| 75 | skeleton | `resources/js/components/ui/skeleton.tsx` |
| 76 | skip-link | `resources/js/components/ui/skip-link.tsx` |
| 77 | slider | `resources/js/components/ui/slider.tsx` |
| 78 | sonner | `resources/js/components/ui/sonner.tsx` |
| 79 | spinner | `resources/js/components/ui/spinner.tsx` |
| 80 | stat-card | `resources/js/components/ui/stat-card.tsx` |
| 81 | stepper | `resources/js/components/ui/stepper.tsx` |
| 82 | switch | `resources/js/components/ui/switch.tsx` |
| 83 | table | `resources/js/components/ui/table.tsx` |
| 84 | tabs | `resources/js/components/ui/tabs.tsx` |
| 85 | tags-input | `resources/js/components/ui/tags-input.tsx` |
| 86 | textarea | `resources/js/components/ui/textarea.tsx` |
| 87 | time-picker | `resources/js/components/ui/time-picker.tsx` |
| 88 | toast | `resources/js/components/ui/toast.tsx` |
| 89 | toaster | `resources/js/components/ui/toaster.tsx` |
| 90 | toggle | `resources/js/components/ui/toggle.tsx` |
| 91 | toggle-group | `resources/js/components/ui/toggle-group.tsx` |
| 92 | tooltip | `resources/js/components/ui/tooltip.tsx` |

### 4b. Custom Components (26)

| # | Component | File Path |
|---|-----------|-----------|
| 1 | Can | `resources/js/components/Can.tsx` |
| 2 | HasRole | `resources/js/components/HasRole.tsx` |
| 3 | SiteSelector | `resources/js/components/SiteSelector.tsx` |
| 4 | alert-error | `resources/js/components/alert-error.tsx` |
| 5 | app-content | `resources/js/components/app-content.tsx` |
| 6 | app-header | `resources/js/components/app-header.tsx` |
| 7 | app-logo | `resources/js/components/app-logo.tsx` |
| 8 | app-logo-icon | `resources/js/components/app-logo-icon.tsx` |
| 9 | app-shell | `resources/js/components/app-shell.tsx` |
| 10 | app-sidebar | `resources/js/components/app-sidebar.tsx` |
| 11 | app-sidebar-header | `resources/js/components/app-sidebar-header.tsx` |
| 12 | appearance-dropdown | `resources/js/components/appearance-dropdown.tsx` |
| 13 | appearance-tabs | `resources/js/components/appearance-tabs.tsx` |
| 14 | breadcrumbs | `resources/js/components/breadcrumbs.tsx` |
| 15 | delete-user | `resources/js/components/delete-user.tsx` |
| 16 | icon | `resources/js/components/icon.tsx` |
| 17 | input-error | `resources/js/components/input-error.tsx` |
| 18 | nav-footer | `resources/js/components/nav-footer.tsx` |
| 19 | nav-main | `resources/js/components/nav-main.tsx` |
| 20 | nav-user | `resources/js/components/nav-user.tsx` |
| 21 | simple-pagination | `resources/js/components/simple-pagination.tsx` |
| 22 | text-link | `resources/js/components/text-link.tsx` |
| 23 | two-factor-recovery-codes | `resources/js/components/two-factor-recovery-codes.tsx` |
| 24 | two-factor-setup-modal | `resources/js/components/two-factor-setup-modal.tsx` |
| 25 | user-info | `resources/js/components/user-info.tsx` |
| 26 | user-menu-content | `resources/js/components/user-menu-content.tsx` |

---

## 5. Hook Inventory

Total hooks: **16** (13 `.ts` + 3 `.tsx`)

| # | Hook | Purpose | File Path |
|---|------|---------|-----------|
| 1 | `useAppearance` | Theme management (light/dark/system) | `resources/js/hooks/use-appearance.tsx` |
| 2 | `useClipboard` | Copy text to clipboard | `resources/js/hooks/use-clipboard.ts` |
| 3 | `useDebounce` | Debounce a value by delay | `resources/js/hooks/useDebounce.ts` |
| 4 | `useErrorHandler` | Standardized error handling | `resources/js/hooks/use-error-handler.ts` |
| 5 | `useFileUpload` | File upload with progress tracking | `resources/js/hooks/use-file-upload.ts` |
| 6 | `useFlashMessages` | Auto-display Laravel flash as Sonner toasts | `resources/js/hooks/use-flash-messages.ts` |
| 7 | `useInView` | Intersection observer for element visibility | `resources/js/hooks/use-in-view.ts` |
| 8 | `useInitials` | Extract initials from user name | `resources/js/hooks/use-initials.tsx` |
| 9 | `useLang` | i18n translation helper (`t()`) | `resources/js/hooks/use-lang.ts` |
| 10 | `useIsMobile` | Detect mobile viewport | `resources/js/hooks/use-mobile.tsx` |
| 11 | `useMobileNavigation` | Mobile nav open/close state | `resources/js/hooks/use-mobile-navigation.ts` |
| 12 | `useNotifications` | Notification fetching and management | `resources/js/hooks/use-notifications.ts` |
| 13 | `useRealtimeNotifications` | WebSocket real-time notifications via Reverb | `resources/js/hooks/use-realtime-notifications.ts` |
| 14 | `useNotificationCount` | Real-time unread notification count | `resources/js/hooks/use-realtime-notifications.ts` |
| 15 | `useSearch` / `useTypeahead` | Debounced search with Inertia or API | `resources/js/hooks/use-search.ts` |
| 16 | `useTwoFactorAuth` | 2FA setup/confirm/disable flow | `resources/js/hooks/use-two-factor-auth.ts` |
| -- | `useToast` (reducer) | Toast state management (internal) | `resources/js/hooks/use-toast.ts` |

---

## 6. Coverage Summary

### 6a. Models (33 total)

| # | Model | Has Factory | Has Policy | Has Tests |
|---|-------|-------------|------------|-----------|
| 1 | `User` | Yes | -- (Fortify) | Yes |
| 2 | `Organization` | No | No | Yes (OrgScopeTest) |
| 3 | `Site` | No | No | Yes (SiteAccessTest) |
| 4 | `Device` | No | No | Yes (DeviceTest) |
| 5 | `Gateway` | No | Yes | Yes (GatewayTest) |
| 6 | `SensorReading` | No | No | Yes (ProcessSensorReadingTest) |
| 7 | `Module` | No | No | Yes (AdvancedModulesTest) |
| 8 | `Recipe` | No | No | Yes (RecipeControllerTest) |
| 9 | `SiteModule` | No | No | No |
| 10 | `SiteRecipeOverride` | No | No | No |
| 11 | `FloorPlan` | No | No | Yes (FloorPlanTest) |
| 12 | `AlertRule` | No | No | Yes (AlertEngineTest) |
| 13 | `Alert` | No | No | Yes (AlertEngineTest) |
| 14 | `EscalationChain` | No | No | Yes (EscalationServiceTest) |
| 15 | `AlertNotification` | No | No | Yes (SendAlertNotificationTest) |
| 16 | `DefrostSchedule` | No | No | Yes (LearnDefrostPatternTest) |
| 17 | `WorkOrder` | No | No | Yes (WorkOrderTest) |
| 18 | `WorkOrderPhoto` | No | No | No |
| 19 | `WorkOrderNote` | No | No | No |
| 20 | `BillingProfile` | No | No | Yes (BillingTest) |
| 21 | `Subscription` | No | No | Yes (SubscriptionServiceTest) |
| 22 | `SubscriptionItem` | No | No | Yes (SubscriptionServiceTest) |
| 23 | `Invoice` | No | No | Yes (InvoiceServiceTest) |
| 24 | `DoorBaseline` | No | No | Yes (DoorPatternServiceTest) |
| 25 | `CompressorBaseline` | No | No | Yes (CompressorDutyCycleServiceTest) |
| 26 | `IaqZoneScore` | No | No | No |
| 27 | `TrafficSnapshot` | No | No | No |
| 28 | `ApiKey` | No | No | Yes (ApiKeyControllerTest) |
| 29 | `WebhookSubscription` | No | No | Yes (WebhookDispatcherTest) |
| 30 | `IntegrationConfig` | No | No | Yes (IntegrationControllerTest) |
| 31 | `File` | Yes | Yes | No |
| 32 | `PushToken` | Yes | No | Yes (MobileApiTest) |
| 33 | `ComplianceEvent` | Yes | No | No |

### 6b. Factory Coverage

| Metric | Count |
|--------|-------|
| Models with factories | **33** (all models) |
| Models without factories | **0** |
| Factory coverage | **100%** |

### 6c. Policy Coverage

| Metric | Count |
|--------|-------|
| Policies defined | **13** (DevicePolicy, AlertPolicy, AlertRulePolicy, WorkOrderPolicy, SitePolicy, RecipePolicy, EscalationChainPolicy, BillingPolicy, ReportPolicy, UserPolicy, FilePolicy, GatewayPolicy, NotificationPolicy) |
| Controllers using policies | **13+** |
| Controllers without policies | **~20** (non-critical or middleware-protected) |
| Policy coverage | **~40%** (13/33 non-base controllers) |

### 6d. Test Coverage

| Category | Files |
|----------|-------|
| Auth tests | 7 (`AuthenticationTest`, `EmailVerificationTest`, `PasswordConfirmationTest`, `PasswordResetTest`, `RegistrationTest`, `TwoFactorChallengeTest`, `VerificationNotificationTest`) |
| Settings tests | 3 (`PasswordUpdateTest`, `ProfileUpdateTest`, `TwoFactorAuthenticationTest`) |
| HTTP controller tests | 20 (`DeviceControllerTest`, `WorkOrderControllerTest`, `AlertControllerTest`, `AlertRuleControllerTest`, `CommandCenterControllerTest`, `GatewayControllerTest`, `SiteOnboardingControllerTest`, `SiteDetailControllerTest`, `FloorPlanControllerTest`, `BillingControllerTest`, `ApiKeyControllerTest`, `IntegrationControllerTest`, `ModuleControllerTest`, `ReportControllerTest`, `RecipeControllerTest`, `PartnerControllerTest`, `NotificationControllerTest`, `ActivityLogControllerTest`, `DeviceDetailControllerTest`, `Api\DeviceApiControllerTest`, `Api\WhatsAppWebhookControllerTest`) |
| Service tests | 11 (`SubscriptionServiceTest`, `InvoiceServiceTest`, `WorkOrderServiceTest`, `ReadingStorageServiceTest`, `EscalationServiceTest`, `FacturapiServiceTest`, `TwilioServiceTest`, `DoorPatternServiceTest`, `SapExportServiceTest`, `ContpaqExportServiceTest`, `WebhookDispatcherTest`, `AlertRouterTest`, `CompressorDutyCycleServiceTest`, `ChirpStackProvisionerTest`) |
| Job tests | 7 (`CheckDeviceHealthTest`, `CreateWorkOrderTest`, `EvaluateAlertRulesTest`, `EscalateAlertTest`, `SendAlertNotificationTest`, `LearnDefrostPatternTest`, `SendMorningSummaryTest`, `SendCorporateSummaryTest`) |
| Middleware tests | 2 (`EnsureOrganizationScopeTest`, `EnsureSiteAccessTest`) |
| Integration/feature tests | 10 (`ExampleTest`, `DashboardTest`, `OrganizationScopeTest`, `SiteAccessTest`, `UserSiteAccessTest`, `DeviceTest`, `ReadingQueryServiceTest`, `FloorPlanTest`, `GatewayTest`, `ProcessSensorReadingTest`, `SimulatorTest`, `AlertEngineTest`, `ColdChainTest`, `EnergyTest`, `DashboardServicesTest`, `WorkOrderTest`, `AdvancedModulesTest`, `BillingTest`) |
| Unit tests | 1 (`ExampleTest`) |
| **Total test files** | **~87** |

### 6e. Controllers vs Tests

| Controller | Has HTTP Test |
|------------|---------------|
| `ActivityLogController` | Yes |
| `AlertController` | Yes |
| `AlertRuleController` | Yes |
| `ApiKeyController` | Yes |
| `BillingController` | Yes |
| `CommandCenterController` | Yes |
| `DeviceController` | Yes |
| `DeviceDetailController` | Yes |
| `FileController` | **No** |
| `FileUploadController` | **No** |
| `FloorPlanController` | Yes |
| `GatewayController` | Yes |
| `IntegrationController` | Yes |
| `LocaleController` | **No** |
| `ModuleController` | Yes |
| `NotificationController` | Yes |
| `OrganizationSettingsController` | **No** |
| `PartnerController` | Yes |
| `RecipeController` | Yes |
| `ReportController` | Yes |
| `SiteDetailController` | Yes |
| `SiteOnboardingController` | Yes |
| `UserManagementController` | **No** |
| `WorkOrderController` | Yes |
| `Settings\PasswordController` | Yes |
| `Settings\ProfileController` | Yes |
| `Settings\TwoFactorAuthenticationController` | Yes |
| `Api\DeviceApiController` | Yes |
| `Api\WhatsAppWebhookController` | Yes |

Controllers without dedicated HTTP tests: **5** (`FileController`, `FileUploadController`, `LocaleController`, `OrganizationSettingsController`, `UserManagementController`)

---

## 7. Known Issues

### 7a. ~~Missing Factories~~ -- RESOLVED (M4)

All 33 models now have factories. Factory coverage is 100%.

### 7b. ~~Missing Policies~~ -- PARTIALLY RESOLVED (M4)

13 policies now exist (up from 3): DevicePolicy, AlertPolicy, AlertRulePolicy, WorkOrderPolicy, SitePolicy, RecipePolicy, EscalationChainPolicy, BillingPolicy, ReportPolicy, UserPolicy, FilePolicy, GatewayPolicy, NotificationPolicy. The following controllers still rely on middleware-only authorization:

- **ApiKeyController** -- manual org_id check in destroy, no formal policy
- **CommandCenterController** -- relies on role middleware only
- **SiteOnboardingController** -- relies on site.access middleware only
- **SiteDetailController** -- relies on site.access middleware only

### 7c. Page/Route Mismatches (12 routes)

Controllers render Inertia pages that do not exist as files:

1. `settings/rules/show` -- `AlertRuleController@show` renders this, but no `.tsx` file exists
2. `settings/devices/show` -- `DeviceController@show` renders this, but no `.tsx` file exists
3. `settings/gateways/index` -- `GatewayController@index` renders this, but no `.tsx` file exists
4. `settings/gateways/show` -- `GatewayController@show` renders this, but no `.tsx` file exists
5. `settings/recipes/index` -- `RecipeController@index` renders this, but no `.tsx` file exists
6. `settings/recipes/show` -- `RecipeController@show` renders this, but no `.tsx` file exists
7. `settings/api-keys/index` -- controller renders path with `/index`, but page is `settings/api-keys.tsx` (no subdirectory)
8. `settings/integrations/index` -- controller renders path with `/index`, but page is `settings/integrations.tsx` (no subdirectory)
9. `settings/billing/dashboard` -- controller renders `dashboard`, but page is `settings/billing/index.tsx`
10. `command-center/alerts` -- no page file exists
11. `command-center/work-orders` -- no page file exists
12. `command-center/devices` -- no page file exists

### 7d. Incomplete Billing Module

- `BillingController` provides `dashboard`, `profiles`, and `storeProfile` only
- No update/delete endpoints for billing profiles
- No subscription management endpoints (create, cancel, change plan)
- No invoice download or payment endpoints
- `SubscriptionService`, `InvoiceService`, and `FacturapiService` exist as services but are not exposed via controllers
- Billing pages (`settings/billing/index.tsx`, `settings/billing/profiles.tsx`) are stubs

### 7e. Orphaned / Underutilized Models

| Model | Issue |
|-------|-------|
| `SiteModule` | Pivot model with no direct routes or controller |
| `SiteRecipeOverride` | No controller, no routes, no tests |
| `IaqZoneScore` | No controller, no routes, no tests |
| `TrafficSnapshot` | No controller, no routes, no tests |
| `WebhookSubscription` | Model + migration exist, referenced by `WebhookDispatcher` service, but no CRUD endpoints |
| `EscalationChain` | No direct CRUD controller (managed only via `EscalationService`) |
| `AlertNotification` | No direct controller (created by `SendAlertNotification` job) |
| `DefrostSchedule` | No direct controller (created by `LearnDefrostPattern` job) |
| `DoorBaseline` | No direct controller (created by `DoorPatternService`) |
| `CompressorBaseline` | No direct controller (created by `CompressorDutyCycleService`) |

### 7f. Controllers Without Tests

5 controllers have no dedicated HTTP test file:

1. `FileController` -- 4 methods, uses FilePolicy
2. `FileUploadController` -- 6 methods, uses FilePolicy
3. `LocaleController` -- 1 method
4. `OrganizationSettingsController` -- 2 methods
5. `UserManagementController` -- 4 methods (high-risk: creates/deletes users)

### 7g. Missing Frontend Pages

6 pages referenced by controllers do not exist at all (will cause Inertia 500 errors):

1. `settings/rules/show`
2. `settings/devices/show`
3. `settings/gateways/index`
4. `settings/gateways/show`
5. `command-center/alerts`
6. `command-center/work-orders`
7. `command-center/devices`
8. `settings/recipes/index`
9. `settings/recipes/show`

### 7h. Naming Inconsistencies

- `ApiKeyController` renders `settings/api-keys/index` but page file is `settings/api-keys.tsx`
- `IntegrationController` renders `settings/integrations/index` but page file is `settings/integrations.tsx`
- `BillingController@dashboard` renders `settings/billing/dashboard` but page file is `settings/billing/index.tsx`
- Hook `useDebounce` uses camelCase filename (`useDebounce.ts`) instead of kebab-case (`use-debounce.ts`)

---

## Appendix A: Service Layer Inventory (30 services)

| # | Service | Namespace |
|---|---------|-----------|
| 1 | `FileStorageService` | `App\Services` |
| 2 | `FileValidationService` | `App\Services` |
| 3 | `ImageOptimizationService` | `App\Services` |
| 4 | `PdfService` | `App\Services` |
| 5 | `DecoderFactory` | `App\Services\Decoders` |
| 6 | `MilesightDecoder` | `App\Services\Decoders` |
| 7 | `MqttListener` | `App\Services\ChirpStack` |
| 8 | `DeviceProvisioner` | `App\Services\ChirpStack` |
| 9 | `ReadingStorageService` | `App\Services\Readings` |
| 10 | `ReadingQueryService` | `App\Services\Readings` |
| 11 | `ChartDataService` | `App\Services\Readings` |
| 12 | `RuleEvaluator` | `App\Services\RulesEngine` |
| 13 | `DefrostDetector` | `App\Services\RulesEngine` |
| 14 | `BaselineService` | `App\Services\RulesEngine` |
| 15 | `AlertRouter` | `App\Services\Alerts` |
| 16 | `EscalationService` | `App\Services\Alerts` |
| 17 | `TwilioService` | `App\Services\WhatsApp` |
| 18 | `MorningSummaryService` | `App\Services\Reports` |
| 19 | `TemperatureReport` | `App\Services\Reports` |
| 20 | `EnergyReport` | `App\Services\Reports` |
| 21 | `SubscriptionService` | `App\Services\Billing` |
| 22 | `InvoiceService` | `App\Services\Billing` |
| 23 | `FacturapiService` | `App\Services\Billing` |
| 24 | `DoorPatternService` | `App\Services\Analytics` |
| 25 | `CompressorDutyCycleService` | `App\Services\Analytics` |
| 26 | `WebhookDispatcher` | `App\Services\Api` |
| 27 | `SapExportService` | `App\Services\Integrations` |
| 28 | `ContpaqExportService` | `App\Services\Integrations` |
| 29 | `WorkOrderService` | `App\Services\WorkOrders` |

## Appendix B: Job Inventory (11 jobs)

| # | Job | File Path |
|---|-----|-----------|
| 1 | `ProcessUploadedImage` | `app/Jobs/ProcessUploadedImage.php` |
| 2 | `CheckDeviceHealth` | `app/Jobs/CheckDeviceHealth.php` |
| 3 | `EvaluateAlertRules` | `app/Jobs/EvaluateAlertRules.php` |
| 4 | `SendAlertNotification` | `app/Jobs/SendAlertNotification.php` |
| 5 | `EscalateAlert` | `app/Jobs/EscalateAlert.php` |
| 6 | `ProcessSensorReading` | `app/Jobs/ProcessSensorReading.php` |
| 7 | `SendMorningSummary` | `app/Jobs/SendMorningSummary.php` |
| 8 | `SendRegionalSummary` | `app/Jobs/SendRegionalSummary.php` |
| 9 | `SendCorporateSummary` | `app/Jobs/SendCorporateSummary.php` |
| 10 | `LearnDefrostPattern` | `app/Jobs/LearnDefrostPattern.php` |
| 11 | `CreateWorkOrder` | `app/Jobs/CreateWorkOrder.php` |

## Appendix C: Migration Count

Total migrations: **43**

## Appendix D: Middleware Inventory (5 custom)

| Middleware | File Path |
|------------|-----------|
| `HandleAppearance` | `app/Http/Middleware/HandleAppearance.php` |
| `SetLocale` | `app/Http/Middleware/SetLocale.php` |
| `EnsureOrganizationScope` (`org.scope`) | `app/Http/Middleware/EnsureOrganizationScope.php` |
| `EnsureSiteAccess` (`site.access`) | `app/Http/Middleware/EnsureSiteAccess.php` |
| `HandleInertiaRequests` | `app/Http/Middleware/HandleInertiaRequests.php` |
