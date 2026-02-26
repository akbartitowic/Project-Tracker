import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Rocket, Timer, Wallet, Users, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProjects: '-',
        totalHours: '-',
        activeTasks: '-'
    });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await fetchAPI('/stats');
                if (response.data) {
                    setStats({
                        totalProjects: response.data.totalProjects || 0,
                        totalHours: (response.data.totalHours || 0) + 'h',
                        activeTasks: response.data.activeTasks || 0
                    });
                }
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            }
        };
        loadStats();
    }, []);

    return (
        <div className="p-8 space-y-8">
            {/* KPI Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Rocket className="text-primary bg-primary/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">+2 this month</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Active Projects</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stats.totalProjects}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Timer className="text-amber-500 bg-amber-500/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Avg 78h/proj</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Recorded Manhours</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stats.totalHours}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Wallet className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">+12% vs last m</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Billable Hours (Monthly)</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">$142,400</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Users className="text-purple-500 bg-purple-500/10 p-2 rounded-lg size-10" />
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">Good Capacity</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Tasks</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stats.activeTasks}</h3>
                    </CardContent>
                </Card>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Estimated vs Actual Manhours</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Top 5 projects by complexity</p>
                            </div>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="size-3 rounded-sm bg-primary/30"></span>
                                    <span className="text-slate-600 dark:text-slate-300">Estimated</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="size-3 rounded-sm bg-primary"></span>
                                    <span className="text-slate-600 dark:text-slate-300">Actual</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium mb-1 text-slate-700 dark:text-slate-200">
                                    <span>Cloud Migration (Enterprise)</span>
                                    <span>840h / 900h</span>
                                </div>
                                <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-primary/40" style={{ width: '90%' }}></div>
                                    <div className="h-full bg-primary" style={{ width: '82%' }}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium mb-1 text-slate-700 dark:text-slate-200">
                                    <span>Mobile Banking Redesign</span>
                                    <span>450h / 500h</span>
                                </div>
                                <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-primary/40" style={{ width: '85%' }}></div>
                                    <div className="h-full bg-primary" style={{ width: '70%' }}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium mb-1 text-slate-700 dark:text-slate-200">
                                    <span>AI Integration Suite</span>
                                    <span>1200h / 1200h</span>
                                </div>
                                <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-primary/40" style={{ width: '100%' }}></div>
                                    <div className="h-full bg-primary" style={{ width: '95%' }}></div>
                                </div>
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
                            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-sm text-slate-900 dark:text-rose-100">Fintech Core Sync</span>
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">8% Left</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <Clock className="size-4" /> 12h remaining
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-sm text-slate-900 dark:text-rose-100">E-commerce API</span>
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">4% Left</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <Clock className="size-4" /> 5h remaining
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                            View All Risks
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
                    {/* Log entry */}
                    <Card className="flex-none w-80">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center"
                                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDXN94WDvOywZEeh3Qp3tMpJ7UOQHiR7dlwRKaDENM5C0CtMmIJvP73iF7f5iIUlv9l15mlw1RzrOPi2MKC7Ld06LVe52w0VPvmxja24tAIVtElJTDPtLmja1l6rjfC2axYYVh2nD7LWEcf7fuHRRV9k_qCRvinkjKGNC5Od7E36A0bz-s44nZ3gZwts2aaDh8x_tfwgxbPMSJlH3rryVaIFOBA7H7j8hnfzKy7UJQlLQ50pCaT0ynQOtmxxun9TfuMZUvzihD2zd4')" }}>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Sarah Connor</p>
                                    <p className="text-[11px] text-slate-500 border border-transparent">Frontend Developer</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Project:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Cloud Migration</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Hours:</span>
                                    <span className="font-bold text-primary">6.5h</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">Implemented the new secure authentication flow and fixed token expiry bugs.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Log entry */}
                    <Card className="flex-none w-80">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center"
                                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCfvkso-j4NWC778yJwOZ-H5DzMaPeH_ca4Acqz6vZN3V-IL-5ZtJu3DteZoVCzMKK9LNebXwHKyDykvExyLBVEulkLVuC2QAIDIDBlpDDUm8IzxN0_CTcH0q4fFh1uifaDhk6pWi5dA8jX5abEQDDYImTGpZ33ZDswMgg4-GZxPgL596oQPyL-EtrfJeJUeLetRy57QZ2VCVD1F_ToUQ8TRpxIcU-pJZxQl2AEdYfpJ2D4cEKFhxaVw7KshhA8U2FK586GMK6VBzc')" }}>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Michael Ross</p>
                                    <p className="text-[11px] text-slate-500 border border-transparent">Backend Engineer</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Project:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">AI Integration</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Hours:</span>
                                    <span className="font-bold text-primary">8.0h</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">Optimizing vector database queries and refining the prompt engineering templates.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
