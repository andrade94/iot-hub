<?php

namespace App\Http\Controllers;

use App\Models\Gateway;
use App\Models\Module;
use App\Models\Recipe;
use App\Models\Site;
use App\Services\ChirpStack\DeviceProvisioner;
use App\Services\Recipes\RecipeApplicationService;
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

        $org = $site->organization;
        $segmentSuggestions = $this->getSegmentSuggestions($org?->segment);

        // Check ChirpStack configuration
        $chirpstackConfigured = ! empty(config('services.chirpstack.url'))
            && ! empty(config('services.chirpstack.api_key'));

        return Inertia::render('settings/sites/onboard', [
            'site' => $site,
            'modules' => $modules,
            'recipes' => $recipes,
            'currentStep' => $step,
            'steps' => $this->getStepStatuses($site),
            'segmentSuggestions' => $segmentSuggestions,
            'chirpstackConfigured' => $chirpstackConfigured,
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

        // Apply recipes from active modules to newly registered devices
        $activeModuleIds = $site->modules()->wherePivot('activated_at', '!=', null)->pluck('modules.id');
        $recipeRulesCreated = 0;
        if ($activeModuleIds->isNotEmpty()) {
            $recipeService = app(RecipeApplicationService::class);
            foreach ($activeModuleIds as $moduleId) {
                $module = Module::find($moduleId);
                if ($module) {
                    $recipeRulesCreated += $recipeService->applyModuleRecipes($site, $module);
                }
            }
        }

        $message = count($validated['devices']).' device(s) registered.';
        if ($provisionedCount > 0) {
            $message .= " {$provisionedCount} provisioned in ChirpStack.";
        }
        if ($recipeRulesCreated > 0) {
            $message .= " {$recipeRulesCreated} alert rule(s) auto-created.";
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

        // Apply recipes from activated modules to existing devices
        $recipeService = app(RecipeApplicationService::class);
        $totalRules = 0;
        foreach ($validated['module_ids'] as $moduleId) {
            $module = Module::find($moduleId);
            if ($module) {
                $totalRules += $recipeService->applyModuleRecipes($site, $module);
            }
        }

        $message = 'Modules activated.';
        if ($totalRules > 0) {
            $message .= " {$totalRules} alert rule(s) auto-created.";
        }

        return back()->with('success', $message);
    }

    /**
     * Complete onboarding.
     */
    public function complete(Request $request, Site $site)
    {
        // Validate minimum onboarding requirements
        $warnings = [];
        if ($site->gateways->isEmpty()) {
            $warnings[] = 'No gateway registered.';
        }
        if ($site->devices->isEmpty()) {
            $warnings[] = 'No devices registered.';
        }
        if ($site->modules->isEmpty()) {
            $warnings[] = 'No modules activated.';
        }

        // Check escalation chain
        $hasEscalationChain = \App\Models\EscalationChain::where('site_id', $site->id)->exists();
        if (! $hasEscalationChain) {
            $warnings[] = 'No escalation chain configured — alert notifications will not be delivered.';
        }

        $site->update(['status' => 'active']);

        // BR-072: Auto-create default weekly temperature compliance report schedule
        \App\Models\ReportSchedule::firstOrCreate(
            ['site_id' => $site->id, 'org_id' => $site->org_id, 'type' => 'temperature_compliance'],
            [
                'frequency' => 'weekly',
                'day_of_week' => 1, // Monday
                'time' => '08:00',
                'recipients_json' => \App\Models\User::where('org_id', $site->org_id)
                    ->role('org_admin')
                    ->pluck('email')
                    ->take(3)
                    ->toArray(),
                'active' => true,
                'created_by' => $request->user()->id,
            ]
        );

        $message = "Site '{$site->name}' is now active.";
        if (! empty($warnings)) {
            $message .= ' Warnings: '.implode(' ', $warnings);
            return redirect()->route('dashboard')->with('warning', $message);
        }

        return redirect()->route('dashboard')->with('success', $message);
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
            ['label' => 'Floor Plans', 'completed' => $site->floorPlans->isNotEmpty(), 'optional' => true],
            ['label' => 'Modules', 'completed' => $site->modules->isNotEmpty()],
            ['label' => 'Escalation', 'completed' => \App\Models\EscalationChain::where('site_id', $site->id)->exists()],
            ['label' => 'Complete', 'completed' => $site->status === 'active'],
        ];
    }

    /**
     * Get module and sensor suggestions based on organization segment.
     *
     * @return array{modules: string[], sensor_models: string[], description: string}
     */
    protected function getSegmentSuggestions(?string $segment): array
    {
        $suggestions = [
            'cold_chain' => [
                'modules' => ['cold_chain', 'compliance', 'safety'],
                'sensor_models' => ['EM300-TH', 'WS301'],
                'description' => 'Cold chain monitoring: temperature sensors for coolers/freezers, door sensors for access control, COFEPRIS compliance.',
            ],
            'energy' => [
                'modules' => ['energy'],
                'sensor_models' => ['CT101'],
                'description' => 'Energy monitoring: current transformers on circuits for consumption tracking and cost analysis.',
            ],
            'industrial' => [
                'modules' => ['industrial', 'energy', 'safety'],
                'sensor_models' => ['CT101', 'EM310-UDL', 'EM300-PT'],
                'description' => 'Industrial monitoring: vibration, pressure, compressed air, and energy for production equipment.',
            ],
            'commercial' => [
                'modules' => ['iaq', 'energy', 'people'],
                'sensor_models' => ['AM307', 'CT101', 'VS121'],
                'description' => 'Commercial buildings: indoor air quality, energy efficiency, and occupancy tracking.',
            ],
            'foodservice' => [
                'modules' => ['cold_chain', 'compliance', 'safety', 'energy'],
                'sensor_models' => ['EM300-TH', 'WS301', 'CT101', 'GS101'],
                'description' => 'Food service: temperature monitoring, gas leak detection, door monitoring, and energy tracking.',
            ],
        ];

        return $suggestions[$segment] ?? [
            'modules' => [],
            'sensor_models' => [],
            'description' => 'Select modules and sensors appropriate for your operation.',
        ];
    }
}
