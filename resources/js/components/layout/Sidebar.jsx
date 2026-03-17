import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, PlusCircle, KanbanSquare, Users, Shield, Clock, BarChart3, Settings, Moon, Sun, Activity, Wallet, Tag, Lock, LogOut, User, ClipboardList } from "lucide-react";

export default function Sidebar() {
    const { toggleTheme } = useTheme();
    const { user, logout } = useAuth();

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-colors duration-200">
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
                <NavLink to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <LayoutDashboard className="size-5" />
                    <span className="text-sm">Dashboard</span>
                </NavLink>
                <NavLink to="/presales"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Activity className="size-5" />
                    <span className="text-sm">Presales</span>
                </NavLink>
                <NavLink to="/create-project"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <PlusCircle className="size-5" />
                    <span className="text-sm">Create Project</span>
                </NavLink>
                <NavLink to="/board"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <KanbanSquare className="size-5" />
                    <span className="text-sm">Project Board</span>
                </NavLink>
                <NavLink to="/reports"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <BarChart3 className="size-5" />
                    <span className="text-sm">Reports</span>
                </NavLink>

                <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Finance</p>
                </div>
                <NavLink to="/finance-monitoring"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Wallet className="size-5" />
                    <span className="text-sm">Monitoring</span>
                </NavLink>
                <NavLink to="/finance-categories"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Tag className="size-5" />
                    <span className="text-sm">Categories</span>
                </NavLink>

                <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Settings</p>
                </div>
                <NavLink to="/users"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Users className="size-5" />
                    <span className="text-sm">Teams & Users</span>
                </NavLink>
                <NavLink to="/roles"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Lock className="size-5" />
                    <span className="text-sm">Access Control</span>
                </NavLink>
                <NavLink to="/project-roles"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Shield className="size-5" />
                    <span className="text-sm">Project Roles</span>
                </NavLink>
                <NavLink to="/system-logs"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <ClipboardList className="size-5" />
                    <span className="text-sm">System Log</span>
                </NavLink>
            </nav>

            <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
                <NavLink to="/profile"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <User className="size-5" />
                    <span className="text-sm">My Profile</span>
                </NavLink>
                <NavLink to="/settings"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Settings className="size-5" />
                    <span className="text-sm">Settings</span>
                </NavLink>

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
