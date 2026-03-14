import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    items?: NavItem[]; // Support for nested navigation items
    badge?: string; // Optional badge text
    tooltip?: string; // Optional tooltip text
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    locale?: string; // Current locale (e.g., 'en', 'es')
    notifications: DatabaseNotification[];
    unreadNotificationsCount: number;
    flash?: {
        success?: string;
        error?: string;
        info?: string;
        warning?: string;
    };
    ziggy?: any; // Ziggy route helper
    [key: string]: unknown;
}

export interface Activity {
    id: number;
    log_name: string | null;
    description: string;
    subject_type: string | null;
    event: string | null;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    properties: Record<string, any>;
    batch_uuid: string | null;
    created_at: string;
    updated_at: string;
    causer?: User;
    subject?: any;
}

export interface UploadedFile {
    id: string;
    name: string;
    filename: string;
    path: string;
    url: string;
    thumbnail_url?: string | null;
    size: number;
    formatted_size: string;
    mime_type: string;
    extension: string;
    visibility: 'public' | 'private';
    is_image: boolean;
    has_thumbnail: boolean;
    uploaded_at: string;
}

export interface FileUploadProgress {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    uploadedFile?: UploadedFile;
    error?: string;
}

export interface DatabaseNotification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: NotificationData;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationData {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    icon?: string;
    action_url?: string;
    action_text?: string;
    [key: string]: any;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
