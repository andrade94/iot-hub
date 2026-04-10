<?php

namespace App\Http\Controllers;

use App\Models\Gateway;
use App\Models\Site;
use App\Services\ChirpStack\DeviceProvisioner;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GatewayController extends Controller
{
    public function globalIndex(Request $request)
    {
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $gateways = Gateway::whereIn('site_id', $siteIds)
            ->with('site')
            ->withCount('devices')
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('settings/gateways/global', [
            'gateways' => $gateways,
        ]);
    }

    public function index(Request $request, Site $site)
    {
        $this->authorize('viewAny', [Gateway::class, $site]);

        $gateways = $site->gateways()
            ->withCount('devices')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('settings/gateways/index', [
            'site' => $site,
            'gateways' => $gateways,
        ]);
    }

    public function store(Request $request, Site $site)
    {
        $this->authorize('create', [Gateway::class, $site]);

        $validated = $request->validate([
            'model' => 'required|string|max:255',
            'serial' => 'required|string|max:255',
            'is_addon' => 'boolean',
        ]);

        $gateway = $site->gateways()->create($validated);

        // Attempt ChirpStack provisioning
        $provisioner = app(DeviceProvisioner::class);
        $provisioner->provisionGateway($gateway);

        return back()->with('success', 'Gateway registered successfully.');
    }

    public function show(Request $request, Site $site, Gateway $gateway)
    {
        $this->authorize('view', [$gateway, $site]);

        $gateway->load('devices');

        return Inertia::render('settings/gateways/show', [
            'site' => $site,
            'gateway' => $gateway,
        ]);
    }

    public function update(Request $request, Site $site, Gateway $gateway)
    {
        $this->authorize('update', [$gateway, $site]);

        $validated = $request->validate([
            'model' => 'required|string|max:255',
            'serial' => 'required|string|max:255',
            'is_addon' => 'boolean',
        ]);

        $gateway->update($validated);

        return back()->with('success', 'Gateway updated successfully.');
    }

    public function destroy(Request $request, Site $site, Gateway $gateway)
    {
        $this->authorize('delete', [$gateway, $site]);

        $gateway->delete();

        return back()->with('success', 'Gateway removed successfully.');
    }
}
