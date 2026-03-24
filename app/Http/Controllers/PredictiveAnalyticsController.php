<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Services\Analytics\PredictiveAnalyticsService;
use Illuminate\Http\Request;

class PredictiveAnalyticsController extends Controller
{
    public function devicePrediction(Request $request, Device $device, PredictiveAnalyticsService $service)
    {
        return response()->json($service->analyzeDevice($device));
    }
}
