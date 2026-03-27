import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/utils/date';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2 } from 'lucide-react';

/* -- Types ------------------------------------------------------------ */

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

export interface OrganizationColumnOptions {
    t: (key: string) => string;
}

/* -- Sortable Header -------------------------------------------------- */

function SortableHeader({
    column,
    title,
}: {
    column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc: boolean) => void };
    title: string;
}) {
    const sorted = column.getIsSorted();
    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 font-medium"
            onClick={() => column.toggleSorting(sorted === 'asc')}
        >
            {title}
            {sorted === 'asc' ? (
                <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
            ) : (
                <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/50" />
            )}
        </Button>
    );
}

/* -- Badge Variants --------------------------------------------------- */

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

/* -- Column Definitions ----------------------------------------------- */

export function getOrganizationColumns({ t }: OrganizationColumnOptions): ColumnDef<OrganizationRow>[] {
    return [
        // -- Name with Avatar --
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title={t('Organization')} />,
            cell: ({ row }) => {
                const org = row.original;
                return (
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
                );
            },
        },

        // -- Segment --
        {
            accessorKey: 'segment',
            header: ({ column }) => <SortableHeader column={column} title={t('Segment')} />,
            cell: ({ row }) => {
                const segment = row.original.segment;
                return segment ? (
                    <Badge variant={segmentVariants[segment] ?? 'outline'} className="text-xs capitalize">
                        {segment.replace('_', ' ')}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">--</span>
                );
            },
        },

        // -- Plan --
        {
            accessorKey: 'plan',
            header: () => t('Plan'),
            cell: ({ row }) => {
                const plan = row.original.plan;
                return plan ? (
                    <Badge variant={planVariants[plan] ?? 'outline'} className="text-xs capitalize">
                        {plan}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">--</span>
                );
            },
            enableSorting: false,
        },

        // -- Sites count --
        {
            accessorKey: 'sites_count',
            header: ({ column }) => <SortableHeader column={column} title={t('Sites')} />,
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.sites_count}</span>
            ),
        },

        // -- Devices count --
        {
            accessorKey: 'devices_count',
            header: () => t('Devices'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.devices_count}</span>
            ),
            enableSorting: false,
        },

        // -- Users count --
        {
            accessorKey: 'users_count',
            header: () => t('Users'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.users_count}</span>
            ),
            enableSorting: false,
        },

        // -- Status --
        {
            accessorKey: 'status',
            header: ({ column }) => <SortableHeader column={column} title={t('Status')} />,
            cell: ({ row }) => (
                <Badge variant={statusVariants[row.original.status] ?? 'outline'} className="text-xs capitalize">
                    {row.original.status}
                </Badge>
            ),
            sortingFn: (rowA, rowB) => {
                const order: Record<string, number> = { active: 0, onboarding: 1, suspended: 2, archived: 3 };
                const a = order[rowA.original.status] ?? 4;
                const b = order[rowB.original.status] ?? 4;
                return a - b;
            },
        },

        // -- Created --
        {
            accessorKey: 'created_at',
            header: () => t('Created'),
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTimeAgo(row.original.created_at)}
                </span>
            ),
            enableSorting: false,
        },
    ];
}
