<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\User;
use App\Services\WhatsApp\TwilioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    public function __invoke(Request $request, TwilioService $twilioService): JsonResponse
    {
        $result = $twilioService->processWebhook($request->all());

        if (! $result) {
            return response()->json(['status' => 'ignored']);
        }

        $user = User::where('whatsapp_phone', $result['phone'])->first();
        if (! $user) {
            return response()->json(['status' => 'user_not_found'], 404);
        }

        // Find the most recent active alert for this user's sites
        $siteIds = $user->accessibleSites()->pluck('id');
        $alert = Alert::whereIn('site_id', $siteIds)
            ->where('status', 'active')
            ->latest('triggered_at')
            ->first();

        if (! $alert) {
            return response()->json(['status' => 'no_active_alert']);
        }

        match ($result['action']) {
            'acknowledge' => $alert->acknowledge($user->id),
            'escalate' => null, // Escalation handled by EscalationService
            default => null,
        };

        return response()->json([
            'status' => 'ok',
            'action' => $result['action'],
            'alert_id' => $alert->id,
        ]);
    }
}
