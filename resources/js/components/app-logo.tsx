/**
 * AppLogo Component
 *
 * Clean logo design with subtle styling.
 */

import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            {/* Logo Icon */}
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
            </div>

            {/* Text */}
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    Laravel Starter Kit
                </span>
            </div>
        </>
    );
}
