import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, PlusCircle, KanbanSquare, Users, Shield, BarChart3, Settings, Moon, Sun,
    Activity, Wallet, Tag, Lock, LogOut, User, ClipboardList, FileText, PieChart, ClipboardCheck,
    Building2, Handshake, Layers, Plug, Cable, Gauge, Star, LayoutGrid, HelpCircle,
} from "lucide-react";
import AppLogo from '../AppLogo';
import { hasPermission, getModuleSortOrder } from '../../utils/permissions';
import { cn } from '@/lib/utils';

/** Maps the `icon` string stored in `menu_items` to its Lucide component. */
const ICONS = {
    LayoutDashboard, PlusCircle, KanbanSquare, Users, Shield, BarChart3, Settings,
    Activity, Wallet, Tag, Lock, User, ClipboardList, FileText, PieChart, ClipboardCheck,
    Building2, Handshake, Layers, Plug, Cable, Gauge, Star, LayoutGrid,
};

/** Sidebar section header display order — not part of `menu_items` data since it's a fixed, stable taxonomy. */
const SECTION_ORDER = ['Bisnis', 'Operation', 'Report', 'Finance', 'API Monitoring', 'User Management', 'System Settings'];

const navLinkClass = (isActive, variant = 'primary') => cn(
    'flex items-center gap-3 rounded-lg transition-colors',
    variant === 'sub' ? 'px-6 py-2' : 'px-3 py-2.5',
    isActive
        ? 'bg-primary/10 text-primary font-medium'
        : variant === 'sub'
            ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
);

function SidebarNavItem({ item }) {
    const Icon = ICONS[item.icon] || HelpCircle;
    return (
        <NavLink
            to={item.path}
            title={item.label}
            className={({ isActive }) => navLinkClass(isActive, item.variant)}
        >
            <Icon className={item.variant === 'sub' ? 'size-4' : 'size-5'} />
            <span className={item.variant === 'sub' ? 'text-xs' : 'text-sm'}>{item.label}</span>
        </NavLink>
    );
}

/** Visible items for a section, sorted by their permission's module `sort_order` (editable from the Modules admin screen), then by the item's own `sort_order` as a tiebreaker (e.g. the two Integrasi items share one module). */
function visibleSortedItems(items, user) {
    return items
        .filter((item) => hasPermission(user, item.permission_slug))
        .slice()
        .sort((a, b) =>
            getModuleSortOrder(user, a.permission_slug) - getModuleSortOrder(user, b.permission_slug)
            || a.sort_order - b.sort_order
        );
}

export default function Sidebar({ mobileOpen = false }) {
    const { toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const menuItems = user?.menu_items || [];

    const dashboardItem = menuItems.find((item) => !item.section);
    const sections = SECTION_ORDER
        .map((label) => ({
            key: label,
            label,
            items: visibleSortedItems(menuItems.filter((item) => item.section === label), user),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <aside
            className={cn(
                'fixed inset-y-0 left-0 z-50 flex h-screen w-64 max-w-[min(18rem,88vw)] flex-col overflow-y-auto',
                'border-r border-slate-200 bg-white transition-transform duration-200 ease-out',
                'dark:border-slate-800 dark:bg-slate-900',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
                'lg:relative lg:inset-auto lg:z-auto lg:max-w-none lg:shrink-0 lg:translate-x-0',
            )}
        >
            <div className="p-6 flex items-center gap-3">
                <div className="size-11 rounded-xl flex items-center justify-center p-1.5 bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800">
                    <AppLogo alt="Application logo" className="size-full" />
                </div>
                <div>
                    <h1 className="font-extrabold text-xl leading-tight tracking-tight text-primary dark:text-white">Noohtify</h1>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Software Management</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {dashboardItem && hasPermission(user, dashboardItem.permission_slug) && (
                    <SidebarNavItem item={dashboardItem} />
                )}

                {sections.map((section) => (
                    <div key={section.key}>
                        <div className="pt-4 pb-2 px-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{section.label}</p>
                        </div>
                        {section.items.map((item) => (
                            <SidebarNavItem key={item.path} item={item} />
                        ))}
                    </div>
                ))}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
                <div className="mt-4 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 transition-colors duration-200 overflow-hidden text-ellipsis">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-700 dark:text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-tighter">{user?.role?.name || 'Member'}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors shrink-0" title="Logout">
                        <LogOut className="size-4" />
                    </button>
                </div>

                <div className="mt-2 flex items-center justify-between p-2">
                    <span className="text-xs font-medium text-slate-400">Dark Mode</span>
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm">
                        <Sun className="size-4 text-amber-500 dark:hidden" />
                        <Moon className="size-4 text-slate-300 hidden dark:block" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
