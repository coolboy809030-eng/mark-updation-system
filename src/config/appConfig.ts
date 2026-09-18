/**
 * Global Application Configuration & Permanent Endpoints
 * 
 * Sets the permanent Google Apps Script Web App URL and central defaults.
 * Users & teachers do NOT need to manually paste URLs across devices.
 */

// Permanent Google Apps Script Web App URL for Peace International School
// Can be customized or loaded from environment variables (e.g. VITE_GAS_URL)
export const PERMANENT_GOOGLE_APPS_SCRIPT_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GAS_URL)
    ? String((import.meta as any).env.VITE_GAS_URL).trim()
    : 'https://script.google.com/macros/s/AKfycbwYpfYa3Hw3P7P7cOxAVknPHszmGDtRlfZO_U_-iyjT11gnRwuppqNgj6WHlDBUD79G_Q/exec';

/**
 * Returns the effective Google Apps Script Web App URL,
 * falling back to the permanent configuration if the saved URL is empty or a placeholder.
 */
export function getEffectiveGasUrl(customUrl?: string | null): string {
  const clean = (customUrl || '').trim();
  if (clean && !clean.includes('PASTE_YOUR') && clean.startsWith('http')) {
    return clean;
  }
  return PERMANENT_GOOGLE_APPS_SCRIPT_URL;
}
