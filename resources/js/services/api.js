export const API_BASE = '/api';
export const getApiUrl = () => API_BASE;

export async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers 
            }
        });

        if (response.status === 401 && !endpoint.includes('/login')) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let message = errorData.message;
            if (!message && errorData.errors && typeof errorData.errors === 'object') {
                message = Object.values(errorData.errors)
                    .flat()
                    .filter(Boolean)
                    .join(' ');
            }
            if (!message) {
                message = `API error: ${response.status} ${response.statusText}`;
            }
            throw new Error(message);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
