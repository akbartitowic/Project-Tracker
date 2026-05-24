import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Rocket, Wallet, Users, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminUser } from '../utils/permissions';

const getMethodologyLabel = (value) => {
    const normalized = String(value || '').toLowerCase();
    return normalized.includes('waterfall') ? 'Waterfall' : 'Scrum';
};

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        doneProjects: 0,
        scrumProjects: 0,
        waterfallProjects: 0,
        totalHours: 0,
        activeTasks: 0,
        totalRevenue: 0,
        totalMargin: 0,
        marginPercentage: 0
    });

    const [recentLogs, setRecentLogs] = useState([]);
    const [revenueTrend, setRevenueTrend] = useState([]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const [efficiencyData, setEfficiencyData] = useState([]);
    const [dashboardMode, setDashboardMode] = useState('admin');
    const [memberStats, setMemberStats] = useState({
        totalProjectsHandled: 0,
        activeTasks: 0,
        taskStatusCounts: {
            'To Do': 0,
            'In Progress': 0,
            Review: 0,
            Reopen: 0,
            Done: 0,
        },
    });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetchAPI('/dashboard/overview');
                if (res.mode === 'member') {
                    setDashboardMode('member');
                    if (res.userStats) setMemberStats(res.userStats);
                    return;
                }
                setDashboardMode('admin');
                if (res.stats) setStats(res.stats);
                if (res.efficiency) setEfficiencyData(res.efficiency.slice(0, 5));
                if (res.recentLogs) setRecentLogs(res.recentLogs);
                if (res.revenueTrend) setRevenueTrend(res.revenueTrend);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            }
        };
        loadStats();
    }, []);

    const shouldShowMemberDashboard = dashboardMode === 'member' && !isAdminUser(user);
    const commonSummary = shouldShowMemberDashboard
        ? memberStats
        : {
            totalProjectsHandled: stats.totalProjects || 0,
            activeTasks: stats.activeTasks || 0,
            taskStatusCounts: stats.taskStatusCounts || {
                'To Do': 0,
                'In Progress': 0,
                Review: 0,
                Reopen: 0,
                Done: 0,
            },
        };

    const taskStatusSection = (
        <section>
            <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Total Task per Status</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {['To Do', 'In Progress', 'Review', 'Reopen', 'Done'].map((status) => (
                    <Card key={status} className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{status}</p>
                            <p className="text-2xl mt-2 font-bold tabular-nums text-slate-900 dark:text-white">
                                {commonSummary.taskStatusCounts?.[status] || 0}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );

    const summarySection = shouldShowMemberDashboard ? (
        <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Project yang Di-handle</p>
                        <h3 className="text-3xl font-bold mt-1 tabular-nums text-slate-900 dark:text-white">{commonSummary.totalProjectsHandled}</h3>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Task yang Masih Aktif</p>
                        <h3 className="text-3xl font-bold mt-1 tabular-nums text-slate-900 dark:text-white">{commonSummary.activeTasks}</h3>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm sm:col-span-2 lg:col-span-1">
                    <CardContent className="p-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Task Selesai</p>
                        <h3 className="text-3xl font-bold mt-1 tabular-nums text-slate-900 dark:text-white">{commonSummary.taskStatusCounts?.Done || 0}</h3>
                    </CardContent>
                </Card>
            </section>
            {taskStatusSection}
        </>
    ) : (
        taskStatusSection
    );

    if (shouldShowMemberDashboard) {
        return <div className="space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">{summarySection}</div>;
    }

    return (
        <div className="space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-3 mb-4">
                            <Rocket className="text-orange-500 bg-orange-500/10 p-2 rounded-lg size-10 shrink-0" />
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded shrink-0">Active</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Projects</p>
                        <h3 className="text-3xl font-bold mt-1 tabular-nums text-slate-900 dark:text-white">{stats.activeProjects}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Done: {stats.doneProjects} · Total: {stats.totalProjects}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2 xl:col-span-1">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-3 mb-4">
                            <Wallet className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg size-10 shrink-0" />
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded shrink-0">
                                {Number(stats.marginPercentage || 0).toFixed(2)}%
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Agency Net Margin</p>
                        <h3 className="text-xl sm:text-2xl font-bold mt-1 tabular-nums text-emerald-600 dark:text-emerald-400 break-words leading-tight">
                            {formatCurrency(stats.totalMargin)}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-2">
                            Gross revenue {formatCurrency(stats.totalRevenue)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-3 mb-4">
                            <Users className="text-purple-500 bg-purple-500/10 p-2 rounded-lg size-10 shrink-0" />
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded shrink-0">In Progress</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Tasks</p>
                        <h3 className="text-3xl font-bold mt-1 tabular-nums text-slate-900 dark:text-white">{stats.activeTasks}</h3>
                    </CardContent>
                </Card>
            </section>

            {summarySection}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-900/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Scrum Projects</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">Agile</span>
                        </div>
                        <p className="text-3xl mt-2 font-bold text-slate-900 dark:text-white">{stats.scrumProjects}</p>
                        <p className="text-xs text-slate-500 mt-1">Projects with Scrum / Agile methodology.</p>
                    </CardContent>
                </Card>
                <Card className="border-violet-100 dark:border-violet-900/30 bg-violet-50/40 dark:bg-violet-900/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Waterfall Projects</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-bold">Fixed Scope</span>
                        </div>
                        <p className="text-3xl mt-2 font-bold text-slate-900 dark:text-white">{stats.waterfallProjects}</p>
                        <p className="text-xs text-slate-500 mt-1">Projects with Waterfall methodology.</p>
                    </CardContent>
                </Card>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Monthly Financial Performance</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Billed Value vs Project Costs</p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-tight">
                                <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-primary/30"></span>
                                    <span className="text-slate-400">Project Costs</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-slate-400">Total Billed</span>
                                </div>
                            </div>
                        </div>
                        <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
                        <div className="flex min-w-[520px] items-end justify-around gap-4 border-b border-slate-100 px-4 pb-2 h-64">
                            {revenueTrend.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 italic">Financial trend loading...</div>
                            ) : (
                                revenueTrend.map((item, idx) => {
                                    const maxVal = Math.max(...revenueTrend.map(t => Math.max(t.billed, t.cost))) || 1;
                                    const billedHeight = (item.billed / maxVal) * 100;
                                    const costHeight = (item.cost / maxVal) * 100;
                                    
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                            <div className="w-full flex justify-center gap-1 h-full items-end pb-1">
                                                <div className="w-3 bg-primary/40 rounded-t transition-all group-hover:bg-primary/60" 
                                                     style={{ height: `${costHeight}%` }}
                                                     title={`Costs: ${formatCurrency(item.cost)}`}></div>
                                                <div className="w-3 bg-accent rounded-t transition-all group-hover:bg-orange-600" 
                                                     style={{ height: `${billedHeight}%` }}
                                                     title={`Billed: ${formatCurrency(item.billed)}`}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{item.month.split('-')[1]}/{item.month.split('-')[0].slice(2)}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col">
                        <div className="mb-6">
                            <h4 className="font-bold text-lg text-rose-600 flex items-center gap-2">
                                <AlertCircle className="size-5" /> Critical Projects
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Low manhour balance (&lt; 15%)</p>
                        </div>
                        <div className="space-y-4 flex-1">
                            {efficiencyData.filter(p => p.burn_percentage > 85).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm italic">
                                    <p>No critical projects.</p>
                                    <p>All projects healthy.</p>
                                </div>
                            ) : (
                                efficiencyData.filter(p => p.burn_percentage > 85).map((proj, idx) => (
                                    <div key={idx} className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-slate-900 dark:text-rose-100 truncate pr-2">{proj.name}</span>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[10px] font-bold ${proj.burn_percentage > 100 ? 'text-white bg-rose-600' : 'text-rose-700 bg-rose-100 dark:bg-rose-900/40'} px-2 py-0.5 rounded shadow-sm`}>
                                                    {Math.round(proj.burn_percentage)}% Used
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase">
                                                    {getMethodologyLabel(proj.methodology)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-tight">
                                            <Clock className="size-3.5" /> {Math.max(0, proj.estimated_hours - proj.allocated_hours).toFixed(1)}h remaining
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => navigate('/reports')} className="w-full mt-6 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                            View Full Efficiency Report
                        </button>
                    </CardContent>
                </Card>
            </section>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">Recent Manhour Log Updates</h4>
                    <button className="text-primary text-sm font-semibold hover:underline">View All Logs</button>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
                    {recentLogs.length === 0 ? (
                        <div className="w-full text-center py-10 text-slate-400 italic">No manhour activity recorded yet.</div>
                    ) : (
                        recentLogs.map((log) => (
                            <Card key={log.id} className="flex-none w-80 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                            {log.user_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{log.user_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{log.role_name || 'Member'}</p>
                                        </div>
                                        <div className="ml-auto flex flex-col items-end">
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+{log.hours}h</span>
                                            <span className="text-[9px] text-slate-400 mt-1">{new Date(log.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-0.5">Project</span>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.project_name}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                                                "{log.description || 'No description provided.'}"
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
