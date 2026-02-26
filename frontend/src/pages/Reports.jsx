import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Search, Calendar, ChevronDown, Download, Briefcase, TrendingUp, Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
    const [stats, setStats] = useState({
        totalProjects: 0,
        activeTasks: 0,
        totalHours: 0
    });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await fetchAPI('/stats');
                if (response.data) {
                    setStats({
                        totalProjects: response.data.totalProjects || 0,
                        activeTasks: response.data.activeTasks || 0,
                        totalHours: response.data.totalHours || 0
                    });
                }
            } catch (err) {
                console.error("Failed to load generic reports stats", err);
            }
        };

        loadStats();
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full transition-colors duration-200 relative">
            {/* Decorative background blur */}
            <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
            <div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-[#1e232e]/70 backdrop-blur-md px-10 py-4 z-10 transition-colors duration-200">
                <div className="flex items-center gap-8">
                    {/* Global Search */}
                    <div className="hidden md:flex relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 min-w-4 size-4 text-slate-500 dark:text-[#9da6b9]" />
                        <Input type="text" placeholder="Search reports..." className="pl-9 h-10 w-full bg-white/50 dark:bg-[#282e39]/50 shadow-sm" />
                    </div>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="gap-2 bg-white/50 dark:bg-slate-800/50">
                            <Calendar className="size-4" />
                            <span>This Month</span>
                            <ChevronDown className="size-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 justify-center py-8 z-0">
                <div className="w-full max-w-[1200px] px-4 md:px-6 flex flex-col gap-8">
                    {/* Page Title */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">Analytics & Reports</h1>
                            <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium">Gain deep insights into agency performance, velocity, and profitability.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button className="gap-2 h-10 px-5 shadow-lg shadow-black/10 dark:shadow-white/10 text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">
                                <Download className="size-5" />
                                <span>Export Full Report</span>
                            </Button>
                        </div>
                    </div>

                    {/* Top KPI Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1 */}
                        <Card className="bg-white/70 dark:bg-slate-900/70 p-6 flex flex-col justify-between shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:-translate-y-1 transition-transform duration-300">
                            <CardContent className="p-0">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-primary/20 rounded-xl">
                                        <Briefcase className="text-primary size-7" />
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                        <TrendingUp className="size-3.5" /> Active
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Projects</p>
                                    <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stats.totalProjects}</h3>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2 */}
                        <Card className="bg-white/70 dark:bg-slate-900/70 p-6 flex flex-col justify-between shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:-translate-y-1 transition-transform duration-300">
                            <CardContent className="p-0">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl">
                                        <TrendingUp className="text-emerald-500 size-7" />
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                        <Users className="size-3.5" /> Team
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Active Tasks</p>
                                    <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stats.activeTasks}</h3>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3 */}
                        <Card className="bg-white/70 dark:bg-slate-900/70 p-6 flex flex-col justify-between shadow-xl shadow-slate-200/20 dark:shadow-black/20 hover:-translate-y-1 transition-transform duration-300">
                            <CardContent className="p-0">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-gradient-to-br from-rose-500/20 to-red-500/20 rounded-xl">
                                        <TrendingUp className="text-rose-500 size-7" />
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800/50">
                                        <Clock className="size-3.5" /> Total
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Logged Manhours</p>
                                    <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stats.totalHours}h</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Chart Section */}
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/20 w-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Project Profitability Trend</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Quarterly comparison of cost vs billed.</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-semibold">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                    <span className="text-slate-700 dark:text-slate-300">Billed Value</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                    <span className="text-slate-700 dark:text-slate-300">Internal Cost</span>
                                </div>
                            </div>
                        </div>

                        {/* CSS Grid "Chart" visualization */}
                        <div className="h-64 w-full flex items-end gap-2 sm:gap-6 pt-4 border-b border-slate-200 dark:border-slate-800 relative z-0 overflow-x-auto no-scrollbar">
                            {/* Y-axis lines */}
                            <div className="absolute inset-0 flex flex-col justify-between hidden sm:flex pointer-events-none">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-full border-t border-dashed border-slate-200 dark:border-slate-800/60 z-[-1] opacity-50"></div>
                                ))}
                            </div>

                            {/* Columns */}
                            {[
                                { month: 'Jan', billed: 65, cost: 40, label: '$45k / $20k' },
                                { month: 'Feb', billed: 72, cost: 48, label: '$52k / $25k' },
                                { month: 'Mar', billed: 68, cost: 35, label: '$48k / $18k' },
                                { month: 'Apr', billed: 85, cost: 55, label: '$60k / $28k' },
                                { month: 'May', billed: 100, cost: 60, label: '$75k / $30k', current: true }
                            ].map((col, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 min-w-[60px] cursor-pointer group">
                                    <div className="w-full flex justify-center items-end gap-1 h-56 relative">
                                        <div className="absolute -top-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 pointers-events-none shadow-xl">
                                            {col.label}
                                        </div>
                                        <div className="w-1/2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-t-sm transition-all duration-300" style={{ height: `${col.cost}%` }}></div>
                                        <div className="w-1/2 bg-primary hover:bg-blue-600 rounded-t-sm transition-all duration-300 shadow-[0_0_15px_rgba(19,91,236,0.5)]" style={{ height: `${col.billed}%` }}></div>
                                    </div>
                                    {col.current ? (
                                        <span className="text-xs font-bold text-primary dark:text-white bg-primary/10 px-2 py-0.5 rounded-full mt-1">{col.month}</span>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{col.month}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Health Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                        {/* Top Performers */}
                        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                            <CardHeader className="p-0">
                                <CardTitle className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="text-emerald-500 size-6 shadow-sm" />
                                    High Efficiency Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-0">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">Cloud Migration (Enterprise)</span>
                                        <span className="text-xs text-slate-500">Under budget by 60 hrs</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-black text-emerald-500">98% Efficient</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">Healthcare API Portal</span>
                                        <span className="text-xs text-slate-500">Under budget by 40 hrs</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-black text-emerald-500">92% Efficient</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Low Performers */}
                        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                            <CardHeader className="p-0">
                                <CardTitle className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <AlertTriangle className="text-rose-500 size-6 shadow-sm" />
                                    Over-budget Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-0">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">Fintech Core Sync</span>
                                        <span className="text-xs text-rose-500">Over budget by 45 hrs</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-black text-rose-500">115% Burned</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">Landing Page Hero Animation</span>
                                        <span className="text-xs text-rose-500">Over budget by 4 hrs</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-black text-rose-500">140% Burned</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
