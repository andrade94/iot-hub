import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import { Head, router } from '@inertiajs/react';
import { Shield } from 'lucide-react';

interface Props {
    version: string;
}

export default function PrivacyAccept({ version }: Props) {
    const { t } = useLang();

    return (
        <>
            <Head title={t('Privacy Policy')} />
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <FadeIn>
                    <Card className="w-full max-w-lg shadow-elevation-2">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl">{t('Privacy Policy')}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t('Version')} {version}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                                <p className="mb-3">
                                    {t('By using the Astrea IoT Platform, you agree to the collection and processing of your personal data in accordance with the Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP) and applicable Mexican regulations.')}
                                </p>
                                <p className="mb-3">
                                    {t('We collect: name, email, phone number, and usage data necessary for platform operation. This data is processed to provide IoT monitoring services, generate compliance reports, and deliver alert notifications.')}
                                </p>
                                <p className="mb-3">
                                    {t('Your data is stored securely and is accessible only to authorized personnel within your organization. You have the right to access, rectify, cancel, or oppose the processing of your personal data (ARCO rights).')}
                                </p>
                                <p>
                                    {t('For data portability requests or questions about our privacy practices, contact your organization administrator or email privacy@example.com.')}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={() => router.post('/privacy/accept')}
                            >
                                {t('I Accept')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => router.post('/logout')}
                            >
                                {t('Log Out')}
                            </Button>
                        </CardFooter>
                    </Card>
                </FadeIn>
            </div>
        </>
    );
}
