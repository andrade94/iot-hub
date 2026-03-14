/**
 * Laravel Pagination Types
 *
 * Types for handling Laravel pagination responses
 */

export interface PaginationMeta {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
}

export interface PaginationLinks {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    links: PaginationLinks;
    meta: PaginationMeta;
}

/**
 * Simple pagination metadata (for cursor-based pagination)
 */
export interface SimplePaginationMeta {
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
}

export interface SimplePaginatedResponse<T> {
    data: T[];
    meta: SimplePaginationMeta;
}
