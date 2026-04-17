import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { complianceEventSchema } from '@/utils/schemas';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    AlertTriangle,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    Cpu,
    Download,
    FileText,
    History,
    Paperclip,
    Pencil,
    Plus,
    ShieldCheck,
    Thermometer,
    Trash2,
    Upload,
    X,
    Zap,
} from 'lucide-react';
import { type ChangeEvent, type ReactNode, useRef, useState } from 'react';

/* ── Types ──────────────────────────────────────────────────── */

interface SiteOption {
    id: number;
    name: string;
}

interface ComplianceEvent {
    id: number;
    site_id: number;
    site: { id: number; name: string } | null;
    type: string;
    title: string;
    description: string | null;
    due_date: string;
    status: string;
    completed_at: string | null;
    completed_by: string | null;
    attachment_path: string | null;
    attachment_name: string | null;
    days_until_due: number;
    can_generate_evidence: boolean;
    evidence_report_type: string | null;
}

interface Stats {
    overdue_count: number;
    overdue_example: { title: string; days_overdue: number } | null;
    due_this_month_count: number;
    due_next_7_count: number;
    ytd_compliance_pct: number;
    ytd_on_time: number;
    ytd_total: number;
    next_audit: {
        id: number;
        title: string;
        type: string;
        due_date: string;
        days_until: number;
        site_name: string | null;
    } | null;
}

interface LastGenerated {
    at: string | null;
    site: string | null;
}

interface Props {
    events: Record<string, ComplianceEvent[]>;
    sites: SiteOption[];
    types: Record<string, string>;
    filters: {
        site_id: string | null;
        type: string | null;
        status: string | null;
        overdue_only: boolean;
    };
    stats: Stats;
    last_generated: {
        temperature: LastGenerated | null;
        energy: LastGenerated | null;
        inventory: LastGenerated | null;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administration', href: '#' },
    { title: 'Compliance', href: '/settings/compliance' },
];

/* ── Helpers ────────────────────────────────────────────────── */

function formatMonthLabel(month: string): string {
    // month is "YYYY-MM"
    const date = new Date(`${month}-01T00:00:00`);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatRelativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const diffSeconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function isCurrentMonth(monthKey: string): boolean {
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthKey === nowKey;
}

function formatDueDateShort(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

function formatCountdown(
    event: ComplianceEvent,
    t: (k: string, replacements?: Record<string, string | number>) => string,
): { text: string; tone: 'overdue' | 'due-soon' | 'on-track' | 'neutral' } {
    const days = event.days_until_due;
    if (event.status === 'completed') {
        return { text: t('Completed on time'), tone: 'on-track' };
    }
    if (days < 0) {
        return { text: t(':n days overdue', { n: Math.abs(days) }), tone: 'overdue' };
    }
    if (days === 0) {
        return { text: t('Due today'), tone: 'overdue' };
    }
    if (days <= 7) {
        return { text: t('in :n days', { n: days }), tone: 'due-soon' };
    }
    return { text: t('in :n days', { n: days }), tone: 'neutral' };
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    cofepris_audit: {
        bg: 'bg-rose-500/10',
        text: 'text-rose-500',
        border: 'border-rose-500/20',
        icon: 'shield',
    },
    certificate_renewal: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/20',
        icon: 'certificate',
    },
    calibration: {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-500',
        border: 'border-cyan-500/20',
        icon: 'calibration',
    },
    inspection: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        border: 'border-emerald-500/20',
        icon: 'inspection',
    },
    permit_renewal: {
        bg: 'bg-violet-500/10',
        text: 'text-violet-500',
        border: 'border-violet-500/20',
        icon: 'permit',
    },
};

function TypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'cofepris_audit':
            return <ShieldCheck className="h-2.5 w-2.5" />;
        case 'certificate_renewal':
            return <FileText className="h-2.5 w-2.5" />;
        case 'calibration':
            return <AlertTriangle className="h-2.5 w-2.5" />;
        case 'inspection':
            return <ShieldCheck className="h-2.5 w-2.5" />;
        case 'permit_renewal':
            return <FileText className="h-2.5 w-2.5" />;
        default:
            return <FileText className="h-2.5 w-2.5" />;
    }
}

