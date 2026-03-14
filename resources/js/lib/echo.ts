/**
 * Laravel Echo Configuration
 *
 * This file sets up Laravel Echo for real-time broadcasting with Laravel Reverb.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Echo
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

/**
 * Initialize Laravel Echo instance
 */
function createEchoInstance(): Echo<'reverb'> | null {
    const appKey = import.meta.env.VITE_REVERB_APP_KEY;
    const host = import.meta.env.VITE_REVERB_HOST;
    const port = import.meta.env.VITE_REVERB_PORT;
    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';

    // Don't initialize if not configured
    if (!appKey || !host) {
        console.warn('Laravel Echo not configured. Real-time features disabled.');
        return null;
    }

    return new Echo({
        broadcaster: 'reverb',
        key: appKey,
        wsHost: host,
        wsPort: port ?? 8080,
        wssPort: port ?? 443,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
    });
}

/**
 * Get or create the Echo instance
 */
export function getEcho(): Echo<'reverb'> | null {
    if (!window.Echo) {
        const instance = createEchoInstance();
        if (instance) {
            window.Echo = instance;
        }
    }
    return window.Echo ?? null;
}

/**
 * Check if Echo is available
 */
export function isEchoAvailable(): boolean {
    return getEcho() !== null;
}

export default getEcho;
