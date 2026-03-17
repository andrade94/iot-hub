<?php

use App\Http\Controllers\Api\AlertApiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardApiController;
use App\Http\Controllers\Api\DeviceApiController;
use App\Http\Controllers\Api\NotificationApiController;
use App\Http\Controllers\Api\PushTokenApiController;
use App\Http\Controllers\Api\SiteApiController;
use App\Http\Controllers\Api\WhatsAppWebhookController;
use App\Http\Controllers\Api\WorkOrderApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Auth (no Sanctum — issues tokens)
|--------------------------------------------------------------------------
*/

Route::post('auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| API Routes (Sanctum-protected)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // ── Auth ─────────────────────────────────────────────────────
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/user', [AuthController::class, 'user']);

    // ── Dashboard ────────────────────────────────────────────────
    Route::get('dashboard', DashboardApiController::class);

    // ── Sites & Zones ────────────────────────────────────────────
    Route::get('sites', [SiteApiController::class, 'index']);
    Route::get('sites/{site}', [SiteApiController::class, 'show']);
    Route::get('sites/{site}/zones/{zone}', [SiteApiController::class, 'zone']);

    // ── Devices ──────────────────────────────────────────────────
    Route::get('sites/{site}/devices', [DeviceApiController::class, 'index']);
    Route::get('devices/{device}', [DeviceApiController::class, 'show']);
    Route::get('devices/{device}/readings', [DeviceApiController::class, 'readings']);
    Route::get('devices/{device}/status', [DeviceApiController::class, 'status']);

    // ── Alerts ───────────────────────────────────────────────────
    Route::get('alerts', [AlertApiController::class, 'index']);
    Route::get('alerts/{alert}', [AlertApiController::class, 'show']);
    Route::post('alerts/{alert}/acknowledge', [AlertApiController::class, 'acknowledge']);
    Route::post('alerts/{alert}/resolve', [AlertApiController::class, 'resolve']);

    // ── Work Orders ──────────────────────────────────────────────
    Route::get('work-orders', [WorkOrderApiController::class, 'index']);
    Route::get('work-orders/{workOrder}', [WorkOrderApiController::class, 'show']);
    Route::post('sites/{site}/work-orders', [WorkOrderApiController::class, 'store']);
    Route::put('work-orders/{workOrder}/status', [WorkOrderApiController::class, 'updateStatus']);
    Route::post('work-orders/{workOrder}/photos', [WorkOrderApiController::class, 'storePhoto']);
    Route::post('work-orders/{workOrder}/notes', [WorkOrderApiController::class, 'storeNote']);

    // ── Notifications ────────────────────────────────────────────
    Route::get('notifications', [NotificationApiController::class, 'index']);
    Route::post('notifications/mark-all-read', [NotificationApiController::class, 'markAllRead']);

    // ── Push Tokens ──────────────────────────────────────────────
    Route::post('push-tokens', [PushTokenApiController::class, 'store']);
    Route::delete('push-tokens/{token}', [PushTokenApiController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Webhooks (no auth)
|--------------------------------------------------------------------------
*/

// WhatsApp (Twilio) webhook for alert acknowledgment
Route::post('whatsapp/webhook', WhatsAppWebhookController::class);
