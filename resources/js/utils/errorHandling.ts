/**
 * Frontend error handling utilities for consistent error processing
 * and user feedback across the application.
 */

import { toast } from '@/hooks/use-toast';

export interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    additionalData?: Record<string, any>;
}

export interface FormErrors {
    [key: string]: string | string[];
}

/**
 * Handle and display errors from Inertia responses.
 */
export const handleInertiaErrors = (errors: FormErrors | string, context?: ErrorContext): void => {
    if (typeof errors === 'string') {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: errors,
        });
        logError(new Error(errors), context);
        return;
    }

    // Handle validation errors object
    const errorMessages = Object.values(errors).flat();
    const firstError = errorMessages[0];

    if (firstError) {
        toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: firstError,
        });
    }

    logError(new Error(`Validation errors: ${JSON.stringify(errors)}`), context);
};

/**
 * Handle success messages from Inertia responses.
 */
export const handleInertiaSuccess = (message: string): void => {
    toast({
        title: 'Success',
        description: message,
    });
};

/**
 * Generic error handler for try-catch blocks.
 */
export const handleError = (error: Error | string, userMessage?: string, context?: ErrorContext): void => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const displayMessage = userMessage || 'An unexpected error occurred. Please try again.';

    toast({
        variant: 'destructive',
        title: 'Error',
        description: displayMessage,
    });

    logError(errorObj, context);
};

/**
 * Handle network/fetch errors.
 */
export const handleNetworkError = (error: Error, context?: ErrorContext): void => {
    const isOffline = !navigator.onLine;
    const message = isOffline ? 'You appear to be offline. Please check your connection.' : 'Network error occurred. Please try again.';

    toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: message,
    });

    logError(error, { ...context, networkError: true, offline: isOffline });
};

/**
 * Handle validation errors from forms.
 */
export const handleValidationError = (fieldErrors: FormErrors, context?: ErrorContext): string[] => {
    const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => {
            const errorList = Array.isArray(errors) ? errors : [errors];
            return errorList.map((error) => `${field}: ${error}`);
        })
        .flat();

    // Show first error in toast
    if (errorMessages.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: errorMessages[0],
        });
    }

    logError(new Error(`Validation errors: ${JSON.stringify(fieldErrors)}`), context);
    return errorMessages;
};

/**
 * Handle unauthorized access errors.
 */
export const handleUnauthorizedError = (context?: ErrorContext): void => {
    toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: 'You do not have permission to perform this action.',
    });

    logError(new Error('Unauthorized access attempt'), context);
};

/**
 * Handle not found errors.
 */
export const handleNotFoundError = (resource?: string, context?: ErrorContext): void => {
    const message = resource ? `The ${resource} you are looking for was not found.` : 'The requested resource was not found.';

    toast({
        variant: 'destructive',
        title: 'Not Found',
        description: message,
    });

    logError(new Error(`Resource not found: ${resource}`), context);
};

/**
 * Log errors to console in development and to external service in production.
 */
export const logError = (error: Error, context?: ErrorContext): void => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        context,
    };

    // Always log to console in development
    if (import.meta.env.DEV) {
        console.error('Application Error:', errorInfo);
    }

    // In production, you would send to an external logging service
    // Example: Sentry, LogRocket, etc.
    if (import.meta.env.PROD) {
        // TODO: Implement external logging service
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }
};

/**
 * Create a higher-order function that wraps async operations with error handling.
 */
export const withErrorHandling = <T extends any[], R>(fn: (...args: T) => Promise<R>, context?: ErrorContext, customErrorMessage?: string) => {
    return async (...args: T): Promise<R | null> => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error instanceof Error ? error : new Error(String(error)), customErrorMessage, context);
            return null;
        }
    };
};

/**
 * Retry utility for failed operations.
 */
export const retryOperation = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: ErrorContext,
): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                logError(lastError, { ...context, attempt, maxRetries });
                throw lastError;
            }

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
    }

    throw lastError!;
};

/**
 * Form submission error handler.
 */
export const handleFormSubmissionError = (error: any, context?: ErrorContext): void => {
    if (error.response?.data?.errors) {
        handleValidationError(error.response.data.errors, context);
    } else if (error.response?.status === 401) {
        handleUnauthorizedError(context);
    } else if (error.response?.status === 404) {
        handleNotFoundError(undefined, context);
    } else if (error.response?.status >= 500) {
        handleError(error, 'Server error occurred. Please try again later.', context);
    } else {
        handleError(error, undefined, context);
    }
};
