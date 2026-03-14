/**
 * Activity Timeline Component
 *
 * Displays a timeline of activity logs
 */

import { ActivityLogItem } from '@/components/ui/activity-log-item';
import type { Activity } from '@/types';

interface ActivityTimelineProps {
    activities: Activity[];
    emptyMessage?: string;
    showDetails?: boolean;
}

export function ActivityTimeline({
    activities,
    emptyMessage = 'No activity to display',
    showDetails = true,
}: ActivityTimelineProps) {
    if (activities.length === 0) {
        return (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map((activity) => (
                <ActivityLogItem key={activity.id} activity={activity} showDetails={showDetails} />
            ))}
        </div>
    );
}