/* ── Main Component ─────────────────────────────────────────── */

export default function ComplianceIndex({
    events,
    sites,
    types,
    filters,
    stats,
    last_generated,
}: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editEvent, setEditEvent] = useState<ComplianceEvent | null>(null);
    const [deleteEvent, setDeleteEvent] = useState<ComplianceEvent | null>(null);
    const [attachEvent, setAttachEvent] = useState<ComplianceEvent | null>(null);
    const [deleting, setDeleting] = useState(false);

    const sortedMonths = Object.keys(events).sort();
    const hasAnyEvents = sortedMonths.length > 0;

    const updateFilter = (key: string, value: string | boolean | null) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(filters)) {
            if (v !== null && v !== undefined && v !== '' && v !== false) next[k] = String(v);
        }
        if (value === true) next[key] = '1';
        else if (value && value !== '' && value !== 'all') next[key] = String(value);
        else delete next[key];
        router.get('/settings/compliance', next, { preserveState: true, replace: true });
    };

    const handleDelete = () => {
        if (!deleteEvent) return;
        setDeleting(true);
        router.delete(`/settings/compliance/${deleteEvent.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteEvent(null);
            },
        });
    };

    const handleComplete = (event: ComplianceEvent) => {
        router.post(`/settings/compliance/${event.id}/complete`, {}, { preserveScroll: true });
    };

    const handleDetach = (event: ComplianceEvent) => {
        router.delete(`/settings/compliance/${event.id}/attach`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Compliance')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-2xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Regulatory Calendar & Evidence')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Compliance')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'Track scheduled audits, inspections, and renewals — and generate the PDFs inspectors ask for, on one page.',
                                    )}
                                </p>
                            </div>
                            <Can permission="manage org settings">
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-1.5 h-4 w-4" />
                                            {t('Schedule event')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>{t('Create Compliance Event')}</DialogTitle>
                                        </DialogHeader>
                                        <EventForm
                                            sites={sites}
                                            types={types}
                                            onSuccess={() => setShowCreate(false)}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Stat strip ────────────────────────────────── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FadeIn delay={50} duration={400}>
                        <StatCell
                            icon={<AlertTriangle className="h-3 w-3" />}
                            label={t('Overdue')}
                            value={stats.overdue_count.toString()}
                            tone={stats.overdue_count > 0 ? 'coral' : 'default'}
                            subtitle={
                                stats.overdue_example
                                    ? `${stats.overdue_example.title} · ${stats.overdue_example.days_overdue}${t('d')}`
                                    : t('none in this window')
                            }
                        />
                    </FadeIn>
                    <FadeIn delay={100} duration={400}>
                        <StatCell
                            icon={<CalendarDays className="h-3 w-3" />}
                            label={t('Due this month')}
                            value={stats.due_this_month_count.toString()}
                            tone={stats.due_this_month_count > 0 ? 'amber' : 'default'}
                            subtitle={`${stats.due_next_7_count} ${t('next 7 days')}`}
                        />
                    </FadeIn>
                    <FadeIn delay={150} duration={400}>
                        <StatCell
                            icon={<CheckCircle2 className="h-3 w-3" />}
                            label={t('Compliance · YTD')}
                            value={`${stats.ytd_compliance_pct}%`}
                            tone="emerald"
                            subtitle={`${stats.ytd_on_time} ${t('of')} ${stats.ytd_total} ${t('on time')}`}
                        />
                    </FadeIn>
                    <FadeIn delay={200} duration={400}>
                        <StatCell
                            icon={<ShieldCheck className="h-3 w-3" />}
                            label={t('Next audit')}
                            value={
                                stats.next_audit
                                    ? new Date(`${stats.next_audit.due_date}T00:00:00`).toLocaleDateString(undefined, {
                                          month: 'short',
                                          day: 'numeric',
                                      })
                                    : '—'
                            }
                            tone="cyan"
                            smallValue
                            subtitle={
                                stats.next_audit
                                    ? `${stats.next_audit.site_name ?? '—'} · ${t('in :n days', { n: stats.next_audit.days_until })}`
                                    : t('no upcoming audits')
                            }
                        />
                    </FadeIn>
                </div>

                {/* ── Scheduled events card ─────────────────────── */}
                <FadeIn delay={250} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-6">
                            <div className="mb-5">
                                <p className="font-display text-base font-semibold tracking-tight">
                                    {t('Scheduled events')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t(
                                        'Audits, inspections, renewals and calibrations across your sites. Completed events keep the signed PDF attached.',
                                    )}
                                </p>
                            </div>

                            {/* Filter row */}
                            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/60 pb-4">
                                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
                                    {t('Filter')}
                                </span>
                                <Select
                                    value={filters.site_id ?? 'all'}
                                    onValueChange={(v) => updateFilter('site_id', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                        <SelectValue placeholder={t('All sites')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All sites')}</SelectItem>
                                        {sites.map((site) => (
                                            <SelectItem key={site.id} value={site.id.toString()}>
                                                {site.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.type ?? 'all'}
                                    onValueChange={(v) => updateFilter('type', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                        <SelectValue placeholder={t('All types')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All types')}</SelectItem>
                                        {Object.entries(types).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(v) => updateFilter('status', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                        <SelectValue placeholder={t('All statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All statuses')}</SelectItem>
                                        <SelectItem value="upcoming">{t('Upcoming')}</SelectItem>
                                        <SelectItem value="overdue">{t('Overdue')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="mx-1 h-5 w-px bg-border" />
                                <button
                                    type="button"
                                    onClick={() => updateFilter('overdue_only', !filters.overdue_only)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] transition-colors',
                                        filters.overdue_only
                                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                                            : 'border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-500',
                                    )}
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    {t('Overdue only')}
                                    <span className="rounded bg-background/50 px-1 py-0.5 text-[9px] font-semibold">
                                        {stats.overdue_count}
                                    </span>
                                </button>
                            </div>

                            {!hasAnyEvents ? (
                                <EmptyState
                                    icon={<CalendarCheck className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No compliance events scheduled')}
                                    description={t(
                                        'Create a compliance event to track audits, certifications, and inspections.',
                                    )}
                                />
                            ) : (
                                <div className="space-y-6">
                                    {sortedMonths.map((month) => {
                                        const monthEvents = events[month];
                                        const overdueCount = monthEvents.filter(
                                            (e) => e.status === 'overdue',
                                        ).length;
                                        const current = isCurrentMonth(month);
                                        return (
                                            <div key={month}>
                                                <div className="mb-3 flex items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            'flex items-center font-display text-sm font-semibold',
                                                            current ? 'text-foreground' : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {current && (
                                                            <span className="mr-2 h-[5px] w-[5px] rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                                        )}
                                                        {formatMonthLabel(month)}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-muted-foreground/70">
                                                        {monthEvents.length}{' '}
                                                        {monthEvents.length === 1 ? t('event') : t('events')}
                                                        {overdueCount > 0 && (
                                                            <>
                                                                {' · '}
                                                                <span className="text-rose-500">
                                                                    {overdueCount} {t('overdue')}
                                                                </span>
                                                            </>
                                                        )}
                                                    </span>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {monthEvents.map((event) => (
                                                        <EventRow
                                                            key={event.id}
                                                            event={event}
                                                            types={types}
                                                            onComplete={() => handleComplete(event)}
                                                            onEdit={() => setEditEvent(event)}
                                                            onDelete={() => setDeleteEvent(event)}
                                                            onAttach={() => setAttachEvent(event)}
                                                            onDetach={() => handleDetach(event)}
                                                            t={t}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Report Center ─────────────────────────────── */}
                <FadeIn delay={300} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-6">
                            <div className="mb-5">
                                <p className="font-display text-base font-semibold tracking-tight">
                                    {t('Report Center')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t(
                                        'Generate PDF evidence for audits. Temperature Compliance is what COFEPRIS asks for; Energy covers sustainability reporting; Device Inventory is the asset register.',
                                    )}
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <ReportCard
                                    tone="temp"
                                    icon={<Thermometer className="h-4 w-4" />}
                                    title={t('Temperature Compliance')}
                                    description={t(
                                        'Zone-level compliance rates, excursion detection, minimum/maximum trends. The PDF COFEPRIS asks for.',
                                    )}
                                    badge={t('COFEPRIS required')}
                                    badgeTone="required"
                                    lastGenerated={last_generated.temperature}
                                    sites={sites}
                                    reportType="temperature"
                                    withDates
                                    defaultFromDays={7}
                                />
                                <ReportCard
                                    tone="energy"
                                    icon={<Zap className="h-4 w-4" />}
                                    title={t('Energy Consumption')}
                                    description={t(
                                        'kWh usage with cost breakdown, daily trends, baseline per device. For sustainability reporting and ops reviews.',
                                    )}
                                    badge={t('Optional')}
                                    badgeTone="optional"
                                    lastGenerated={last_generated.energy}
                                    sites={sites}
                                    reportType="energy"
                                    withDates
                                    defaultFromDays={30}
                                />
                                <ReportCard
                                    tone="inventory"
                                    icon={<Cpu className="h-4 w-4" />}
                                    title={t('Device Inventory')}
                                    description={t(
                                        'Asset register: status, battery, signal, calibration date, gateway mapping. For physical-asset audits and insurance.',
                                    )}
                                    badge={t('Snapshot')}
                                    badgeTone="snapshot"
                                    lastGenerated={last_generated.inventory}
                                    sites={sites}
                                    reportType="inventory"
                                    withDates={false}
                                    defaultFromDays={0}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
                <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Compliance Event')}</DialogTitle>
                    </DialogHeader>
                    {editEvent && (
                        <EventForm
                            event={editEvent}
                            sites={sites}
                            types={types}
                            onSuccess={() => setEditEvent(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Attach Dialog */}
            <AttachmentDialog
                event={attachEvent}
                onClose={() => setAttachEvent(null)}
            />

            {/* Delete Confirmation */}
            <ConfirmationDialog
                open={!!deleteEvent}
                onOpenChange={(open) => !open && setDeleteEvent(null)}
                title={t('Delete Compliance Event')}
                description={`${t('Are you sure you want to delete')} "${deleteEvent?.title}"?`}
                warningMessage={t('This compliance event will be permanently removed.')}
                loading={deleting}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* ── Stat cell ──────────────────────────────────────────────── */

function StatCell({
    icon,
    label,
    value,
    tone = 'default',
    subtitle,
    smallValue = false,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    tone?: 'coral' | 'amber' | 'emerald' | 'cyan' | 'default';
    subtitle?: string;
    smallValue?: boolean;
}) {
    const barClass = {
        coral: 'before:bg-rose-500',
        amber: 'before:bg-amber-500',
        emerald: 'before:bg-emerald-500',
        cyan: 'before:bg-cyan-500',
        default: 'before:bg-muted-foreground/40',
    }[tone];

    const valueClass = {
        coral: 'text-rose-500',
        amber: 'text-amber-500',
        emerald: 'text-emerald-500',
        cyan: 'text-foreground',
        default: 'text-foreground',
    }[tone];

    return (
        <Card
            className={cn(
                'relative overflow-hidden shadow-elevation-1 transition-all hover:-translate-y-0.5',
                "before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:opacity-70 before:content-['']",
                barClass,
            )}
        >
            <CardContent className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-widest">{label}</p>
                    {icon}
                </div>
                <p
                    className={cn(
                        'font-display mt-3 font-bold leading-none tracking-tight tabular-nums',
                        smallValue ? 'text-xl' : 'text-3xl',
                        valueClass,
                    )}
                >
                    {value}
                </p>
                {subtitle && <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

/* ── Event row ──────────────────────────────────────────────── */

function EventRow({
    event,
    types,
    onComplete,
    onEdit,
    onDelete,
    onAttach,
    onDetach,
    t,
}: {
    event: ComplianceEvent;
    types: Record<string, string>;
    onComplete: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAttach: () => void;
    onDetach: () => void;
    t: (k: string, replacements?: Record<string, string | number>) => string;
}) {
    const typeStyle = TYPE_STYLES[event.type] ?? TYPE_STYLES.inspection;
    const countdown = formatCountdown(event, t);
    const isOverdue = event.status === 'overdue';
    const isDueSoon = countdown.tone === 'due-soon';
    const isCompleted = event.status === 'completed';

    const borderClass = isOverdue
        ? 'border-l-[3px] border-l-rose-500'
        : isDueSoon
          ? 'border-l-[3px] border-l-amber-500'
          : '';

    const countdownClass = {
        overdue: 'text-rose-500 font-semibold',
        'due-soon': 'text-amber-500 font-semibold',
        'on-track': 'text-emerald-500',
        neutral: 'text-muted-foreground',
    }[countdown.tone];

    const statusClass = {
        upcoming: 'bg-muted/50 text-muted-foreground',
        overdue: 'bg-rose-500/15 text-rose-500',
        completed: 'bg-emerald-500/15 text-emerald-500',
        cancelled: 'bg-muted/50 text-muted-foreground',
    }[event.status] ?? 'bg-muted/50 text-muted-foreground';

    return (
        <div
            className={cn(
                'grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30',
                borderClass,
                isCompleted && 'opacity-75',
            )}
        >
            {/* Type tag */}
            <span
                className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider',
                    typeStyle.bg,
                    typeStyle.text,
                    typeStyle.border,
                )}
            >
                <TypeIcon type={event.type} />
                {(types[event.type] ?? event.type).replace(/_/g, ' ')}
            </span>

            {/* Body */}
            <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{event.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    {event.site && <span className="text-foreground/80">{event.site.name}</span>}
                    {event.description && (
                        <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="truncate">{event.description}</span>
                        </>
                    )}
                    {event.attachment_path && event.attachment_name && (
                        <>
                            <span className="text-muted-foreground/40">·</span>
                            <a
                                href={event.attachment_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-500 hover:bg-emerald-500/20"
                                title={t('Download attached evidence')}
                            >
                                <Paperclip className="h-2.5 w-2.5" />
                                <span className="max-w-[180px] truncate">{event.attachment_name}</span>
                            </a>
                        </>
                    )}
                </div>
            </div>

            {/* Due / countdown */}
            <div className="text-right font-mono text-[11px] whitespace-nowrap">
                <p className="font-semibold text-foreground">{formatDueDateShort(event.due_date)}</p>
                <p className={cn('mt-0.5 text-[10px]', countdownClass)}>{countdown.text}</p>
            </div>

            {/* Status pill */}
            <span
                className={cn(
                    'shrink-0 rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                    statusClass,
                )}
            >
                {t(event.status.charAt(0).toUpperCase() + event.status.slice(1))}
            </span>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
                {!isCompleted && event.can_generate_evidence && event.site && (
                    <Link
                        href={`/sites/${event.site.id}/reports/temperature?from=${getFromDate(event.due_date, 30)}&to=${event.due_date}`}
                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 font-mono text-[9px] font-medium text-muted-foreground transition-colors hover:border-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-500"
                        title={t('Pre-fill Temperature Compliance report for this event')}
                    >
                        <FileText className="h-2.5 w-2.5" />
                        {t('Generate evidence')}
                    </Link>
                )}
                {!isCompleted && !event.can_generate_evidence && (
                    <Can permission="manage org settings">
                        <button
                            type="button"
                            onClick={onAttach}
                            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 font-mono text-[9px] font-medium text-muted-foreground transition-colors hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-500"
                            title={t('Attach the signed document for this event')}
                        >
                            <Upload className="h-2.5 w-2.5" />
                            {t('Attach')}
                        </button>
                    </Can>
                )}
                <Can permission="manage org settings">
                    {!isCompleted && (
                        <button
                            type="button"
                            onClick={onComplete}
                            className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500"
                            title={t('Mark completed')}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {isCompleted && !event.attachment_path && (
                        <button
                            type="button"
                            onClick={onAttach}
                            className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-500"
                            title={t('Attach evidence')}
                        >
                            <Paperclip className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {event.attachment_path && (
                        <button
                            type="button"
                            onClick={onDetach}
                            className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500"
                            title={t('Remove attachment')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onEdit}
                        className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
                        title={t('Edit')}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500"
                        title={t('Delete')}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </Can>
            </div>
        </div>
    );
}

function getFromDate(toDateIso: string, daysBack: number): string {
    const to = new Date(`${toDateIso}T00:00:00`);
    const from = new Date(to);
    from.setDate(from.getDate() - daysBack);
    return from.toISOString().split('T')[0];
}

/* ── Report card ────────────────────────────────────────────── */

function ReportCard({
    tone,
    icon,
    title,
    description,
    badge,
    badgeTone,
    lastGenerated,
    sites,
    reportType,
    withDates,
    defaultFromDays,
}: {
    tone: 'temp' | 'energy' | 'inventory';
    icon: ReactNode;
    title: string;
    description: string;
    badge: string;
    badgeTone: 'required' | 'optional' | 'snapshot';
    lastGenerated: LastGenerated | null;
    sites: SiteOption[];
    reportType: 'temperature' | 'energy' | 'inventory';
    withDates: boolean;
    defaultFromDays: number;
}) {
    const { t } = useLang();
    const [siteId, setSiteId] = useState<string>('');
    const today = new Date().toISOString().split('T')[0];
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - defaultFromDays);
    const [from, setFrom] = useState(defaultFrom.toISOString().split('T')[0]);
    const [to, setTo] = useState(today);
    const [error, setError] = useState('');

    const stripeClass = {
        temp: "before:bg-gradient-to-b before:from-cyan-500 before:to-transparent",
        energy: "before:bg-gradient-to-b before:from-amber-500 before:to-transparent",
        inventory: "before:bg-gradient-to-b before:from-violet-500 before:to-transparent",
    }[tone];

    const iconClass = {
        temp: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/25',
        energy: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
        inventory: 'bg-violet-500/10 text-violet-500 border-violet-500/25',
    }[tone];

    const buttonClass = {
        temp: 'hover:border-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-500',
        energy: 'hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-500',
        inventory: 'hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-500',
    }[tone];

    const badgeClass = {
        required: 'bg-rose-500/10 text-rose-500',
        optional: 'bg-amber-500/10 text-amber-500',
        snapshot: 'bg-muted text-muted-foreground',
    }[badgeTone];

    const generate = () => {
        if (!siteId) {
            setError(t('Please select a site'));
            return;
        }
        setError('');
        const base = `/sites/${siteId}/reports/${reportType}`;
        const url = withDates ? `${base}?from=${from}&to=${to}` : base;
        router.get(url);
    };

    return (
        <Card
            className={cn(
                'relative flex h-full flex-col overflow-hidden shadow-elevation-1 transition-all hover:-translate-y-0.5',
                "before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[3px] before:opacity-70 before:content-['']",
                stripeClass,
            )}
        >
            <CardContent className="flex flex-1 flex-col p-5">
                <div className="mb-4 flex items-start gap-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', iconClass)}>
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-display text-[15px] font-semibold tracking-tight">{title}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
                        <span
                            className={cn(
                                'mt-2 inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest',
                                badgeClass,
                            )}
                        >
                            {badge}
                        </span>
                        <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground/70">
                            <History className="h-2.5 w-2.5" />
                            {t('Last generated')}{' '}
                            <span className="text-muted-foreground">
                                {lastGenerated?.at
                                    ? `${formatRelativeTime(lastGenerated.at)}${lastGenerated.site ? ` · ${lastGenerated.site}` : ''}`
                                    : t('never')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-2.5 border-t border-border/50 pt-4">
                    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t('Site')}
                        </span>
                        <Select value={siteId} onValueChange={(v) => { setSiteId(v); setError(''); }}>
                            <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue placeholder={t('Select a site')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={String(site.id)}>
                                        {site.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {withDates && (
                        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                                {t('Range')}
                            </span>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="h-7 rounded border border-input bg-background px-2 font-mono text-[10px]"
                            />
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="h-7 rounded border border-input bg-background px-2 font-mono text-[10px]"
                            />
                        </div>
                    )}
                    {error && <p className="text-[10px] text-rose-500">{error}</p>}
                    <button
                        type="button"
                        onClick={generate}
                        className={cn(
                            'mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 font-medium text-[11px] text-foreground transition-colors',
                            buttonClass,
                        )}
                    >
                        <Download className="h-3 w-3" />
                        {t('Generate PDF')}
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Attachment dialog ─────────────────────────────────────── */

function AttachmentDialog({
    event,
    onClose,
}: {
    event: ComplianceEvent | null;
    onClose: () => void;
}) {
    const { t } = useLang();
    const fileInput = useRef<HTMLInputElement | null>(null);
    const form = useForm<{ attachment: File | null }>({ attachment: null });

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!event || !form.data.attachment) return;
        form.post(`/settings/compliance/${event.id}/attach`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        form.setData('attachment', file);
    };

    return (
        <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Attach evidence')}</DialogTitle>
                </DialogHeader>
                {event && (
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {event.site?.name ?? ''}
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">
                                {t('PDF or image (max 10MB)')}
                            </Label>
                            <input
                                ref={fileInput}
                                type="file"
                                accept="application/pdf,image/jpeg,image/png"
                                onChange={handleFileChange}
                                className="block w-full cursor-pointer rounded border border-input bg-background px-3 py-2 text-xs file:mr-3 file:rounded file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium hover:bg-muted/50"
                            />
                            <InputError message={form.errors.attachment} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={!form.data.attachment || form.processing}>
                                <Upload className="mr-1.5 h-3.5 w-3.5" />
                                {form.processing ? t('Uploading...') : t('Upload')}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ── Event form (create + edit) ─────────────────────────────── */

function EventForm({
    event,
    sites,
    types,
    onSuccess,
}: {
    event?: ComplianceEvent;
    sites: SiteOption[];
    types: Record<string, string>;
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!event;

    const form = useValidatedForm(complianceEventSchema, {
        title: event?.title ?? '',
        type: event?.type ?? '',
        site_id: event?.site_id?.toString() ?? '',
        due_date: event?.due_date ?? '',
        description: event?.description ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;

        form.transform((data) => ({
            ...data,
            site_id: Number(data.site_id),
        }));

        if (isEdit) {
            form.put(`/settings/compliance/${event!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/settings/compliance', {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    onSuccess();
                },
            });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>{t('Title')}</Label>
                <Input
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                    placeholder={t('e.g. Annual COFEPRIS Audit')}
                    required
                />
                <InputError message={form.errors.title} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Type')}</Label>
                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select a type')} />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(types).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.type} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Site')}</Label>
                <Select value={form.data.site_id} onValueChange={(v) => form.setData('site_id', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select a site')} />
                    </SelectTrigger>
                    <SelectContent>
                        {sites.map((site) => (
                            <SelectItem key={site.id} value={String(site.id)}>
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.site_id} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Due date')}</Label>
                <DatePicker
                    date={form.data.due_date ? parseISO(form.data.due_date) : undefined}
                    onDateChange={(d) => form.setData('due_date', d ? format(d, 'yyyy-MM-dd') : '')}
                    placeholder={t('Select date')}
                />
                <InputError message={form.errors.due_date} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Description')}</Label>
                <Textarea
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder={t('Optional notes')}
                    rows={3}
                />
                <InputError message={form.errors.description} />
            </div>

            <div className="flex justify-end gap-2">
                <Button type="submit" disabled={form.processing}>
                    {isEdit ? t('Save changes') : t('Create event')}
                </Button>
            </div>
        </form>
    );
}
