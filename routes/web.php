<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AlertAnalyticsController;
use App\Http\Controllers\AlertController;
use App\Http\Controllers\AlertRuleController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CommandCenterController;
use App\Http\Controllers\ComplianceCalendarController;
use App\Http\Controllers\CorrectiveActionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DeviceDetailController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\FloorPlanController;
use App\Http\Controllers\EscalationChainController;
use App\Http\Controllers\GatewayController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ModuleCatalogController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrganizationCatalogController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SiteDetailController;
use App\Http\Controllers\SiteOnboardingController;
use App\Http\Controllers\SiteSettingsController;
use App\Http\Controllers\HealthCheckController;
use App\Http\Controllers\DataExportController;
use App\Http\Controllers\MaintenanceWindowController;
use App\Http\Controllers\ReportScheduleController;
use App\Http\Controllers\SiteTemplateController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SegmentController;
use App\Http\Controllers\SensorModelController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\TemperatureVerificationController;
use App\Http\Controllers\WorkOrderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Health check (public, no auth — for external monitoring)
Route::get('/health', HealthCheckController::class)->name('health');

// Platform Status Page
Route::get('/status', StatusController::class)->name('status');

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

// Locale switching
Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

// Privacy consent (Phase 10 — LFPDPPP compliance)
Route::middleware('auth')->group(function () {
    Route::get('/privacy/accept', fn () => Inertia::render('privacy/accept', [
        'version' => config('app.privacy_policy_version', '1.0'),
    ]))->name('privacy.show');
    Route::post('/privacy/accept', function (\Illuminate\Http\Request $request) {
        $request->user()->update([
            'privacy_accepted_at' => now(),
            'privacy_policy_version' => config('app.privacy_policy_version', '1.0'),
        ]);

        return redirect()->intended('/dashboard');
    })->name('privacy.accept');
});

