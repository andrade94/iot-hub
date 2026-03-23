<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Site;
use App\Services\Sites\SiteTimelineService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteTimelineController extends Controller
{
    public function __invoke(Request $request, Site $site, SiteTimelineService $service)
    {
        $from = $request->input('from', now()->subDays(7)->toDateString());
        $to = $request->input('to', now()->toDateString() . ' 23:59:59');
        $type = $request->input('type');
        $zone = $request->input('zone');

        $events = $service->getEvents($site, $from, $to, $type, $zone);

        $zones = Device::where('site_id', $site->id)
            ->whereNotNull('zone')
            ->distinct()
            ->pluck('zone')
            ->sort()
            ->values();

        return Inertia::render('sites/timeline', [
            'site' => $site->only('id', 'name'),
            'events' => $events->take(200),
            'totalEvents' => $events->count(),
            'zones' => $zones,
            'filters' => [
                'from' => $from,
                'to' => $request->input('to', now()->toDateString()),
                'type' => $type,
                'zone' => $zone,
            ],
        ]);
    }
}
