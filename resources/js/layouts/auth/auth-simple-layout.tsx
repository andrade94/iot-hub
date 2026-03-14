import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-grid opacity-50" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

            <div className="relative z-10 w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={home().url} className="group flex flex-col items-center gap-2 font-medium">
                            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10 transition-all duration-200 group-hover:bg-primary/10 group-hover:ring-primary/20">
                                <AppLogoIcon className="size-8 fill-current text-foreground dark:text-white" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground/80">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
