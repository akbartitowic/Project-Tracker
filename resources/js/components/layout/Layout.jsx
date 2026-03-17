import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
    const location = useLocation();

    // Determine header title based on route
    const getHeaderTitle = (pathname) => {
        if (pathname === '/') return 'Executive Overview';
        if (pathname === '/create-project') return 'Create New Project';
        if (pathname === '/board') return 'Project Board';
        if (pathname === '/users') return 'Team & Users';
        if (pathname === '/manhours') return 'Manhours Ledger';
        if (pathname === '/reports') return 'Reports';
        return 'Overview';
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Make sidebar sticky or fixed on desktop layout */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Header title={getHeaderTitle(location.pathname)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
