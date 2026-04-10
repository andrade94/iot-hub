import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, EscalationChain, EscalationLevel } from '@/types';
import { useValidatedForm } from '@/hooks/use-validated-form';
import { escalationChainSchema } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { GitBranch, Mail, MessageCircle, Pencil, Plus, Smartphone, Trash2 } from 'lucide-react';
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
    siteUsers: Record<number, UserOption[]>;
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

export default function EscalationChainIndex({ chains, sites, siteUsers }: Props) {
    // Flatten all users for display in flow cards
    const allUsers: UserOption[] = Object.values(siteUsers).flat().filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);
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
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-center justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Escalation Chains')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Notification Routing')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">{chains.length}</span>{' '}
                                    {t('chain(s) configured')}
                                </p>
                            </div>
                            <Can permission="manage alert rules">
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Create Chain')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>{t('Create Escalation Chain')}</DialogTitle>
                                        </DialogHeader>
                                        <ChainForm
                                            sites={sites}
                                            siteUsers={siteUsers}
                                            onSuccess={() => setShowCreate(false)}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Section Divider ─────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('All Chains')}
                        </p>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                {/* ── Chain Cards with Flow ────────────────────────── */}
                <FadeIn delay={150} duration={500}>
                    {chains.length === 0 ? (
                        <Card className="shadow-elevation-1">
                            <EmptyState
                                size="sm"
                                variant="muted"
                                icon={<GitBranch className="h-5 w-5 text-muted-foreground" />}
                                title={t('No escalation chains')}
                                description={t('Create an escalation chain to route alert notifications')}
                            />
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {chains.map((chain) => (
                                <Card key={chain.id} className="shadow-elevation-1 overflow-hidden">
                                    {/* Chain header */}
                                    <div className="flex items-center justify-between border-b px-5 py-3.5">
                                        <div>
                                            <p className="text-[14px] font-semibold">{chain.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{chain.site?.name ?? getSiteName(chain.site_id)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-[9px] tabular-nums">
                                                {chain.levels.length} {chain.levels.length === 1 ? t('level') : t('levels')}
                                            </Badge>
                                            <Can permission="manage alert rules">
                                                <Dialog open={editChain?.id === chain.id} onOpenChange={(open) => !open && setEditChain(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon-sm" onClick={() => setEditChain(chain)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>{t('Edit Escalation Chain')}</DialogTitle>
                                                        </DialogHeader>
                                                        <ChainForm chain={chain} sites={sites} siteUsers={siteUsers} onSuccess={() => setEditChain(null)} />
                                                    </DialogContent>
                                                </Dialog>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteChain(chain)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </Can>
                                        </div>
                                    </div>

                                    {/* Flow visualization */}
                                    <div className="px-5 py-4">
                                        {chain.levels
                                            .slice()
                                            .sort((a, b) => a.level - b.level)
                                            .map((level, idx, arr) => {
                                                const levelColors = ['bg-rose-500/10 border-rose-500/30 text-rose-500', 'bg-amber-500/10 border-amber-500/30 text-amber-500', 'bg-violet-500/10 border-violet-500/30 text-violet-400'];
                                                const colorClass = levelColors[idx % levelColors.length];
                                                const levelUsers = allUsers.filter((u) => level.user_ids.includes(u.id));
                                                const isLast = idx === arr.length - 1;

                                                return (
                                                    <div key={level.level} className="flex gap-4">
                                                        {/* Connector */}
                                                        <div className="flex flex-col items-center" style={{ width: 36 }}>
                                                            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border-2 font-mono text-[12px] font-bold', colorClass)}>
                                                                L{level.level}
                                                            </div>
                                                            {!isLast && <div className="w-0.5 flex-1 bg-border" style={{ minHeight: 24 }} />}
                                                        </div>
                                                        {/* Content */}
                                                        <div className={cn('flex-1', !isLast && 'pb-4')}>
                                                            <p className="mb-1.5 font-mono text-[10px] text-muted-foreground/60">
                                                                {level.delay_minutes === 0 ? (
                                                                    <span className="font-medium text-rose-500">{t('Immediate')}</span>
                                                                ) : (
                                                                    <><span className="font-medium text-amber-500">+{level.delay_minutes} min</span> {t('if not acknowledged')}</>
                                                                )}
                                                            </p>
                                                            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3.5 py-2.5">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[12px] font-medium">
                                                                        {levelUsers.length > 0 ? levelUsers.map((u) => u.name).join(', ') : t('No users selected')}
                                                                    </p>
                                                                    {levelUsers.length > 1 && (
                                                                        <p className="text-[10px] text-muted-foreground/60">{t('Notified simultaneously')}</p>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    {level.channels.map((ch) => (
                                                                        <span key={ch} className={cn('rounded-md border px-2 py-0.5 text-[9px] font-medium',
                                                                            ch === 'whatsapp' ? 'border-emerald-500/25 text-emerald-400' :
                                                                            ch === 'push' ? 'border-blue-500/25 text-blue-400' :
                                                                            'border-violet-500/25 text-violet-400'
                                                                        )}>
                                                                            {ch === 'whatsapp' ? 'WhatsApp' : ch === 'push' ? 'Push' : 'Email'}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </FadeIn>
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
    siteUsers,
    onSuccess,
}: {
    chain?: EscalationChain;
    sites: SiteOption[];
    siteUsers: Record<number, UserOption[]>;
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!chain;

    const form = useValidatedForm(escalationChainSchema, {
        name: chain?.name ?? '',
        site_id: chain?.site_id?.toString() ?? '',
        levels: chain?.levels ?? [createEmptyLevel(1)],
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;

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

    type LevelData = (typeof form.data.levels)[number];

    function removeLevel(index: number) {
        const updated = form.data.levels
            .filter((_: LevelData, i: number) => i !== index)
            .map((level: LevelData, i: number) => ({ ...level, level: i + 1 }));
        form.setData('levels', updated);
    }

    function updateLevel(index: number, field: keyof EscalationLevel, value: unknown) {
        const updated = form.data.levels.map((level: LevelData, i: number) => {
            if (i !== index) return level;
            return { ...level, [field]: value };
        });
        form.setData('levels', updated);
    }

    function toggleUserInLevel(levelIndex: number, userId: number) {
        const level = form.data.levels[levelIndex];
        const currentIds = level.user_ids;
        const updatedIds = currentIds.includes(userId)
            ? currentIds.filter((id: number) => id !== userId)
            : [...currentIds, userId];
        updateLevel(levelIndex, 'user_ids', updatedIds);
    }

    function toggleChannelInLevel(levelIndex: number, channel: EscalationLevel['channels'][number]) {
        const level = form.data.levels[levelIndex];
        const currentChannels = level.channels;
        const updatedChannels = currentChannels.includes(channel)
            ? currentChannels.filter((ch: string) => ch !== channel)
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

                {form.data.levels.map((level: LevelData, index: number) => (
                    <LevelBuilder
                        key={index}
                        level={level}
                        users={form.data.site_id ? (siteUsers[Number(form.data.site_id)] ?? []) : []}
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

export function EscalationChainsSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <Skeleton className="h-36 w-full rounded-xl" />

            {/* Section divider */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <div className="h-px flex-1 bg-border" />
            </div>

            <Card className="flex-1 shadow-elevation-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-18" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Skeleton className="h-5 w-16" />
                                        <Skeleton className="h-5 w-12" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
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
                    <Badge variant="secondary" className="font-mono text-xs tabular-nums">
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
                    className="w-32 font-mono tabular-nums"
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
                        <p className="text-sm text-muted-foreground">{t('Select a site first to see available users')}</p>
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
                        <span className="font-mono tabular-nums">{level.user_ids.length}</span> {t('user(s) selected')}
                    </p>
                )}
            </div>
        </div>
    );
}
