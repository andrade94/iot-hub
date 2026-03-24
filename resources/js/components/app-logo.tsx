import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <AppLogoIcon className="size-4 fill-emerald-500" />
            </div>
            <div className="ml-1 grid flex-1 text-left">
                <span className="truncate text-sm font-display font-bold tracking-tight">
                    Astrea
                </span>
                <span className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    IoT Platform
                </span>
            </div>
        </>
    );
}
