import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isFreelanceUser } from '../utils/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, KanbanSquare, Clock3, RefreshCcw, CheckCircle2, ListTodo, Activity } from 'lucide-react';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizeMethodology = (value) => (value || '').toLowerCase();

const formatHours = (value) => {
    const num = Number(value || 0);
    return Number.isInteger(num) ? `${num}` : num.toFixed(1);
};

const formatDurationDays = (startDate, status, endDate) => {
    if (!startDate) return '-';
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return '-';

    const end = status === 'Done' && endDate ? new Date(endDate) : new Date();
    if (Number.isNaN(end.getTime())) return '-';

    const diffDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
    return `${diffDays} hari`;
};

export default function ProjectList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await fetchAPI('/projects');
                setProjects(res.data || []);
            } catch (error) {
                console.error('Failed to load projects:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    const filteredProjects = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return projects
            .filter((p) => p.status !== 'Archived')
            .filter((p) => p.status === 'Done' || p.status === 'In Progress' || p.status === 'Planning')
            .filter((p) => {
                if (!keyword) return true;
                return (p.name || '').toLowerCase().includes(keyword);
            });
    }, [projects, searchTerm]);

    const summary = useMemo(() => {
        const total = filteredProjects.length;
        const done = filteredProjects.filter((p) => p.status === 'Done').length;
        const active = total - done;
        const totalTasks = filteredProjects.reduce((acc, p) => acc + Number(p.total_tasks || 0), 0);
        const totalReopen = filteredProjects.reduce((acc, p) => acc + Number(p.reopen_tasks || 0), 0);
        return { total, active, done, totalTasks, totalReopen };
    }, [filteredProjects]);
    const isFreelance = isFreelanceUser(user);

    return (
        <div className="mx-auto max-w-[1400px] p-4 pb-16 sm:p-6 sm:pb-20 lg:p-8">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">List Project</h1>
                <p className="text-slate-500 dark:text-text-secondary">
                    Menampilkan project aktif dan done beserta ringkasan durasi, progress, dan statistik task.
                </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Project</p><p className="text-2xl font-bold">{summary.total}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Active</p><p className="text-2xl font-bold text-blue-600">{summary.active}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Done</p><p className="text-2xl font-bold text-emerald-600">{summary.done}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Task</p><p className="text-2xl font-bold">{summary.totalTasks}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Task Re-open</p><p className="text-2xl font-bold text-amber-600">{summary.totalReopen}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><KanbanSquare className="size-5 text-primary" /> Project Overview</CardTitle>
                            <CardDescription>Ringkasan per project sesuai metodologi Scrum/Waterfall.</CardDescription>
                        </div>
                        <div className="relative w-full md:max-w-xs">
                            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                            <Input
                                className="pl-10"
                                placeholder="Cari project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                                    <th className="text-left font-medium pb-3 px-2">Project</th>
                                    <th className="text-left font-medium pb-3 px-2">Status</th>
                                    <th className="text-left font-medium pb-3 px-2">Berjalan</th>
                                    {!isFreelance && <th className="text-left font-medium pb-3 px-2">Scrum (MH)</th>}
                                    <th className="text-left font-medium pb-3 px-2">Waterfall Progress</th>
                                    <th className="text-right font-medium pb-3 px-2">Total Task</th>
                                    <th className="text-right font-medium pb-3 px-2">Re-open</th>
                                    <th className="text-right font-medium pb-3 px-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {loading ? (
                                    <tr><td colSpan={isFreelance ? "7" : "8"} className="py-10 text-center text-slate-400">Loading projects...</td></tr>
                                ) : filteredProjects.length === 0 ? (
                                    <tr><td colSpan={isFreelance ? "7" : "8"} className="py-10 text-center text-slate-400">Tidak ada project aktif/done.</td></tr>
                                ) : (
                                    filteredProjects.map((project) => {
                                        const methodology = normalizeMethodology(project.methodology);
                                        const isScrum = methodology.includes('scrum') || methodology.includes('agile');
                                        const isWaterfall = methodology.includes('waterfall');

                                        const totalMh = Number(project.total_manhours || 0);
                                        const remainingMh = Number(project.remaining_manhours ?? totalMh);
                                        const waterfallProgress = Number(project.waterfall_progress_percentage || 0);

                                        return (
                                            <tr key={project.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                                                <td className="py-3 px-2">
                                                    <div className="font-semibold text-slate-900 dark:text-white">{project.name}</div>
                                                    <div className="text-[11px] text-slate-500">{project.methodology || '-'}</div>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${project.status === 'Done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                        {project.status === 'Done' ? 'Done' : 'Active'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-slate-700 dark:text-slate-300">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <Clock3 className="size-3.5 text-slate-400" />
                                                        {formatDurationDays(project.start_date, project.status, project.end_date)}
                                                    </div>
                                                </td>
                                                {!isFreelance && (
                                                    <td className="py-3 px-2">
                                                        {isScrum ? (
                                                            <div className="text-slate-700 dark:text-slate-300">
                                                                <div className="inline-flex items-center gap-1.5"><Activity className="size-3.5 text-primary" /> Total {formatHours(totalMh)}h</div>
                                                                <div className="text-[11px] text-slate-500">Sisa {formatHours(remainingMh)}h</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="py-3 px-2">
                                                    {isWaterfall ? (
                                                        <div className="text-slate-700 dark:text-slate-300">
                                                            <div className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /> {formatHours(waterfallProgress)}%</div>
                                                            <div className="text-[11px] text-slate-500">Done ratio task</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-2 text-right font-semibold">{project.total_tasks || 0}</td>
                                                <td className="py-3 px-2 text-right font-semibold text-amber-600">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <RefreshCcw className="size-3.5" />
                                                        {project.reopen_tasks || 0}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate(`/board/${project.id}`)}
                                                        className="inline-flex items-center gap-1.5"
                                                    >
                                                        <ListTodo className="size-3.5" />
                                                        Board
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
