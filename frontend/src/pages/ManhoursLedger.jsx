import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { ChevronRight, Download, Plus, Archive, Clock, Hourglass, TrendingUp, Info, X, Save, Loader2, ArrowLeft, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ManhoursLedger() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);

    const [manhours, setManhours] = useState([]);
    const [stats, setStats] = useState({
        totalLogged: 0,
        entriesTracked: 0,
        latestEntry: '--'
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        hours: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount_idr: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await fetchAPI('/projects');
                if (res.data) {
                    setProjects(res.data.filter(p => p.methodology === 'Agile Scrum'));
                }
            } catch (error) {
                console.error("Failed to load projects", error);
            }
        };
        loadProjects();
    }, []);

    const loadManhours = async (projectId) => {
        try {
            const response = await fetchAPI(`/manhours?project_id=${projectId}`);
            const data = response.data || [];

            let totalHours = 0;
            const mappedData = data.map(log => {
                totalHours += parseFloat(log.hours);
                return {
                    ...log,
                    amountFormatted: log.amount_idr ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(log.amount_idr) : 'Rp 0',
                    dateStr: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                };
            });

            setManhours(mappedData);

            setStats({
                totalLogged: totalHours.toFixed(1),
                entriesTracked: data.length,
                latestEntry: data.length > 0 ? new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'
            });

        } catch (err) {
            console.error("Failed to load manhours", err);
        }
    };

    useEffect(() => {
        if (selectedProject) {
            loadManhours(selectedProject.id);
        }
    }, [selectedProject]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id.replace('manhour-', '')]: value }));
    };

    const handleAddManhours = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await fetchAPI('/manhours', {
                method: 'POST',
                body: JSON.stringify({
                    project_id: selectedProject.id,
                    date: formData.date,
                    hours: formData.hours,
                    amount_idr: formData.amount_idr,
                    description: formData.description
                })
            });

            setIsModalOpen(false);
            setFormData({
                hours: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                amount_idr: ''
            });
            loadManhours(selectedProject.id);
        } catch (err) {
            alert("Failed to add manhours: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!selectedProject) {
        return (
            <div className="flex-1 p-8 overflow-y-auto w-full bg-slate-50/50 dark:bg-background-dark">
                <div className="max-w-[1200px] mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Select Project to Top Up</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Choose an Agile Scrum project to view and manage its manhour logs.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <Card
                                key={project.id}
                                className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all hover:-translate-y-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md"
                                onClick={() => setSelectedProject(project)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                                            <Briefcase className="size-6" />
                                        </div>
                                        <Badge variant="outline" className={
                                            project.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' :
                                                project.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30' :
                                                    'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30'
                                        }>
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{project.name}</h3>
                                    <p className="text-sm font-medium text-slate-500 line-clamp-2">{project.methodology} • {project.budget_status}</p>

                                    {project.total_manhours && (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Archive className="size-4" />
                                            <span>Ledger Tracked</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {projects.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                No projects found. Create one first!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full transition-colors duration-200">
            <div className="flex flex-1 justify-center py-8">
                <div className="w-full max-w-[1200px] px-4 md:px-6 flex flex-col gap-6">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap gap-2 items-center text-sm">
                        <span className="text-slate-500 dark:text-[#9da6b9] cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedProject(null)}>Projects</span>
                        <ChevronRight className="size-4 text-slate-400 dark:text-[#555e6f]" />
                        <span className="text-slate-500 dark:text-[#9da6b9] cursor-pointer transition-colors max-w-[200px] truncate">{selectedProject.name}</span>
                        <ChevronRight className="size-4 text-slate-400 dark:text-[#555e6f]" />
                        <span className="text-slate-900 dark:text-white font-medium">Top Up Manhours</span>
                    </div>

                    {/* Page Title & Actions */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="-ml-3 shrink-0" onClick={() => setSelectedProject(null)}>
                                    <ArrowLeft className="size-5 text-slate-500" />
                                </Button>
                                <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Top Up Manhours</h1>
                            </div>
                            <p className="text-slate-500 dark:text-[#9da6b9] text-base font-normal">Track and manage allocated hours for {selectedProject.name}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="gap-2 h-10 px-4">
                                <Download className="size-5" />
                                <span>Export CSV</span>
                            </Button>
                            <Button className="gap-2 h-10 px-4 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95" onClick={() => setIsModalOpen(true)}>
                                <Plus className="size-5" />
                                <span>Top-Up Manhours</span>
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white dark:bg-[#1e232e]">
                            <CardContent className="p-6 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium uppercase tracking-wider">Total Logged</p>
                                    <Archive className="text-primary bg-primary/10 p-1 rounded-md size-7" />
                                </div>
                                <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                                    <span>{stats.totalLogged}</span> <span className="text-lg font-normal text-slate-400">hrs</span>
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-[#1e232e]">
                            <CardContent className="p-6 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium uppercase tracking-wider">Latest Entry</p>
                                    <Clock className="text-orange-500 bg-orange-500/10 p-1 rounded-md size-7" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                                        <span>{stats.latestEntry}</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-[#1e232e]">
                            <CardContent className="p-6 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium uppercase tracking-wider">Entries Tracked</p>
                                    <Hourglass className="text-green-500 bg-green-500/10 p-1 rounded-md size-7" />
                                </div>
                                <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                                    <span>{stats.entriesTracked}</span>
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-[#1e232e]">
                            <CardContent className="p-6 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium uppercase tracking-wider">Projected Overage</p>
                                    <TrendingUp className="text-red-500 bg-red-500/10 p-1 rounded-md size-7" />
                                </div>
                                <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">0 <span className="text-lg font-normal text-slate-400">hrs</span></p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">Based on current velocity</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center pt-2">
                        <div className="flex items-center gap-2 bg-white dark:bg-[#282e39] border border-slate-200 dark:border-slate-700 rounded-lg p-1 transition-colors duration-200">
                            <button className="px-3 py-1.5 rounded text-sm font-medium bg-slate-100 dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm transition-colors">All Time</button>
                            <button className="px-3 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">This Month</button>
                            <button className="px-3 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Last Month</button>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="w-full bg-white dark:bg-[#1e232e] border border-slate-200 dark:border-[#3b4354] rounded-xl overflow-hidden shadow-sm transition-colors duration-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-[#282e39] border-b border-slate-200 dark:border-[#3b4354] transition-colors duration-200">
                                        <th className="p-4 pl-6 text-xs font-semibold tracking-wide text-slate-500 dark:text-[#9da6b9] uppercase">Date</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-slate-500 dark:text-[#9da6b9] uppercase">Activity Type</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-slate-500 dark:text-[#9da6b9] uppercase w-1/3">Description / Note</th>
                                        <th className="p-4 text-xs font-semibold tracking-wide text-slate-500 dark:text-[#9da6b9] uppercase">Amount (IDR)</th>
                                        <th className="p-4 pr-6 text-xs font-semibold tracking-wide text-slate-500 dark:text-[#9da6b9] uppercase text-right">Hours Added</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-[#3b4354]">
                                    {manhours.map(log => (
                                        <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-[#252b36] transition-colors">
                                            <td className="p-4 pl-6 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{log.dateStr}</td>
                                            <td className="p-4 text-sm">
                                                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/60">
                                                    Tracked
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{log.description}</td>
                                            <td className="p-4">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{log.amountFormatted}</span>
                                            </td>
                                            <td className={`p-4 pr-6 text-sm font-bold ${log.hours >= 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'} text-right`}>
                                                {log.hours >= 0 ? '+' : ''}{log.hours}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Top-Up Manhours</DialogTitle>
                    </DialogHeader>
                    <form className="flex flex-col gap-5 py-4" onSubmit={handleAddManhours}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cost Amount (IDR)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                                <Input type="number" id="manhour-amount_idr" value={formData.amount_idr} onChange={handleInputChange} placeholder="0" min="0" required className="pl-9" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Hours to Add</label>
                            <div className="relative">
                                <Input type="number" id="manhour-hours" value={formData.hours} onChange={handleInputChange} placeholder="e.g. 100" required step="0.5" className="pr-12" />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">hrs</div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                            <Input type="date" id="manhour-date" value={formData.date} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Note / Reason</label>
                            <textarea id="manhour-description" value={formData.description} onChange={handleInputChange} required
                                className="w-full bg-transparent border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[100px] resize-none"
                                placeholder="Enter a description for this addition..."></textarea>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg text-sm">
                            <Info className="size-5 shrink-0" />
                            <p>This will increase the total tracked hours immediately.</p>
                        </div>
                        <DialogFooter className="pt-2 flex gap-3 justify-end">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting} className="shadow-lg shadow-blue-500/20">
                                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Confirm Addition
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
