import { createContext, useContext, useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetchAPI('/me');
            if (res.status === 'success') {
                setUser(res.user);
            }
        } catch (err) {
            console.error("Failed to fetch user", err);
            localStorage.removeItem('auth_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await fetchAPI('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (res.status === 'success') {
            localStorage.setItem('auth_token', res.access_token);
            setUser(res.user);
            return { success: true };
        }
        return { success: false, message: res.message };
    };

    const signup = async (userData) => {
        const res = await fetchAPI('/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (res.status === 'success') {
            localStorage.setItem('auth_token', res.access_token);
            setUser(res.user);
            return { success: true };
        }
        return { success: false, message: res.message };
    };

    const logout = async () => {
        try {
            await fetchAPI('/logout', { method: 'POST' });
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            localStorage.removeItem('auth_token');
            setUser(null);
            window.location.href = '/login';
        }
    };

    const updateProfile = async (profileData) => {
        const res = await fetchAPI('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        if (res.status === 'success') {
            setUser(res.user);
            return { success: true, message: res.message };
        }
        return { success: false, message: res.message };
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
