import { cn } from '@/lib/utils';
import { forwardRef, useState } from 'react';
import { Input } from './input';

export interface PhoneInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value?: string;
    onChange?: (value: string) => void;
    countryCode?: string;
    format?: 'international' | 'national';
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
    ({
        className,
        value = '',
        onChange,
        countryCode = '+52',
        format = 'international',
        ...props
    }, ref) => {
        const [displayValue, setDisplayValue] = useState(value);

        const formatPhoneNumber = (phone: string, fmt: string): string => {
            try {
                // Sanitize input
                const sanitized = String(phone || '').trim();
                if (!sanitized) return '';
                
                // Remove all non-numeric characters
                const numbers = sanitized.replace(/\D/g, '');
                
                if (fmt === 'international') {
                // Mexican format: +52 55 1234 5678
                if (numbers.length <= 2) return countryCode + ' ' + numbers;
                if (numbers.length <= 4) return countryCode + ' ' + numbers.slice(0, 2) + ' ' + numbers.slice(2);
                if (numbers.length <= 8) return countryCode + ' ' + numbers.slice(0, 2) + ' ' + numbers.slice(2, 6) + ' ' + numbers.slice(6);
                return countryCode + ' ' + numbers.slice(0, 2) + ' ' + numbers.slice(2, 6) + ' ' + numbers.slice(6, 10);
                } else {
                    // National format: (55) 1234-5678
                    if (numbers.length <= 2) return '(' + numbers;
                    if (numbers.length <= 6) return '(' + numbers.slice(0, 2) + ') ' + numbers.slice(2);
                    return '(' + numbers.slice(0, 2) + ') ' + numbers.slice(2, 6) + '-' + numbers.slice(6, 10);
                }
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Phone formatting failed:', error);
                }
                return phone || '';
            }
        };

        const extractNumbers = (phone: string): string => {
            return phone.replace(/\D/g, '');
        };

        const isValidMexicanPhone = (phone: string): boolean => {
            const numbers = extractNumbers(phone);
            // Mexican mobile numbers are 10 digits (after country code)
            return numbers.length === 10 && /^[0-9]{10}$/.test(numbers);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;
            const numbers = extractNumbers(inputValue);
            
            // Limit to 10 digits for Mexican numbers
            if (numbers.length <= 10) {
                const formatted = formatPhoneNumber(numbers, format);
                setDisplayValue(formatted);
                
                // Return the E.164 format for validation
                const e164Format = numbers.length > 0 ? `+52${numbers}` : '';
                onChange?.(e164Format);
            }
        };

        const handleBlur = () => {
            const numbers = extractNumbers(displayValue);
            if (numbers.length > 0) {
                const formatted = formatPhoneNumber(numbers, format);
                setDisplayValue(formatted);
            }
        };

        return (
            <div className="relative">
                <Input
                    className={cn(className)}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={format === 'international' ? '+52 55 1234 5678' : '(55) 1234-5678'}
                    ref={ref}
                    {...props}
                />
                {displayValue && !isValidMexicanPhone(displayValue) && (
                    <div className="mt-1 text-xs text-destructive">
                        Ingresa un número de teléfono mexicano válido
                    </div>
                )}
            </div>
        );
    }
);
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };