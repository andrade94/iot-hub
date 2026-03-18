import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, EscalationChain, EscalationLevel } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Link2, Mail, Pencil, Plus, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SiteOption {
    id: number;
    name: string;
}

interface UserOption {
    id: number;
    name: string;
}

interface Props {
    chains: EscalationChain[];
    sites: SiteOption[];
    users: UserOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Escalation Chains', href: '#' },
];

const AVAILABLE_CHANNELS: { value: EscalationLevel['channels'][number]; label: string; icon: typeof Mail }[] = [
    { value: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
    { value: 'push', label: 'Push', icon: Smartphone },
    { value: 'email', label: 'Email', icon: Mail },
];

function createEmptyLevel(levelNumber: number): EscalationLevel {
    return {
        level: levelNumber,
        delay_minutes: levelNumber === 1 ? 0 : 5,
        user_ids: [],
        channels: [],
    };
}

export default function EscalationChainIndex({ chains, sites, users }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editChain, setEditChain] = useState<EscalationChain | null>(null);
    const [deleteChain, setDeleteChain] = useState<EscalationChain | null>(null);
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        if (!deleteChain) return;
        setDeleting(true);
        router.delete(`/settings/escalation-chains/${deleteChain.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteChain(null);
            },
        });
    }

    function getSiteName(siteId: number): string {
        return sites.find((s) => s.id === siteId)?.name ?? t('Unknown');
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Escalation Chains')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Escalation Chains')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {chains.length} {t('chain(s)')}
                        </p>
                    </div>
                    <Dialog open={showCreate} onOpenChange={setShowCreate}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Create Chain')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{t('Create Escalation Chain')}</DialogTitle>
                            </DialogHeader>
                            <ChainForm
                                sites={sites}
                                users={users}
                                onSuccess={() => setShowCreate(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead>{t('Levels')}</TableHead>
                                <TableHead>{t('Channels')}</TableHead>
                                <TableHead>{t('Created')}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chains.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center">
                                        <Link2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {t('No escalation chains configured')}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                chains.map((chain) => {
                                    const allChannels = [...new Set(chain.levels.flatMap((l) => l.channels))];

                                    return (
                                        <TableRow key={chain.id}>
                                            <TableCell className="font-medium">{chain.name}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {chain.site?.name ?? getSiteName(chain.site_id)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {chain.levels.length} {t('level(s)')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {allChannels.map((ch) => (
                                                        <Badge key={ch} variant="outline" className="text-xs">
                                                            {ch}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(chain.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Dialog
                                                        open={editChain?.id === chain.id}
                                                        onOpenChange={(open) => !open && setEditChain(null)}
                                                    >
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                title={t('Edit')}
                                                                onClick={() => setEditChain(chain)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>{t('Edit Escalation Chain')}</DialogTitle>
                                                            </DialogHeader>
                                                            <ChainForm
                                                                chain={chain}
                                                                sites={sites}
                                                                users={users}
                                                                onSuccess={() => setEditChain(null)}
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-destructive"
                                                        title={t('Delete')}
                                                        onClick={() => setDeleteChain(chain)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <ConfirmationDialog
                open={!!deleteChain}
                onOpenChange={(open) => !open && setDeleteChain(null)}
                title={t('Delete Escalation Chain')}
                description={`${t('Are you sure you want to delete')} "${deleteChain?.name}"?`}
                warningMessage={t('All escalation levels and notification routing for this chain will be removed.')}
                loading={deleting}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

function ChainForm({
    chain,
    sites,
    users,
    onSuccess,
}: {
    chain?: EscalationChain;
    sites: SiteOption[];
    users: UserOption[];
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!chain;

    const form = useForm({
        name: chain?.name ?? '',
        site_id: chain?.site_id?.toString() ?? '',
        levels: chain?.levels ?? [createEmptyLevel(1)],
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            site_id: Number(data.site_id),
        }));

        if (isEdit) {
            form.put(`/settings/escalation-chains/${chain!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/settings/escalation-chains', {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    onSuccess();
                },
            });
        }
    }

    function addLevel() {
        const nextNumber = form.data.levels.length + 1;
        form.setData('levels', [...form.data.levels, createEmptyLevel(nextNumber)]);
    }

    function removeLevel(index: number) {
        const updated = form.data.levels
            .filter((_, i) => i !== index)
            .map((level, i) => ({ ...level, level: i + 1 }));
        form.setData('levels', updated);
    }

    function updateLevel(index: number, field: keyof EscalationLevel, value: unknown) {
        const updated = form.data.levels.map((level, i) => {
            if (i !== index) return level;
            return { ...level, [field]: value };
        });
        form.setData('levels', updated);
    }

    function toggleUserInLevel(levelIndex: number, userId: number) {
        const level = form.data.levels[levelIndex];
        const currentIds = level.user_ids;
        const updatedIds = currentIds.includes(userId)
            ? currentIds.filter((id) => id !== userId)
            : [...currentIds, userId];
        updateLevel(levelIndex, 'user_ids', updatedIds);
    }

    function toggleChannelInLevel(levelIndex: number, channel: EscalationLevel['channels'][number]) {
        const level = form.data.levels[levelIndex];
        const currentChannels = level.channels;
        const updatedChannels = currentChannels.includes(channel)
            ? currentChannels.filter((ch) => ch !== channel)
            : [...currentChannels, channel];
        updateLevel(levelIndex, 'channels', updatedChannels);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="grid gap-2">
                <Label>{t('Name')}</Label>
                <Input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder={t('e.g. Critical Alert Chain')}
                    required
                />
                <InputError message={form.errors.name} />
            </div>

            {/* Site */}
            <div className="grid gap-2">
                <Label>{t('Site')}</Label>
                <Select
                    value={form.data.site_id}
                    onValueChange={(v) => form.setData('site_id', v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select site')} />
                    </SelectTrigger>
                    <SelectContent>
                        {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id.toString()}>
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.site_id} />
            </div>

            {/* Levels */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{t('Escalation Levels')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLevel}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {t('Add Level')}
                    </Button>
                </div>

                {form.data.levels.map((level, index) => (
                    <LevelBuilder
                        key={index}
                        level={level}
                        users={users}
                        canRemove={form.data.levels.length > 1}
                        onRemove={() => removeLevel(index)}
                        onDelayChange={(val) => updateLevel(index, 'delay_minutes', val)}
                        onToggleUser={(userId) => toggleUserInLevel(index, userId)}
                        onToggleChannel={(channel) => toggleChannelInLevel(index, channel)}
                    />
                ))}

                <InputError message={form.errors.levels} />
            </div>

            <Button type="submit" disabled={form.processing} className="w-full">
                {isEdit ? t('Update Chain') : t('Create Chain')}
            </Button>
        </form>
    );
}

function LevelBuilder({
    level,
    users,
    canRemove,
    onRemove,
    onDelayChange,
    onToggleUser,
    onToggleChannel,
}: {
    level: EscalationLevel;
    users: UserOption[];
    canRemove: boolean;
    onRemove: () => void;
    onDelayChange: (value: number) => void;
    onToggleUser: (userId: number) => void;
    onToggleChannel: (channel: EscalationLevel['channels'][number]) => void;
}) {
    const { t } = useLang();

    return (
        <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono">
                        L{level.level}
                    </Badge>
                    <span className="text-sm font-medium">
                        {t('Level :number', { number: level.level })}
                    </span>
                </div>
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Delay */}
            <div className="grid gap-2">
                <Label className="text-xs">{t('Delay (minutes)')}</Label>
                <Input
                    type="number"
                    min={0}
                    value={level.delay_minutes}
                    onChange={(e) => onDelayChange(Number(e.target.value))}
                    className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                    {level.delay_minutes === 0
                        ? t('Notified immediately when alert fires')
                        : t('Wait :min minute(s) before escalating to this level', { min: level.delay_minutes })}
                </p>
            </div>

            {/* Notification Channels */}
            <div className="grid gap-2">
                <Label className="text-xs">{t('Notification Channels')}</Label>
                <div className="flex flex-wrap gap-3">
                    {AVAILABLE_CHANNELS.map(({ value, label, icon: Icon }) => (
                        <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                                checked={level.channels.includes(value)}
                                onCheckedChange={() => onToggleChannel(value)}
                            />
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Users */}
            <div className="grid gap-2">
                <Label className="text-xs">{t('Users to Notify')}</Label>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-3">
                    {users.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('No users available')}</p>
                    ) : (
                        users.map((user) => (
                            <label key={user.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                    checked={level.user_ids.includes(user.id)}
                                    onCheckedChange={() => onToggleUser(user.id)}
                                />
                                {user.name}
                            </label>
                        ))
                    )}
                </div>
                {level.user_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {level.user_ids.length} {t('user(s) selected')}
                    </p>
                )}
            </div>
        </div>
    );
}
