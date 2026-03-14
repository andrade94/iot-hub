import { useState } from 'react';

interface ErrorState {
    message: string;
    field?: string;
    status?: number;
}

interface UseErrorHandlerReturn {
    error: ErrorState | null;
    clearError: () => void;
    handleError: (error: unknown) => void;
}

/**
 * Hook for handling errors in a consistent way across components
 * Provides error state management and error handling utilities
 */
export function useErrorHandler(): UseErrorHandlerReturn {
    const [error, setError] = useState<ErrorState | null>(null);

    const clearError = () => {
        setError(null);
    };

    const handleError = (error: unknown) => {
        if (import.meta.env.DEV) {
            console.error('Error occurred:', error);
        }

        const err = error as {
            response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } };
            code?: string;
            message?: string;
        };

        // Handle Inertia validation errors
        if (err.response?.status === 422) {
            const validationErrors = err.response.data?.errors;
            if (validationErrors) {
                const firstError = Object.keys(validationErrors)[0];
                setError({
                    message: validationErrors[firstError][0],
                    field: firstError,
                    status: 422,
                });
                return;
            }
        }

        // Handle authorization errors
        if (err.response?.status === 403) {
            setError({
                message: err.response.data?.message || 'You are not authorized to perform this action.',
                status: 403,
            });
            return;
        }

        // Handle not found errors
        if (err.response?.status === 404) {
            setError({
                message: err.response.data?.message || 'The requested resource was not found.',
                status: 404,
            });
            return;
        }

        // Handle server errors
        if (err.response?.status && err.response.status >= 500) {
            setError({
                message: 'A server error occurred. Please try again later.',
                status: err.response.status,
            });
            return;
        }

        // Handle network errors
        if (err.code === 'ERR_NETWORK') {
            setError({
                message: 'Network error. Please check your connection and try again.',
                status: 0,
            });
            return;
        }

        // Default error message
        setError({
            message: err.message || 'An unexpected error occurred. Please try again.',
            status: err.response?.status,
        });
    };

    return {
        error,
        clearError,
        handleError,
    };
}
