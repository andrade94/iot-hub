/**
 * SearchInput Component
 *
 * Search input with typeahead dropdown and keyboard navigation.
 */

import { cn } from '@/lib/utils';
import { Loader2, Search, X } from 'lucide-react';
import * as React from 'react';

import { Input } from '@/components/ui/input';

export interface SearchResult {
    id: string;
    label: string;
    value: string;
    subtitle?: string;
    icon?: React.ReactNode;
}

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    results?: SearchResult[];
    isLoading?: boolean;
    onSelect?: (result: SearchResult) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    showClearButton?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
}

export function SearchInput({
    value,
    onChange,
    results = [],
    isLoading = false,
    onSelect,
    onSearch,
    placeholder = 'Search...',
    className,
    inputClassName,
    showClearButton = true,
    autoFocus = false,
    disabled = false,
}: SearchInputProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);

    // Open dropdown when results are available
    React.useEffect(() => {
        if (results.length > 0 && value.length > 0) {
            setIsOpen(true);
            setHighlightedIndex(-1);
        } else {
            setIsOpen(false);
        }
    }, [results, value]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'Enter' && onSearch) {
                onSearch(value);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && results[highlightedIndex]) {
                    handleSelect(results[highlightedIndex]);
                } else if (onSearch) {
                    onSearch(value);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    const handleSelect = (result: SearchResult) => {
        onSelect?.(result);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className={cn('relative', className)}>
            <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    onBlur={() => {
                        // Delay to allow click on results
                        setTimeout(() => setIsOpen(false), 200);
                    }}
                    placeholder={placeholder}
                    className={cn('pr-10 pl-9', inputClassName)}
                    autoFocus={autoFocus}
                    disabled={disabled}
                />
                <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
                    {isLoading && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
                    {showClearButton && value && !isLoading && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-muted-foreground hover:text-foreground rounded-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Results dropdown */}
            {isOpen && results.length > 0 && (
                <ul
                    ref={listRef}
                    className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md"
                    role="listbox"
                >
                    {results.map((result, index) => (
                        <li
                            key={result.id}
                            role="option"
                            aria-selected={index === highlightedIndex}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                                index === highlightedIndex && 'bg-accent text-accent-foreground'
                            )}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            {result.icon && <span className="text-muted-foreground flex-shrink-0">{result.icon}</span>}
                            <div className="flex-1 overflow-hidden">
                                <div className="truncate font-medium">{result.label}</div>
                                {result.subtitle && (
                                    <div className="text-muted-foreground truncate text-xs">{result.subtitle}</div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* No results message */}
            {isOpen && value.length >= 2 && results.length === 0 && !isLoading && (
                <div className="bg-popover text-muted-foreground absolute z-50 mt-1 w-full rounded-md border p-4 text-center text-sm shadow-md">
                    No results found
                </div>
            )}
        </div>
    );
}
