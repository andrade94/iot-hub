import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    const currentPeriod = new URLSearchParams(window.location.search).get('period') ?? '24h';

    function handlePeriodChange(period: string) {
        router.get(window.location.pathname, { period }, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('IAQ Dashboard')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
                    <p className="text-sm text-muted-foreground">{t('Indoor Air Quality')}</p>
                </div>

                {/* Overall score */}
                <Card>
                    <CardContent className="flex items-center gap-6 p-6">
                        <div
                            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4"
                            style={{ borderColor: getScoreColor(overallScore) }}
                        >
                            <div className="text-center">
                                <p className="text-3xl font-bold tabular-nums" style={{ color: getScoreColor(overallScore) }}>
                                    {overallScore}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-lg font-semibold" style={{ color: getScoreColor(overallScore) }}>
                                {t(getScoreLabel(overallScore))}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {t('Overall IAQ Score')} — {zones.length} {t('zone(s)')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Zone cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {zones.map((zone) => (
                        <ZoneCard key={zone.zone} zone={zone} />
                    ))}
                </div>

                {/* Chart */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{t('Trend')}</CardTitle>
                            <div className="flex gap-1">
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
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="co2" stroke="#ef4444" name="CO2 (ppm)" dot={false} />
                                <Line type="monotone" dataKey="temperature" stroke="#3b82f6" name="Temp (C)" dot={false} />
                                <Line type="monotone" dataKey="humidity" stroke="#10b981" name="Humidity (%)" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
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
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{zone.zone}</CardTitle>
                    <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums" style={{ color: scoreColor }}>
                            {zone.score}
                        </p>
                        <p className="text-xs" style={{ color: scoreColor }}>
                            {getScoreLabel(zone.score)}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {metrics.map(({ key, label, value, unit, icon: Icon }) => {
                    const status = getMetricStatus(key, value);
                    return (
                        <div key={key} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Icon className="h-3.5 w-3.5" />
                                <span>{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-medium tabular-nums ${STATUS_COLORS[status]}`}>
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
