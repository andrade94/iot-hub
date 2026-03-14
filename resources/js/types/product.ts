/**
 * Product Types
 *
 * Types for the Products CRUD resource
 */

export interface Category {
    id: string;
    name: string;
    slug: string;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: Category;
    status: 'active' | 'inactive' | 'draft';
    stock: number;
    sku: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProductFilters {
    search?: string;
    status?: string[];
    categories?: string[];
    price_min?: number;
    price_max?: number;
    date_from?: string;
    date_to?: string;
}

export interface ProductFormData {
    name: string;
    description: string;
    price: number;
    category_id: string;
    status: 'active' | 'inactive' | 'draft';
    stock: number;
    sku: string;
    image?: File | null;
}

export interface ProductStats {
    total: number;
    active: number;
    inactive: number;
    draft: number;
    low_stock: number;
    out_of_stock: number;
}
