import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';

export interface UserRecord {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    whatsapp_phone: string | null;
    has_app_access: boolean;
    role: string | null;
    sites: { id: number; name: string }[];
    created_at: string;
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    org_admin: 'default',
    site_manager: 'secondary',
    site_viewer: 'outline',
    technician: 'outline',
};

interface UserColumnOptions {
    onEdit: (user: UserRecord) => void;
    onDelete: (user: UserRecord) => void;
    t: (key: string) => string;
    canManage: boolean;
}

export function getUserColumns({ onEdit, onDelete, t, canManage }: UserColumnOptions): ColumnDef<UserRecord>[] {
    const columns: ColumnDef<UserRecord>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Name')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
        },
        {
            accessorKey: 'email',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Email')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">{row.getValue('email')}</span>
            ),
        },
        {
            accessorKey: 'role',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Role')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => {
                const role = row.getValue('role') as string | null;
                if (!role) return null;
                return (
                    <Badge variant={roleBadgeVariant[role] ?? 'outline'}>
                        {role.replace('_', ' ')}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'sites',
            header: t('Sites'),
            enableSorting: false,
            cell: ({ row }) => {
                const sites = row.original.sites;
                return (
                    <div className="flex flex-wrap gap-1">
                        {sites.slice(0, 2).map((s) => (
                            <Badge key={s.id} variant="outline" className="text-[10px]">
                                {s.name}
                            </Badge>
                        ))}
                        {sites.length > 2 && (
                            <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                                +{sites.length - 2}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'has_app_access',
            header: t('App Access'),
            enableSorting: false,
            cell: ({ row }) => {
                const hasAccess = row.getValue('has_app_access') as boolean;
                return (
                    <Badge variant={hasAccess ? 'success' : 'outline'} className="text-xs">
                        {hasAccess ? t('Yes') : t('No')}
                    </Badge>
                );
            },
        },
    ];

    if (canManage) {
        columns.push({
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(user);
                            }}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(user);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                );
            },
        });
    }

    return columns;
}
