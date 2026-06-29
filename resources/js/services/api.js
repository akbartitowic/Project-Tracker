function normalizeApiBase() {
    const raw =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';
    const s = String(raw).trim();
    if (!s) {
        return '/api';
    }
    return s.replace(/\/$/, '');
}

function normalizeEndpoint(endpoint) {
    const ep = String(endpoint ?? '').trim();
    if (!ep) {
        throw new Error('fetchAPI: endpoint is required');
    }
    // Always root-absolute so fetch never resolves relative to /sales/pitch/...
    return ep.startsWith('/') ? ep : `/${ep}`;
}

/** Base URL for API (no trailing slash), e.g. `/api` or full URL from VITE_API_URL */
export const API_BASE = normalizeApiBase();

export const getApiUrl = () => normalizeApiBase();

export async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    const base = normalizeApiBase();
    const path = normalizeEndpoint(endpoint);
    const url = /^https?:\/\//i.test(base) ? `${base}${path}` : `${base}${path}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });

        if (response.status === 401 && !endpoint.includes('/login')) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let message = errorData.message ?? errorData.error;
            if (message != null && typeof message === 'object') {
                message = JSON.stringify(message);
            }
            if (!message && errorData.errors && typeof errorData.errors === 'object') {
                message = Object.values(errorData.errors)
                    .flat()
                    .filter(Boolean)
                    .join(' ');
            }
            if (!message) {
                message = `API error: ${response.status} ${response.statusText}`;
            }
            if (
                response.status === 405 &&
                typeof message === 'string' &&
                message.includes('method is not supported')
            ) {
                message +=
                    ' Pastikan permintaan ke URL API dengan awalan /api (bukan path halaman React seperti /sales/pitch/...).';
            }
            throw new Error(message);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