Route::middleware(['auth', 'org.scope', 'privacy'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Global Search (Cmd+K)
    Route::get('search', SearchController::class)->name('search');

    // Organization context switching (super_admin only)
    Route::post('org/switch', function (Request $request) {
        $user = $request->user();

        if (! $user->isSuperAdmin()) {
            abort(403);
        }

        $orgId = $request->input('org_id');

        if ($orgId) {
            $org = \App\Models\Organization::find($orgId);
            if (! $org) {
                abort(404, 'Organization not found.');
            }
        }

        session(['current_org_id' => $orgId]);
        // Reset site context when switching org
        session()->forget('current_site_id');

        return back();
    })->name('org.switch');

    // Fetch sites for an organization (used by user form org selector)
    Route::get('api/organizations/{organization}/sites', function (\App\Models\Organization $organization) {
        return $organization->sites()->orderBy('name')->get(['id', 'name']);
    })->name('api.org.sites')->middleware('role:super_admin');

    // Site context switching
    Route::post('site/switch', function (Request $request) {
        $siteId = $request->input('site_id');
        $user = $request->user();

        if ($siteId && ! $user->canAccessSite((int) $siteId)) {
            abort(403);
        }

        session(['current_site_id' => $siteId]);

        return back();
    })->name('site.switch');

    // Activity Log routes
    Route::get('activity-log', [ActivityLogController::class, 'index'])
        ->middleware('permission:view activity log')
        ->name('activity-log');

    Route::get('activity-log/user/{userId}', [ActivityLogController::class, 'userActivity'])
        ->middleware('permission:view activity log')
        ->name('activity-log.user');

    Route::get('activity-log/{model}/{id}', [ActivityLogController::class, 'modelActivity'])
        ->middleware('permission:view activity log')
        ->name('activity-log.model');

    // File Upload routes - rate limited to prevent abuse
    Route::post('upload', [FileUploadController::class, 'upload'])
        ->middleware('throttle:20,1')
        ->name('upload');
    Route::post('upload/multiple', [FileUploadController::class, 'uploadMultiple'])
        ->middleware('throttle:10,1')
        ->name('upload.multiple');
    Route::get('upload/allowed-types', [FileUploadController::class, 'allowedTypes'])
        ->name('upload.allowed-types');
    Route::delete('upload/{path}', [FileUploadController::class, 'delete'])
        ->name('upload.delete')
        ->where('path', '.*');

    // File management routes
    Route::prefix('files')->name('files.')->group(function () {
        Route::get('{file}', [FileController::class, 'show'])->name('show');
        Route::get('{file}/serve', [FileController::class, 'serve'])->name('serve');
        Route::get('{file}/download', [FileController::class, 'download'])->name('download');
        Route::delete('{file}', [FileController::class, 'destroy'])->name('destroy');
        Route::patch('{file}/visibility', [FileUploadController::class, 'updateVisibility'])->name('visibility');
    });

    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-as-read');
    Route::post('notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-as-read');
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('notifications/read/delete-all', [NotificationController::class, 'deleteRead'])->name('notifications.delete-read');

    // Site onboarding wizard
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/onboard', [SiteOnboardingController::class, 'show'])->name('sites.onboard');
        Route::post('sites/{site}/onboard/gateway', [SiteOnboardingController::class, 'storeGateway'])->name('sites.onboard.gateway');
        Route::post('sites/{site}/onboard/devices', [SiteOnboardingController::class, 'storeDevices'])->name('sites.onboard.devices');
        Route::post('sites/{site}/onboard/modules', [SiteOnboardingController::class, 'activateModules'])->name('sites.onboard.modules');
        Route::post('sites/{site}/onboard/complete', [SiteOnboardingController::class, 'complete'])->name('sites.onboard.complete');
    });

    // Gateway management
    Route::middleware(['site.access', 'permission:manage devices'])->group(function () {
        Route::get('sites/{site}/gateways', [GatewayController::class, 'index'])->name('gateways.index');
        Route::post('sites/{site}/gateways', [GatewayController::class, 'store'])->name('gateways.store');
        Route::get('sites/{site}/gateways/{gateway}', [GatewayController::class, 'show'])->name('gateways.show');
        Route::delete('sites/{site}/gateways/{gateway}', [GatewayController::class, 'destroy'])->name('gateways.destroy');
    });

    // Device management
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/devices', [DeviceController::class, 'index'])->name('devices.index');
        Route::post('sites/{site}/devices', [DeviceController::class, 'store'])->name('devices.store')->middleware('permission:manage devices');
        Route::get('sites/{site}/devices/{device}', [DeviceController::class, 'show'])->name('devices.show');
        Route::put('sites/{site}/devices/{device}', [DeviceController::class, 'update'])->name('devices.update')->middleware('permission:manage devices');
        Route::delete('sites/{site}/devices/{device}', [DeviceController::class, 'destroy'])->name('devices.destroy')->middleware('permission:manage devices');
        Route::post('sites/{site}/devices/{device}/replace', [DeviceController::class, 'replace'])->name('devices.replace')->middleware('permission:manage devices');
    });

    // Floor plan management
    Route::middleware(['site.access', 'permission:manage devices'])->group(function () {
        Route::post('sites/{site}/floor-plans', [FloorPlanController::class, 'store'])->name('floor-plans.store');
        Route::put('sites/{site}/floor-plans/{floorPlan}', [FloorPlanController::class, 'update'])->name('floor-plans.update');
        Route::delete('sites/{site}/floor-plans/{floorPlan}', [FloorPlanController::class, 'destroy'])->name('floor-plans.destroy');
    });

    // Recipe management
    Route::get('recipes', [RecipeController::class, 'index'])->name('recipes.index');
    Route::get('recipes/{recipe}', [RecipeController::class, 'show'])->name('recipes.show');
    Route::middleware('role:super_admin')->group(function () {
        Route::post('recipes', [RecipeController::class, 'store'])->name('recipes.store');
        Route::put('recipes/{recipe}', [RecipeController::class, 'update'])->name('recipes.update');
        Route::delete('recipes/{recipe}', [RecipeController::class, 'destroy'])->name('recipes.destroy');
    });

    // Site, Device & Gateway index (monitor pages)
    Route::get('sites', [SiteDetailController::class, 'index'])->name('sites.index');
    Route::get('devices', [DeviceDetailController::class, 'index'])->name('devices.index');
    Route::get('settings/gateways', [GatewayController::class, 'globalIndex'])->name('gateways.global');

    // Site Comparison (Phase 11) — must be before sites/{site} to avoid wildcard capture
    Route::get('sites/compare', \App\Http\Controllers\SiteComparisonController::class)->name('sites.compare');
    Route::get('sites/compare/export', [\App\Http\Controllers\SiteComparisonController::class, 'export'])->name('sites.compare.export');

    // SLA & KPI Dashboard (Phase 11)
    Route::get('analytics/performance', \App\Http\Controllers\PerformanceAnalyticsController::class)->name('analytics.performance');

    // Site detail & zones
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/timeline', \App\Http\Controllers\SiteTimelineController::class)->name('sites.timeline');
        Route::get('sites/{site}/audit', \App\Http\Controllers\AuditModeController::class)->name('sites.audit');
        Route::get('sites/{site}/audit/export', [\App\Http\Controllers\AuditModeController::class, 'exportInsurancePackage'])->name('sites.audit.export');
        Route::get('sites/{site}/layout', [\App\Http\Controllers\SiteLayoutController::class, 'show'])->middleware('permission:manage devices')->name('sites.layout');
        Route::post('sites/{site}/layout', [\App\Http\Controllers\SiteLayoutController::class, 'save'])->middleware('permission:manage devices')->name('sites.layout.save');
        Route::get('sites/{site}', [SiteDetailController::class, 'show'])->name('sites.show');
        Route::get('sites/{site}/zones/{zone}', [SiteDetailController::class, 'zone'])->name('sites.zone');
    });

    // Device predictions (Phase 13)
    Route::get('devices/{device}/predictions', [\App\Http\Controllers\PredictiveAnalyticsController::class, 'devicePrediction'])->name('devices.predictions');

    // Device calibrations (Phase 12)
    Route::post('devices/{device}/calibrations', [\App\Http\Controllers\DeviceCalibrationController::class, 'store'])->name('calibrations.store');
    Route::delete('calibrations/{calibration}', [\App\Http\Controllers\DeviceCalibrationController::class, 'destroy'])->name('calibrations.destroy');

    // Device detail (public within org scope)
    Route::get('devices/{device}', [DeviceDetailController::class, 'show'])->name('devices.show');

    // Module dashboards
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/modules/iaq', [\App\Http\Controllers\ModuleDashboardController::class, 'iaq'])
            ->middleware('module.active:iaq')
            ->name('modules.iaq');
        Route::get('sites/{site}/modules/industrial', [\App\Http\Controllers\ModuleDashboardController::class, 'industrial'])
            ->middleware('module.active:industrial')
            ->name('modules.industrial');
    });

    // Report builder landing page
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');

    // Reports
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/reports/temperature', [ReportController::class, 'temperature'])->name('reports.temperature');
        Route::get('sites/{site}/reports/temperature/download', [ReportController::class, 'downloadTemperature'])->name('reports.temperature.download');
        Route::get('sites/{site}/reports/energy', [ReportController::class, 'energy'])->name('reports.energy');
        Route::get('sites/{site}/reports/energy/download', [ReportController::class, 'downloadEnergy'])->name('reports.energy.download');
        Route::get('sites/{site}/reports/summary', [ReportController::class, 'summary'])->name('reports.summary');
        Route::get('sites/{site}/reports/inventory', [ReportController::class, 'inventory'])->name('reports.inventory');
    });

    // Temperature Verifications (BLD-04)
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/verifications', [TemperatureVerificationController::class, 'index'])->name('sites.verifications');
        Route::post('sites/{site}/verifications', [TemperatureVerificationController::class, 'store'])->name('sites.verifications.store');
    });

    // Module management (per site)
    Route::middleware(['site.access', 'permission:manage devices'])->group(function () {
        Route::get('sites/{site}/modules', [ModuleController::class, 'index'])->name('modules.index');
        Route::post('sites/{site}/modules/{module}/toggle', [ModuleController::class, 'toggle'])->name('modules.toggle');
    });

    // Alert management
    Route::get('alerts', [AlertController::class, 'index'])->name('alerts.index');
    Route::get('alerts/{alert}', [AlertController::class, 'show'])->name('alerts.show');
    Route::post('alerts/{alert}/acknowledge', [AlertController::class, 'acknowledge'])->name('alerts.acknowledge');
    Route::post('alerts/{alert}/resolve', [AlertController::class, 'resolve'])->name('alerts.resolve');
    Route::post('alerts/{alert}/dismiss', [AlertController::class, 'dismiss'])->name('alerts.dismiss');

    // Bulk Operations (Phase 11)
    Route::post('alerts/bulk-acknowledge', [AlertController::class, 'bulkAcknowledge'])->name('alerts.bulk-acknowledge');
    Route::post('alerts/bulk-resolve', [AlertController::class, 'bulkResolve'])->name('alerts.bulk-resolve');
    Route::post('work-orders/bulk-assign', [WorkOrderController::class, 'bulkAssign'])->name('work-orders.bulk-assign');

    // Alert Snooze (Phase 11)
    Route::post('alerts/{alert}/snooze', [AlertController::class, 'snooze'])->name('alerts.snooze');
    Route::delete('alerts/{alert}/snooze', [AlertController::class, 'unsnooze'])->name('alerts.unsnooze');

    // Corrective Actions (Phase 10)
    Route::post('alerts/{alert}/corrective-actions', [CorrectiveActionController::class, 'store'])
        ->name('corrective-actions.store');
    Route::post('alerts/{alert}/corrective-actions/{correctiveAction}/verify', [CorrectiveActionController::class, 'verify'])
        ->name('corrective-actions.verify');

    // Alert Analytics (Phase 10)
    Route::get('analytics/alerts', AlertAnalyticsController::class)->name('analytics.alerts');

    // Maintenance Windows (Phase 10)
    Route::prefix('settings/maintenance-windows')->name('maintenance-windows.')->group(function () {
        Route::get('/', [MaintenanceWindowController::class, 'index'])->name('index');
        Route::post('/', [MaintenanceWindowController::class, 'store'])->name('store');
        Route::put('{maintenanceWindow}', [MaintenanceWindowController::class, 'update'])->name('update');
        Route::delete('{maintenanceWindow}', [MaintenanceWindowController::class, 'destroy'])->name('destroy');
    });

    // Data Export (Phase 10)
    Route::prefix('settings/export-data')->name('export-data.')->group(function () {
        Route::get('/', [DataExportController::class, 'index'])->name('index');
        Route::post('/', [DataExportController::class, 'store'])->name('store');
    });

    // Site Templates (Phase 10)
    Route::prefix('settings/site-templates')->name('site-templates.')->group(function () {
        Route::get('/', [SiteTemplateController::class, 'index'])->name('index');
        Route::post('/', [SiteTemplateController::class, 'store'])->name('store');
        Route::delete('{siteTemplate}', [SiteTemplateController::class, 'destroy'])->name('destroy');
        Route::post('{siteTemplate}/apply', [SiteTemplateController::class, 'apply'])->name('apply');
    });

    // Report Schedules (Phase 10)
    Route::prefix('settings/report-schedules')->name('report-schedules.')->group(function () {
        Route::get('/', [ReportScheduleController::class, 'index'])->name('index');
        Route::post('/', [ReportScheduleController::class, 'store'])->name('store');
        Route::put('{reportSchedule}', [ReportScheduleController::class, 'update'])->name('update');
        Route::delete('{reportSchedule}', [ReportScheduleController::class, 'destroy'])->name('destroy');
    });

    // Alert rules (per site)
    Route::middleware(['site.access', 'permission:manage alert rules'])->group(function () {
        Route::get('sites/{site}/rules', [AlertRuleController::class, 'index'])->name('rules.index');
        Route::get('sites/{site}/rules/create', [AlertRuleController::class, 'create'])->name('rules.create');
        Route::post('sites/{site}/rules', [AlertRuleController::class, 'store'])->name('rules.store');
        Route::get('sites/{site}/rules/{rule}', [AlertRuleController::class, 'show'])->name('rules.show');
        Route::get('sites/{site}/rules/{rule}/edit', [AlertRuleController::class, 'edit'])->name('rules.edit');
        Route::put('sites/{site}/rules/{rule}', [AlertRuleController::class, 'update'])->name('rules.update');
        Route::delete('sites/{site}/rules/{rule}', [AlertRuleController::class, 'destroy'])->name('rules.destroy');
    });

    // Export download route
    Route::get('exports/download', function (Request $request) {
        $path = $request->query('path');

        if (! $path || ! \Illuminate\Support\Facades\Storage::disk('local')->exists($path)) {
            abort(404, 'Export file not found');
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->download($path);
    })->name('exports.download');

    // Work Orders
    Route::get('work-orders', [WorkOrderController::class, 'index'])->name('work-orders.index');
    Route::get('work-orders/{workOrder}', [WorkOrderController::class, 'show'])->name('work-orders.show');
    Route::middleware(['site.access'])->group(function () {
        Route::post('sites/{site}/work-orders', [WorkOrderController::class, 'store'])->name('work-orders.store');
    });
    Route::put('work-orders/{workOrder}/status', [WorkOrderController::class, 'updateStatus'])->name('work-orders.update-status');
    Route::post('work-orders/{workOrder}/photos', [WorkOrderController::class, 'addPhoto'])->name('work-orders.add-photo');
    Route::post('work-orders/{workOrder}/notes', [WorkOrderController::class, 'addNote'])->name('work-orders.add-note');

    // Command Center (super_admin only)
    Route::middleware('role:super_admin')->prefix('command-center')->name('command-center.')->group(function () {
        Route::get('/', [CommandCenterController::class, 'index'])->name('index');
        Route::get('/alerts', [CommandCenterController::class, 'alerts'])->name('alerts');
        Route::get('/work-orders', [CommandCenterController::class, 'workOrders'])->name('work-orders');
        Route::get('/devices', [CommandCenterController::class, 'devices'])->name('devices');
        Route::get('/revenue', [CommandCenterController::class, 'revenue'])->name('revenue');
        Route::get('/dispatch', [CommandCenterController::class, 'dispatch'])->name('dispatch');
        Route::post('/outage', [CommandCenterController::class, 'declareOutage'])->name('outage.declare');
        Route::delete('/outage', [CommandCenterController::class, 'resolveOutage'])->name('outage.resolve');
        Route::get('/{organization}', [CommandCenterController::class, 'show'])->name('show');
    });

    // Billing
    Route::prefix('settings/billing')->name('billing.')->group(function () {
        Route::get('/', [BillingController::class, 'dashboard'])->name('dashboard');
        Route::get('/profiles', [BillingController::class, 'profiles'])->name('profiles');
        Route::post('/profiles', [BillingController::class, 'storeProfile'])->name('profiles.store');
        Route::put('/profiles/{profile}', [BillingController::class, 'updateProfile'])->name('profiles.update');
        Route::delete('/profiles/{profile}', [BillingController::class, 'destroyProfile'])->name('profiles.destroy');
        Route::post('/generate-invoice', [BillingController::class, 'generateInvoice'])->name('generate-invoice');
        Route::post('/invoices/{invoice}/mark-paid', [BillingController::class, 'markInvoicePaid'])->name('invoices.mark-paid');
        Route::post('/invoices/{invoice}/cancel', [BillingController::class, 'cancelInvoice'])->name('invoices.cancel');
        Route::post('/invoices/{invoice}/cdp', [BillingController::class, 'generateCdp'])->name('invoices.cdp');
        Route::get('/invoices/{invoice}/download/{format}', [BillingController::class, 'downloadInvoice'])
            ->name('invoices.download')
            ->where('format', 'pdf|xml');
    });

    // API Keys
    Route::middleware('permission:manage org settings')->group(function () {
        Route::get('settings/api-keys', [ApiKeyController::class, 'index'])->name('api-keys.index');
        Route::post('settings/api-keys', [ApiKeyController::class, 'store'])->name('api-keys.store');
        Route::delete('settings/api-keys/{apiKey}', [ApiKeyController::class, 'destroy'])->name('api-keys.destroy');
    });

    // Integrations
    Route::middleware('permission:manage org settings')->group(function () {
        Route::get('settings/integrations', [IntegrationController::class, 'index'])->name('integrations.index');
        Route::post('settings/integrations', [IntegrationController::class, 'store'])->name('integrations.store');
    });

    // Site Management
    Route::middleware('permission:manage sites')->prefix('settings/sites')->name('sites.settings.')->group(function () {
        Route::get('/', [SiteSettingsController::class, 'index'])->name('index');
        Route::get('batch-import', [SiteSettingsController::class, 'batchImport'])->name('batch-import');
        Route::post('batch-import', [SiteSettingsController::class, 'processBatchImport'])->name('batch-import.process');
        Route::post('/', [SiteSettingsController::class, 'store'])->name('store');
        Route::put('{site}', [SiteSettingsController::class, 'update'])->name('update');
        Route::delete('{site}', [SiteSettingsController::class, 'destroy'])->name('destroy');
    });

    // User Management
    Route::middleware('permission:manage users')->prefix('settings/users')->name('users.')->group(function () {
        Route::get('/', [UserManagementController::class, 'index'])->name('index');
        Route::get('{user}', [UserManagementController::class, 'show'])->name('show');
        Route::post('/', [UserManagementController::class, 'store'])->name('store');
        Route::put('{user}', [UserManagementController::class, 'update'])->name('update');
        Route::delete('{user}', [UserManagementController::class, 'destroy'])->name('destroy');
        Route::post('{user}/deactivate', [UserManagementController::class, 'deactivate'])->name('deactivate');
        Route::post('{user}/reactivate', [UserManagementController::class, 'reactivate'])->name('reactivate');
    });

    // Compliance Calendar
    Route::prefix('settings/compliance')->name('compliance.')->group(function () {
        Route::get('/', [ComplianceCalendarController::class, 'index'])->name('index');
        Route::post('/', [ComplianceCalendarController::class, 'store'])->name('store');
        Route::put('{complianceEvent}', [ComplianceCalendarController::class, 'update'])->name('update');
        Route::post('{complianceEvent}/complete', [ComplianceCalendarController::class, 'complete'])->name('complete');
        Route::delete('{complianceEvent}', [ComplianceCalendarController::class, 'destroy'])->name('destroy');
    });

    // Escalation Chains
    Route::middleware('permission:manage alert rules')->prefix('settings/escalation-chains')->name('escalation-chains.')->group(function () {
        Route::get('/', [EscalationChainController::class, 'index'])->name('index');
        Route::post('/', [EscalationChainController::class, 'store'])->name('store');
        Route::put('{escalationChain}', [EscalationChainController::class, 'update'])->name('update');
        Route::delete('{escalationChain}', [EscalationChainController::class, 'destroy'])->name('destroy');
    });

    // Recipe Overrides
    Route::post('recipes/{recipe}/overrides', [RecipeController::class, 'storeOverride'])->name('recipes.overrides.store');

    // Organization Catalog (super_admin)
    // Organization catalog — super_admin only (list, lifecycle, notes)
    Route::middleware('role:super_admin')->prefix('settings/organizations')->name('organizations.')->group(function () {
        Route::get('/', [OrganizationCatalogController::class, 'index'])->name('index');
        Route::post('{organization}/suspend', [OrganizationCatalogController::class, 'suspend'])->name('suspend');
        Route::post('{organization}/reactivate', [OrganizationCatalogController::class, 'reactivate'])->name('reactivate');
        Route::post('{organization}/notes', [OrganizationCatalogController::class, 'storeNote'])->name('notes.store');
        Route::delete('{organization}/notes/{note}', [OrganizationCatalogController::class, 'destroyNote'])->name('notes.destroy');
        Route::post('{organization}/export', [OrganizationCatalogController::class, 'export'])->name('export');
        Route::delete('{organization}', [OrganizationCatalogController::class, 'destroy'])->name('destroy');
    });

    // Organization show/edit — super_admin OR org admin for their own org
    Route::prefix('settings/organizations')->name('organizations.')->group(function () {
        Route::get('{organization}', [OrganizationCatalogController::class, 'show'])->name('show');
        Route::get('{organization}/edit', [OrganizationCatalogController::class, 'edit'])->name('edit');
        Route::put('{organization}', [OrganizationCatalogController::class, 'update'])->name('update');
        Route::post('{organization}/logo', [OrganizationCatalogController::class, 'uploadLogo'])->name('logo.upload');
        Route::delete('{organization}/logo', [OrganizationCatalogController::class, 'deleteLogo'])->name('logo.delete');
    });

    // Module Catalog (super_admin)
    Route::middleware('role:super_admin')->prefix('settings/modules-catalog')->name('modules-catalog.')->group(function () {
        Route::get('/', [ModuleCatalogController::class, 'index'])->name('index');
        Route::post('/', [ModuleCatalogController::class, 'store'])->name('store');
        Route::put('{module}', [ModuleCatalogController::class, 'update'])->name('update');
        Route::delete('{module}', [ModuleCatalogController::class, 'destroy'])->name('destroy');
    });

    // Segment Catalog (super_admin)
    Route::middleware('role:super_admin')->prefix('settings/segments')->name('segments.')->group(function () {
        Route::get('/', [SegmentController::class, 'index'])->name('index');
        Route::post('/', [SegmentController::class, 'store'])->name('store');
        Route::put('{segment}', [SegmentController::class, 'update'])->name('update');
        Route::delete('{segment}', [SegmentController::class, 'destroy'])->name('destroy');
    });

    // Sensor Model Catalog (super_admin)
    Route::middleware('role:super_admin')->prefix('settings/sensor-models')->name('sensor-models.')->group(function () {
        Route::get('/', [SensorModelController::class, 'index'])->name('index');
        Route::post('/', [SensorModelController::class, 'store'])->name('store');
        Route::put('{sensorModel}', [SensorModelController::class, 'update'])->name('update');
        Route::delete('{sensorModel}', [SensorModelController::class, 'destroy'])->name('destroy');
    });

    // Partner Portal (super_admin)
    Route::middleware('role:super_admin')->group(function () {
        Route::get('partner', [PartnerController::class, 'index'])->name('partner.index');
        Route::post('partner', [PartnerController::class, 'store'])->name('partner.store');
        Route::post('partner/{organization}/suspend', [PartnerController::class, 'suspend'])->name('partner.suspend');
        Route::post('partner/{organization}/archive', [PartnerController::class, 'archive'])->name('partner.archive');
    });
});

require __DIR__.'/settings.php';
