import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
    value: string;
    label: string;
    searchTerms?: string[];
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    value?: string[];
    onValueChange: (value: string[]) => void;
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
    ({
        options,
        value = [],
        onValueChange,
        placeholder = "Select options...",
        emptyText = "No options found.",
        searchPlaceholder = "Search...",
        disabled = false,
        className,
    }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [search, setSearch] = React.useState("");
        const [debouncedSearch, setDebouncedSearch] = React.useState("");
        const dropdownRef = React.useRef<HTMLDivElement>(null);
        const inputRef = React.useRef<HTMLInputElement>(null);

        // Debounce search to improve performance
        React.useEffect(() => {
            const timer = setTimeout(() => {
                setDebouncedSearch(search);
            }, 300);

            return () => clearTimeout(timer);
        }, [search]);

        // Find the selected options
        const selectedOptions = options.filter((option) => value.includes(option.value));

        // Filter options based on debounced search
        const filteredOptions = React.useMemo(() => {
            if (!debouncedSearch) return options;
            
            const searchTerm = debouncedSearch.toLowerCase();
            return options.filter((option) => {
                // Search in label
                if (option.label.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                // Search in value
                if (option.value.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                // Search in additional search terms
                if (option.searchTerms) {
                    return option.searchTerms.some(term => 
                        term.toLowerCase().includes(searchTerm)
                    );
                }
                
                return false;
            });
        }, [options, debouncedSearch]);

        // Handle click outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
                // Focus search input when opened
                setTimeout(() => inputRef.current?.focus(), 0);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [isOpen]);

        const handleToggleOption = (optionValue: string) => {
            const newValue = value.includes(optionValue)
                ? value.filter(v => v !== optionValue)
                : [...value, optionValue];
            onValueChange(newValue);
        };

        const handleRemoveOption = (optionValue: string) => {
            onValueChange(value.filter(v => v !== optionValue));
        };

        const handleToggle = () => {
            if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                    setSearch("");
                }
            }
        };

        const handleClearAll = (e: React.MouseEvent) => {
            e.stopPropagation();
            onValueChange([]);
        };

        return (
            <div className={cn("relative", className)} ref={dropdownRef}>
                <Button
                    ref={ref}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={cn(
                        "min-h-10 w-full justify-between",
                        !selectedOptions.length && "text-muted-foreground"
                    )}
                    disabled={disabled}
                    onClick={handleToggle}
                >
                    <div className="flex flex-1 flex-wrap items-center gap-1">
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((option) => (
                                <Badge
                                    key={option.value}
                                    variant="secondary"
                                    className="mr-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveOption(option.value);
                                    }}
                                >
                                    {option.label}
                                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                                </Badge>
                            ))
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {selectedOptions.length > 0 && (
                            <X
                                className="h-4 w-4 cursor-pointer opacity-50 hover:opacity-100"
                                onClick={handleClearAll}
                            />
                        )}
                        <ChevronDown className={cn(
                            "h-4 w-4 shrink-0 opacity-50 transition-transform",
                            isOpen && "rotate-180"
                        )} />
                    </div>
                </Button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <Input
                                ref={inputRef}
                                type="text"
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsOpen(false);
                                    }
                                    e.stopPropagation();
                                }}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {filteredOptions.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {emptyText}
                                </div>
                            ) : (
                                <div className="p-1">
                                    {filteredOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={cn(
                                                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                "focus:bg-accent focus:text-accent-foreground"
                                            )}
                                            onClick={() => handleToggleOption(option.value)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value.includes(option.value) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
export type { MultiSelectProps };