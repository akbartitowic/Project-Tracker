import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Wallet, Plus, Trash2, PieChart, Info, ArrowUpRight, DollarSign, ListFilter, Search, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function FinanceMonitoring() {
    const [projects, setProjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [projectRolesList, setProjectRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [summary, setSummary] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Allocation Form States
    const [newAllocation, setNewAllocation] = useState({
        category_id: '',
        amount: '',
        description: ''
    });

    // Top Up States
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpData, setTopUpData] = useState({
        additional_quotation: '',
        additional_hours: '',
        description: '',
        category_id: ''
    });

    // Quota Details States
    const [isQuotaDetailsOpen, setIsQuotaDetailsOpen] = useState(false);
    const [quotaBreakdown, setQuotaBreakdown] = useState([]);
    const [loadingQuotas, setLoadingQuotas] = useState(false);

    const loadInitialData = async () => {
        try {
            const [projData, catData, rolesData] = await Promise.all([
                fetchAPI('/projects'),
                fetchAPI('/finance-categories'),
                fetchAPI('/project-roles')
            ]);
            setProjects(projData.data || []);
            setCategories(catData.data || []);
            setProjectRolesList(rolesData.data || []);
        } catch (error) {
            console.error('Failed to load initial finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProjectFinance = async (projectId) => {
        try {
            const res = await fetchAPI(`/projects/${projectId}/finance-summary`);
            setSummary(res.data);
            setSelectedProject(projectId);
        } catch (error) {
            alert('Failed to load project finance details');
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const handleAddAllocation = async (e) => {
        e.preventDefault();
        if (!selectedProject || !newAllocation.category_id || !newAllocation.amount) return;

        try {
            await fetchAPI('/project-allocations', {
                method: 'POST',
                body: JSON.stringify({
                    project_id: selectedProject,
                    ...newAllocation,
                    amount: parseFloat(newAllocation.amount)
                })
            });
            setNewAllocation({ category_id: '', amount: '', description: '' });
            loadProjectFinance(selectedProject);
        } catch (error) {
            alert('Failed to add allocation: ' + error.message);
        }
    };

    const handleDeleteAllocation = async (id) => {
        if (!window.confirm('Delete this allocation?')) return;
        try {
            await fetchAPI(`/project-allocations/${id}`, { method: 'DELETE' });
            loadProjectFinance(selectedProject);
        } catch (error) {
            alert('Failed to delete allocation');
        }
    };

    const handleTopUp = async (e) => {
        e.preventDefault();
        if (!selectedProject || !topUpData.category_id || !topUpData.project_role_id) return;

        try {
            await fetchAPI(`/projects/${selectedProject}/top-up`, {
                method: 'POST',
                body: JSON.stringify({
                    ...topUpData,
                    additional_quotation: parseFloat(topUpData.additional_quotation || 0),
                    additional_hours: parseFloat(topUpData.additional_hours || 0)
                })
            });
            setIsTopUpOpen(false);
            setTopUpData({ additional_quotation: '', additional_hours: '', description: '', category_id: '', project_role_id: '' });
            loadProjectFinance(selectedProject);
            loadInitialData(); // Refresh project list to show updated quotation
        } catch (error) {
            alert('Top up failed: ' + error.message);
        }
    };

    const loadQuotaBreakdown = async () => {
        if (!selectedProject) return;
        setLoadingQuotas(true);
        setIsQuotaDetailsOpen(true);
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/quotas`);
            setQuotaBreakdown(res.data || []);
        } catch (error) {
            console.error('Failed to load quota breakdown:', error);
        } finally {
            setLoadingQuotas(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val);
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const allocationPercentage = summary ? (summary.total_allocated / (summary.quotation_value || 1)) * 100 : 0;

    return (
        <div className="p-8 max-w-[1400px] mx-auto pb-20">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Finance Monitoring</h1>
                <p className="text-slate-500 dark:text-text-secondary">Track project quotation values against cost allocations and margins.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Project List Sidebar */}
                <div className="xl:col-span-4 flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                        <Input
                            placeholder="Search projects..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Card className="flex-1 min-h-[500px]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                <ListFilter className="size-4" /> ACTIVE PROJECTS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex flex-col">
                                {loading ? (
                                    <div className="p-8 text-center text-slate-500">Loading projects...</div>
                                ) : filteredProjects.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">No projects found.</div>
                                ) : (
                                    filteredProjects.map(proj => (
                                        <button
                                            key={proj.id}
                                            onClick={() => loadProjectFinance(proj.id)}
                                            className={`flex flex-col gap-1 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors ${selectedProject === proj.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                        >
                                            <span className="font-bold text-slate-900 dark:text-white">{proj.name}</span>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Quotation Value:</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(proj.quotation_value || 0)}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detail View */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    {!summary ? (
                        <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed border-2">
                            <Wallet className="size-16 text-slate-200 mb-4" />
                            <CardTitle className="text-slate-400">Select a project to see financial details</CardTitle>
                        </Card>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-xs font-bold text-primary uppercase">Quotation Value</CardDescription>
                                        <CardTitle className="text-2xl">{formatCurrency(summary.quotation_value)}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Total Allocated</CardDescription>
                                        <CardTitle className="text-2xl text-amber-700 dark:text-amber-300">{formatCurrency(summary.total_allocated)}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20">
                                    <CardHeader className="pb-2">
                                        <CardDescription className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Remaining Margin</CardDescription>
                                        <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-300">{formatCurrency(summary.remaining_margin)}</CardTitle>
                                    </CardHeader>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <Card className="bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 cursor-pointer hover:border-blue-400 transition-all"
                                     onClick={loadQuotaBreakdown}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardDescription className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Manhour Quota Status</CardDescription>
                                                <CardTitle className="text-xl mt-1">
                                                    {summary.used_hours}/{summary.total_manhours} <span className="text-sm font-normal text-slate-500 uppercase ml-1">Hours</span>
                                                </CardTitle>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Remaining</div>
                                                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                    {summary.remaining_hours} <span className="text-xs font-normal opacity-70">Hrs</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Progress value={(summary.used_hours / (summary.total_manhours || 1)) * 100} className="h-1.5 mt-3" />
                                    </CardHeader>
                                </Card>
                                <Card className="flex items-center justify-center p-6 border-dashed border-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors group"
                                     onClick={() => setIsTopUpOpen(true)}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Plus className="size-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Top Up Quota</h3>
                                            <p className="text-xs text-slate-500">Increase budget and manhour limits.</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <PieChart className="size-5 text-primary" /> Allocation Breakdown
                                        </CardTitle>
                                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                            <Info className="size-3" /> {allocationPercentage.toFixed(1)}% of quotation used
                                        </div>
                                    </div>
                                    <Progress value={allocationPercentage} className="h-2 mt-2" />
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                                                    <th className="text-left font-medium pb-3 px-2">Category</th>
                                                    <th className="text-left font-medium pb-3 px-2">Description</th>
                                                    <th className="text-right font-medium pb-3 px-2 w-32">Amount</th>
                                                    <th className="text-right font-medium pb-3 px-2 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {summary.allocations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="py-8 text-center text-slate-400 italic">No allocations yet. Add one below.</td>
                                                    </tr>
                                                ) : (
                                                    summary.allocations.map(alloc => (
                                                        <tr key={alloc.id} className="group">
                                                            <td className="py-3 px-2">
                                                                <span className="font-medium text-slate-900 dark:text-white">
                                                                    {alloc.category_name}
                                                                    {alloc.is_topup ? <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold uppercase tracking-tight">Top Up</span> : null}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-2 text-slate-500">{alloc.description || '-'}</td>
                                                            <td className={`py-3 px-2 text-right font-medium ${alloc.is_topup ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                                                                {alloc.is_topup ? '+' : ''}{formatCurrency(alloc.amount)}
                                                            </td>
                                                            <td className="py-3 px-2 text-right">
                                                                {!alloc.is_topup && (
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAllocation(alloc.id)}
                                                                        className="size-7 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Add Allocation Form */}
                                    <form onSubmit={handleAddAllocation} className="mt-6 p-4 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Category</span>
                                                <select
                                                    value={newAllocation.category_id}
                                                    onChange={(e) => setNewAllocation({ ...newAllocation, category_id: e.target.value })}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm"
                                                    required
                                                >
                                                    <option value="">Select Category</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-2 md:col-span-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Amount</span>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-3 size-3.5 text-slate-400" />
                                                    <Input
                                                        type="number"
                                                        value={newAllocation.amount}
                                                        onChange={(e) => setNewAllocation({ ...newAllocation, amount: e.target.value })}
                                                        className="pl-9"
                                                        placeholder="0"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Description</span>
                                                <Input
                                                    value={newAllocation.description}
                                                    onChange={(e) => setNewAllocation({ ...newAllocation, description: e.target.value })}
                                                    placeholder="Reason..."
                                                />
                                            </div>
                                            <Button type="submit" className="w-full flex items-center gap-2">
                                                <Plus className="size-4" /> Add Line
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                <ArrowUpRight className="size-4 text-primary" />
                                <span>Note: Allocations are used to track internal and external costs against the formal quotation. This does not affect the actual manhour billing.</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Top Up Modal */}
            {isTopUpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="size-5 text-primary" /> Top Up Project Quota
                            </CardTitle>
                            <CardDescription>Increase the formal quotation value and manhour limits for this project.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleTopUp}>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Up Category</label>
                                        <select
                                            value={topUpData.category_id}
                                            onChange={(e) => setTopUpData({ ...topUpData, category_id: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm"
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Role</label>
                                        <select
                                            value={topUpData.project_role_id}
                                            onChange={(e) => setTopUpData({ ...topUpData, project_role_id: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm"
                                            required
                                        >
                                            <option value="">Select Role</option>
                                            {projectRolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Value (Rp)</label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 5000000"
                                            value={topUpData.additional_quotation}
                                            onChange={(e) => setTopUpData({ ...topUpData, additional_quotation: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Manhours</label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 40"
                                            value={topUpData.additional_hours}
                                            onChange={(e) => setTopUpData({ ...topUpData, additional_hours: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Up Notes</label>
                                    <Input
                                        placeholder="Reason for top-up..."
                                        value={topUpData.description}
                                        onChange={(e) => setTopUpData({ ...topUpData, description: e.target.value })}
                                        required
                                    />
                                </div>
                            </CardContent>
                            <div className="p-6 pt-2 flex items-center justify-end gap-3 border-t">
                                <Button type="button" variant="ghost" onClick={() => setIsTopUpOpen(false)}>Cancel</Button>
                                <Button type="submit">Complete Top Up</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Quota Details Modal */}
            {isQuotaDetailsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="size-5 text-primary" /> Manhour Quota Breakdown
                            </CardTitle>
                            <CardDescription>Detailed usage of manhours allocated per role for {summary?.project_name}.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {loadingQuotas ? (
                                <div className="py-20 text-center text-slate-500">Loading breakdown...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                                                <th className="text-left font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Project Role</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Allocated</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Actual Used</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Remaining</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {quotaBreakdown.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="py-8 text-center text-slate-400 italic">No role quotas defined for this project.</td>
                                                </tr>
                                            ) : (
                                                quotaBreakdown.map(item => {
                                                    const remaining = item.quota_hours - item.actual_used_hours;
                                                    const percentUsed = (item.actual_used_hours / (item.quota_hours || 1)) * 100;
                                                    
                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                            <td className="py-4 px-2">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-bold text-slate-900 dark:text-white">{item.role_name}</span>
                                                                    <div className="w-32">
                                                                        <Progress value={percentUsed} className="h-1" color={percentUsed > 90 ? 'bg-red-500' : 'bg-primary'} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-right font-medium text-slate-600 dark:text-slate-400">{item.quota_hours} <span className="text-[10px]">HRS</span></td>
                                                            <td className="py-4 px-2 text-right font-bold text-slate-900 dark:text-white">{item.actual_used_hours} <span className="text-[10px]">HRS</span></td>
                                                            <td className={`py-4 px-2 text-right font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                {remaining.toFixed(1)} <span className="text-[10px]">HRS</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                        <div className="p-6 pt-2 flex items-center justify-end border-t mt-4">
                            <Button variant="outline" onClick={() => setIsQuotaDetailsOpen(false)}>Close Details</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
