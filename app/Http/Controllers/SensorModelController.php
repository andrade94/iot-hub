<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\SensorModel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SensorModelController extends Controller
{
    public function index()
    {
        $sensorModels = SensorModel::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (SensorModel $model) => [
                'id' => $model->id,
                'name' => $model->name,
                'label' => $model->label,
                'manufacturer' => $model->manufacturer,
                'description' => $model->description,
                'supported_metrics' => $model->supported_metrics ?? [],
                'valid_ranges' => $model->valid_ranges,
                'monthly_fee' => $model->monthly_fee,
                'decoder_class' => $model->decoder_class,
                'icon' => $model->icon,
                'color' => $model->color,
                'active' => $model->active,
                'sort_order' => $model->sort_order,
                'devices_count' => Device::where('model', $model->name)->count(),
                'created_at' => $model->created_at->toIso8601String(),
                'updated_at' => $model->updated_at->toIso8601String(),
            ]);

        return Inertia::render('settings/sensor-models/index', [
            'sensorModels' => $sensorModels,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:sensor_models,name',
            'label' => 'required|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'supported_metrics' => 'required|array|min:1',
            'supported_metrics.*' => 'string|max:100',
            'valid_ranges' => 'nullable|array',
            'monthly_fee' => 'nullable|numeric|min:0|max:99999999.99',
            'decoder_class' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        // Default manufacturer to Milesight if not provided
        $validated['manufacturer'] = $validated['manufacturer'] ?: 'Milesight';

        SensorModel::create($validated);

        return back()->with('success', "Sensor model '{$validated['name']}' created.");
    }

    public function update(Request $request, SensorModel $sensorModel)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('sensor_models', 'name')->ignore($sensorModel->id)],
            'label' => 'required|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'supported_metrics' => 'required|array|min:1',
            'supported_metrics.*' => 'string|max:100',
            'valid_ranges' => 'nullable|array',
            'monthly_fee' => 'nullable|numeric|min:0|max:99999999.99',
            'decoder_class' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        // If the name changed, cascade to devices that reference the old model name
        if ($sensorModel->name !== $validated['name']) {
            Device::where('model', $sensorModel->name)->update(['model' => $validated['name']]);
        }

        $validated['manufacturer'] = $validated['manufacturer'] ?: 'Milesight';

        $sensorModel->update($validated);

        return back()->with('success', "Sensor model '{$sensorModel->name}' updated.");
    }

    public function destroy(SensorModel $sensorModel)
    {
        $deviceCount = Device::where('model', $sensorModel->name)->count();

        if ($deviceCount > 0) {
            return back()->with('error', "Cannot delete sensor model '{$sensorModel->name}' — {$deviceCount} device(s) still reference it.");
        }

        $sensorModel->delete();

        return back()->with('success', "Sensor model '{$sensorModel->name}' deleted.");
    }
}
