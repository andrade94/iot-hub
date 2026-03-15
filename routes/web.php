<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AlertController;
use App\Http\Controllers\AlertRuleController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CommandCenterController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DeviceDetailController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\FloorPlanController;
use App\Http\Controllers\GatewayController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SiteDetailController;
use App\Http\Controllers\SiteOnboardingController;
use App\Http\Controllers\WorkOrderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Locale switching
Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth', 'verified', 'org.scope'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

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

    // Site detail & zones
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}', [SiteDetailController::class, 'show'])->name('sites.show');
        Route::get('sites/{site}/zones/{zone}', [SiteDetailController::class, 'zone'])->name('sites.zone');
    });

    // Device detail (public within org scope)
    Route::get('devices/{device}', [DeviceDetailController::class, 'show'])->name('devices.show');

    // Reports
    Route::middleware('site.access')->group(function () {
        Route::get('sites/{site}/reports/temperature', [ReportController::class, 'temperature'])->name('reports.temperature');
        Route::get('sites/{site}/reports/energy', [ReportController::class, 'energy'])->name('reports.energy');
        Route::get('sites/{site}/reports/summary', [ReportController::class, 'summary'])->name('reports.summary');
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

    // Alert rules (per site)
    Route::middleware(['site.access', 'permission:manage alert rules'])->group(function () {
        Route::get('sites/{site}/rules', [AlertRuleController::class, 'index'])->name('rules.index');
        Route::post('sites/{site}/rules', [AlertRuleController::class, 'store'])->name('rules.store');
        Route::get('sites/{site}/rules/{rule}', [AlertRuleController::class, 'show'])->name('rules.show');
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
    });

    // Billing
    Route::prefix('settings/billing')->name('billing.')->group(function () {
        Route::get('/', [BillingController::class, 'dashboard'])->name('dashboard');
        Route::get('/profiles', [BillingController::class, 'profiles'])->name('profiles');
        Route::post('/profiles', [BillingController::class, 'storeProfile'])->name('profiles.store');
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

    // Partner Portal (super_admin)
    Route::middleware('role:super_admin')->group(function () {
        Route::get('partner', [PartnerController::class, 'index'])->name('partner.index');
    });
});

require __DIR__.'/settings.php';
