import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';

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
    onEdit: (user: UserRecord) => void;
    onDelete: (user: UserRecord) => void;
    t: (key: string) => string;
    canManage: boolean;
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

export function getUserColumns({ onEdit, onDelete, t, canManage, allOrgsMode }: UserColumnOptions): ColumnDef<UserRecord>[] {
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

    if (canManage) {
        columns.push({
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onEdit(row.original); }}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive-foreground" onClick={(e) => { e.stopPropagation(); onDelete(row.original); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        });
    }

    return columns;
}
