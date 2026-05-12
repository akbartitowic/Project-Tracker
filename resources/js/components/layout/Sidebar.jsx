import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, PlusCircle, KanbanSquare, Users, Shield, Clock, BarChart3, Settings, Moon, Sun, Activity, Wallet, Tag, Lock, LogOut, User, ClipboardList, FileText, TrendingUp, Building2, Handshake, Layers } from "lucide-react";
import { hasPermission } from '../../utils/permissions';
import { cn } from '@/lib/utils';
import { MENU_NEW_PROJECT } from '../../constants/menuLabels';

export default function Sidebar({ mobileOpen = false }) {
    const { toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const can = (slug) => hasPermission(user, slug);
    const canSeeBisnisSection =
        can('sales.read')
        || can('list_company.read')
        || can('category_project.read')
        || can('sales_category_project.read');
    const canSeeOperationSection =
        can('presales.read') || can('list_project.read') || can('project_board.read');
    const canSeeReportSection =
        can('reports.read') || can('generate_report.read') || can('finance_report.read') || can('realization_report.read');
    const canSeeFinanceSection = can('finance_monitoring.read') || can('finance_categories.read');
    const canSeeUserManagementSection = can('profile.read') || can('teams_users.read') || can('access_control.read');
    const canSeeSystemSection = can('settings.read') || can('project_roles.read') || can('system_log.read');

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
                    <img src="/logo.png" alt="Noohtify Logo" className="size-full object-contain" />
                </div>
                <div>
                    <h1 className="font-extrabold text-xl leading-tight tracking-tight text-primary dark:text-white">Noohtify</h1>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Software Management</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {can('dashboard.read') && <NavLink to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <LayoutDashboard className="size-5" />
                    <span className="text-sm">Dashboard</span>
                </NavLink>}
                {canSeeBisnisSection && <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bisnis</p>
                </div>}
                {canSeeBisnisSection && <>
                    {can('sales.read') && <NavLink to="/sales"
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Handshake className="size-5" />
                        <span className="text-sm">Sales</span>
                    </NavLink>}
                    {can('list_company.read') && <NavLink to="/presales-companies"
                        className={({ isActive }) => `flex items-center gap-3 px-6 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Building2 className="size-4" />
                        <span className="text-xs">List Company</span>
                    </NavLink>}
                    {can('category_project.read') && <NavLink to="/presales-project-categories"
                        className={({ isActive }) => `flex items-center gap-3 px-6 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Tag className="size-4" />
                        <span className="text-xs">Category Company</span>
                    </NavLink>}
                    {can('sales_category_project.read') && <NavLink to="/sales-category-projects"
                        className={({ isActive }) => `flex items-center gap-3 px-6 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Layers className="size-4" />
                        <span className="text-xs">Category Project</span>
                    </NavLink>}
                </>}

                {canSeeOperationSection && <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operation</p>
                </div>}
                {can('presales.read') && <NavLink to="/presales" title={MENU_NEW_PROJECT} aria-label={MENU_NEW_PROJECT}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Activity className="size-5" />
                    <span className="text-sm">{MENU_NEW_PROJECT}</span>
                </NavLink>}
                {can('list_project.read') && <NavLink to="/create-project"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <PlusCircle className="size-5" />
                    <span className="text-sm">List Project</span>
                </NavLink>}
                {can('project_board.read') && <NavLink to="/board"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <KanbanSquare className="size-5" />
                    <span className="text-sm">Project Board</span>
                </NavLink>}

                {canSeeReportSection && <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report</p>
                </div>}
                {can('reports.read') && <NavLink to="/reports"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <BarChart3 className="size-5" />
                    <span className="text-sm">Reports</span>
                </NavLink>}
                {can('generate_report.read') && <NavLink to="/generate-report"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <FileText className="size-5" />
                    <span className="text-sm">Generate Report</span>
                </NavLink>}
                {can('finance_report.read') && <NavLink to="/finance-report"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <TrendingUp className="size-5" />
                    <span className="text-sm">Finance Report</span>
                </NavLink>}
                {can('realization_report.read') && <NavLink to="/finance-realization-report"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <TrendingUp className="size-5" />
                    <span className="text-sm">Realization Report</span>
                </NavLink>}

                {canSeeFinanceSection && <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Finance</p>
                </div>}
                {can('finance_monitoring.read') && <NavLink to="/finance-monitoring"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Wallet className="size-5" />
                    <span className="text-sm">Monitoring</span>
                </NavLink>}
                {can('finance_categories.read') && <NavLink to="/finance-categories"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Tag className="size-5" />
                    <span className="text-sm">Categories</span>
                </NavLink>}

                {canSeeUserManagementSection && <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Management</p>
                </div>}
                {can('profile.read') && <NavLink to="/profile"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <User className="size-5" />
                    <span className="text-sm">My Profile</span>
                </NavLink>}
                {can('teams_users.read') && <NavLink to="/users"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Users className="size-5" />
                    <span className="text-sm">Teams & Users</span>
                </NavLink>}
                {can('access_control.read') && <NavLink to="/roles"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Lock className="size-5" />
                    <span className="text-sm">Access Control</span>
                </NavLink>}

                {canSeeSystemSection && <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Settings</p>
                </div>}
                {can('settings.read') && <NavLink to="/settings"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Settings className="size-5" />
                    <span className="text-sm">Settings</span>
                </NavLink>}
                {can('project_roles.read') && <NavLink to="/project-roles"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Shield className="size-5" />
                    <span className="text-sm">Project Roles</span>
                </NavLink>}
                {can('system_log.read') && <NavLink to="/system-logs"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <ClipboardList className="size-5" />
                    <span className="text-sm">System Log</span>
                </NavLink>}
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
