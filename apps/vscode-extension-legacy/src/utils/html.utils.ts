/**
 * HTML utility functions
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Create a safe HTML attribute value
 */
export function escapeAttribute(value: string): string {
    return escapeHtml(value).replace(/\n/g, '&#10;');
}
