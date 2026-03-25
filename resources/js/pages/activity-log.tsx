/**
 * Activity Log Page
 *
 * Industrial Precision design treatment — chronicle-style activity log
 * with bg-dots header, section dividers, shadow-elevation-1, and FadeIn.
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import type { Activity, BreadcrumbItem } from '@/types';
import {
    formatDateTime,
    formatFieldName,
    formatRelativeTime,
    getCauserName,
    getChangedProperties,
    getEventIcon,
    getEventName,
    getModelName,
    hasPropertyChanges,
    truncateValue,
} from '@/utils/activity';
import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    Calendar,
    ChevronDown,
    Clock,
    Filter,
    Layers,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useMemo, useState } from 'react';

interface ActivityLogPageProps {
    activities: {
        data: Activity[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        causer?: string;
        subject?: string;
        event?: string;
    };
}

const eventTypes = [
    { value: 'all', label: 'All Events', icon: Layers },
    { value: 'created', label: 'Created', icon: Sparkles },
    { value: 'updated', label: 'Updated', icon: RefreshCw },
    { value: 'deleted', label: 'Deleted', icon: Icons.Trash2 },
    { value: 'login', label: 'Login', icon: Icons.LogIn },
    { value: 'logout', label: 'Logout', icon: Icons.LogOut },
];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Activity Log',
        href: '/activity-log',
    },
];

// Group activities by date
function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
    const groups: Record<string, Activity[]> = {};

    activities.forEach((activity) => {
        const date = new Date(activity.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let key: string;
        if (date.toDateString() === today.toDateString()) {
            key = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            key = 'Yesterday';
        } else {
            key = date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            });
        }

        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(activity);
    });

    return groups;
}

// Activity Item Component
function ActivityItem({
    activity,
    index,
    isLast,
}: {
    activity: Activity;
    index: number;
    isLast: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const causerName = getCauserName(activity);
    const { initials } = useInitials(causerName);
    const eventName = getEventName(activity.event);
    const modelName = getModelName(activity.subject_type);
    const eventIconName = getEventIcon(activity.event);
    const Icon = (Icons as Record<string, Icons.LucideIcon>)[eventIconName] || Icons.Circle;

    const hasChanges = hasPropertyChanges(activity);
    const changes = hasChanges ? getChangedProperties(activity) : [];

    // Event-specific accent colors
    const eventAccents: Record<string, { bg: string; text: string; border: string; glow: string }> = {
        created: {
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-500/30',
            glow: 'shadow-emerald-500/20',
        },
        updated: {
            bg: 'bg-amber-500/10 dark:bg-amber-500/20',
            text: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-500/30',
            glow: 'shadow-amber-500/20',
        },
        deleted: {
            bg: 'bg-rose-500/10 dark:bg-rose-500/20',
            text: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-500/30',
            glow: 'shadow-rose-500/20',
        },
        login: {
            bg: 'bg-sky-500/10 dark:bg-sky-500/20',
            text: 'text-sky-600 dark:text-sky-400',
            border: 'border-sky-500/30',
            glow: 'shadow-sky-500/20',
        },
        logout: {
            bg: 'bg-slate-500/10 dark:bg-slate-500/20',
            text: 'text-slate-600 dark:text-slate-400',
            border: 'border-slate-500/30',
            glow: 'shadow-slate-500/20',
        },
    };

    const accent = eventAccents[activity.event || ''] || eventAccents.updated;

    return (
        <div
            className="group relative stagger-item"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            {/* Timeline connector */}
            {!isLast && (
                <div className="absolute left-[1.375rem] top-14 bottom-0 w-px bg-gradient-to-b from-border via-border/50 to-transparent" />
            )}

            <div className="relative flex gap-4">
                {/* Timeline node */}
                <div className="relative z-10 flex flex-col items-center">
                    <div
                        className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all duration-300',
                            accent.bg,
                            accent.border,
                            'group-hover:scale-110 group-hover:shadow-lg',
                            accent.glow
                        )}
                    >
                        <Icon className={cn('h-5 w-5', accent.text)} />
                    </div>
                </div>

                {/* Content card */}
                <div className="flex-1 pb-8">
                    <div
                        className={cn(
                            'rounded-xl border bg-card/50 backdrop-blur-sm p-4 shadow-elevation-1 transition-all duration-300',
                            'hover:bg-card hover:shadow-elevation-2 hover:border-border/80',
                            'dark:bg-card/30 dark:hover:bg-card/50'
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                                    <AvatarFallback className="text-xs font-medium bg-muted">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm truncate">
                                            {causerName}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                'text-[10px] font-medium uppercase tracking-wider px-2 py-0.5',
                                                accent.bg,
                                                accent.text
                                            )}
                                        >
                                            {eventName}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                        {activity.description}
                                    </p>
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                <Clock className="h-3 w-3" />
                                <span className="font-mono tabular-nums" title={formatDateTime(activity.created_at)}>
                                    {formatRelativeTime(activity.created_at)}
                                </span>
                            </div>
                        </div>

                        {/* Model reference */}
                        {modelName && (
                            <div className="mt-3 flex items-center gap-2">
                                <div className="h-px flex-1 bg-border/50" />
                                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                                    {modelName}
                                    {activity.subject_id && (
                                        <span className="ml-1 font-mono tabular-nums">#{activity.subject_id}</span>
                                    )}
                                </span>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>
                        )}

                        {/* Changes accordion */}
                        {hasChanges && changes.length > 0 && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className={cn(
                                        'flex items-center gap-2 w-full text-xs font-medium transition-colors',
                                        'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <ChevronDown
                                        className={cn(
                                            'h-3.5 w-3.5 transition-transform duration-200',
                                            expanded && 'rotate-180'
                                        )}
                                    />
                                    <span>
                                        <span className="font-mono tabular-nums">{changes.length}</span> field{changes.length !== 1 ? 's' : ''} changed
                                    </span>
                                </button>

                                {expanded && (
                                    <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        {changes.map((change, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg bg-muted/30 border border-border/50 p-3"
                                            >
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                                    {formatFieldName(change.field)}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    {change.old !== null && (
                                                        <>
                                                            <span className="rounded-md bg-rose-100 dark:bg-rose-900/30 px-2 py-1 text-rose-700 dark:text-rose-300 font-mono text-xs line-through">
                                                                {truncateValue(change.old)}
                                                            </span>
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        </>
                                                    )}
                                                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-emerald-700 dark:text-emerald-300 font-mono text-xs">
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
            </div>
        </div>
    );
}

// Date Group Header
function DateGroupHeader({ date, count }: { date: string; count: number }) {
    const isToday = date === 'Today';
    const isYesterday = date === 'Yesterday';

    return (
        <div className="relative flex items-center gap-4 mb-6 mt-8 first:mt-0">
            {/* Decorative line */}
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Date badge */}
            <div
                className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full',
                    'bg-card border shadow-sm',
                    isToday && 'border-amber-500/30 bg-amber-500/5',
                    isYesterday && 'border-sky-500/30 bg-sky-500/5'
                )}
            >
                <Calendar
                    className={cn(
                        'h-4 w-4',
                        isToday && 'text-amber-600 dark:text-amber-400',
                        isYesterday && 'text-sky-600 dark:text-sky-400',
                        !isToday && !isYesterday && 'text-muted-foreground'
                    )}
                />
                <span
                    className={cn(
                        'text-sm font-semibold',
                        isToday && 'text-amber-700 dark:text-amber-300',
                        isYesterday && 'text-sky-700 dark:text-sky-300'
                    )}
                >
                    {date}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    ({count} {count === 1 ? 'event' : 'events'})
                </span>
            </div>

            {/* Decorative line */}
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
        </div>
    );
}

// Empty State
function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-3xl rounded-full" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                    <Layers className="h-8 w-8 text-muted-foreground/50" />
                </div>
            </div>
            <h3 className="font-display text-xl font-semibold tracking-tight mb-2">
                No Activity Yet
            </h3>
            <p className="text-muted-foreground max-w-sm">{message}</p>
        </div>
    );
}

export function ActivityLogSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex items-start justify-between">
                    <div>
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="mt-3 h-8 w-36" />
                        <Skeleton className="mt-2 h-4 w-64" />
                    </div>
                    <Skeleton className="h-9 w-36 rounded-lg" />
                </div>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-14" />
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-9 w-[180px]" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            {/* Timeline items */}
            <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                        <div className="flex-1 rounded-xl border p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ActivityLogPage({ activities, filters }: ActivityLogPageProps) {
    const { t } = useLang();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const groupedActivities = useMemo(
        () => groupActivitiesByDate(activities.data),
        [activities.data]
    );

    const handleEventFilter = (event: string) => {
        router.get(
            '/activity-log',
            { event: event === 'all' ? undefined : event },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['activities'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleLoadMore = () => {
        if (activities.current_page < activities.last_page) {
            router.get(
                '/activity-log',
                { page: activities.current_page + 1, ...filters },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['activities'],
                }
            );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Activity Log')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Activity Chronicle')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Activity Log')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('A complete record of all system events and changes')}
                                </p>
                            </div>

                            {/* Stats badge */}
                            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span className="font-mono text-sm font-medium tabular-nums">
                                    {activities.total.toLocaleString()}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {t('total events')}
                                </span>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── FILTERS ─────────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Filters')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                <FadeIn delay={100} duration={400}>
                    <Card className="shadow-elevation-1">
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Filter className="h-4 w-4" />
                                    <span>{t('Filter by:')}</span>
                                </div>

                                <Select value={filters.event || 'all'} onValueChange={handleEventFilter}>
                                    <SelectTrigger className="w-[180px] bg-background">
                                        <SelectValue placeholder={t('Filter by event')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    <type.icon className="h-4 w-4 text-muted-foreground" />
                                                    <span>{type.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="gap-2"
                            >
                                <RefreshCw
                                    className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                                />
                                {t('Refresh')}
                            </Button>
                        </div>
                    </Card>
                </FadeIn>

                {/* ── Timeline ─────────────────────────────────────── */}
                <FadeIn delay={150} duration={400}>
                    <div className="flex-1">
                        {activities.data.length === 0 ? (
                            <EmptyState message={t('No activities found matching your filters')} />
                        ) : (
                            <div className="space-y-0">
                                {Object.entries(groupedActivities).map(([date, items]) => (
                                    <div key={date}>
                                        <DateGroupHeader date={date} count={items.length} />
                                        <div className="pl-0 md:pl-4">
                                            {items.map((activity, index) => (
                                                <ActivityItem
                                                    key={activity.id}
                                                    activity={activity}
                                                    index={index}
                                                    isLast={index === items.length - 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Load More */}
                        {activities.current_page < activities.last_page && (
                            <div className="flex justify-center pt-8">
                                <Button
                                    onClick={handleLoadMore}
                                    variant="outline"
                                    size="lg"
                                    className="gap-2 px-8"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    {t('Load More Events')}
                                </Button>
                            </div>
                        )}

                        {/* Footer stats */}
                        <div className="flex justify-center pt-6 pb-4">
                            <div className="text-sm text-muted-foreground">
                                {t('Showing')}{' '}
                                <span className="font-mono font-semibold tabular-nums text-foreground">
                                    {activities.data.length}
                                </span>{' '}
                                {t('of')}{' '}
                                <span className="font-mono font-semibold tabular-nums text-foreground">
                                    {activities.total}
                                </span>{' '}
                                {t('activities')}
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}
