import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Device, Gateway, Site } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    site: Site;
    gateway: Gateway & { devices?: Device[] };
}

export default function GatewayShow({ site, gateway }: Props) {
    const { t } = useLang();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isOnline = gateway.last_seen_at && new Date(gateway.last_seen_at) > new Date(Date.now() - 15 * 60000);
    const devices = gateway.devices ?? [];

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Gateways'), href: `/sites/${site.id}/gateways` },
        { title: `${gateway.model} (${gateway.serial})`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${gateway.model} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get(`/sites/${site.id}/gateways`)}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Gateways')} · {site.name}
                            </button>
                            <div className="flex items-center gap-3">
                                <h1 className="font-mono text-[28px] font-bold tracking-tight">{gateway.model}</h1>
                                <Badge variant={isOnline ? 'success' : 'destructive'} className="text-[9px]">
                                    {isOnline ? t('online') : t('offline')}
                                </Badge>
                                {gateway.is_addon && <Badge variant="outline" className="text-[9px]">{t('addon')}</Badge>}
                            </div>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                {t('Serial')}: <span className="font-mono">{gateway.serial}</span> · {gateway.is_addon ? t('Addon') : t('Primary')} · {site.name}
                            </p>
                        </div>
                        <Can permission="manage devices">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="text-[11px]" onClick={() => setEditOpen(true)}>
                                    <Pencil className="mr-1 h-3 w-3" />{t('Edit')}
                                </Button>
                                <Button variant="outline" size="sm" className="text-[11px] text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40"
                                    onClick={() => setDeleteOpen(true)}>
                                    <Trash2 className="mr-1 h-3 w-3" />{t('Delete')}
                                </Button>
                            </div>
                        </Can>
                    </div>
                </FadeIn>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* ━━ LEFT: DEVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('CONNECTED DEVICES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{devices.length}</span>
                        </div>

                        <FadeIn delay={100} duration={400}>
                            {devices.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No devices connected to this gateway')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border/30">
                                                <th className="text-left px-4 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Device')}</th>
                                                <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Model')}</th>
                                                <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Zone')}</th>
                                                <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Status')}</th>
                                                <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Last Reading')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {devices.map((device) => {
                                                const online = isDeviceOnline(device.last_reading_at);
                                                return (
                                                    <tr key={device.id} className="border-b border-border/20 last:border-b-0 cursor-pointer transition-colors hover:bg-accent/30"
                                                        onClick={() => router.get(`/devices/${device.id}`)}>
                                                        <td className="px-4 py-3.5 text-[13px] font-medium">{device.name}</td>
                                                        <td className="px-3 py-3.5"><span className="font-mono text-[11px]">{device.model}</span></td>
                                                        <td className="px-3 py-3.5 text-[12px] text-muted-foreground">{device.zone || '—'}</td>
                                                        <td className="px-3 py-3.5">
                                                            <Badge variant={online ? 'success' : 'destructive'} className="text-[8px]">
                                                                {online ? t('online') : t('offline')}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-3.5 font-mono text-[10px] text-muted-foreground">
                                                            {device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </FadeIn>
                    </div>

                    {/* ━━ RIGHT: DETAILS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('DETAILS')}</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <FadeIn delay={100} duration={400}>
                            <Card className="border-border shadow-none overflow-hidden">
                                {[
                                    { label: t('Gateway ID'), value: <span className="font-mono font-medium">#{gateway.id}</span> },
                                    { label: t('Model'), value: <span className="font-mono font-bold">{gateway.model}</span> },
                                    { label: t('Serial'), value: <span className="font-mono">{gateway.serial}</span> },
                                    { label: t('Type'), value: gateway.is_addon ? t('Addon') : t('Primary') },
                                    { label: t('Status'), value: <Badge variant={isOnline ? 'success' : 'destructive'} className="text-[8px]">{isOnline ? t('online') : t('offline')}</Badge> },
                                    { label: t('Devices'), value: <span className="font-mono font-semibold">{devices.length}</span> },
                                    { label: t('Provisioning'), value: gateway.chirpstack_id
                                        ? <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">✓ {t('Provisioned')}</span>
                                        : <span className="text-amber-500 text-[10px]">⚠ {t('Pending')}</span> },
                                    { label: t('Last Seen'), value: <span className={cn('font-mono', isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                                        {gateway.last_seen_at ? formatTimeAgo(gateway.last_seen_at) : t('never')}</span> },
                                    { label: t('Site'), value: site.name },
                                    { label: t('Registered'), value: <span className="font-mono">{new Date(gateway.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span> },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-b-0">
                                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                                        <span className="text-[11px]">{item.value}</span>
                                    </div>
                                ))}
                            </Card>
                        </FadeIn>
                    </div>
                </div>
            </div>

            {/* ━━ EDIT DIALOG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <GatewayEditDialog open={editOpen} onOpenChange={setEditOpen} siteId={site.id} gateway={gateway} />

            {/* ━━ DELETE CONFIRMATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Delete Gateway')}
                description={`${t('Delete')} ${gateway.model} (${gateway.serial})?`}
                warningMessage={`${devices.length} ${t('device(s) are connected through this gateway. They will lose their gateway connection.')}`}
                onConfirm={() => {
                    router.delete(`/sites/${site.id}/gateways/${gateway.id}`, {
                        onSuccess: () => router.get(`/sites/${site.id}/gateways`),
                    });
                }}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* -- Edit Dialog --------------------------------------------------------- */

function GatewayEditDialog({ open, onOpenChange, siteId, gateway }: {
    open: boolean; onOpenChange: (open: boolean) => void; siteId: number; gateway: Gateway;
}) {
    const { t } = useLang();
    const form = useForm({
        model: gateway.model,
        serial: gateway.serial,
        is_addon: gateway.is_addon,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.put(`/sites/${siteId}/gateways/${gateway.id}`, form.data, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Edit Gateway')}</DialogTitle>
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
                            className="font-mono text-[13px] font-semibold tracking-wider" />
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
                        <Button type="submit" disabled={form.processing}>{t('Save Changes')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
