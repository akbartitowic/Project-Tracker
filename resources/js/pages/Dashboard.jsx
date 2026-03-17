import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Rocket, Timer, Wallet, Users, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalProjects: 0,
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

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [statsRes, effRes, logsRes, trendRes] = await Promise.all([
                    fetchAPI('/stats'),
                    fetchAPI('/reports/efficiency'),
                    fetchAPI('/stats/recent'),
                    fetchAPI('/reports/revenue-trend')
                ]);

                if (statsRes.data) setStats(statsRes.data);
                if (effRes.data) setEfficiencyData(effRes.data.slice(0, 5));
                if (logsRes.data) setRecentLogs(logsRes.data);
                if (trendRes.data) setRevenueTrend(trendRes.data);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            }
        };
        loadStats();
    }, []);

    return (
        <div className="p-8 space-y-8">
            {/* KPI Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Rocket className="text-accent bg-accent/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-bold text-accent bg-accent/5 px-2 py-1 rounded">Active</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Active Projects</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stats.totalProjects}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Wallet className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg size-10" />
                            <div className="text-right">
                                <span className="text-[10px] block font-bold text-slate-400 uppercase">Gross Revenue</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Agency Net Margin</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold mt-1 text-emerald-600">{formatCurrency(stats.totalMargin)}</h3>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.marginPercentage.toFixed(1)}%</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Timer className="text-amber-500 bg-amber-500/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Accumulated</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Recorded Manhours</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stats.totalHours}<span className="text-sm font-normal ml-1">hrs</span></h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Users className="text-purple-500 bg-purple-500/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">In Progress</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Active Tasks</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stats.activeTasks}</h3>
                    </CardContent>
                </Card>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Monthly Financial Performance</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Billed Value vs Project Costs</p>
                            </div>
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-tight">
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
                        <div className="flex items-end justify-around h-64 gap-4 px-4 border-b border-slate-100 pb-2">
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
                                            <span className={`text-[10px] font-bold ${proj.burn_percentage > 100 ? 'text-white bg-rose-600' : 'text-rose-700 bg-rose-100 dark:bg-rose-900/40'} px-2 py-0.5 rounded shadow-sm`}>
                                                {Math.round(proj.burn_percentage)}% Used
                                            </span>
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
