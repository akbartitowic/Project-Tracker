import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
    const location = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    // Determine header title based on route
    const getHeaderTitle = (pathname) => {
        if (pathname === '/') return 'Executive Overview';
        if (pathname === '/create-project') return 'List Project';
        if (pathname === '/board') return 'Project Board';
        if (pathname === '/users') return 'Team & Users';
        if (pathname === '/manhours') return 'Manhours Ledger';
        if (pathname === '/reports') return 'Reports';
        if (pathname === '/presales-companies') return 'Presales - List Company';
        if (pathname === '/presales-project-categories') return 'Presales - Category Company';
        if (pathname === '/finance-realization-report') return 'Finance - Realization Report';
        return 'Overview';
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {mobileNavOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
                    aria-label="Close navigation menu"
                    onClick={() => setMobileNavOpen(false)}
                />
            )}
            <Sidebar mobileOpen={mobileNavOpen} />

            {/* Main Content Area */}
            <div className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                <Header
                    title={getHeaderTitle(location.pathname)}
                    onMenuClick={() => setMobileNavOpen(true)}
                />
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
