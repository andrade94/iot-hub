import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Archive, Building2, Eye, Pause, Play } from 'lucide-react';

export interface OrganizationRow {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    segment: string | null;
    plan: string | null;
    status: string;
    sites_count: number;
    devices_count: number;
    users_count: number;
    created_at: string;
}

interface ColumnOptions {
    onView: (org: OrganizationRow) => void;
    onSuspend: (org: OrganizationRow) => void;
    onReactivate: (org: OrganizationRow) => void;
    onArchive: (org: OrganizationRow) => void;
    t: (key: string) => string;
}

const segmentVariants: Record<string, 'info' | 'secondary' | 'outline' | 'warning' | 'success'> = {
    retail: 'info',
    cold_chain: 'secondary',
    industrial: 'warning',
    commercial: 'outline',
    foodservice: 'success',
};

const planVariants: Record<string, 'outline' | 'secondary' | 'default'> = {
    starter: 'outline',
    standard: 'secondary',
    enterprise: 'default',
};

const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    active: 'success',
    onboarding: 'warning',
    suspended: 'destructive',
    archived: 'secondary',
};

export function getOrganizationColumns(options: ColumnOptions) {
    const { onView, onSuspend, onReactivate, onArchive, t } = options;

    return [
        {
            key: 'name' as const,
            header: t('Organization'),
            render: (org: OrganizationRow) => (
                <div className="flex items-center gap-3">
                    <Avatar size="sm">
                        {org.logo ? <AvatarImage src={org.logo} alt={org.name} /> : null}
                        <AvatarFallback>
                            <Building2 className="h-4 w-4" />
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <span className="font-medium">{org.name}</span>
                        <p className="text-xs text-muted-foreground">{org.slug}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'segment' as const,
            header: t('Segment'),
            render: (org: OrganizationRow) =>
                org.segment ? (
                    <Badge variant={segmentVariants[org.segment] ?? 'outline'} className="text-xs capitalize">
                        {org.segment.replace('_', ' ')}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">--</span>
                ),
        },
        {
            key: 'plan' as const,
            header: t('Plan'),
            render: (org: OrganizationRow) =>
                org.plan ? (
                    <Badge variant={planVariants[org.plan] ?? 'outline'} className="text-xs capitalize">
                        {org.plan}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">--</span>
                ),
        },
        {
            key: 'sites_count' as const,
            header: t('Sites'),
            render: (org: OrganizationRow) => (
                <span className="font-mono tabular-nums">{org.sites_count}</span>
            ),
        },
        {
            key: 'devices_count' as const,
            header: t('Devices'),
            render: (org: OrganizationRow) => (
                <span className="font-mono tabular-nums">{org.devices_count}</span>
            ),
        },
        {
            key: 'users_count' as const,
            header: t('Users'),
            render: (org: OrganizationRow) => (
                <span className="font-mono tabular-nums">{org.users_count}</span>
            ),
        },
        {
            key: 'status' as const,
            header: t('Status'),
            render: (org: OrganizationRow) => (
                <Badge variant={statusVariants[org.status] ?? 'outline'} className="text-xs capitalize">
                    {org.status}
                </Badge>
            ),
        },
        {
            key: 'actions' as const,
            header: '',
            render: (org: OrganizationRow) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" onClick={() => onView(org)} title={t('View')}>
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {['active', 'onboarding'].includes(org.status) && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-amber-600 hover:text-amber-700"
                                onClick={() => onSuspend(org)}
                                title={t('Suspend')}
                            >
                                <Pause className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onArchive(org)}
                                title={t('Archive')}
                            >
                                <Archive className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                    {org.status === 'suspended' && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-emerald-600 hover:text-emerald-700"
                                onClick={() => onReactivate(org)}
                                title={t('Reactivate')}
                            >
                                <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onArchive(org)}
                                title={t('Archive')}
                            >
                                <Archive className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];
}
