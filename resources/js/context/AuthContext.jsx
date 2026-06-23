import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../services/api';

const AuthContext = createContext();

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || '';

/** Returns the org slug if currently on a tenant subdomain, otherwise null */
function getCurrentTenantSlug() {
    if (!APP_DOMAIN) return localStorage.getItem('org_slug') || null;
    const host = window.location.hostname;
    if (host.endsWith('.' + APP_DOMAIN)) {
        return host.slice(0, host.length - APP_DOMAIN.length - 1);
    }
    return null;
}

/** Redirect to org workspace */
function redirectToOrg(slug) {
    if (APP_DOMAIN) {
        window.location.href = `${window.location.protocol}//${slug}.${APP_DOMAIN}`;
    } else {
        localStorage.setItem('org_slug', slug);
        window.location.href = '/';
    }
}

/** Redirect based on the user's org list (called after login/signup on main domain) */
function handleOrgRedirect(organizations) {
    if (getCurrentTenantSlug()) return; // already on tenant subdomain
    if (!organizations || organizations.length === 0) {
        window.location.href = '/create-org';
    } else if (organizations.length === 1) {
        redirectToOrg(organizations[0].slug);
    } else {
        window.location.href = '/select-org';
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetchAPI('/me');
            if (res.status === 'success') {
                setUser(res.user);
                setOrganizations(res.organizations ?? []);
            }
        } catch (err) {
            console.error('Failed to fetch user', err);
            localStorage.removeItem('auth_token');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [fetchUser]);

    const refreshOrganizations = useCallback(async () => {
        try {
            const res = await fetchAPI('/me');
            if (res.status === 'success') {
                setOrganizations(res.organizations ?? []);
            }
        } catch {}
    }, []);

    const login = async (email, password) => {
        const res = await fetchAPI('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (res.status === 'success') {
            localStorage.setItem('auth_token', res.access_token);
            setUser(res.user);
            setOrganizations(res.organizations ?? []);
            return { success: true, user: res.user, organizations: res.organizations ?? [] };
        }
        return { success: false, message: res.message };
    };

    const signup = async (userData) => {
        const res = await fetchAPI('/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        if (res.status === 'success') {
            localStorage.setItem('auth_token', res.access_token);
            setUser(res.user);
            setOrganizations(res.organizations ?? []);
            return { success: true, organizations: res.organizations ?? [] };
        }
        return { success: false, message: res.message };
    };

    const logout = async () => {
        try {
            await fetchAPI('/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout error', err);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('org_slug');
            setUser(null);
            setOrganizations([]);
            window.location.href = '/login';
        }
    };

    const updateProfile = async (profileData) => {
        const res = await fetchAPI('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });

        if (res.status === 'success') {
            setUser(res.user);
            return { success: true, message: res.message };
        }
        return { success: false, message: res.message };
    };

    return (
        <AuthContext.Provider value={{
            user,
            organizations,
            loading,
            login,
            signup,
            logout,
            updateProfile,
            refreshOrganizations,
            getCurrentTenantSlug,
            handleOrgRedirect,
            redirectToOrg,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
