<?php

use App\Http\Controllers\Api\DeviceApiController;
use App\Http\Controllers\Api\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (Sanctum-protected)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    // Site devices
    Route::get('sites/{site}/devices', [DeviceApiController::class, 'index']);

    // Device readings & status
    Route::get('devices/{device}/readings', [DeviceApiController::class, 'readings']);
    Route::get('devices/{device}/status', [DeviceApiController::class, 'status']);
});

/*
|--------------------------------------------------------------------------
| Webhooks (no auth)
|--------------------------------------------------------------------------
*/

// WhatsApp (Twilio) webhook for alert acknowledgment
Route::post('whatsapp/webhook', WhatsAppWebhookController::class);
