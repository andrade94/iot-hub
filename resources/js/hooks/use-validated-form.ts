/**
 * useValidatedForm — Inertia useForm + Zod client-side validation
 *
 * Wraps Inertia's useForm with a Zod schema for instant client-side
 * validation before submit. Server errors still flow through form.errors
 * automatically. No need for react-hook-form.
 *
 * Usage:
 *   const form = useValidatedForm(siteSchema, { name: '', timezone: '' });
 *   form.submit('post', '/settings/sites');
 */

import { useForm } from '@inertiajs/react';
import type { VisitOptions } from '@inertiajs/core';
import type { z } from 'zod';
import { useCallback } from 'react';

type InertiaForm<T extends Record<string, unknown>> = ReturnType<typeof useForm<T>>;

interface ValidatedForm<T extends Record<string, unknown>> extends InertiaForm<T> {
    /** Validate + submit. Errors set client-side if invalid, otherwise submits to server. */
    submit: (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, options?: Partial<VisitOptions>) => void;
    /** Validate without submitting. Returns true if valid. */
    validate: () => boolean;
}

export function useValidatedForm<T extends Record<string, unknown>>(
    schema: z.ZodType<T>,
    initialValues: T,
): ValidatedForm<T> {
    const form = useForm<T>(initialValues);

    const validate = useCallback((): boolean => {
        form.clearErrors();

        const result = schema.safeParse(form.data);

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            for (const issue of result.error.issues) {
                const path = issue.path.join('.');
                if (path && !fieldErrors[path]) {
                    fieldErrors[path] = issue.message;
                }
            }
            form.setError(fieldErrors as Record<keyof T & string, string>);
            return false;
        }

        return true;
    }, [form, schema]);

    const submit = useCallback(
        (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, options?: Partial<VisitOptions>) => {
            if (!validate()) return;

            form[method](url, options);
        },
        [form, validate],
    );

    return {
        ...form,
        submit,
        validate,
    };
}
