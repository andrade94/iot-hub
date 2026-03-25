/**
 * Shared formatting utilities
 */

/**
 * Format a number as Mexican Peso currency (e.g., "$1,234 MXN").
 */
export function formatMXN(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
}
