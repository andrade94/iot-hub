import AppLogoIcon from '@/components/app-logo-icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            {/* Gradient mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

            <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
                <Link href={home().url} className="group flex items-center justify-center gap-2 self-center font-medium">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-elevation-2 ring-1 ring-black/[0.03] transition-all duration-200 group-hover:shadow-elevation-3 dark:ring-white/[0.05]">
                        <AppLogoIcon className="size-8 fill-current text-foreground dark:text-white" />
                    </div>
                </Link>

                <Card className="shadow-elevation-3 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                    <CardHeader className="px-8 pt-8 pb-0 text-center">
                        <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-muted-foreground/80">{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 py-8">{children}</CardContent>
                </Card>
            </div>
        </div>
    );
}
