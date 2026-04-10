import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Gateway, Site } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Radio, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PaginatedGateways {
    data: Gateway[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    site: Site;
    gateways: PaginatedGateways;
}

export default function GatewayIndex({ site, gateways }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteGateway, setDeleteGateway] = useState<Gateway | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Gateways'), href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Gateways')} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get(`/sites/${site.id}?tab=setup`)}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                ← {site.name}
                            </button>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                                {t('Gateways')}
                            </h1>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                <span className="font-mono tabular-nums font-medium text-foreground">{gateways.total}</span>{' '}
                                {t('gateway(s)')} · {site.name}
                            </p>
                        </div>
                        <Can permission="manage devices">
                            <Button size="sm" className="text-[11px]" onClick={() => setShowCreate(true)}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />{t('Register Gateway')}
                            </Button>
                        </Can>
                    </div>
                </FadeIn>

                {/* ━━ GATEWAY CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={100} duration={400}>
                    {gateways.data.length === 0 ? (
                        <div className="mt-8">
                            <EmptyState
                                icon={<Radio className="h-5 w-5 text-muted-foreground" />}
                                title={t('No gateways registered')}
                                description={t('Register a LoRaWAN gateway to start receiving sensor data')}
                                action={
                                    <Can permission="manage devices">
                                        <Button size="sm" onClick={() => setShowCreate(true)}>
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />{t('Register Gateway')}
                                        </Button>
                                    </Can>
                                }
                            />
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {gateways.data.map((gw, i) => {
                                const isOnline = gw.last_seen_at && new Date(gw.last_seen_at) > new Date(Date.now() - 15 * 60000);
                                return (
                                    <FadeIn key={gw.id} delay={100 + i * 50} duration={400}>
                                        <Card className="border-border shadow-none cursor-pointer transition-colors hover:border-primary/20"
                                            onClick={() => router.get(`/sites/${site.id}/gateways/${gw.id}`)}>
                                            <CardContent className="p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl',
                                                        isOnline ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
                                                        📡
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-mono text-[15px] font-bold">{gw.model}</h3>
                                                            <Badge variant={isOnline ? 'success' : 'destructive'} className="text-[8px]">
                                                                {isOnline ? t('online') : t('offline')}
                                                            </Badge>
                                                            {gw.is_addon && <Badge variant="outline" className="text-[8px]">{t('addon')}</Badge>}
                                                        </div>
                                                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/60">{gw.serial}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 border-t border-border/30 pt-3">
                                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                                                        <div>
                                                            <span className="text-muted-foreground/60">{t('Devices')}:</span>{' '}
                                                            <span className="font-mono font-semibold">{(gw as any).devices_count ?? 0}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground/60">{t('Type')}:</span>{' '}
                                                            <span>{gw.is_addon ? t('Addon') : t('Primary')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground/60">{t('Last seen')}:</span>{' '}
                                                            <span className={cn('font-mono', isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                                                                {gw.last_seen_at ? formatTimeAgo(gw.last_seen_at) : t('never')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <span className={cn('text-[9px]', gw.chirpstack_id ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                                                            {gw.chirpstack_id ? `✓ ${t('Provisioned')}` : `⚠ ${t('Pending')}`}
                                                        </span>
                                                        <Can permission="manage devices">
                                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive opacity-0 group-hover:opacity-100"
                                                                onClick={(e) => { e.stopPropagation(); setDeleteGateway(gw); }}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </Can>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </FadeIn>
                                );
                            })}
                        </div>
                    )}
                </FadeIn>
            </div>

            {/* ━━ REGISTER DIALOG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <GatewayFormDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                siteId={site.id}
            />

            {/* ━━ DELETE CONFIRMATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <ConfirmationDialog
                open={!!deleteGateway}
                onOpenChange={(open) => !open && setDeleteGateway(null)}
                title={t('Delete Gateway')}
                description={`${t('Delete')} ${deleteGateway?.model} (${deleteGateway?.serial})?`}
                warningMessage={`${(deleteGateway as any)?.devices_count ?? 0} ${t('device(s) are connected through this gateway. They will lose their gateway connection.')}`}
                onConfirm={() => {
                    if (deleteGateway) {
                        router.delete(`/sites/${site.id}/gateways/${deleteGateway.id}`, {
                            preserveScroll: true,
                            onSuccess: () => setDeleteGateway(null),
                        });
                    }
                }}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* -- Gateway Form Dialog ------------------------------------------------- */

function GatewayFormDialog({ open, onOpenChange, siteId, gateway }: {
    open: boolean; onOpenChange: (open: boolean) => void; siteId: number; gateway?: Gateway;
}) {
    const { t } = useLang();
    const isEdit = !!gateway;

    const form = useForm({
        model: gateway?.model ?? 'UG65',
        serial: gateway?.serial ?? '',
        is_addon: gateway?.is_addon ?? false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) {
            router.put(`/sites/${siteId}/gateways/${gateway.id}`, form.data, {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
            });
        } else {
            form.post(`/sites/${siteId}/gateways`, {
                preserveScroll: true,
                onSuccess: () => { form.reset(); onOpenChange(false); },
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('Edit Gateway') : t('Register Gateway')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[11px]">{t('Model')}</Label>
                        <Select value={form.data.model} onValueChange={(v) => form.setData('model', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UG65">Milesight UG65</SelectItem>
                                <SelectItem value="UG67">Milesight UG67</SelectItem>
                                <SelectItem value="Other">{t('Other')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px]">{t('Serial Number')}</Label>
                        <Input value={form.data.serial} onChange={(e) => form.setData('serial', e.target.value)}
                            placeholder="24E124743C00XXXX" className="font-mono text-[13px] font-semibold tracking-wider" />
                        <p className="text-[10px] text-muted-foreground/60">{t('Found on the gateway label or packaging')}</p>
                        {form.errors.serial && <p className="text-[10px] text-destructive">{form.errors.serial}</p>}
                    </div>

                    <div className="flex items-start gap-3">
                        <Switch checked={form.data.is_addon} onCheckedChange={(v) => form.setData('is_addon', v)} className="mt-0.5" />
                        <div>
                            <Label className="text-[12px]">{t('Additional gateway (addon)')}</Label>
                            <p className="text-[10px] text-muted-foreground/60">{t('For coverage extension only')}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={form.processing || !form.data.serial.trim()}>
                            {isEdit ? t('Save Changes') : t('Register Gateway')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
