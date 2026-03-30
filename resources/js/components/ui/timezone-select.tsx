import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { useMemo } from 'react';

interface TimezoneSelectProps {
    timezones: string[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Format a timezone identifier into a display label with UTC offset.
 * e.g. "America/Mexico_City" → "America/Mexico City (UTC-6)"
 */
function formatTimezone(tz: string): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
        const parts = formatter.formatToParts(now);
        const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
        const displayName = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
        return `${displayName} (${offset})`;
    } catch {
        return tz.replace(/_/g, ' ');
    }
}

export function TimezoneSelect({ timezones, value, onValueChange, placeholder, disabled, className }: TimezoneSelectProps) {
    const options = useMemo<SearchableSelectOption[]>(() =>
        timezones.map((tz) => ({
            value: tz,
            label: formatTimezone(tz),
            searchTerms: [tz, tz.replace(/_/g, ' ')],
        })),
    [timezones]);

    return (
        <SearchableSelect
            options={options}
            value={value}
            onValueChange={onValueChange}
            placeholder={placeholder ?? 'Select timezone...'}
            searchPlaceholder="Search timezone..."
            emptyText="No timezone found."
            disabled={disabled}
            className={className}
        />
    );
}
