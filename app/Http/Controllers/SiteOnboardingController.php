<?php

namespace App\Http\Controllers;

use App\Models\Gateway;
use App\Models\Module;
use App\Models\Recipe;
use App\Models\Site;
use App\Services\ChirpStack\DeviceProvisioner;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteOnboardingController extends Controller
{
    /**
     * Show the onboarding wizard for a site.
     */
    public function show(Request $request, Site $site)
    {
        $site->load(['gateways', 'devices', 'floorPlans', 'modules']);

        $modules = Module::with('recipes')->get();
        $recipes = Recipe::with('module')->get();

        $step = $request->query('step', $this->determineCurrentStep($site));

        return Inertia::render('settings/sites/onboard', [
            'site' => $site,
            'modules' => $modules,
            'recipes' => $recipes,
            'currentStep' => $step,
            'steps' => $this->getStepStatuses($site),
        ]);
    }

    /**
     * Register a gateway during onboarding.
     */
    public function storeGateway(Request $request, Site $site)
    {
        $validated = $request->validate([
            'model' => 'required|string|max:255',
            'serial' => 'required|string|max:255',
            'is_addon' => 'boolean',
        ]);

        $gateway = $site->gateways()->create($validated);

        // Provision gateway in ChirpStack
        $provisioner = app(DeviceProvisioner::class);
        if (! $provisioner->provisionGateway($gateway)) {
            return back()->with('warning', 'Gateway saved but ChirpStack provisioning failed. Retry from gateway settings.');
        }

        return back()->with('success', 'Gateway registered and provisioned.');
    }

    /**
     * Register devices during onboarding.
     */
    public function storeDevices(Request $request, Site $site)
    {
        $validated = $request->validate([
            'devices' => 'required|array|min:1',
            'devices.*.model' => 'required|string|max:255',
            'devices.*.dev_eui' => 'required|string|max:32|unique:devices,dev_eui',
            'devices.*.name' => 'required|string|max:255',
            'devices.*.zone' => 'nullable|string|max:255',
            'devices.*.gateway_id' => 'nullable|exists:gateways,id',
            'devices.*.recipe_id' => 'nullable|exists:recipes,id',
        ]);

        $provisioner = app(DeviceProvisioner::class);
        $provisionedCount = 0;
        $failedCount = 0;

        foreach ($validated['devices'] as $deviceData) {
            $device = $site->devices()->create(array_merge($deviceData, [
                'status' => 'pending',
            ]));

            // Provision device in ChirpStack if application/profile IDs are configured
            $applicationId = config('services.chirpstack.application_id', '');
            $deviceProfileId = config('services.chirpstack.device_profile_id', '');

            if ($applicationId && $deviceProfileId) {
                if ($provisioner->provisionDevice($device, $applicationId, $deviceProfileId)) {
                    $provisionedCount++;
                } else {
                    $failedCount++;
                }
            }
        }

        $message = count($validated['devices']).' device(s) registered.';
        if ($provisionedCount > 0) {
            $message .= " {$provisionedCount} provisioned in ChirpStack.";
        }
        if ($failedCount > 0) {
            return back()->with('warning', $message." {$failedCount} failed provisioning — retry from device settings.");
        }

        return back()->with('success', $message);
    }

    /**
     * Activate modules during onboarding.
     */
    public function activateModules(Request $request, Site $site)
    {
        $validated = $request->validate([
            'module_ids' => 'required|array|min:1',
            'module_ids.*' => 'exists:modules,id',
        ]);

        foreach ($validated['module_ids'] as $moduleId) {
            $site->modules()->syncWithoutDetaching([
                $moduleId => ['activated_at' => now()],
            ]);
        }

        return back()->with('success', 'Modules activated.');
    }

    /**
     * Complete onboarding.
     */
    public function complete(Request $request, Site $site)
    {
        $site->update(['status' => 'active']);

        return redirect()->route('dashboard')->with('success', "Site '{$site->name}' is now active.");
    }

    /**
     * Determine the current step based on site state.
     */
    protected function determineCurrentStep(Site $site): int
    {
        if ($site->gateways->isEmpty()) {
            return 1; // Register gateway
        }
        if ($site->devices->isEmpty()) {
            return 2; // Register devices
        }
        if ($site->floorPlans->isEmpty()) {
            return 3; // Upload floor plans
        }
        if ($site->modules->isEmpty()) {
            return 4; // Activate modules
        }

        return 5; // Review & complete
    }

    /**
     * Get step completion statuses.
     */
    protected function getStepStatuses(Site $site): array
    {
        return [
            ['label' => 'Gateway', 'completed' => $site->gateways->isNotEmpty()],
            ['label' => 'Devices', 'completed' => $site->devices->isNotEmpty()],
            ['label' => 'Floor Plans', 'completed' => $site->floorPlans->isNotEmpty()],
            ['label' => 'Modules', 'completed' => $site->modules->isNotEmpty()],
            ['label' => 'Complete', 'completed' => $site->status === 'active'],
        ];
    }
}
