import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface SearchableSelectOption {
    value: string;
    label: string;
    searchTerms?: string[];
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
}

const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(
    ({
        options,
        value,
        onValueChange,
        placeholder = "Select option...",
        emptyText = "No option found.",
        searchPlaceholder = "Search...",
        disabled = false,
        className,
    }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [search, setSearch] = React.useState("");
        const dropdownRef = React.useRef<HTMLDivElement>(null);
        const inputRef = React.useRef<HTMLInputElement>(null);

        // Find the selected option
        const selectedOption = options.find((option) => option.value === value);

        // Filter options based on search
        const filteredOptions = React.useMemo(() => {
            if (!search) return options;
            
            const searchTerm = search.toLowerCase();
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
        }, [options, search]);

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

        const handleSelect = (selectedValue: string) => {
            onValueChange(selectedValue);
            setIsOpen(false);
            setSearch("");
        };

        const handleToggle = () => {
            if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                    setSearch("");
                }
            }
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
                        "w-full justify-between h-10 rounded-lg bg-background/50 border-input font-normal shadow-xs hover:border-border/80",
                        !selectedOption && "text-muted-foreground"
                    )}
                    disabled={disabled}
                    onClick={handleToggle}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className={cn(
                        "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
                        isOpen && "rotate-180"
                    )} />
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
                                                "focus:bg-accent focus:text-accent-foreground",
                                                value === option.value && "bg-accent text-accent-foreground"
                                            )}
                                            onClick={() => handleSelect(option.value)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === option.value ? "opacity-100" : "opacity-0"
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

SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
export type { SearchableSelectProps };