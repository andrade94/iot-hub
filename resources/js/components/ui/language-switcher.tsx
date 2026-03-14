/**
 * Language Switcher Component
 *
 * Dropdown component for switching between available languages
 */

import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { Check, Globe } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Available languages configuration
 * Add more languages here as needed
 */
const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

interface LanguageSwitcherProps {
    /**
     * Show language name next to the globe icon
     * @default false
     */
    showLanguageName?: boolean;

    /**
     * Button variant
     * @default 'ghost'
     */
    variant?: 'default' | 'outline' | 'ghost';

    /**
     * Button size
     * @default 'default'
     */
    size?: 'default' | 'sm' | 'lg' | 'icon';

    /**
     * Additional CSS classes
     */
    className?: string;
}

export function LanguageSwitcher({
    showLanguageName = false,
    variant = 'ghost',
    size = 'default',
    className,
}: LanguageSwitcherProps) {
    const { currentLocale, setLocale } = useLaravelReactI18n();

    const currentLanguage = languages.find((lang) => lang.code === currentLocale()) || languages[0];

    const handleLanguageChange = (languageCode: string) => {
        setLocale(languageCode);

        // Persist locale change on the server
        router.post(
            route('locale.update'),
            { locale: languageCode },
            {
                preserveScroll: true,
                preserveState: true,
                only: [], // Don't reload any props
                onSuccess: () => {
                    // Locale has been updated
                    window.location.reload(); // Reload to apply translations
                },
            }
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size} className={cn('gap-2', className)}>
                    <Globe className="h-4 w-4" />
                    {showLanguageName && (
                        <span className="hidden sm:inline">{currentLanguage.name}</span>
                    )}
                    <span className="sr-only">Change language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        className="cursor-pointer"
                    >
                        <span className="mr-2 text-lg">{language.flag}</span>
                        <span className="flex-1">{language.name}</span>
                        {currentLocale() === language.code && (
                            <Check className="ml-2 h-4 w-4" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
