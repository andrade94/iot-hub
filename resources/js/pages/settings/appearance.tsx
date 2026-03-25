import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import { FadeIn } from '@/components/ui/fade-in';
import HeadingSmall from '@/components/ui/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editAppearance } from '@/routes/appearance';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: editAppearance().url,
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <FadeIn duration={400}>
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Appearance settings"
                            description="Update your account's appearance settings"
                        />
                        <AppearanceTabs />
                    </div>
                </FadeIn>
            </SettingsLayout>
        </AppLayout>
    );
}
