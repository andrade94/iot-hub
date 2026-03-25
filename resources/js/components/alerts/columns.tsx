import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatTimeAgo } from '@/utils/date';
import type { Alert } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Bell,
    CheckCircle2,
    Eye,
    ShieldAlert,
    XCircle,
} from 'lucide-react';

/* ── Column Options ─────────────────────────────────────────────── */

export interface AlertColumnOptions {
    t: (key: string) => string;
    onAcknowledge: (alert: Alert) => void;
    onResolve: (alert: Alert) => void;
    onDismiss: (alert: Alert) => void;
}

/* ── Sortable Header ────────────────────────────────────────────── */

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

/* ── Severity Badge ─────────────────────────────────────────────── */

export function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<
        string,
        {
            variant: 'destructive' | 'warning' | 'info' | 'outline';
            icon: typeof ShieldAlert;
        }
    > = {
        critical: { variant: 'destructive', icon: ShieldAlert },
        high: { variant: 'warning', icon: AlertTriangle },
        medium: { variant: 'info', icon: Bell },
        low: { variant: 'outline', icon: Bell },
    };

    const { variant, icon: Icon } = config[severity] ?? config.low;

    return (
        <Badge variant={variant} className="gap-1 text-xs">
            <Icon className="h-3 w-3" />
            {severity}
        </Badge>
    );
}

/* ── Status Badge ───────────────────────────────────────────────── */

export function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'success' | 'outline'> = {
        active: 'destructive',
        acknowledged: 'warning',
        resolved: 'success',
        dismissed: 'outline',
    };

    return (
        <Badge variant={variants[status] ?? 'outline'} className="text-xs">
            {status}
        </Badge>
    );
}

/* ── Column Definitions ─────────────────────────────────────────── */

export function getAlertColumns({ t, onAcknowledge, onResolve, onDismiss }: AlertColumnOptions): ColumnDef<Alert>[] {
    return [
        // ── Select checkbox ──
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label={t('Select all')}
                />
            ),
            cell: ({ row }) => {
                const alert = row.original;
                const isActionable = ['active', 'acknowledged'].includes(alert.status);
                if (!isActionable) return null;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label={`${t('Select alert')} ${alert.id}`}
                        />
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
            meta: { className: 'w-[40px]' },
        },

        // ── Severity ──
        {
            accessorKey: 'severity',
            header: ({ column }) => <SortableHeader column={column} title={t('Severity')} />,
            cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
            sortingFn: (rowA, rowB) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                const a = order[rowA.original.severity as keyof typeof order] ?? 4;
                const b = order[rowB.original.severity as keyof typeof order] ?? 4;
                return a - b;
            },
            meta: { className: 'w-[120px]' },
        },

        // ── Alert name ──
        {
            id: 'alert_name',
            header: () => t('Alert'),
            accessorFn: (row) => row.data?.rule_name ?? `Alert #${row.id}`,
            cell: ({ row }) => (
                <span className="text-sm font-medium">{row.original.data?.rule_name ?? `Alert #${row.original.id}`}</span>
            ),
            enableSorting: false,
        },

        // ── Device + Zone ──
        {
            id: 'device',
            header: () => t('Device'),
            accessorFn: (row) => row.data?.device_name ?? '',
            cell: ({ row }) => {
                const alert = row.original;
                return (
                    <div>
                        <p className="text-sm">{alert.data?.device_name ?? '\u2014'}</p>
                        {alert.data?.zone && <p className="text-xs text-muted-foreground">{alert.data.zone}</p>}
                    </div>
                );
            },
            enableSorting: false,
        },

        // ── Reading ──
        {
            id: 'reading',
            header: () => t('Reading'),
            cell: ({ row }) => {
                const alert = row.original;
                if (!alert.data?.metric) return null;
                return (
                    <span className="font-mono text-sm tabular-nums">
                        {alert.data.metric}: {alert.data.value}
                        {alert.data.threshold !== null && (
                            <span className="text-muted-foreground">
                                {' '}
                                / {alert.data.threshold}
                            </span>
                        )}
                    </span>
                );
            },
            enableSorting: false,
        },

        // ── Status ──
        {
            accessorKey: 'status',
            header: ({ column }) => <SortableHeader column={column} title={t('Status')} />,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            sortingFn: (rowA, rowB) => {
                const order = { active: 0, acknowledged: 1, resolved: 2, dismissed: 3 };
                const a = order[rowA.original.status as keyof typeof order] ?? 4;
                const b = order[rowB.original.status as keyof typeof order] ?? 4;
                return a - b;
            },
        },

        // ── Time ──
        {
            accessorKey: 'triggered_at',
            header: ({ column }) => <SortableHeader column={column} title={t('Time')} />,
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTimeAgo(row.original.triggered_at)}
                </span>
            ),
        },

        // ── Actions ──
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('Actions')}</span>,
            cell: ({ row }) => {
                const alert = row.original;
                return (
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {alert.status === 'active' && (
                            <Can permission="acknowledge alerts">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title={t('Acknowledge')}
                                    onClick={() => onAcknowledge(alert)}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title={t('Resolve')}
                                    onClick={() => onResolve(alert)}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                            </Can>
                        )}
                        {alert.status === 'acknowledged' && (
                            <Can permission="acknowledge alerts">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title={t('Resolve')}
                                    onClick={() => onResolve(alert)}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                            </Can>
                        )}
                        {(alert.status === 'active' || alert.status === 'acknowledged') && (
                            <Can permission="manage alert rules">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title={t('Dismiss')}
                                    onClick={() => onDismiss(alert)}
                                >
                                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </Can>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
            meta: { className: 'text-right' },
        },
    ];
}
