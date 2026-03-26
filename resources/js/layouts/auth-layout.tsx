import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import AppLogoIcon from '@/components/app-logo-icon';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useLang } from '@/hooks/use-lang';
import { Link } from '@inertiajs/react';
import { Activity, Radio, Shield, Thermometer, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AuthLayout({
    children,
    title,
    description,
}: {
    children: React.ReactNode;
    title: string;
    description: string;
}) {
    const { t } = useLang();

    return (
        <div className="relative grid min-h-dvh lg:grid-cols-[1fr_480px]">
            {/* Left panel — Astrea brand showcase */}
            <div className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:flex-col">
                {/* Gradient mesh */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(59,130,246,0.08),transparent_50%)]" />

                {/* Animated grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

                {/* Content */}
                <div className="relative z-10 flex flex-1 flex-col justify-between p-12">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                            <AppLogoIcon className="h-5 w-5 fill-emerald-400" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-white">Astrea</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wider text-emerald-400 uppercase">IoT Platform</span>
                    </div>

                    {/* Hero text */}
                    <div className="max-w-md space-y-6">
                        <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
                            {t('Operations intelligence,')}<br />
                            <span className="text-emerald-400">{t('not just monitoring.')}</span>
                        </h2>
                        <p className="text-base leading-relaxed text-zinc-400">
                            {t('From sensor to decision. Temperature compliance, alert management, predictive maintenance — all in one command center.')}
                        </p>

                        {/* Live stats animation */}
                        <LiveMetrics />
                    </div>

                    {/* Bottom features */}
                    <div className="grid grid-cols-2 gap-4">
                        <FeatureChip icon={<Thermometer className="h-3.5 w-3.5" />} label={t('Cold Chain')} />
                        <FeatureChip icon={<Zap className="h-3.5 w-3.5" />} label={t('Energy')} />
                        <FeatureChip icon={<Shield className="h-3.5 w-3.5" />} label={t('Compliance')} />
                        <FeatureChip icon={<Activity className="h-3.5 w-3.5" />} label={t('Predictive')} />
                    </div>
                </div>
            </div>

            {/* Right panel — Login form */}
            <div className="relative flex items-center justify-center bg-background px-6 py-12">
                {/* Language + Theme toggle */}
                <div className="absolute right-4 top-4 flex items-center gap-1">
                    <LanguageSwitcher size="icon" />
                    <AppearanceToggleDropdown />
                </div>

                <div className="w-full max-w-[360px] space-y-8">
                    {/* Mobile logo */}
                    <div className="flex flex-col items-center gap-4 lg:hidden">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                                <AppLogoIcon className="h-7 w-7 fill-emerald-600 dark:fill-emerald-400" />
                            </div>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-semibold tracking-tight">Astrea</span>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">IoT</span>
                        </div>
                    </div>

                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}

function LiveMetrics() {
    const { t } = useLang();

    const [metrics, setMetrics] = useState([
        { key: 'sensors_online', label: t('Sensors Online'), value: 847, suffix: '' },
        { key: 'readings_min', label: t('Readings/min'), value: 2340, suffix: '' },
        { key: 'uptime', label: t('Uptime'), value: 99.97, suffix: '%' },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics((prev) =>
                prev.map((m) => ({
                    ...m,
                    value:
                        m.suffix === '%'
                            ? +(m.value + (Math.random() - 0.5) * 0.01).toFixed(2)
                            : Math.round(m.value + (Math.random() - 0.5) * m.value * 0.02),
                })),
            );
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex gap-6">
            {metrics.map((m) => (
                <div key={m.key}>
                    <div className="flex items-baseline gap-1">
                        <Radio className="h-2 w-2 animate-pulse text-emerald-400" />
                        <span className="font-mono text-lg font-bold tabular-nums text-white transition-all duration-700">
                            {typeof m.value === 'number' && m.suffix === '%' ? m.value.toFixed(2) : m.value.toLocaleString()}
                        </span>
                        <span className="text-xs text-zinc-500">{m.suffix}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{m.label}</p>
                </div>
            ))}
        </div>
    );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
            <span className="text-emerald-400">{icon}</span>
            {label}
        </div>
    );
}
