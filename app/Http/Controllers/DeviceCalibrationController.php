<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\DeviceCalibration;
use Illuminate\Http\Request;

class DeviceCalibrationController extends Controller
{
    public function store(Request $request, Device $device)
    {
        $this->authorize('update', $device);

        $validated = $request->validate([
            'calibrated_at' => 'required|date|before_or_equal:today',
            'expires_at' => 'required|date|after:calibrated_at',
            'calibrated_by' => 'nullable|string|max:255',
            'method' => 'nullable|string|in:comparison,laboratory,reference_bath',
            'notes' => 'nullable|string|max:1000',
            'certificate' => 'nullable|file|mimes:pdf|max:10240',
        ]);

        $certificatePath = null;
        if ($request->hasFile('certificate')) {
            $certificatePath = $request->file('certificate')->store('calibration-certificates', 'public');
        }

        DeviceCalibration::create([
            'device_id' => $device->id,
            'calibrated_at' => $validated['calibrated_at'],
            'expires_at' => $validated['expires_at'],
            'calibrated_by' => $validated['calibrated_by'] ?? null,
            'method' => $validated['method'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'certificate_path' => $certificatePath,
            'uploaded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Calibration record added.');
    }

    public function destroy(DeviceCalibration $calibration)
    {
        $this->authorize('update', $calibration->device);

        if ($calibration->certificate_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($calibration->certificate_path);
        }

        $calibration->delete();

        return back()->with('success', 'Calibration record deleted.');
    }
}
