/**
 * Safely converts a value to a number, handling Laravel's decimal cast strings
 * @param value - The value to convert (can be string, number, null, or undefined)
 * @param defaultValue - The default value if conversion fails (default: 0)
 * @returns A number
 */
export function toNumber(value: string | number | null | undefined, defaultValue: number = 0): number {
    if (value === null || value === undefined) {
        return defaultValue;
    }

    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely formats a decimal value with a fixed number of decimal places
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @param defaultValue - The default value if conversion fails (default: 0)
 * @returns A formatted string
 */
export function toFixed(value: string | number | null | undefined, decimals: number = 2, defaultValue: number = 0): string {
    return toNumber(value, defaultValue).toFixed(decimals);
}

/**
 * Safely formats a number with locale-specific formatting
 * @param value - The value to format
 * @param locale - The locale to use (default: 'es-MX')
 * @param options - Intl.NumberFormatOptions
 * @returns A formatted string
 */
export function toLocaleString(value: string | number | null | undefined, locale: string = 'es-MX', options?: Intl.NumberFormatOptions): string {
    return toNumber(value).toLocaleString(locale, options);
}
