import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';

export interface UserRecord {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    whatsapp_phone: string | null;
    has_app_access: boolean;
    role: string | null;
    sites: { id: number; name: string }[];
    organization_name?: string;
    deactivated_at?: string | null;
    created_at: string;
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    org_admin: 'default',
    site_manager: 'secondary',
    site_viewer: 'outline',
    technician: 'outline',
};

function getRoleLabel(role: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        super_admin: t('Super Admin'),
        support: t('Support'),
        account_manager: t('Account Manager'),
        technician: t('Technician'),
        client_org_admin: t('Org Admin'),
        client_site_manager: t('Site Manager'),
        client_site_viewer: t('Site Viewer'),
    };
    return labels[role] ?? role.replace(/_/g, ' ');
}

interface UserColumnOptions {
    t: (key: string) => string;
    allOrgsMode?: boolean;
}

function SortableHeader({ column, title }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc: boolean) => void }; title: string }) {
    const sorted = column.getIsSorted();
    return (
        <button
            className="-ml-1 flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 transition-colors hover:text-foreground/70"
            onClick={() => column.toggleSorting(sorted === 'asc')}
        >
            {title}
            {sorted === 'asc' ? <ArrowUp className="h-3 w-3" /> : sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
    );
}

export function getUserColumns({ t, allOrgsMode }: UserColumnOptions): ColumnDef<UserRecord>[] {
    const columns: ColumnDef<UserRecord>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title={t('Name')} />,
            cell: ({ row }) => (
                <div>
                    <span className="font-medium text-foreground">{row.getValue('name')}</span>
                    {row.original.deactivated_at && <span className="ml-2 text-[10px] text-rose-600 dark:text-rose-400">{t('Deactivated')}</span>}
                </div>
            ),
        },
        {
            accessorKey: 'email',
            header: ({ column }) => <SortableHeader column={column} title={t('Email')} />,
            cell: ({ row }) => <span className="font-mono text-[12px] text-muted-foreground">{row.getValue('email')}</span>,
        },
    ];

    if (allOrgsMode) {
        columns.push({
            accessorKey: 'organization_name',
            header: ({ column }) => <SortableHeader column={column} title={t('Organization')} />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.organization_name ?? '—'}</span>,
        });
    }

    columns.push(
        {
            accessorKey: 'role',
            header: ({ column }) => <SortableHeader column={column} title={t('Role')} />,
            cell: ({ row }) => {
                const role = row.getValue('role') as string | null;
                if (!role) return null;
                return <Badge variant={roleBadgeVariant[role] ?? 'outline'} className="text-[10px] capitalize">{getRoleLabel(role, t)}</Badge>;
            },
        },
        {
            accessorKey: 'sites',
            header: () => t('Sites'),
            enableSorting: false,
            cell: ({ row }) => {
                const sites = row.original.sites;
                if (sites.length === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {sites.slice(0, 2).map((s) => <Badge key={s.id} variant="outline" className="text-[10px]">{s.name}</Badge>)}
                        {sites.length > 2 && <Badge variant="outline" className="font-mono text-[10px] tabular-nums">+{sites.length - 2}</Badge>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'has_app_access',
            header: () => t('App'),
            enableSorting: false,
            cell: ({ row }) => {
                const has = row.getValue('has_app_access') as boolean;
                return <Badge variant={has ? 'success' : 'outline'} className="text-[10px]">{has ? t('Yes') : t('No')}</Badge>;
            },
        },
    );

    columns.push({
        id: 'arrow',
        enableSorting: false,
        enableHiding: false,
        cell: () => <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />,
    });

    return columns;
}
