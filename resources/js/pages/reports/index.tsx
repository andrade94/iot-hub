import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowRight, BarChart3, Sun, Thermometer, Zap } from 'lucide-react';
import { useState } from 'react';

interface SiteOption {
    id: number;
    name: string;
}

interface Props {
    sites: SiteOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reports', href: '#' },
];

const today = new Date().toISOString().split('T')[0];
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

interface ReportType {
    key: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
    defaultFrom: string;
    route: (siteId: number, from: string, to: string) => string;
}

export default function ReportsIndex({ sites }: Props) {
    const { t } = useLang();

    const reportTypes: ReportType[] = [
        {
            key: 'temperature',
            title: t('Temperature Compliance'),
            description: t('COFEPRIS-compliant temperature monitoring with excursion detection and zone-level compliance rates'),
            icon: <Thermometer className="h-6 w-6" />,
            accent: 'text-blue-500',
            defaultFrom: weekAgo,
            route: (siteId, from, to) => `/sites/${siteId}/reports/temperature?from=${from}&to=${to}`,
        },
        {
            key: 'energy',
            title: t('Energy Consumption'),
            description: t('Power usage analysis with cost breakdown, daily trends, and baseline comparison per device'),
            icon: <Zap className="h-6 w-6" />,
            accent: 'text-amber-500',
            defaultFrom: monthAgo,
            route: (siteId, from, to) => `/sites/${siteId}/reports/energy?from=${from}&to=${to}`,
        },
        {
            key: 'summary',
            title: t('Morning Summary'),
            description: t('Daily operational overview — device health, alert counts, and zone status for a single site'),
            icon: <Sun className="h-6 w-6" />,
            accent: 'text-emerald-500',
            defaultFrom: today,
            route: (siteId) => `/sites/${siteId}/reports/summary`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Reports')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <div className="flex items-center gap-3">
                        <BarChart3 className="h-6 w-6 text-muted-foreground" />
                        <h1 className="text-2xl font-bold tracking-tight">{t('Reports')}</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('Select a report type, choose a site, and set the date range to generate')}
                    </p>
                </div>

                {sites.length === 0 ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                <p className="mt-3 text-muted-foreground">{t('No sites available for reporting')}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {reportTypes.map((report) => (
                            <ReportCard key={report.key} report={report} sites={sites} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function ReportCard({ report, sites }: { report: ReportType; sites: SiteOption[] }) {
    const { t } = useLang();
    const [siteId, setSiteId] = useState<string>('');
    const [from, setFrom] = useState(report.defaultFrom);
    const [to, setTo] = useState(today);
    const [error, setError] = useState('');

    function generate() {
        if (!siteId) {
            setError(t('Please select a site'));
            return;
        }
        setError('');
        router.get(report.route(Number(siteId), from, to));
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className={report.accent}>{report.icon}</div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                    {report.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid gap-2">
                    <Label className="text-xs">{t('Site')}</Label>
                    <Select value={siteId} onValueChange={(v) => { setSiteId(v); setError(''); }}>
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
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                {report.key !== 'summary' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('From')}</Label>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('To')}</Label>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-2">
                    <Button onClick={generate} className="w-full">
                        {t('Generate')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
