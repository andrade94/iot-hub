/**
 * useSearch Hook
 *
 * Hook for debounced search with typeahead support.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface SearchResult {
    id: string;
    type?: string;
    title: string;
    subtitle?: string;
    description?: string;
    url?: string;
    image?: string;
    meta?: Record<string, unknown>;
}

interface UseSearchOptions {
    endpoint?: string;
    debounceMs?: number;
    minLength?: number;
    limit?: number;
    onResults?: (results: SearchResult[]) => void;
    onError?: (error: string) => void;
}

interface UseSearchReturn {
    query: string;
    setQuery: (query: string) => void;
    results: SearchResult[];
    isLoading: boolean;
    error: string | null;
    search: (query: string) => Promise<void>;
    clear: () => void;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
    const { endpoint = '/api/search', debounceMs = 300, minLength = 2, limit = 10, onResults, onError } = options;

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const search = useCallback(
        async (searchQuery: string) => {
            // Clear previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            if (searchQuery.length < minLength) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            abortControllerRef.current = new AbortController();

            try {
                const params = new URLSearchParams({
                    q: searchQuery,
                    limit: limit.toString(),
                });

                const response = await fetch(`${endpoint}?${params}`, {
                    signal: abortControllerRef.current.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                    },
                });

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const data = await response.json();

                // Handle different response formats
                let searchResults: SearchResult[] = [];
                if (Array.isArray(data)) {
                    searchResults = data;
                } else if (data.results) {
                    // Flatten results from multiple types
                    if (typeof data.results === 'object' && !Array.isArray(data.results)) {
                        searchResults = Object.values(data.results).flat() as SearchResult[];
                    } else {
                        searchResults = data.results;
                    }
                }

                setResults(searchResults);
                onResults?.(searchResults);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }
                const errorMessage = err instanceof Error ? err.message : 'Search failed';
                setError(errorMessage);
                onError?.(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        [endpoint, limit, minLength, onResults, onError]
    );

    // Debounced search on query change
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            search(query);
        }, debounceMs);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, debounceMs, search]);

    const clear = useCallback(() => {
        setQuery('');
        setResults([]);
        setError(null);
    }, []);

    return {
        query,
        setQuery,
        results,
        isLoading,
        error,
        search,
        clear,
    };
}

/**
 * useTypeahead Hook
 *
 * Simplified hook for typeahead/autocomplete functionality.
 */
interface TypeaheadOption {
    id: string;
    label: string;
    value: string;
    subtitle?: string;
}

interface UseTypeaheadOptions {
    endpoint: string;
    debounceMs?: number;
    minLength?: number;
    limit?: number;
}

interface UseTypeaheadReturn {
    query: string;
    setQuery: (query: string) => void;
    options: TypeaheadOption[];
    isLoading: boolean;
    select: (option: TypeaheadOption) => void;
    clear: () => void;
    selectedOption: TypeaheadOption | null;
}

export function useTypeahead(options: UseTypeaheadOptions): UseTypeaheadReturn {
    const { endpoint, debounceMs = 200, minLength = 1, limit = 5 } = options;

    const [query, setQuery] = useState('');
    const [typeaheadOptions, setTypeaheadOptions] = useState<TypeaheadOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState<TypeaheadOption | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (query.length < minLength) {
            setTypeaheadOptions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            setIsLoading(true);
            abortControllerRef.current = new AbortController();

            try {
                const params = new URLSearchParams({
                    q: query,
                    limit: limit.toString(),
                });

                const response = await fetch(`${endpoint}?${params}`, {
                    signal: abortControllerRef.current.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                    },
                });

                if (!response.ok) {
                    throw new Error('Typeahead failed');
                }

                const data = await response.json();
                setTypeaheadOptions(Array.isArray(data) ? data : []);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Typeahead error:', err);
                }
            } finally {
                setIsLoading(false);
            }
        }, debounceMs);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, endpoint, debounceMs, minLength, limit]);

    const select = useCallback((option: TypeaheadOption) => {
        setSelectedOption(option);
        setQuery(option.label);
        setTypeaheadOptions([]);
    }, []);

    const clear = useCallback(() => {
        setQuery('');
        setTypeaheadOptions([]);
        setSelectedOption(null);
    }, []);

    return {
        query,
        setQuery,
        options: typeaheadOptions,
        isLoading,
        select,
        clear,
        selectedOption,
    };
}
