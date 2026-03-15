import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Invoice, Subscription } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CreditCard, DollarSign, FileText, Settings } from 'lucide-react';

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Billing')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Billing')}</h1>
                        <p className="text-sm text-muted-foreground">{t('Subscription and invoices')}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/settings/billing/profiles">
                            <Settings className="mr-2 h-4 w-4" />{t('Billing Profiles')}
                        </Link>
                    </Button>
                </div>

                {/* Subscription card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />{t('Subscription')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {subscription ? (
                            <div className="grid gap-4 sm:grid-cols-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('Base Fee')}</p>
                                    <p className="text-xl font-bold tabular-nums">${subscription.base_fee}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('Discount')}</p>
                                    <p className="text-xl font-bold tabular-nums">{subscription.discount_pct}%</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('Devices')}</p>
                                    <p className="text-xl font-bold tabular-nums">{subscription.items?.length ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('Monthly Total')}</p>
                                    <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        ${monthlyTotal.toFixed(2)}
                                    </p>
                                </div>
                                <div className="sm:col-span-4 flex items-center gap-3">
                                    <Badge variant={subscription.status === 'active' ? 'success' : 'outline'}>{subscription.status}</Badge>
                                    <Badge variant="outline">{subscription.contract_type}</Badge>
                                    {subscription.started_at && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('Since')} {new Date(subscription.started_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">{t('No active subscription')}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Invoices */}
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />{t('Invoices')}
                        </CardTitle>
                        <CardDescription>{invoices.length} {t('invoice(s)')}</CardDescription>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">{t('No invoices yet')}</TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium">{inv.period}</TableCell>
                                        <TableCell className="tabular-nums">${Number(inv.subtotal).toFixed(2)}</TableCell>
                                        <TableCell className="tabular-nums">${Number(inv.iva).toFixed(2)}</TableCell>
                                        <TableCell className="tabular-nums font-medium">${Number(inv.total).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <InvoiceStatusBadge status={inv.status} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {inv.cfdi_uuid ? inv.cfdi_uuid.substring(0, 8) + '...' : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}

function InvoiceStatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = { paid: 'success', sent: 'warning', overdue: 'destructive', draft: 'outline' };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}
