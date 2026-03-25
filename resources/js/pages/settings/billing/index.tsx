import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/Can';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Invoice, Subscription } from '@/types';
import { formatMXN } from '@/utils/formatters';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRightLeft, Bell, CreditCard, Download, FileText, Receipt, Settings, XCircle } from 'lucide-react';
import { useState } from 'react';

interface Props {
    subscription: Subscription | null;
    invoices: Invoice[];
    monthlyTotal: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Billing', href: '/settings/billing' },
];

export default function BillingDashboard({ subscription, invoices, monthlyTotal }: Props) {
    const { t } = useLang();
    const [cancelInvoice, setCancelInvoice] = useState<Invoice | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showChangePlan, setShowChangePlan] = useState(false);
    const [remindersEnabled, setRemindersEnabled] = useState(true);

    function handleCancelInvoice() {
        if (!cancelInvoice) return;
        setCancelLoading(true);
        router.post(
            `/settings/billing/invoices/${cancelInvoice.id}/cancel`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setCancelLoading(false);
                    setCancelInvoice(null);
                },
            },
        );
    }

    function handleGenerateCdp(invoice: Invoice) {
        router.post(
            `/settings/billing/invoices/${invoice.id}/cdp`,
            {},
            { preserveScroll: true },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Billing')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Billing')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Billing')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Subscription and invoices')}
                                </p>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href="/settings/billing/profiles">
                                    <Settings className="mr-2 h-4 w-4" />{t('Billing Profiles')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ── SUBSCRIPTION section ────────────────────────── */}
                <FadeIn delay={100} duration={500}>
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Subscription')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />{t('Subscription')}
                                    </CardTitle>
                                    {subscription && (
                                        <Button variant="outline" size="sm" onClick={() => setShowChangePlan(true)}>
                                            <ArrowRightLeft className="mr-2 h-3.5 w-3.5" />
                                            {t('Change Plan')}
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {subscription ? (
                                    <div className="grid gap-4 sm:grid-cols-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('Base Fee')}</p>
                                            <p className="font-mono text-xl font-bold tabular-nums">
                                                {formatMXN(subscription.base_fee)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('Discount')}</p>
                                            <p className="font-mono text-xl font-bold tabular-nums">
                                                {subscription.discount_pct}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('Devices')}</p>
                                            <p className="font-mono text-xl font-bold tabular-nums">
                                                {subscription.items?.length ?? 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('Monthly Total')}</p>
                                            <p className="font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                {formatMXN(monthlyTotal)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 sm:col-span-4">
                                            <Badge variant={subscription.status === 'active' ? 'success' : 'outline'}>
                                                {subscription.status}
                                            </Badge>
                                            <Badge variant="outline">{subscription.contract_type}</Badge>
                                            {subscription.started_at && (
                                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                    {t('Since')}{' '}
                                                    {new Date(subscription.started_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyState
                                        size="sm"
                                        variant="muted"
                                        className="border-0"
                                        icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
                                        title={t('No active subscription')}
                                        description={t('Contact your account manager to set up billing')}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── INVOICES section ────────────────────────────── */}
                <FadeIn delay={200} duration={500}>
                    <div className="flex-1">
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Invoices')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="h-4 w-4" />{t('Invoices')}
                                    </CardTitle>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono font-medium tabular-nums text-foreground">
                                            {invoices.length}
                                        </span>{' '}
                                        {t('invoice(s)')}
                                    </p>
                                </div>
                                <Can permission="manage org settings">
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            router.post(
                                                '/settings/billing/generate-invoice',
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {t('Generate Invoice')}
                                    </Button>
                                </Can>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Period')}</TableHead>
                                        <TableHead>{t('Subtotal')}</TableHead>
                                        <TableHead>{t('IVA')}</TableHead>
                                        <TableHead>{t('Total')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('CFDI')}</TableHead>
                                        <TableHead>{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-0">
                                                <EmptyState
                                                    size="sm"
                                                    variant="muted"
                                                    className="border-0"
                                                    icon={<FileText className="h-5 w-5 text-muted-foreground" />}
                                                    title={t('No invoices yet')}
                                                    description={t('Invoices will appear here once billing is active')}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((inv) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">{inv.period}</TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {formatMXN(Number(inv.subtotal))}
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {formatMXN(Number(inv.iva))}
                                                </TableCell>
                                                <TableCell className="font-mono font-medium tabular-nums">
                                                    {formatMXN(Number(inv.total))}
                                                </TableCell>
                                                <TableCell>
                                                    <InvoiceStatusBadge status={inv.status} />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                    {inv.cfdi_uuid
                                                        ? inv.cfdi_uuid.substring(0, 8) + '...'
                                                        : '\u2014'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {/* Mark Paid — sent/overdue only */}
                                                        {['sent', 'overdue'].includes(inv.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/settings/billing/invoices/${inv.id}/mark-paid`,
                                                                        {},
                                                                        { preserveScroll: true },
                                                                    )
                                                                }
                                                            >
                                                                {t('Mark Paid')}
                                                            </Button>
                                                        )}
                                                        {/* Cancel — sent/overdue only (Feature 1: BLD-08) */}
                                                        {['sent', 'overdue'].includes(inv.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => setCancelInvoice(inv)}
                                                            >
                                                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                                                {t('Cancel')}
                                                            </Button>
                                                        )}
                                                        {/* Generate CdP — paid only (Feature 8: BLD-15) */}
                                                        {inv.status === 'paid' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleGenerateCdp(inv)}
                                                            >
                                                                <Receipt className="mr-1 h-3.5 w-3.5" />
                                                                {t('Generate CdP')}
                                                            </Button>
                                                        )}
                                                        {inv.cfdi_uuid && (
                                                            <Button size="sm" variant="ghost" asChild>
                                                                <a
                                                                    href={`/settings/billing/invoices/${inv.id}/download/pdf`}
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── PAYMENT REMINDERS section (Feature 4: BLD-11) ─ */}
                <FadeIn delay={300} duration={500}>
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Payment Reminders')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Bell className="h-4 w-4" />{t('Automated Payment Reminders')}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {t('Automatic email reminders are sent for overdue invoices on the following schedule.')}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {remindersEnabled ? t('Enabled') : t('Disabled')}
                                        </span>
                                        <Switch
                                            checked={remindersEnabled}
                                            onCheckedChange={setRemindersEnabled}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {[
                                        { days: 7, label: t('First Reminder'), description: t('Gentle reminder sent 7 days after invoice date') },
                                        { days: 14, label: t('Second Reminder'), description: t('Follow-up reminder sent 14 days after invoice date') },
                                        { days: 30, label: t('Final Notice'), description: t('Escalation notice sent 30 days after invoice date') },
                                    ].map((reminder) => (
                                        <div
                                            key={reminder.days}
                                            className="rounded-lg border border-border/50 bg-muted/30 p-4"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                                                    {reminder.days}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{t('days')}</span>
                                            </div>
                                            <p className="mt-1 text-sm font-medium">{reminder.label}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{reminder.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>
            </div>

            {/* ── Cancel Invoice Confirmation (Feature 1: BLD-08) ── */}
            <ConfirmationDialog
                open={!!cancelInvoice}
                onOpenChange={(open) => !open && setCancelInvoice(null)}
                title={t('Cancel Invoice')}
                description={
                    cancelInvoice
                        ? `${t('Are you sure you want to cancel invoice for period')} ${cancelInvoice.period}?`
                        : ''
                }
                warningMessage={t('This action cannot be undone. The invoice will be permanently marked as cancelled.')}
                loading={cancelLoading}
                onConfirm={handleCancelInvoice}
                actionLabel={t('Cancel Invoice')}
            />

            {/* ── Change Plan Dialog (Feature 2: BLD-09) ────────── */}
            <Dialog open={showChangePlan} onOpenChange={setShowChangePlan}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5" />
                            {t('Change Subscription Plan')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-3">
                            {[
                                { name: 'Starter', price: '$2,500 MXN/mo', description: t('Up to 50 devices, basic monitoring') },
                                { name: 'Standard', price: '$7,500 MXN/mo', description: t('Up to 200 devices, advanced analytics') },
                                { name: 'Enterprise', price: t('Custom'), description: t('Unlimited devices, dedicated support') },
                            ].map((plan) => (
                                <div
                                    key={plan.name}
                                    className="flex items-center justify-between rounded-lg border border-border/50 p-4"
                                >
                                    <div>
                                        <p className="font-medium">{plan.name}</p>
                                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                                    </div>
                                    <p className="font-mono text-sm font-semibold tabular-nums">{plan.price}</p>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                {t('Plan changes require approval from your Astrea account manager. Please contact them directly to initiate a plan change.')}
                            </p>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setShowChangePlan(false)}>
                            {t('Close')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function InvoiceStatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'secondary'> = {
        paid: 'success',
        sent: 'warning',
        overdue: 'destructive',
        draft: 'outline',
        cancelled: 'secondary',
    };
    return (
        <Badge variant={v[status] ?? 'outline'} className="text-xs">
            {status}
        </Badge>
    );
}

export function BillingSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                <div className="relative flex items-start justify-between p-6 md:p-8">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-4 w-44" />
                    </div>
                    <Skeleton className="h-9 w-36" />
                </div>
            </div>

            {/* Subscription section divider */}
            <div>
                <div className="mb-3 flex items-center gap-3">
                    <Skeleton className="h-3 w-24" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <Card className="shadow-elevation-1">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-28" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-1">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-7 w-20" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices section divider */}
            <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <Card className="shadow-elevation-1">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-3 w-24" />
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                                <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                                <TableHead><Skeleton className="h-3 w-8" /></TableHead>
                                <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                                <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                                <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                                    <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}
