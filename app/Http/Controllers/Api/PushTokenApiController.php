<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenApiController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:255',
            'device_name' => 'nullable|string|max:255',
            'platform' => 'required|string|in:ios,android',
        ]);

        $pushToken = PushToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $request->user()->id,
                'device_name' => $validated['device_name'],
                'platform' => $validated['platform'],
            ]
        );

        return response()->json([
            'data' => [
                'id' => $pushToken->id,
                'token' => $pushToken->token,
                'platform' => $pushToken->platform,
            ],
        ], 201);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $deleted = PushToken::where('token', $token)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (! $deleted) {
            abort(404, 'Push token not found.');
        }

        return response()->json([
            'data' => ['message' => 'Push token removed.'],
        ]);
    }
}
