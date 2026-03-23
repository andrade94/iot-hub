<?php

namespace App\Services\Sites;

use App\Models\Alert;
use App\Models\CorrectiveAction;
use App\Models\Site;
use App\Models\WorkOrder;
use Illuminate\Support\Collection;
use Spatie\Activitylog\Models\Activity;

class SiteTimelineService
{
    public function getEvents(
        Site $site,
        string $from,
        string $to,
        ?string $type = null,
        ?string $zone = null,
    ): Collection {
        $events = collect();

        $types = $type ? [$type] : ['alert', 'work_order', 'corrective_action', 'activity'];

        if (in_array('alert', $types)) {
            $query = Alert::where('site_id', $site->id)
                ->whereBetween('triggered_at', [$from, $to])
                ->with('device');

            if ($zone) {
                $query->whereHas('device', fn ($q) => $q->where('zone', $zone));
            }

            $alerts = $query->get()->map(fn (Alert $a) => [
                'type' => $a->status === 'resolved' ? 'alert_resolved' : 'alert_triggered',
                'timestamp' => $a->status === 'resolved' ? ($a->resolved_at ?? $a->triggered_at) : $a->triggered_at,
                'title' => strtoupper($a->severity) . ': ' . ($a->data['rule_name'] ?? "Alert #{$a->id}"),
                'description' => $a->device?->name . ($a->device?->zone ? " ({$a->device->zone})" : ''),
                'severity' => $a->severity,
                'link' => "/alerts/{$a->id}",
                'meta' => ['status' => $a->status, 'resolution_type' => $a->resolution_type],
            ]);

            $events = $events->merge($alerts);
        }

        if (in_array('work_order', $types)) {
            $wos = WorkOrder::where('site_id', $site->id)
                ->whereBetween('created_at', [$from, $to])
                ->with('assignedTo')
                ->get()
                ->map(fn (WorkOrder $wo) => [
                    'type' => 'work_order',
                    'timestamp' => $wo->created_at,
                    'title' => "WO: {$wo->title}",
                    'description' => "Status: {$wo->status}" . ($wo->assignedTo ? " — {$wo->assignedTo->name}" : ''),
                    'severity' => $wo->priority,
                    'link' => "/work-orders/{$wo->id}",
                    'meta' => ['status' => $wo->status, 'type' => $wo->type],
                ]);

            $events = $events->merge($wos);
        }

        if (in_array('corrective_action', $types)) {
            $cas = CorrectiveAction::where('site_id', $site->id)
                ->whereBetween('created_at', [$from, $to])
                ->with('takenByUser')
                ->get()
                ->map(fn (CorrectiveAction $ca) => [
                    'type' => 'corrective_action',
                    'timestamp' => $ca->taken_at ?? $ca->created_at,
                    'title' => "CA: " . \Illuminate\Support\Str::limit($ca->action_taken, 60),
                    'description' => "By {$ca->takenByUser?->name} — Status: {$ca->status}",
                    'severity' => null,
                    'link' => "/alerts/{$ca->alert_id}",
                    'meta' => ['status' => $ca->status],
                ]);

            $events = $events->merge($cas);
        }

        if (in_array('activity', $types)) {
            $siteModelClass = Site::class;
            $activities = Activity::where(function ($q) use ($site, $siteModelClass) {
                $q->where(function ($q2) use ($site, $siteModelClass) {
                    $q2->where('subject_type', $siteModelClass)
                        ->where('subject_id', $site->id);
                })->orWhere('properties->site_id', $site->id);
            })
                ->whereBetween('created_at', [$from, $to])
                ->with('causer')
                ->limit(100)
                ->get()
                ->map(fn (Activity $a) => [
                    'type' => 'activity',
                    'timestamp' => $a->created_at,
                    'title' => $a->description ?? 'Activity',
                    'description' => $a->causer?->name ?? 'System',
                    'severity' => null,
                    'link' => null,
                    'meta' => ['subject_type' => class_basename($a->subject_type ?? ''), 'event' => $a->event],
                ]);

            $events = $events->merge($activities);
        }

        return $events->sortByDesc('timestamp')->values();
    }
}
