import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
        const triggerRef = React.useRef<HTMLButtonElement>(null);
        const dropdownRef = React.useRef<HTMLDivElement>(null);
        const inputRef = React.useRef<HTMLInputElement>(null);
        const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

        const selectedOption = options.find((option) => option.value === value);

        const filteredOptions = React.useMemo(() => {
            if (!search) return options;
            const searchTerm = search.toLowerCase();
            return options.filter((option) => {
                if (option.label.toLowerCase().includes(searchTerm)) return true;
                if (option.value.toLowerCase().includes(searchTerm)) return true;
                if (option.searchTerms) {
                    return option.searchTerms.some(term => term.toLowerCase().includes(searchTerm));
                }
                return false;
            });
        }, [options, search]);

        const handleToggle = () => {
            if (disabled) return;
            setIsOpen(!isOpen);
            if (!isOpen) setSearch("");
        };

        // Position the dropdown when opened
        React.useEffect(() => {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setDropdownStyle({
                    position: 'fixed' as const,
                    top: rect.bottom + 6,
                    left: rect.left,
                    width: rect.width,
                });
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        }, [isOpen]);

        // Close on click outside
        React.useEffect(() => {
            if (!isOpen) return;
            const handleClickOutside = (event: MouseEvent) => {
                if (
                    triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
                    dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
                ) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen]);

        // Close on scroll (optional, prevents stale positioning)
        React.useEffect(() => {
            if (!isOpen) return;
            const handleScroll = () => {
                if (triggerRef.current) {
                    const rect = triggerRef.current.getBoundingClientRect();
                    setDropdownStyle(prev => ({ ...prev, top: rect.bottom + 6, left: rect.left, width: rect.width }));
                }
            };
            window.addEventListener('scroll', handleScroll, true);
            return () => window.removeEventListener('scroll', handleScroll, true);
        }, [isOpen]);

        const handleSelect = (selectedValue: string) => {
            onValueChange(selectedValue);
            setIsOpen(false);
            setSearch("");
        };

        // Merge refs
        const mergedRef = React.useCallback((node: HTMLButtonElement | null) => {
            (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }, [ref]);

        return (
            <>
                <Button
                    ref={mergedRef}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={cn(
                        "w-full justify-between h-10 rounded-lg font-normal",
                        !selectedOption && "text-muted-foreground",
                        className,
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

                {isOpen && createPortal(
                    <div
                        ref={dropdownRef}
                        style={dropdownStyle}
                        className="z-[9999] overflow-hidden rounded-lg border border-border shadow-2xl shadow-black/50"
                    >
                        {/* Search */}
                        <div className="flex items-center gap-2.5 border-b border-border px-3 py-0.5" style={{ backgroundColor: '#1e2330' }}>
                            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setIsOpen(false);
                                    e.stopPropagation();
                                }}
                            />
                        </div>
                        {/* Options */}
                        <div className="max-h-[260px] overflow-y-auto overscroll-contain p-1 scrollbar-thin" style={{ backgroundColor: '#1e2330' }}>
                            {filteredOptions.length === 0 ? (
                                <div className="py-6 text-center text-[12px] text-muted-foreground">
                                    {emptyText}
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-md px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors",
                                            "hover:bg-white/5",
                                            value === option.value && "bg-primary/10 text-primary"
                                        )}
                                        onClick={() => handleSelect(option.value)}
                                    >
                                        <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", value === option.value ? "opacity-100 text-primary" : "opacity-0")} />
                                        <span className="truncate">{option.label}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </>
        );
    }
);

SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
export type { SearchableSelectProps };
