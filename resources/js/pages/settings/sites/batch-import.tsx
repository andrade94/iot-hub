import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface SiteRow {
    name: string;
    address: string;
    timezone: string;
    template_name: string;
    valid: boolean;
    errors: string[];
}

interface Props {
    templates: Array<{ id: number; name: string }>;
    timezones: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Sites', href: '/settings/sites' },
    { title: 'Batch Import', href: '/settings/sites/batch-import' },
];

export default function BatchImport({ templates, timezones }: Props) {
    const { t } = useLang();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState<SiteRow[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    const validateRow = useCallback((row: SiteRow): SiteRow => {
        const errors: string[] = [];
        if (!row.name || row.name.trim().length === 0) {
            errors.push('Name is required');
        }
        if (row.timezone && !timezones.includes(row.timezone)) {
            errors.push('Invalid timezone');
        }
        if (row.template_name && !templates.some((t) => t.name === row.template_name)) {
            errors.push('Unknown template');
        }
        return { ...row, valid: errors.length === 0, errors };
    }, [templates, timezones]);

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter((line) => line.trim().length > 0);

            if (lines.length < 2) {
                setRows([]);
                return;
            }

            // Parse header
            const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

            const nameIdx = headers.indexOf('name');
            const addressIdx = headers.indexOf('address');
            const tzIdx = headers.indexOf('timezone');
            const templateIdx = headers.indexOf('template_name');

            const parsed: SiteRow[] = lines.slice(1).map((line) => {
                const cols = parseCSVLine(line);
                const row: SiteRow = {
                    name: nameIdx >= 0 ? (cols[nameIdx] ?? '').trim() : '',
                    address: addressIdx >= 0 ? (cols[addressIdx] ?? '').trim() : '',
                    timezone: tzIdx >= 0 ? (cols[tzIdx] ?? '').trim() : '',
                    template_name: templateIdx >= 0 ? (cols[templateIdx] ?? '').trim() : '',
                    valid: true,
                    errors: [],
                };
                return validateRow(row);
            });

            setRows(parsed);
        };
        reader.readAsText(file);
    }

    function parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    function removeRow(index: number) {
        setRows((prev) => prev.filter((_, i) => i !== index));
    }

    function clearAll() {
        setRows([]);
        setFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleImport() {
        const validRows = rows.filter((r) => r.valid);
        if (validRows.length === 0) return;

        setImporting(true);
        router.post('/settings/sites/batch-import', {
            sites: validRows.map((r) => ({
                name: r.name,
                address: r.address || null,
                timezone: r.timezone || null,
                template_name: r.template_name || null,
            })),
        }, {
            onFinish: () => setImporting(false),
        });
    }

    const validCount = rows.filter((r) => r.valid).length;
    const invalidCount = rows.filter((r) => !r.valid).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Batch Site Import')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div className="flex items-start gap-3">
                                <FileSpreadsheet className="mt-1 h-6 w-6 text-emerald-600" />
                                <div>
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Site Management')}
                                    </p>
                                    <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {t('Batch Site Import')}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('Upload a CSV file to create multiple sites at once')}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href="/settings/sites">
                                    <ArrowLeft className="mr-2 h-4 w-4" />{t('Back to Sites')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Upload Section ───────────────────────────────── */}
                <FadeIn delay={100} duration={500}>
                    <div className="mb-3 flex items-center gap-3">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Upload CSV')}
                        </p>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <Card className="shadow-elevation-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Upload className="h-4 w-4" />{t('CSV File')}
                            </CardTitle>
                            <CardDescription>
                                {t('Expected columns: name, address, timezone, template_name. Only name is required.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="max-w-sm"
                                />
                                {fileName && (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {fileName}
                                        </Badge>
                                        <Button variant="ghost" size="sm" onClick={clearAll}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                                <p className="text-xs font-medium text-muted-foreground">{t('CSV Template')}</p>
                                <code className="mt-1 block font-mono text-xs text-foreground">
                                    name,address,timezone,template_name
                                    <br />
                                    &quot;Warehouse A&quot;,&quot;Av. Insurgentes 123&quot;,America/Mexico_City,cold_chain_standard
                                    <br />
                                    &quot;Warehouse B&quot;,&quot;Blvd. Reforma 456&quot;,America/Monterrey,
                                </code>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Preview Table ────────────────────────────────── */}
                {rows.length > 0 && (
                    <FadeIn delay={200} duration={500}>
                        <div className="flex-1">
                            <div className="mb-3 flex items-center gap-3">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Preview')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                                <div className="flex items-center gap-2">
                                    <Badge variant="success" className="font-mono text-xs">
                                        {validCount} {t('valid')}
                                    </Badge>
                                    {invalidCount > 0 && (
                                        <Badge variant="destructive" className="font-mono text-xs">
                                            {invalidCount} {t('invalid')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Card className="shadow-elevation-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">#</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Address')}</TableHead>
                                            <TableHead>{t('Timezone')}</TableHead>
                                            <TableHead>{t('Template')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="w-12" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row, i) => (
                                            <TableRow key={i} className={row.valid ? '' : 'bg-destructive/5'}>
                                                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                    {i + 1}
                                                </TableCell>
                                                <TableCell className="font-medium">{row.name || '--'}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {row.address || '--'}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {row.timezone || '--'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {row.template_name || '--'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.valid ? (
                                                        <Badge variant="success" className="text-xs">{t('OK')}</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="text-xs">
                                                            {row.errors.join(', ')}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => removeRow(i)}>
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>

                            {/* Import Action */}
                            <div className="mt-4 flex items-center justify-end gap-3">
                                <Button variant="outline" onClick={clearAll}>
                                    {t('Clear')}
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={validCount === 0 || importing}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    {importing
                                        ? t('Importing...')
                                        : `${t('Import')} ${validCount} ${t('site(s)')}`}
                                </Button>
                            </div>
                        </div>
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}
