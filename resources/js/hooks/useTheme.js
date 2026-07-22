import { useEffect } from 'react';

// Centralize theme toggle logic
export function useTheme() {
    useEffect(() => {
        const initTheme = () => {
            // Default to light regardless of OS preference — dark mode only applies
            // once the user explicitly picks it via the sidebar toggle.
            if (localStorage.getItem('color-theme') === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            }
        };
        initTheme();
    }, []);

    const toggleTheme = () => {
        if (localStorage.getItem('color-theme')) {
            if (localStorage.getItem('color-theme') === 'light') {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            }
        } else {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        }
    };

    return { toggleTheme };
}
