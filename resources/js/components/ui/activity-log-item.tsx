/**
 * Activity Log Item Component
 *
 * Displays a single activity log entry with icon, description, and metadata
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useInitials } from '@/hooks/use-initials';
import type { Activity } from '@/types';
import {
    formatDateTime,
    formatFieldName,
    formatRelativeTime,
    getCauserName,
    getChangedProperties,
    getEventColor,
    getEventIcon,
    getEventName,
    getModelName,
    hasPropertyChanges,
    truncateValue,
} from '@/utils/activity';
import * as Icons from 'lucide-react';
import { useState } from 'react';

interface ActivityLogItemProps {
    activity: Activity;
    showDetails?: boolean;
}

export function ActivityLogItem({ activity, showDetails = true }: ActivityLogItemProps) {
    const [expanded, setExpanded] = useState(false);
    const causerName = getCauserName(activity);
    const { initials } = useInitials(causerName);
    const eventName = getEventName(activity.event);
    const modelName = getModelName(activity.subject_type);
    const eventColor = getEventColor(activity.event);
    const eventIconName = getEventIcon(activity.event);
    const Icon = (Icons as any)[eventIconName] || Icons.Circle;

    const hasChanges = hasPropertyChanges(activity);
    const changes = hasChanges ? getChangedProperties(activity) : [];

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    {/* Event Icon */}
                    <div className="flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${eventColor} text-white`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        {showDetails && <div className="mt-2 h-full w-px bg-border" />}
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{causerName}</span>
                                    <Badge variant="outline" className="font-normal">
                                        {eventName}
                                    </Badge>
                                    {modelName && (
                                        <span className="text-sm text-muted-foreground">
                                            {modelName}
                                            {activity.subject_id && ` #${activity.subject_id}`}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                            </div>

                            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                                <span title={formatDateTime(activity.created_at)}>
                                    {formatRelativeTime(activity.created_at)}
                                </span>
                            </div>
                        </div>

                        {/* Changes (expandable) */}
                        {showDetails && hasChanges && changes.length > 0 && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    {expanded ? '− Hide' : '+ Show'} changes ({changes.length})
                                </button>

                                {expanded && (
                                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                                        {changes.map((change, index) => (
                                            <div key={index} className="text-sm">
                                                <div className="font-medium">{formatFieldName(change.field)}</div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    {change.old !== null && (
                                                        <>
                                                            <span className="rounded bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-900/30 dark:text-red-300">
                                                                {truncateValue(change.old)}
                                                            </span>
                                                            <Icons.ArrowRight className="h-3 w-3" />
                                                        </>
                                                    )}
                                                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-900 dark:bg-green-900/30 dark:text-green-300">
                                                        {truncateValue(change.new)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
