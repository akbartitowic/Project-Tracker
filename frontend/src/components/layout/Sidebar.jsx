import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { LayoutDashboard, PlusCircle, KanbanSquare, Users, Shield, Clock, BarChart3, Settings, Moon, Sun, Activity } from "lucide-react";

export default function Sidebar() {
    const { toggleTheme } = useTheme();

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-colors duration-200">
            <div className="p-6 flex items-center gap-3">
                <div className="bg-primary size-10 rounded-lg flex items-center justify-center text-white">
                    <Activity className="size-6" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight">ExecuTrack</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Software Management</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                <NavLink to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <LayoutDashboard className="size-5" />
                    <span className="text-sm">Dashboard</span>
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
                <NavLink to="/users"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Users className="size-5" />
                    <span className="text-sm">Team & Users</span>
                </NavLink>
                <NavLink to="/project-roles"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Shield className="size-5" />
                    <span className="text-sm">Project Roles</span>
                </NavLink>
                <NavLink to="/manhours"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Clock className="size-5" />
                    <span className="text-sm">Top Up Manhours</span>
                </NavLink>
                <NavLink to="/reports"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <BarChart3 className="size-5" />
                    <span className="text-sm">Reports</span>
                </NavLink>
            </nav>

            <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
                <a href="#"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Settings className="size-5" />
                    <span className="text-sm">Settings</span>
                </a>
                <div
                    className="mt-4 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-slate-200 bg-cover bg-center"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC14XLFiHXKk2Dsi0Mq7fhjJdLzE4_kfqPEOaKfRFu9EEvLtW-e4eADUiusfhFuyMAnkVR5LqSUNypu-0w_19s0ifFkuIhJ_fyRwSYWsAaDcgO-_K4BKfmp3Yjo1b9ek-kDxxj0SZ3b4Pwcyhu-u99S6QUf-zKgusL7YLX78OjW119yK2Tg_0WAxpZAoO6_DbGCnkDXoTLBuw2lIk3EsX6z09xFqWsjx_9lJ26685z-IWYD5Rr8bEVTF1bnO4qIsbYZmP2K7aFzPIM')" }}>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">Alex Henderson</p>
                            <p className="text-[10px] text-slate-500 truncate">CTO & Founder</p>
                        </div>
                    </div>
                    <button onClick={toggleTheme}
                        className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Toggle Dark/Light Mode">
                        <Moon className="size-5 dark:hidden block" />
                        <Sun className="size-5 hidden dark:block text-yellow-500" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
