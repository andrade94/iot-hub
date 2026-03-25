/**
 * Shared device utilities
 */

/**
 * Check if a device is online based on its last reading timestamp.
 * A device is considered online if it reported within the last 15 minutes.
 */
export function isDeviceOnline(lastReadingAt: string | null | undefined): boolean {
    if (!lastReadingAt) return false;
    const diff = Date.now() - new Date(lastReadingAt).getTime();
    return diff < 15 * 60 * 1000; // 15 minutes
}
