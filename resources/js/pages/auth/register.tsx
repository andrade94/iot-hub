import { login } from '@/routes';
import { Head } from '@inertiajs/react';

import TextLink from '@/components/text-link';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AuthLayout from '@/layouts/auth-layout';

export default function Register() {
    const { t } = useLang();

    return (
        <AuthLayout
            title={t('Create an account')}
            description={t('Enter your details below to create your account')}
        >
            <Head title={t('Register')} />
            <FadeIn>
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <p className="text-muted-foreground">
                        {t('Registration is not available. Users are created by organization administrators.')}
                    </p>
                    <TextLink href={login()}>
                        {t('Log in')}
                    </TextLink>
                </div>
            </FadeIn>
        </AuthLayout>
    );
}
