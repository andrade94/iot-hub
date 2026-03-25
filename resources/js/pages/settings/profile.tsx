import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';

import DeleteUser from '@/components/delete-user';
import { FadeIn } from '@/components/ui/fade-in';
import HeadingSmall from '@/components/ui/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

/* ── Section Divider ──────────────────────────────── */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 pt-2">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                {/* ── Profile Information ──────────────────── */}
                <FadeIn duration={400}>
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Profile information"
                            description="Update your name and email address"
                        />

                        <div className="rounded-lg border bg-card p-6 shadow-elevation-1">
                            <Form
                                {...ProfileController.update.form()}
                                options={{
                                    preserveScroll: true,
                                }}
                                className="space-y-6"
                            >
                                {({ processing, recentlySuccessful, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Name</Label>

                                            <Input
                                                id="name"
                                                className="mt-1 block w-full"
                                                defaultValue={auth.user.name}
                                                name="name"
                                                required
                                                autoComplete="name"
                                                placeholder="Full name"
                                            />

                                            <InputError
                                                className="mt-2"
                                                message={errors.name}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email address</Label>

                                            <Input
                                                id="email"
                                                type="email"
                                                className="mt-1 block w-full"
                                                defaultValue={auth.user.email}
                                                name="email"
                                                required
                                                autoComplete="username"
                                                placeholder="Email address"
                                            />

                                            <InputError
                                                className="mt-2"
                                                message={errors.email}
                                            />
                                        </div>

                                        {mustVerifyEmail &&
                                            auth.user.email_verified_at === null && (
                                                <div>
                                                    <p className="-mt-4 text-sm text-muted-foreground">
                                                        Your email address is
                                                        unverified.{' '}
                                                        <Link
                                                            href={send()}
                                                            as="button"
                                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                        >
                                                            Click here to resend the
                                                            verification email.
                                                        </Link>
                                                    </p>

                                                    {status ===
                                                        'verification-link-sent' && (
                                                        <div className="mt-2 text-sm font-medium text-green-600">
                                                            A new verification link has
                                                            been sent to your email
                                                            address.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        <div className="flex items-center gap-4">
                                            <Button
                                                disabled={processing}
                                                data-test="update-profile-button"
                                            >
                                                Save
                                            </Button>

                                            <Transition
                                                show={recentlySuccessful}
                                                enter="transition ease-in-out"
                                                enterFrom="opacity-0"
                                                leave="transition ease-in-out"
                                                leaveTo="opacity-0"
                                            >
                                                <p className="text-sm text-neutral-600">
                                                    Saved
                                                </p>
                                            </Transition>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Quiet Hours ──────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <QuietHoursSection />
                </FadeIn>

                {/* ── Notification Preferences ────────────── */}
                <FadeIn delay={150} duration={400}>
                    <NotificationPrefsSection />
                </FadeIn>

                {/* ── Danger Zone ─────────────────────────── */}
                <FadeIn delay={225} duration={400}>
                    <DeleteUser />
                </FadeIn>
            </SettingsLayout>
        </AppLayout>
    );
}

function QuietHoursSection() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user as SharedData['auth']['user'] & {
        quiet_hours_start?: string | null;
        quiet_hours_end?: string | null;
        quiet_hours_tz?: string | null;
    };

    const [enabled, setEnabled] = useState(!!user.quiet_hours_start);
    const [start, setStart] = useState(user.quiet_hours_start ?? '23:00');
    const [end, setEnd] = useState(user.quiet_hours_end ?? '06:00');
    const [tz, setTz] = useState(user.quiet_hours_tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    function save() {
        setSaving(true);
        router.patch(
            '/settings/profile',
            {
                name: user.name,
                email: user.email,
                quiet_hours_start: enabled ? start : null,
                quiet_hours_end: enabled ? end : null,
                quiet_hours_tz: enabled ? tz : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                },
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Quiet hours"
                description="Suppress non-critical alert notifications during off-hours. Critical and high-severity alerts are always delivered."
            />

            <div className="rounded-lg border bg-card p-6 shadow-elevation-1">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Switch
                            id="quiet-hours-enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="quiet-hours-enabled">Enable quiet hours</Label>
                    </div>

                    {enabled && (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="quiet-start">Start time</Label>
                                <Input
                                    id="quiet-start"
                                    type="time"
                                    value={start}
                                    onChange={(e) => setStart(e.target.value)}
                                    className="font-mono tabular-nums"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="quiet-end">End time</Label>
                                <Input
                                    id="quiet-end"
                                    type="time"
                                    value={end}
                                    onChange={(e) => setEnd(e.target.value)}
                                    className="font-mono tabular-nums"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="quiet-tz">Timezone</Label>
                                <Select value={tz} onValueChange={setTz}>
                                    <SelectTrigger id="quiet-tz">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['America/Mexico_City', 'America/Monterrey', 'America/Cancun', 'America/Tijuana', 'America/Hermosillo', 'UTC'].map(
                                            (zone) => (
                                                <SelectItem key={zone} value={zone}>
                                                    {zone.replace('America/', '').replace('_', ' ')}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving...' : 'Save quiet hours'}
                        </Button>
                        {saved && <p className="text-sm text-neutral-600">Saved</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function NotificationPrefsSection() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user as SharedData['auth']['user'] & {
        notify_whatsapp?: boolean;
        notify_push?: boolean;
        notify_email?: boolean;
        notify_min_severity?: string;
    };

    const [whatsapp, setWhatsapp] = useState(user.notify_whatsapp ?? true);
    const [push, setPush] = useState(user.notify_push ?? true);
    const [email, setEmail] = useState(user.notify_email ?? true);
    const [minSeverity, setMinSeverity] = useState(user.notify_min_severity ?? 'low');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    function save() {
        setSaving(true);
        router.patch(
            '/settings/profile',
            {
                name: user.name,
                email: user.email,
                notify_whatsapp: whatsapp,
                notify_push: push,
                notify_email: email,
                notify_min_severity: minSeverity,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                },
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Notification preferences"
                description="Choose how and when you receive alert notifications. Escalation chain notifications override these preferences."
            />

            <div className="rounded-lg border bg-card p-6 shadow-elevation-1">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Switch id="notify-whatsapp" checked={whatsapp} onCheckedChange={setWhatsapp} />
                            <Label htmlFor="notify-whatsapp">WhatsApp alerts</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch id="notify-push" checked={push} onCheckedChange={setPush} />
                            <Label htmlFor="notify-push">Push notifications</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch id="notify-email" checked={email} onCheckedChange={setEmail} />
                            <Label htmlFor="notify-email">Email notifications</Label>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:max-w-[250px]">
                        <Label htmlFor="min-severity">Minimum severity</Label>
                        <Select value={minSeverity} onValueChange={setMinSeverity}>
                            <SelectTrigger id="min-severity">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">All alerts</SelectItem>
                                <SelectItem value="medium">Medium and above</SelectItem>
                                <SelectItem value="high">High and above</SelectItem>
                                <SelectItem value="critical">Critical only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving...' : 'Save preferences'}
                        </Button>
                        {saved && <p className="text-sm text-neutral-600">Saved</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
