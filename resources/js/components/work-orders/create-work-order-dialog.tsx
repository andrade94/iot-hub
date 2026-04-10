import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import { router, useForm } from '@inertiajs/react';
import { useEffect } from 'react';

interface SiteOption {
    id: number;
    name: string;
}

interface DeviceOption {
    id: number;
    name: string;
    site_id: number;
}

interface TechnicianOption {
    id: number;
    name: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sites: SiteOption[];
    devices: DeviceOption[];
    technicians?: TechnicianOption[];
    /** "create" = POST new WO · "edit" = PUT existing WO (title/desc/type/priority only) */
    mode?: 'create' | 'edit';
    /** Required when mode="edit" */
    workOrderId?: number;
    /** Pre-fill values (e.g. when creating from an alert, or editing) */
    defaults?: {
        title?: string;
        description?: string;
        site_id?: number;
        device_id?: number;
        alert_id?: number;
        type?: string;
        priority?: string;
    };
}

const TYPE_OPTIONS = [
    { value: 'battery_replace', label: 'Battery Replace' },
    { value: 'sensor_replace', label: 'Sensor Replace' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'install', label: 'Install' },
];

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export function CreateWorkOrderDialog({ open, onOpenChange, sites, devices, technicians = [], mode = 'create', workOrderId, defaults }: Props) {
    const { t } = useLang();
    const isEdit = mode === 'edit';

    const form = useForm({
        title: defaults?.title ?? '',
        description: defaults?.description ?? '',
        type: defaults?.type ?? 'maintenance',
        priority: defaults?.priority ?? 'medium',
        site_id: defaults?.site_id ? String(defaults.site_id) : '',
        device_id: defaults?.device_id ? String(defaults.device_id) : '',
        alert_id: defaults?.alert_id ? String(defaults.alert_id) : '',
        assigned_to: '',
    });

    // Reset form when dialog opens with new defaults
    useEffect(() => {
        if (open) {
            form.setData({
                title: defaults?.title ?? '',
                description: defaults?.description ?? '',
                type: defaults?.type ?? 'maintenance',
                priority: defaults?.priority ?? 'medium',
                site_id: defaults?.site_id ? String(defaults.site_id) : '',
                device_id: defaults?.device_id ? String(defaults.device_id) : '',
                alert_id: defaults?.alert_id ? String(defaults.alert_id) : '',
                assigned_to: '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, defaults?.alert_id, defaults?.device_id, defaults?.site_id]);

    // Filter devices by selected site
    const filteredDevices = form.data.site_id
        ? devices.filter((d) => d.site_id === Number(form.data.site_id))
        : [];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (isEdit) {
            if (!workOrderId) return;
            router.put(`/work-orders/${workOrderId}`, {
                title: form.data.title,
                description: form.data.description || null,
                type: form.data.type,
                priority: form.data.priority,
            }, {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
            });
            return;
        }

        if (!form.data.site_id) return;

        router.post(`/sites/${form.data.site_id}/work-orders`, {
            title: form.data.title,
            description: form.data.description || null,
            type: form.data.type,
            priority: form.data.priority,
            device_id: form.data.device_id ? Number(form.data.device_id) : null,
            alert_id: form.data.alert_id ? Number(form.data.alert_id) : null,
            assigned_to: form.data.assigned_to ? Number(form.data.assigned_to) : null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('Edit Work Order') : t('New Work Order')}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? t('Update the details for this work order.')
                            : defaults?.alert_id
                                ? t('Create a work order linked to this alert.')
                                : t('Assign a task to a technician or team.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">{t('Title')}</Label>
                        <Input
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder={t('e.g. Replace battery — EM300-TH Cooler A')}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Type')}</Label>
                            <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TYPE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Priority')}</Label>
                            <Select value={form.data.priority} onValueChange={(v) => form.setData('priority', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!isEdit && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Site')}</Label>
                                <Select
                                    value={form.data.site_id}
                                    onValueChange={(v) => {
                                        form.setData('site_id', v);
                                        form.setData('device_id', '');
                                    }}
                                    disabled={!!defaults?.site_id}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('Select site')} /></SelectTrigger>
                                    <SelectContent>
                                        {sites.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Device')} <span className="text-muted-foreground/50">({t('optional')})</span></Label>
                                <Select
                                    value={form.data.device_id || '__none'}
                                    onValueChange={(v) => form.setData('device_id', v === '__none' ? '' : v)}
                                    disabled={!form.data.site_id || !!defaults?.device_id}
                                >
                                    <SelectTrigger><SelectValue placeholder={form.data.site_id ? t('Select device') : t('Select site first')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none">{t('No device')}</SelectItem>
                                        {filteredDevices.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-[11px]">{t('Description')} <span className="text-muted-foreground/50">({t('optional')})</span></Label>
                        <Textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder={t('Describe the task and any special instructions...')}
                            rows={3}
                        />
                    </div>

                    {!isEdit && technicians.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Assign to')} <span className="text-muted-foreground/50">({t('optional')})</span></Label>
                            <Select
                                value={form.data.assigned_to || '__none'}
                                onValueChange={(v) => form.setData('assigned_to', v === '__none' ? '' : v)}
                            >
                                <SelectTrigger><SelectValue placeholder={t('Unassigned — assign later')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none">{t('Unassigned')}</SelectItem>
                                    {technicians.map((tech) => (
                                        <SelectItem key={tech.id} value={String(tech.id)}>{tech.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {!isEdit && defaults?.alert_id && (
                        <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-[11px] text-muted-foreground">
                            {t('Linked to Alert')} <span className="font-mono font-semibold text-rose-500">#{defaults.alert_id}</span>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing || !form.data.title || (!isEdit && !form.data.site_id)}>
                            {form.processing
                                ? (isEdit ? t('Saving...') : t('Creating...'))
                                : (isEdit ? t('Save Changes') : t('Create Work Order'))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
