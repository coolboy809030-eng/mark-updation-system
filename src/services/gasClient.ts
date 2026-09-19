import { getEffectiveGasUrl } from '../config/appConfig';

export interface GasApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

export interface GasRequestOptions {
  providedUrl?: string;
  timeoutMs?: number;
  mode?: RequestMode;
}

/**
 * Robust, centralized HTTP GET requester for Google Apps Script Web Apps
 */
export async function gasGet<T = any>(
  action: string,
  extraParams?: Record<string, string | number | boolean | undefined>,
  options?: GasRequestOptions
): Promise<GasApiResponse<T>> {
  const scriptUrl = getEffectiveGasUrl(options?.providedUrl);

  if (!scriptUrl || scriptUrl.includes('PASTE_YOUR')) {
    return {
      success: false,
      message: 'Google Apps Script Web App URL is not configured.'
    };
  }

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('timestamp', String(Date.now()));

    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined) {
          url.searchParams.set(k, String(v));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: options?.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const isSuccess = Boolean(data && (data.status === 'success' || data.success === true));

    return {
      success: isSuccess,
      data,
      message: data?.message || (isSuccess ? 'Request succeeded' : 'Request returned an unsuccessful status'),
      ...data
    };
  } catch (err: any) {
    console.warn(`[gasGet:${action}] Request failed:`, err?.message || err);
    return {
      success: false,
      message: err?.message || 'Network error while contacting Google Apps Script.'
    };
  }
}

/**
 * Robust, centralized HTTP POST requester for Google Apps Script Web Apps
 * Uses text/plain to avoid browser CORS preflight (OPTIONS) issues with GAS Web Apps.
 */
export async function gasPost<T = any>(
  action: string,
  payload: Record<string, any>,
  options?: GasRequestOptions
): Promise<GasApiResponse<T>> {
  const scriptUrl = getEffectiveGasUrl(options?.providedUrl);

  if (!scriptUrl || scriptUrl.includes('PASTE_YOUR')) {
    return {
      success: false,
      message: 'Google Apps Script Web App URL is not configured.'
    };
  }

  const bodyData = {
    action,
    ...payload,
    timestamp: new Date().toISOString()
  };

  try {
    const isNoCors = options?.mode === 'no-cors';
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: options?.mode,
      headers: {
        // text/plain prevents CORS preflight issues on standard Google Apps Script Web App endpoints
        'Content-Type': isNoCors ? 'application/json' : 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyData),
      signal: options?.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined
    });

    if (isNoCors) {
      return {
        success: true,
        message: `Queued ${action} to Google Sheet.`
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const isSuccess = Boolean(data && (data.status === 'success' || data.success === true));

    return {
      success: isSuccess,
      data,
      message: data?.message || (isSuccess ? 'Saved successfully to Google Sheet.' : 'Google Sheet returned an error.'),
      ...data
    };
  } catch (err: any) {
    console.error(`[gasPost:${action}] Error:`, err);
    return {
      success: false,
      message: `Failed to post to Google Sheet: ${err?.message || 'Network error'}`
    };
  }
}
