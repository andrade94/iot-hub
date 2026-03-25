import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Site, User } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ClipboardCheck, Plus, Thermometer } from 'lucide-react';
import { useEffect } from 'react';
import { z } from 'zod';

interface TemperatureVerification {
    id: number;
    site_id: number;
    zone: string;
    manual_reading: string;
    sensor_reading: string | null;
    discrepancy: string | null;
    verified_by: number;
    verified_at: string;
    notes: string | null;
    created_at: string;
    verified_by_user?: User;
}

interface PaginatedVerifications {
    data: TemperatureVerification[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    site: Site;
    verifications: PaginatedVerifications;
    zones: string[];
    latestReadings: Record<string, number>;
}

export default function TemperatureVerifications({
    site,
    verifications,
    zones,
    latestReadings,
}: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Temperature Verification'), href: '#' },
    ];

    const verificationSchema = z.object({
        zone: z.string().min(1, 'Zone is required'),
        manual_reading: z.string().min(1, 'Manual reading is required'),
        sensor_reading: z.string(),
        notes: z.string(),
    });

    const { data, setData, processing, errors, reset, submit } = useValidatedForm(
        verificationSchema,
        {
            zone: '',
            manual_reading: '',
            sensor_reading: '',
            notes: '',
        },
    );

    // Auto-fill sensor reading when zone changes
    useEffect(() => {
        if (data.zone && latestReadings[data.zone] !== undefined) {
            setData('sensor_reading', String(latestReadings[data.zone]));
        } else {
            setData('sensor_reading', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on zone change
    }, [data.zone]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        submit('post', `/sites/${site.id}/verifications`, {
            onSuccess: () => reset(),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Temperature Verification')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Temperature Verification')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {site.name}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t(
                                    'Daily walk-through temperature verification checklist',
                                )}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* Verification Form */}
                <FadeIn delay={75} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                    <Plus className="h-4.5 w-4.5 text-blue-500" />
                                </div>
                                <CardTitle className="text-base">
                                    {t('New Verification')}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSubmit}
                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                            >
                                <div className="grid gap-2">
                                    <Label className="text-xs">
                                        {t('Zone')}
                                    </Label>
                                    <Select
                                        value={data.zone}
                                        onValueChange={(v) =>
                                            setData('zone', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={t(
                                                    'Select a zone',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones.map((zone) => (
                                                <SelectItem
                                                    key={zone}
                                                    value={zone}
                                                >
                                                    {zone}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.zone && (
                                        <p className="text-xs text-destructive">
                                            {errors.zone}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs">
                                        {t('Manual Reading')} (°C)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="-18.5"
                                        value={data.manual_reading}
                                        onChange={(e) =>
                                            setData(
                                                'manual_reading',
                                                e.target.value,
                                            )
                                        }
                                        className="font-mono"
                                    />
                                    {errors.manual_reading && (
                                        <p className="text-xs text-destructive">
                                            {errors.manual_reading}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs">
                                        {t('Sensor Reading')} (°C)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder={t('Auto-filled')}
                                        value={data.sensor_reading}
                                        onChange={(e) =>
                                            setData(
                                                'sensor_reading',
                                                e.target.value,
                                            )
                                        }
                                        className="font-mono"
                                    />
                                    {errors.sensor_reading && (
                                        <p className="text-xs text-destructive">
                                            {errors.sensor_reading}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
                                    <Label className="text-xs">
                                        {t('Notes')}
                                    </Label>
                                    <Textarea
                                        placeholder={t(
                                            'Optional observations...',
                                        )}
                                        value={data.notes}
                                        onChange={(e) =>
                                            setData('notes', e.target.value)
                                        }
                                        rows={1}
                                        className="min-h-9 resize-none"
                                    />
                                </div>

                                <div className="flex items-end sm:col-span-2 lg:col-span-4">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto"
                                    >
                                        <ClipboardCheck className="mr-2 h-4 w-4" />
                                        {t('Record Verification')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Verification History */}
                <FadeIn delay={150} duration={400}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Verification History')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {verifications.total}
                            </span>
                        </div>

                        <Card className="shadow-elevation-1">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t('Date')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Zone')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Manual')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Sensor')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Discrepancy')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Verified By')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Notes')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {verifications.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="py-12 text-center"
                                                >
                                                    <Thermometer className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        {t(
                                                            'No verifications recorded yet',
                                                        )}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            verifications.data.map((v) => {
                                                const disc = v.discrepancy
                                                    ? parseFloat(v.discrepancy)
                                                    : null;
                                                const isHighDiscrepancy =
                                                    disc !== null && disc > 2;

                                                return (
                                                    <TableRow key={v.id}>
                                                        <TableCell className="font-mono text-xs tabular-nums">
                                                            {new Date(
                                                                v.verified_at,
                                                            ).toLocaleDateString(
                                                                undefined,
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                },
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {v.zone}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums">
                                                            {parseFloat(
                                                                v.manual_reading,
                                                            ).toFixed(1)}
                                                            °C
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                                            {v.sensor_reading
                                                                ? `${parseFloat(v.sensor_reading).toFixed(1)}°C`
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {disc !== null ? (
                                                                <span
                                                                    className={`font-mono tabular-nums ${
                                                                        isHighDiscrepancy
                                                                            ? 'font-semibold text-red-600 dark:text-red-400'
                                                                            : 'text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {disc.toFixed(
                                                                        1,
                                                                    )}
                                                                    °C
                                                                    {isHighDiscrepancy && (
                                                                        <Badge
                                                                            variant="destructive"
                                                                            className="ml-1.5 text-[0.6rem]"
                                                                        >
                                                                            {t(
                                                                                'HIGH',
                                                                            )}
                                                                        </Badge>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {v.verified_by_user
                                                                ?.name ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                                            {v.notes || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Pagination */}
                        {verifications.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!verifications.prev_page_url}
                                    onClick={() =>
                                        verifications.prev_page_url &&
                                        router.get(verifications.prev_page_url)
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {verifications.current_page} / {verifications.last_page}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!verifications.next_page_url}
                                    onClick={() =>
                                        verifications.next_page_url &&
                                        router.get(verifications.next_page_url)
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}
