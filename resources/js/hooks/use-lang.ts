/**
 * useLang Hook
 *
 * Convenience wrapper around laravel-react-i18n
 * Provides a simpler API for translations
 */

import { useLaravelReactI18n } from 'laravel-react-i18n';

/**
 * Translation replacement values
 */
export type TranslationReplacements = Record<string, string | number>;

/**
 * Custom hook for translations
 *
 * @example
 * const { t, locale, setLocale } = useLang();
 *
 * // Simple translation
 * t('Welcome')
 *
 * // With replacements
 * t('Hello :name', { name: 'John' })
 *
 * // Get current locale
 * const currentLang = locale();
 *
 * // Change locale
 * setLocale('es');
 */
export function useLang() {
    const i18n = useLaravelReactI18n();

    /**
     * Translate a key
     *
     * @param key - Translation key
     * @param replacements - Key-value pairs for replacement
     * @returns Translated string
     */
    const t = (key: string, replacements?: TranslationReplacements): string => {
        return i18n.t(key, replacements);
    };

    /**
     * Get current locale
     *
     * @returns Current locale code (e.g., 'en', 'es')
     */
    const locale = (): string => {
        return i18n.currentLocale();
    };

    /**
     * Set locale
     *
     * @param newLocale - Locale code to set
     */
    const setLocale = (newLocale: string): void => {
        i18n.setLocale(newLocale);
    };

    /**
     * Get fallback locale
     *
     * @returns Fallback locale code
     */
    const fallbackLocale = (): string => {
        return i18n.fallbackLocale;
    };

    /**
     * Check if a translation key exists
     *
     * @param key - Translation key to check
     * @returns True if key exists
     */
    const has = (key: string): boolean => {
        // If translation returns the key itself, it doesn't exist
        return i18n.t(key) !== key;
    };

    /**
     * Get translation or return default if not found
     *
     * @param key - Translation key
     * @param defaultValue - Default value if key not found
     * @param replacements - Key-value pairs for replacement
     * @returns Translated string or default
     */
    const tOrDefault = (
        key: string,
        defaultValue: string,
        replacements?: TranslationReplacements
    ): string => {
        const translation = i18n.t(key, replacements);
        return translation !== key ? translation : defaultValue;
    };

    return {
        /** Translate function */
        t,
        /** Get current locale */
        locale,
        /** Set locale */
        setLocale,
        /** Get fallback locale */
        fallbackLocale,
        /** Check if translation key exists */
        has,
        /** Get translation or default */
        tOrDefault,
        /** Access to underlying i18n instance */
        i18n,
    };
}

/**
 * Export type for useLang return value
 */
export type UseLangReturn = ReturnType<typeof useLang>;
