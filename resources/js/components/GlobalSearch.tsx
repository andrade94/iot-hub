import { router } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ClipboardList, Cpu, Loader2, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchResult {
    id: number;
    name: string;
    subtitle: string;
    url: string;
}

interface SearchResults {
    sites?: SearchResult[];
    devices?: SearchResult[];
    alerts?: SearchResult[];
    work_orders?: SearchResult[];
}

const categoryConfig = {
    sites: {
        label: 'Sites',
        icon: MapPin,
    },
    devices: {
        label: 'Devices',
        icon: Cpu,
    },
    alerts: {
        label: 'Alerts',
        icon: AlertTriangle,
    },
    work_orders: {
        label: 'Work Orders',
        icon: ClipboardList,
    },
} as const;

type CategoryKey = keyof typeof categoryConfig;

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({});
    const [loading, setLoading] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Search API call
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) {
            setResults({});
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        axios
            .get<SearchResults>('/search', { params: { q: debouncedQuery } })
            .then((response) => {
                if (!cancelled) {
                    setResults(response.data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResults({});
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    // Navigate to result
    const handleSelect = useCallback(
        (url: string) => {
            setOpen(false);
            setQuery('');
            setResults({});
            router.visit(url);
        },
        [],
    );

    // Reset state when dialog closes
    const handleOpenChange = useCallback((value: boolean) => {
        setOpen(value);
        if (!value) {
            setQuery('');
            setResults({});
        }
    }, []);

    const hasResults = Object.keys(results).length > 0;
    const categories = Object.keys(categoryConfig) as CategoryKey[];

    return (
        <CommandDialog
            open={open}
            onOpenChange={handleOpenChange}
            title="Global Search"
            description="Search across sites, devices, alerts, and work orders"
            showCloseButton={false}
        >
            <CommandInput
                placeholder="Search sites, devices, alerts..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="text-muted-foreground size-5 animate-spin" />
                        <span className="text-muted-foreground ml-2 text-sm">Searching...</span>
                    </div>
                )}

                {!loading && debouncedQuery.length >= 2 && !hasResults && (
                    <CommandEmpty>No results found.</CommandEmpty>
                )}

                {!loading && debouncedQuery.length < 2 && (
                    <div className="text-muted-foreground py-6 text-center text-sm">
                        Type at least 2 characters to search...
                    </div>
                )}

                {!loading &&
                    hasResults &&
                    categories.map((category, index) => {
                        const items = results[category];
                        if (!items || items.length === 0) return null;

                        const config = categoryConfig[category];
                        const Icon = config.icon;

                        return (
                            <div key={category}>
                                {index > 0 && results[categories[index - 1] as CategoryKey] && (
                                    <CommandSeparator />
                                )}
                                <CommandGroup heading={config.label}>
                                    {items.map((item) => (
                                        <CommandItem
                                            key={`${category}-${item.id}`}
                                            value={`${category}-${item.id}-${item.name}`}
                                            onSelect={() => handleSelect(item.url)}
                                            className="cursor-pointer"
                                        >
                                            <Icon className="text-muted-foreground mr-2 size-4" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{item.name}</span>
                                                <span className="text-muted-foreground text-xs">{item.subtitle}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </div>
                        );
                    })}
            </CommandList>

            <div className="border-t px-3 py-2">
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Navigate with arrow keys</span>
                    <div className="flex items-center gap-1">
                        <kbd className="bg-muted rounded border px-1.5 py-0.5 text-[10px] font-medium">Esc</kbd>
                        <span>to close</span>
                    </div>
                </div>
            </div>
        </CommandDialog>
    );
}
