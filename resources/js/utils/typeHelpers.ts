/**
 * Type conversion and parsing utilities for handling data type mismatches
 * between Laravel backend and TypeScript frontend.
 */

/**
 * Safely parse a decimal field from Laravel to a number.
 * Laravel casts decimal fields as strings, but frontend expects numbers.
 */
export const parseDecimalField = (value: string | number | null | undefined): number | undefined => {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? undefined : parsed;
};

/**
 * Safely parse a float with fallback handling.
 */
export const safeParseFloat = (value: string | number | null | undefined, fallback?: number): number | undefined => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safely parse an integer with fallback handling.
 */
export const safeParseInt = (value: string | number | null | undefined, fallback?: number): number | undefined => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const parsed = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
    return isNaN(parsed) ? fallback : parsed;
};

/**
 * Parse user input from numeric input fields.
 * Removes commas and other formatting, converts to number.
 */
export const parseNumericInput = (value: string | number): number | undefined => {
    if (typeof value === 'number') {
        return isNaN(value) ? undefined : value;
    }

    if (!value || value.trim() === '') {
        return undefined;
    }

    // Remove commas, spaces, and other non-numeric characters except decimal point and minus
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanValue);

    return isNaN(parsed) ? undefined : parsed;
};

/**
 * Format a number as currency for display.
 */
export const formatCurrency = (value: number | null | undefined, currency: string = 'MXN', locale: string = 'es-MX'): string => {
    if (value === null || value === undefined || isNaN(value)) {
        return '';
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    } catch (error) {
        if (import.meta.env.DEV) {
            console.warn('Currency formatting failed:', error);
        }
        // Fallback to simple formatting
        return `${currency} ${value.toLocaleString()}`;
    }
};

/**
 * Format a number with thousand separators.
 */
export const formatNumber = (value: number | null | undefined, locale: string = 'es-MX'): string => {
    if (value === null || value === undefined || isNaN(value)) {
        return '';
    }

    return value.toLocaleString(locale);
};

/**
 * Convert a boolean-like value to a proper boolean.
 * Handles Laravel's boolean casting inconsistencies.
 */
export const parseBoolean = (value: boolean | string | number | null | undefined): boolean => {
    if (value === null || value === undefined) {
        return false;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const lowercased = value.toLowerCase().trim();
        return lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return false;
};

/**
 * Safely access nested object properties with type conversion.
 */
export const safeGet = <T>(obj: any, path: string, converter?: (value: any) => T, fallback?: T): T | undefined => {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined || !(key in current)) {
            return fallback;
        }
        current = current[key];
    }

    if (converter) {
        try {
            return converter(current);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn(`Conversion failed for path ${path}:`, error);
            }
            return fallback;
        }
    }

    return current;
};

/**
 * Type-safe form data conversion for Laravel forms.
 */
export const prepareFormData = <T extends Record<string, any>>(data: T): T => {
    const prepared = { ...data };

    // Convert undefined numeric fields to null for Laravel
    Object.keys(prepared).forEach((key) => {
        const value = prepared[key];
        if (typeof value === 'number' && isNaN(value)) {
            prepared[key] = null;
        }
        if (value === undefined) {
            prepared[key] = null;
        }
    });

    return prepared;
};

/**
 * Convert Laravel timestamps to Date objects.
 */
export const parseTimestamp = (value: string | null | undefined): Date | null => {
    if (!value) return null;

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format a date for Laravel backend (ISO string).
 */
export const formatDateForBackend = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
    } catch (error) {
        if (import.meta.env.DEV) {
            console.warn('Date formatting failed:', error);
        }
        return null;
    }
};
