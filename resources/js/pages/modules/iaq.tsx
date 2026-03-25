import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Droplets, Thermometer, Wind, Zap } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface IAQZone {
    zone: string;
    score: number;
    co2: number;
    temperature: number;
    humidity: number;
    tvoc: number;
}

interface Props {
    site: { id: number; name: string };
    zones: IAQZone[];
    chartData: { time: string; co2: number; temperature: number; humidity: number }[];
}

const PERIODS = ['24h', '7d', '30d'] as const;

function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
}

function getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
}

function getMetricStatus(metric: string, value: number): 'good' | 'fair' | 'poor' {
    switch (metric) {
        case 'co2':
            if (value < 800) return 'good';
            if (value < 1200) return 'fair';
            return 'poor';
        case 'temperature':
            if (value >= 20 && value <= 26) return 'good';
            if (value >= 18 && value <= 28) return 'fair';
            return 'poor';
        case 'humidity':
            if (value >= 30 && value <= 60) return 'good';
            if (value >= 20 && value <= 70) return 'fair';
            return 'poor';
        case 'tvoc':
            if (value < 300) return 'good';
            if (value < 500) return 'fair';
            return 'poor';
        default:
            return 'good';
    }
}

const STATUS_COLORS: Record<string, string> = {
    good: 'text-emerald-500',
    fair: 'text-amber-500',
    poor: 'text-red-500',
};

const STATUS_DOT_COLORS: Record<string, string> = {
    good: 'bg-emerald-500',
    fair: 'bg-amber-500',
    poor: 'bg-red-500',
};

export default function IAQDashboard({ site, zones, chartData }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'IAQ Dashboard', href: '#' },
    ];

    const overallScore = zones.length > 0
        ? Math.round(zones.reduce((sum, z) => sum + z.score, 0) / zones.length)
        : 0;

    // SSR fix: guard window access
    const currentPeriod = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('period') ?? '24h';

    function handlePeriodChange(newPeriod: string) {
        router.get(`/sites/${site.id}/modules/iaq`, { period: newPeriod }, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('IAQ Dashboard')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('IAQ Dashboard')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {site.name}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Indoor Air Quality')} —{' '}
                                    <span className="font-mono tabular-nums">{zones.length}</span> {t('zone(s)')}
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── OVERALL SCORE ────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Overall Score')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                <FadeIn delay={100} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex items-center gap-6 p-6">
                            <div
                                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4"
                                style={{ borderColor: getScoreColor(overallScore) }}
                            >
                                <div className="text-center">
                                    <p className="font-mono text-3xl font-bold tabular-nums" style={{ color: getScoreColor(overallScore) }}>
                                        {overallScore}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-lg font-semibold" style={{ color: getScoreColor(overallScore) }}>
                                    {t(getScoreLabel(overallScore))}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t('Overall IAQ Score')} —{' '}
                                    <span className="font-mono tabular-nums">{zones.length}</span> {t('zone(s)')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── ZONES ────────────────────────────────────────── */}
                <FadeIn delay={150} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Zones')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {zones.length}
                        </span>
                    </div>
                </FadeIn>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {zones.map((zone, i) => (
                        <FadeIn key={zone.zone} delay={175 + i * 50} duration={400}>
                            <ZoneCard zone={zone} />
                        </FadeIn>
                    ))}
                </div>

                {/* ── TREND ────────────────────────────────────────── */}
                <FadeIn delay={175 + zones.length * 50} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Trend')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                <FadeIn delay={200 + zones.length * 50} duration={400}>
                    <Card className="shadow-elevation-1">
                        <div className="flex items-center justify-between p-6 pb-2">
                            <h3 className="text-base font-semibold">{t('Environmental Trend')}</h3>
                            <ButtonGroup>
                                {PERIODS.map((period) => (
                                    <Button
                                        key={period}
                                        variant={currentPeriod === period ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handlePeriodChange(period)}
                                    >
                                        {period}
                                    </Button>
                                ))}
                            </ButtonGroup>
                        </div>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="co2" stroke="#ef4444" name="CO2 (ppm)" dot={false} strokeWidth={2} />
                                    <Line type="monotone" dataKey="temperature" stroke="#3b82f6" name="Temp (C)" dot={false} strokeWidth={2} />
                                    <Line type="monotone" dataKey="humidity" stroke="#10b981" name="Humidity (%)" dot={false} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

export function IAQDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-44" />
            </div>
            {/* Overall Score */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="rounded-xl border p-6">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div>
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="mt-1 h-4 w-36" />
                    </div>
                </div>
            </div>
            {/* Zones */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-12" />
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-8 w-10" />
                        </div>
                        {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className="flex justify-between">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {/* Chart */}
            <div className="rounded-xl border p-6">
                <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
        </div>
    );
}

function ZoneCard({ zone }: { zone: IAQZone }) {
    const scoreColor = getScoreColor(zone.score);

    const metrics = [
        { key: 'co2', label: 'CO2', value: zone.co2, unit: 'ppm', icon: Wind },
        { key: 'temperature', label: 'Temperature', value: zone.temperature, unit: '\u00B0C', icon: Thermometer },
        { key: 'humidity', label: 'Humidity', value: zone.humidity, unit: '%', icon: Droplets },
        { key: 'tvoc', label: 'TVOC', value: zone.tvoc, unit: 'ppb', icon: Zap },
    ];

    return (
        <Card className="shadow-elevation-1">
            <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{zone.zone}</h3>
                    <div className="text-right">
                        <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: scoreColor }}>
                            {zone.score}
                        </p>
                        <p className="text-xs" style={{ color: scoreColor }}>
                            {getScoreLabel(zone.score)}
                        </p>
                    </div>
                </div>
            </div>
            <CardContent className="space-y-2 pt-0">
                {metrics.map(({ key, label, value, unit, icon: Icon }) => {
                    const status = getMetricStatus(key, value);
                    return (
                        <div key={key} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Icon className="h-3.5 w-3.5" />
                                <span>{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-mono font-medium tabular-nums ${STATUS_COLORS[status]}`}>
                                    {value} {unit}
                                </span>
                                <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
