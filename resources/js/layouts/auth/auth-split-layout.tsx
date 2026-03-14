import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Left panel - Premium dark with gradient */}
            <div className="relative hidden h-full flex-col bg-zinc-950 p-10 text-white lg:flex dark:border-r dark:border-zinc-800">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />

                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />

                {/* Glow orb */}
                <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

                <Link href={home().url} className="relative z-20 flex items-center gap-3 text-lg font-semibold tracking-tight">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                        <AppLogoIcon className="size-6 fill-current text-white" />
                    </div>
                    {name}
                </Link>

                {quote && (
                    <div className="relative z-20 mt-auto">
                        <blockquote className="space-y-3">
                            <p className="text-xl font-light leading-relaxed">&ldquo;{quote.message}&rdquo;</p>
                            <footer className="text-sm text-zinc-400">{quote.author}</footer>
                        </blockquote>
                    </div>
                )}
            </div>

            {/* Right panel */}
            <div className="relative w-full lg:p-8">
                {/* Subtle background */}
                <div className="absolute inset-0 bg-dots opacity-30" />

                <div className="relative z-10 mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[380px]">
                    {/* Mobile logo */}
                    <Link href={home().url} className="group relative z-20 flex items-center justify-center lg:hidden">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10 transition-all group-hover:bg-primary/10">
                            <AppLogoIcon className="h-10 fill-current text-foreground" />
                        </div>
                    </Link>

                    <div className="flex flex-col items-start gap-3 text-left sm:items-center sm:text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground/80">{description}</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
