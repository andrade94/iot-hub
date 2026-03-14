import { cn } from '@/lib/utils';
import { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';

export interface NumericInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value?: number;
    onChange?: (value: number | undefined) => void;
    suffix?: string;
    allowNegative?: boolean;
}

// Helper function to format number with thousand separators
const formatNumberWithCommas = (value: string): string => {
    // Remove existing commas
    const cleanValue = value.replace(/,/g, '');
    
    // Handle negative numbers
    const isNegative = cleanValue.startsWith('-');
    const absoluteValue = isNegative ? cleanValue.slice(1) : cleanValue;
    
    // Add commas
    const formatted = absoluteValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return isNegative ? `-${formatted}` : formatted;
};

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
    ({
        className,
        value,
        onChange,
        suffix,
        allowNegative = false,
        disabled,
        placeholder,
        ...props
    }, ref) => {
        const [displayValue, setDisplayValue] = useState<string>('');
        const [isFocused, setIsFocused] = useState(false);

        // Update display value when value prop changes
        useEffect(() => {
            if (value === undefined || value === null || value === 0) {
                setDisplayValue('');
            } else {
                // Format with commas for display
                setDisplayValue(formatNumberWithCommas(value.toString()));
            }
        }, [value]);

        // Format display value based on focus state
        const getDisplayValue = (): string => {
            if (isFocused || !suffix) {
                // When focused or no suffix, show number with commas
                return displayValue;
            } else {
                // When not focused and has suffix, show formatted with suffix
                const numValue = parseInt(displayValue.replace(/,/g, '')) || 0;
                if (numValue === 0 && displayValue === '') {
                    return '';
                }
                return `${formatNumberWithCommas(numValue.toString())} ${suffix}`;
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const input = e.target.value;
            
            // Remove all non-numeric characters except commas
            const numericOnly = input.replace(/[^\d,-]/g, '');
            
            // Remove commas for processing
            const withoutCommas = numericOnly.replace(/,/g, '');
            
            // Handle negative sign
            if (!allowNegative && withoutCommas.includes('-')) {
                return;
            }
            
            // Prevent multiple negative signs
            const cleanedValue = withoutCommas.replace(/(?!^)-/g, '');
            
            // Format with commas and update display value
            const formattedValue = cleanedValue === '' || cleanedValue === '-' 
                ? cleanedValue 
                : formatNumberWithCommas(cleanedValue);
            
            setDisplayValue(formattedValue);
            
            // Convert to number and call onChange
            const numValue = parseInt(cleanedValue);
            if (cleanedValue === '' || cleanedValue === '-') {
                onChange?.(undefined);
            } else if (!isNaN(numValue)) {
                onChange?.(numValue);
            }
        };

        const handleFocus = () => {
            setIsFocused(true);
        };

        const handleBlur = () => {
            setIsFocused(false);
            // Clean up display value on blur
            if (displayValue === '-' || displayValue === '') {
                setDisplayValue('');
            }
        };

        return (
            <Input
                ref={ref}
                type="text"
                inputMode="numeric"
                className={cn('text-right', className)}
                value={getDisplayValue()}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder || (suffix ? `0 ${suffix}` : '0')}
                disabled={disabled}
                {...props}
            />
        );
    }
);
NumericInput.displayName = 'NumericInput';

export { NumericInput };