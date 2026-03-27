import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/fade-in';
import { Spinner } from '@/components/ui/spinner';
import { useLang } from '@/hooks/use-lang';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { Head, router } from '@inertiajs/react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useLang();

    return (
        <AuthLayout
            title={t('Verify email')}
            description={t('Please verify your email address by clicking on the link we just emailed to you.')}
        >
            <Head title={t('Email verification')} />

            <FadeIn>
                {status === 'verification-link-sent' && (
                    <div className="mb-4 text-center text-sm font-medium text-green-600">
                        {t('A new verification link has been sent to the email address you provided during registration.')}
                    </div>
                )}

                <div className="space-y-6 text-center">
                    <Button
                        variant="secondary"
                        onClick={() => router.post('/email/verification-notification')}
                    >
                        {t('Resend verification email')}
                    </Button>

                    <TextLink
                        href={logout()}
                        className="mx-auto block text-sm"
                    >
                        {t('Log out')}
                    </TextLink>
                </div>
            </FadeIn>
        </AuthLayout>
    );
}
