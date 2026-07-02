import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import {
    Wallet,
    Briefcase,
    Plus,
    Trash2,
    Pencil,
    PieChart,
    Info,
    ArrowUpRight,
    Banknote,
    Search,
    Clock,
    FileEdit,
    ArrowLeft,
    Loader2,
    ArrowRightLeft,
    Ban,
    CircleDollarSign,
    X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ManhourBucketBreakdown from '@/components/ManhourBucketBreakdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PaginationControls from '@/components/ui/PaginationControls';

function SectionTable({ children, className = '' }) {
    return (
        <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
            <table className="w-full text-sm text-left">{children}</table>
        </div>
    );
}

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(Number(val) || 0);

const formatHours = (val) => {
    const num = Number(val || 0);
    return Number.isInteger(num) ? `${num}` : num.toFixed(1);
};

function ProjectCompanyIcon({ logoUrl, projectName, size = 'sm' }) {
    const imgClass = size === 'lg' ? 'size-12 rounded-xl' : 'size-9 rounded-lg';
    const iconWrapClass = size === 'lg' ? 'p-3 rounded-xl' : 'size-9 rounded-lg flex items-center justify-center';
    const iconClass = size === 'lg' ? 'size-6' : 'size-4';

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={projectName ? `${projectName} company logo` : 'Company logo'}
                className={`${imgClass} object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0`}
            />
        );
    }

    return (
        <div className={`${iconWrapClass} bg-primary/10 text-primary shrink-0`}>
            <Briefcase className={iconClass} />
        </div>
    );
}

const projectStatusBadgeClass = {
    Planning: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
    Done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
};

function FinanceProjectTable({ projects, onSelectProject }) {
    if (projects.length === 0) {
        return null;
    }

    return (
        <SectionTable className="border-0 rounded-none">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wide">
                <tr>
                    <th className="px-4 py-2.5 font-medium text-left">Project</th>
                    <th className="px-3 py-2.5 font-medium hidden sm:table-cell">Status</th>
                    <th className="px-3 py-2.5 font-medium hidden md:table-cell">Metodologi</th>
                    <th className="px-4 py-2.5 font-medium text-right">Nilai Quotation</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {projects.map((proj) => (
                    <tr
                        key={proj.id}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        onClick={() => onSelectProject(proj.id)}
                    >
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <ProjectCompanyIcon
                                    logoUrl={proj.company_logo_url}
                                    projectName={proj.name}
                                />
                                <div className="min-w-0">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate block leading-snug">
                                        {proj.name}
                                    </span>
                                    <span className={`sm:hidden inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full border mt-0.5 ${projectStatusBadgeClass[proj.status] || projectStatusBadgeClass.Planning}`}>
                                        {proj.status || 'Planning'}
                                    </span>
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                            <Badge
                                variant="outline"
                                className={`font-normal text-xs ${projectStatusBadgeClass[proj.status] || projectStatusBadgeClass.Planning}`}
                            >
                                {proj.status || 'Planning'}
                            </Badge>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                            {proj.methodology ? (
                                <Badge variant="outline" className="font-normal text-xs text-slate-600 dark:text-slate-300">
                                    {proj.methodology}
                                </Badge>
                            ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="font-semibold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                                    {proj.quotation_value ? formatCurrency(proj.quotation_value) : <span className="text-slate-400 font-normal text-xs">Belum diisi</span>}
                                </span>
                                <ArrowUpRight className="size-3.5 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </SectionTable>
    );
}

function UserSearchInput({ value, onChange, options = [], placeholder = 'Cari user...' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);

    const selected = useMemo(
        () => options.find(o => String(o.user_id) === String(value)) ?? null,
        [options, value]
    );

    const trimmed = query.trim();
    const ready = trimmed.length >= 2;

    const filtered = useMemo(() => {
        if (!ready) return [];
        const q = trimmed.toLowerCase();
        return options.filter(o => o.user_name.toLowerCase().includes(q)).slice(0, 60);
    }, [options, trimmed, ready]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const pick = (id) => { onChange(id); setOpen(false); setQuery(''); };

    return (
        <div ref={rootRef} className="relative">
            <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={open ? query : (selected?.user_name ?? '')}
                    placeholder={placeholder}
                    onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
                    onFocus={() => { setOpen(true); setQuery(''); }}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-7 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {value && (
                    <button type="button" onClick={() => pick('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="size-3.5" />
                    </button>
                )}
            </div>
            {open && !ready && trimmed.length > 0 && (
                <p className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-400 shadow-lg">
                    Ketik minimal 2 karakter untuk mencari user
                </p>
            )}
            {open && ready && (
                <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                    <li>
                        <button type="button" onClick={() => pick('')}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 ${!value ? 'bg-primary/5 font-medium text-primary' : ''}`}>
                            — Tidak dipilih —
                        </button>
                    </li>
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-400">Tidak ada hasil</li>
                    ) : filtered.map(o => (
                        <li key={o.user_id}>
                            <button type="button" onClick={() => pick(String(o.user_id))}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${String(value) === String(o.user_id) ? 'bg-primary/10 font-medium text-primary' : ''}`}>
                                {o.user_name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function FinanceMonitoring() {
    const { projectId: projectIdParam } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [projects, setProjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [projectRolesList, setProjectRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [summary, setSummary] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [allocationTab, setAllocationTab] = useState('expense');
    const [detailTab, setDetailTab] = useState('summary');
    const [allocPage, setAllocPage] = useState(1);
    const [allocPageSize, setAllocPageSize] = useState(10);

    // Allocation Form States
    const [newAllocation, setNewAllocation] = useState({
        category_id: '',
        user_id: '',
        amount: '',
        description: '',
    });
    const [projectMemberOptions, setProjectMemberOptions] = useState([]);

    // Top Up / Change Request States
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false);
    const [topUpData, setTopUpData] = useState({
        additional_quotation: '',
        additional_hours: '',
        description: '',
        category_id: ''
    });
    const defaultChangeRequestForm = () => ({
        cr_date: new Date().toISOString().slice(0, 10),
        cr_feature: '',
        additional_quotation: '',
    });
    const [changeRequestData, setChangeRequestData] = useState(defaultChangeRequestForm);

    // Quota / CR Details States
    const [isCrDetailsOpen, setIsCrDetailsOpen] = useState(false);
    const [changeRequestList, setChangeRequestList] = useState([]);
    const [isQuotaDetailsOpen, setIsQuotaDetailsOpen] = useState(false);
    const [quotaBreakdown, setQuotaBreakdown] = useState([]);
    const [quotaMeta, setQuotaMeta] = useState(null);
    const [loadingQuotas, setLoadingQuotas] = useState(false);
    const [isRealizationModalOpen, setIsRealizationModalOpen] = useState(false);
    const [selectedAllocationForRealization, setSelectedAllocationForRealization] = useState(null);
    const [realizationAmountInput, setRealizationAmountInput] = useState('');
    const [isSavingRealization, setIsSavingRealization] = useState(false);
    const [markingPaidId, setMarkingPaidId] = useState(null);
    const [isEditAllocationModalOpen, setIsEditAllocationModalOpen] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const [editAllocationForm, setEditAllocationForm] = useState({
        category_id: '',
        user_id: '',
        amount: '',
        description: '',
    });
    const [isSavingEditAllocation, setIsSavingEditAllocation] = useState(false);
    const [isSwitchMhOpen, setIsSwitchMhOpen] = useState(false);
    const [switchMhData, setSwitchMhData] = useState({
        from_key: 'general',
        to_key: '',
        hours: '',
    });
    const [isSwitchingMh, setIsSwitchingMh] = useState(false);
    const [deactivatingQuotaId, setDeactivatingQuotaId] = useState(null);

    const selectedProjectData = useMemo(
        () => projects.find((project) => project.id === selectedProject) || null,
        [projects, selectedProject]
    );
    const isWaterfallProject = useMemo(() => {
        const methodology = (selectedProjectData?.methodology ?? summary?.methodology ?? '').toLowerCase();
        return methodology.includes('waterfall');
    }, [selectedProjectData, summary]);

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

    const loadProjectFinance = useCallback(async (projectId) => {
        const id = Number(projectId);
        if (!id) return;

        setDetailLoading(true);
        try {
            const res = await fetchAPI(`/projects/${id}/finance-summary`);
            setSummary(res.data);
            setProjectMemberOptions(res.data?.allocation_user_options || []);
            setSelectedProject(id);

            const qRes = await fetchAPI(`/projects/${id}/quotas`);
            setQuotaBreakdown(qRes.data || []);
            setQuotaMeta(qRes.meta || null);
        } catch (error) {
            alert('Failed to load project finance details');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const selectProject = (projectId) => {
        navigate(`/finance-monitoring/${projectId}`);
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!projectIdParam) {
            setSelectedProject(null);
            setSummary(null);
            setQuotaBreakdown([]);
            setQuotaMeta(null);
            setProjectMemberOptions([]);
            return;
        }

        if (projects.length === 0) return;

        const project = projects.find((p) => p.id.toString() === projectIdParam.toString());
        if (!project) {
            navigate('/finance-monitoring', { replace: true });
            return;
        }

        loadProjectFinance(project.id);
    }, [projectIdParam, projects, navigate, loadProjectFinance]);

    useEffect(() => {
        const modal = searchParams.get('modal');
        if (modal === 'quota-breakdown') {
            if (!isQuotaDetailsOpen) setIsQuotaDetailsOpen(true);
        } else {
            if (isQuotaDetailsOpen) setIsQuotaDetailsOpen(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleAddAllocation = async (e) => {
        e.preventDefault();
        if (!selectedProject || !newAllocation.category_id || !newAllocation.amount) return;

        try {
            await fetchAPI('/project-allocations', {
                method: 'POST',
                body: JSON.stringify({
                    project_id: selectedProject,
                    category_id: newAllocation.category_id,
                    amount: parseFloat(newAllocation.amount),
                    description: newAllocation.description || null,
                    user_id: newAllocation.user_id ? parseInt(newAllocation.user_id, 10) : null,
                }),
            });
            setNewAllocation({ category_id: '', user_id: '', amount: '', description: '' });
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

    const editUserOptions = useMemo(() => {
        const opts = [...projectMemberOptions];
        if (editingAllocation?.user_id && !opts.some((o) => String(o.user_id) === String(editingAllocation.user_id))) {
            opts.unshift({
                user_id: editingAllocation.user_id,
                user_name: editingAllocation.user_name || `User #${editingAllocation.user_id}`,
            });
        }
        return opts;
    }, [projectMemberOptions, editingAllocation]);

    const openEditAllocationModal = (allocation) => {
        setEditingAllocation(allocation);
        setEditAllocationForm({
            category_id: String(allocation.category_id ?? ''),
            user_id: allocation.user_id ? String(allocation.user_id) : '',
            amount: String(allocation.amount ?? ''),
            description: allocation.description || '',
        });
        setIsEditAllocationModalOpen(true);
    };

    const submitEditAllocation = async () => {
        if (!selectedProject || !editingAllocation) return;
        if (!editAllocationForm.category_id || !editAllocationForm.amount) {
            alert('Kategori dan nominal wajib diisi.');
            return;
        }

        const amount = parseFloat(editAllocationForm.amount);
        if (!Number.isFinite(amount)) {
            alert('Nominal tidak valid.');
            return;
        }

        setIsSavingEditAllocation(true);
        try {
            await fetchAPI(`/project-allocations/${editingAllocation.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    category_id: parseInt(editAllocationForm.category_id, 10),
                    user_id: editAllocationForm.user_id ? parseInt(editAllocationForm.user_id, 10) : null,
                    amount,
                    description: editAllocationForm.description || null,
                }),
            });
            setIsEditAllocationModalOpen(false);
            setEditingAllocation(null);
            loadProjectFinance(selectedProject);
        } catch (error) {
            alert('Gagal menyimpan perubahan: ' + error.message);
        } finally {
            setIsSavingEditAllocation(false);
        }
    };

    const openRealizationModal = (allocation) => {
        const defaultValue = allocation.realized_amount ?? allocation.amount ?? 0;
        setSelectedAllocationForRealization(allocation);
        setRealizationAmountInput(String(defaultValue));
        setIsRealizationModalOpen(true);
    };

    const handleMarkPaid = async (allocation, mode = 'add') => {
        if (!selectedProject || !allocation?.id) return;
        const targetAmount = Number(allocation.realized_amount ?? allocation.amount ?? 0);
        const currentPaid = Number(allocation.paid_amount || 0);
        const remaining = Math.max(0, targetAmount - currentPaid);

        setMarkingPaidId(allocation.id);
        try {
            if (mode === 'reset') {
                if (!window.confirm(`Reset pembayaran untuk "${allocation.category_name}"?`)) {
                    return;
                }
                await fetchAPI(`/project-allocations/${allocation.id}/paid`, {
                    method: 'PUT',
                    body: JSON.stringify({ reset: true }),
                });
            } else {
                if (remaining <= 0) {
                    alert('Pengeluaran ini sudah lunas.');
                    return;
                }
                const suggested = remaining.toFixed(0);
                const input = window.prompt(
                    `Input nominal pembayaran untuk "${allocation.category_name}".\nSisa saat ini: ${formatCurrency(remaining)}`,
                    suggested
                );
                if (input === null) return;

                const paymentAmount = Number(input);
                if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
                    alert('Nominal pembayaran tidak valid.');
                    return;
                }

                await fetchAPI(`/project-allocations/${allocation.id}/paid`, {
                    method: 'PUT',
                    body: JSON.stringify({ payment_amount: paymentAmount }),
                });
            }
            loadProjectFinance(selectedProject);
        } catch (error) {
            alert('Gagal menyimpan pembayaran: ' + error.message);
        } finally {
            setMarkingPaidId(null);
        }
    };

    const submitRealization = async () => {
        if (!selectedProject || !selectedAllocationForRealization) return;
        const parsed = Number(realizationAmountInput);
        if (!Number.isFinite(parsed) || parsed < 0) {
            alert('Realization amount must be a valid number (>= 0).');
            return;
        }

        setIsSavingRealization(true);
        try {
            await fetchAPI(`/project-allocations/${selectedAllocationForRealization.id}/realization`, {
                method: 'PUT',
                body: JSON.stringify({ realized_amount: parsed }),
            });
            setIsRealizationModalOpen(false);
            setSelectedAllocationForRealization(null);
            setRealizationAmountInput('');
            loadProjectFinance(selectedProject);
        } catch (error) {
            alert('Failed to save realization: ' + error.message);
        } finally {
            setIsSavingRealization(false);
        }
    };

    const handleChangeRequest = async (e) => {
        e.preventDefault();
        if (!selectedProject || !changeRequestData.cr_feature || !changeRequestData.cr_date) return;

        try {
            await fetchAPI(`/projects/${selectedProject}/change-request`, {
                method: 'POST',
                body: JSON.stringify({
                    cr_date: changeRequestData.cr_date,
                    cr_feature: changeRequestData.cr_feature,
                    additional_quotation: parseFloat(changeRequestData.additional_quotation || 0),
                })
            });
            setIsChangeRequestOpen(false);
            setChangeRequestData(defaultChangeRequestForm());
            loadProjectFinance(selectedProject);
            loadInitialData();
        } catch (error) {
            alert('Change request failed: ' + error.message);
        }
    };

    const openCrBreakdown = () => {
        setChangeRequestList(summary?.change_requests || []);
        setIsCrDetailsOpen(true);
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
        setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('modal', 'quota-breakdown'); return p; });
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/quotas`);
            setQuotaBreakdown(res.data || []);
            setQuotaMeta(res.meta || null);
        } catch (error) {
            console.error('Failed to load quota breakdown:', error);
        } finally {
            setLoadingQuotas(false);
        }
    };

    const closeQuotaDetails = () => {
        setIsQuotaDetailsOpen(false);
        setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('modal'); return p; });
    };

    const refreshQuotas = async () => {
        if (!selectedProject) return;
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/quotas`);
            setQuotaBreakdown(res.data || []);
            setQuotaMeta(res.meta || null);
        } catch (error) {
            console.error('Failed to refresh quotas:', error);
        }
    };

    const generalQuota = quotaMeta?.general_quota || {
        base_quota_hours: 0,
        topup_quota_hours: 0,
        current_quota_hours: 0,
        allocated_hours: 0,
        actual_hours: 0,
        remaining_hours: 0,
    };

    const parseSwitchKey = (key) => {
        if (!key || key === 'general') {
            return { type: 'general', project_role_id: null };
        }
        const roleId = Number(String(key).replace('role:', ''));
        return { type: 'role', project_role_id: Number.isFinite(roleId) ? roleId : null };
    };

    const roleFifoRemaining = (row) => {
        if (row?.fifo_remaining_hours != null) {
            return Math.max(0, Number(row.fifo_remaining_hours));
        }
        return Math.max(0, Number(row.quota_hours || 0) - Number(row.allocated_hours || 0));
    };

    const getTransferRemaining = (key) => {
        if (!key || key === 'general') {
            return Math.max(0, Number(generalQuota.remaining_hours || 0));
        }
        const roleId = Number(String(key).replace('role:', ''));
        const row = quotaBreakdown.find((q) => q.project_role_id === roleId && q.is_active !== false);
        if (!row) return 0;
        return roleFifoRemaining(row);
    };

    const switchSourceOptions = useMemo(() => {
        const options = [];
        const generalRemaining = Math.max(0, Number(generalQuota.remaining_hours || 0));
        if (generalRemaining > 0) {
            options.push({
                key: 'general',
                label: `General (${formatHours(generalRemaining)}h tersedia)`,
            });
        }
        quotaBreakdown
            .filter((q) => q.is_active !== false)
            .forEach((q) => {
                const remaining = roleFifoRemaining(q);
                if (remaining > 0) {
                    options.push({
                        key: `role:${q.project_role_id}`,
                        label: `${q.role_name} (${formatHours(remaining)}h tersedia)`,
                    });
                }
            });
        return options;
    }, [quotaBreakdown, generalQuota.remaining_hours]);

    const switchTargetOptions = useMemo(() => {
        const fromKey = switchMhData.from_key;
        const options = [];
        if (fromKey !== 'general') {
            options.push({ key: 'general', label: 'General' });
        }
        const roleIds = new Set(projectRolesList.map((r) => r.id));
        quotaBreakdown.forEach((q) => roleIds.add(q.project_role_id));
        roleIds.forEach((roleId) => {
            const key = `role:${roleId}`;
            if (key === fromKey) return;
            const role = projectRolesList.find((r) => r.id === roleId);
            const quotaRow = quotaBreakdown.find((q) => q.project_role_id === roleId);
            const name = role?.name || quotaRow?.role_name || `Role ${roleId}`;
            const inactive = quotaRow && quotaRow.is_active === false;
            const label = inactive ? `${name} (nonaktif — akan diaktifkan)` : name;
            options.push({ key, label });
        });
        return options;
    }, [switchMhData.from_key, projectRolesList, quotaBreakdown]);

    const openSwitchMh = () => {
        const defaultFrom = switchSourceOptions[0]?.key || 'general';
        const defaultTo = switchTargetOptions.find((o) => o.key !== defaultFrom)?.key || '';
        setSwitchMhData({ from_key: defaultFrom, to_key: defaultTo, hours: '' });
        setIsSwitchMhOpen(true);
    };

    const handleSwitchMh = async (e) => {
        e.preventDefault();
        if (!selectedProject || !switchMhData.from_key || !switchMhData.to_key) return;

        const hours = parseFloat(switchMhData.hours);
        if (!Number.isFinite(hours) || hours <= 0) {
            alert('Masukkan jumlah jam yang valid.');
            return;
        }

        const maxHours = getTransferRemaining(switchMhData.from_key);
        if (hours > maxHours + 0.0001) {
            alert(`Maksimal ${formatHours(maxHours)} jam dapat dipindahkan dari sumber ini.`);
            return;
        }

        const from = parseSwitchKey(switchMhData.from_key);
        const to = parseSwitchKey(switchMhData.to_key);

        setIsSwitchingMh(true);
        try {
            await fetchAPI(`/projects/${selectedProject}/quota-transfer`, {
                method: 'POST',
                body: JSON.stringify({
                    hours,
                    from_type: from.type,
                    from_project_role_id: from.project_role_id,
                    to_type: to.type,
                    to_project_role_id: to.project_role_id,
                }),
            });
            setIsSwitchMhOpen(false);
            setSwitchMhData({ from_key: 'general', to_key: '', hours: '' });
            await loadProjectFinance(selectedProject);
            if (isQuotaDetailsOpen) {
                await refreshQuotas();
            }
        } catch (error) {
            alert(error.message || 'Gagal memindahkan quota MH.');
        } finally {
            setIsSwitchingMh(false);
        }
    };

    const handleDeactivateQuota = async (quotaRow) => {
        if (!selectedProject || !quotaRow?.id) return;
        if (!window.confirm(`Nonaktifkan kategori "${quotaRow.role_name}"? Kategori tidak akan muncul di Project Board.`)) {
            return;
        }

        setDeactivatingQuotaId(quotaRow.id);
        try {
            await fetchAPI(`/projects/${selectedProject}/role-quotas/${quotaRow.id}/deactivate`, {
                method: 'POST',
            });
            await loadProjectFinance(selectedProject);
            if (isQuotaDetailsOpen) {
                await refreshQuotas();
            }
        } catch (error) {
            alert(error.message || 'Gagal menonaktifkan kategori.');
        } finally {
            setDeactivatingQuotaId(null);
        }
    };

    const formatCrDate = (crDate, createdAt) => {
        const raw = crDate || createdAt;
        if (!raw) return '-';
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const hasGeneralTopUp = Number(generalQuota.topup_quota_hours || 0) > 0;

    const filteredProjects = useMemo(
        () => projects.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [projects, searchTerm]
    );

    const activeProjects = useMemo(
        () => filteredProjects.filter((p) => p.status !== 'Done'),
        [filteredProjects]
    );

    const completedProjects = useMemo(
        () => filteredProjects.filter((p) => p.status === 'Done'),
        [filteredProjects]
    );

    const totalQuotationValue = useMemo(
        () => projects.reduce((s, p) => s + Number(p.quotation_value || 0), 0),
        [projects]
    );
    const allActiveCount = useMemo(() => projects.filter((p) => p.status !== 'Done').length, [projects]);
    const allDoneCount = useMemo(() => projects.filter((p) => p.status === 'Done').length, [projects]);

    const allocationPercentage = summary ? (summary.total_allocated / (summary.quotation_value || 1)) * 100 : 0;
    const allocations = summary?.allocations || [];
    const expenseAllocations = allocations.filter((alloc) => !alloc.is_topup);
    const incomeAllocations = allocations.filter((alloc) => alloc.is_topup);
    const activeAllocations = allocationTab === 'income' ? incomeAllocations : expenseAllocations;
    const pagedAllocations = useMemo(() => {
        const start = (allocPage - 1) * allocPageSize;
        return activeAllocations.slice(start, start + allocPageSize);
    }, [activeAllocations, allocPage, allocPageSize]);
    const expenseByUser = summary?.expense_by_user || [];
    const activeAllocationTotal = activeAllocations.reduce((sum, alloc) => sum + Number(alloc.amount || 0), 0);
    const incomeActionLabel = isWaterfallProject ? 'Change Request' : 'Top Up Quota';

    const formatIncomeBadge = (alloc) => {
        if (alloc.is_change_request || alloc.description?.startsWith('[CHANGE REQUEST]') || (isWaterfallProject && alloc.is_topup)) {
            return 'Change Request';
        }
        return `Top Up MH${alloc.topup_hours ? ` +${formatHours(alloc.topup_hours)}h` : ''}`;
    };

    const isDetailView = Boolean(projectIdParam);
    const marginPercent = summary && summary.quotation_value > 0
        ? (summary.remaining_margin / summary.quotation_value) * 100
        : 0;

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full">
            <div className="w-full px-4 py-5 sm:px-6 lg:px-8 space-y-5 pb-16">
                {!isDetailView ? (
                    <div className="space-y-5">
                        {/* ── Page header ── */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Finance Monitoring
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Pantau quotation, alokasi biaya, margin, dan quota manhour per project.
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                <Input
                                    placeholder="Cari project…"
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ── Summary stats ── */}
                        {!loading && projects.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Project Aktif</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{allActiveCount}</p>
                                        <p className="text-xs text-slate-400 mt-1">Planning &amp; In Progress</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Project Selesai</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{allDoneCount}</p>
                                        <p className="text-xs text-slate-400 mt-1">Marked as Done</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
                                    <CardContent className="p-4">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Nilai Quotation</p>
                                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{formatCurrency(totalQuotationValue)}</p>
                                        <p className="text-xs text-slate-400 mt-1">Dari {projects.length} project</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Project tables ── */}
                        {loading ? (
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardContent className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
                                    <Loader2 className="size-5 animate-spin" />
                                    Memuat data project…
                                </CardContent>
                            </Card>
                        ) : filteredProjects.length === 0 ? (
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardContent className="py-16 text-center text-slate-500 text-sm">
                                    {searchTerm ? `Tidak ada project yang cocok dengan "${searchTerm}".` : 'Belum ada data project.'}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Aktif</p>
                                        <span className="text-xs text-slate-400 tabular-nums">{activeProjects.length} project</span>
                                    </div>
                                    {activeProjects.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-sm">
                                            {searchTerm ? 'Tidak ada project aktif yang cocok.' : 'Tidak ada project aktif.'}
                                        </div>
                                    ) : (
                                        <FinanceProjectTable projects={activeProjects} onSelectProject={selectProject} />
                                    )}
                                </Card>

                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Selesai</p>
                                        <span className="text-xs text-slate-400 tabular-nums">{completedProjects.length} project</span>
                                    </div>
                                    {completedProjects.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-sm">
                                            {searchTerm ? 'Tidak ada project selesai yang cocok.' : 'Belum ada project yang selesai.'}
                                        </div>
                                    ) : (
                                        <FinanceProjectTable projects={completedProjects} onSelectProject={selectProject} />
                                    )}
                                </Card>
                            </div>
                        )}

                    </div>
                ) : (
                <div className="flex flex-col gap-6">
                    {detailLoading ? (
                        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
                            <Loader2 className="size-5 animate-spin" /> Loading finance data…
                        </div>
                    ) : !summary ? (
                        <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed border-2">
                            <Wallet className="size-16 text-slate-200 mb-4" />
                            <CardTitle className="text-slate-400">Project data unavailable</CardTitle>
                        </Card>
                    ) : (
                        <>
                            {isDetailView && (
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between -mt-2">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate('/finance-monitoring')} title="Back">
                                            <ArrowLeft className="size-4" />
                                        </Button>
                                        <div className="min-w-0">
                                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                                                {selectedProjectData?.name || summary.project_name}
                                            </h1>
                                            <p className="text-sm text-slate-500 mt-0.5">Finance monitoring & allocation</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {summary.methodology && <Badge variant="secondary">{summary.methodology}</Badge>}
                                        {!isWaterfallProject ? (
                                            <>
                                                <Button variant="outline" size="sm" onClick={openSwitchMh} className="gap-1.5" disabled={switchSourceOptions.length === 0}>
                                                    <ArrowRightLeft className="size-4" /> Switch MH
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={loadQuotaBreakdown} className="gap-1.5"><Clock className="size-4" /> MH Quota</Button>
                                            </>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={openCrBreakdown} className="gap-1.5"><FileEdit className="size-4" /> CR List</Button>
                                        )}
                                        <Button size="sm" className="gap-1.5" onClick={() => (isWaterfallProject ? setIsChangeRequestOpen(true) : setIsTopUpOpen(true))}>
                                            <Plus className="size-4" /> {incomeActionLabel}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Tabs value={detailTab} onValueChange={setDetailTab}>
                                <TabsList className="mb-2">
                                    <TabsTrigger value="summary">Summary</TabsTrigger>
                                    <TabsTrigger value="allocation">Allocation Breakdown</TabsTrigger>
                                </TabsList>

                                <TabsContent value="summary" className="space-y-6 mt-4">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold">Financial summary</CardTitle>
                                    <CardDescription>Quotation vs realized allocation for this project</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <SectionTable>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600 w-[40%]">Quotation value</td>
                                                <td className="px-4 py-3 font-semibold">{formatCurrency(summary.quotation_value)}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">Total allocated (realized)</td>
                                                <td className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(summary.total_allocated)}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">Planned allocation</td>
                                                <td className="px-4 py-3">{formatCurrency(summary.planned_allocated ?? 0)}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">Remaining margin</td>
                                                <td className={`px-4 py-3 font-semibold ${summary.remaining_margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                                                    {formatCurrency(summary.remaining_margin)} ({marginPercent.toFixed(1)}%)
                                                </td>
                                            </tr>
                                        </tbody>
                                    </SectionTable>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {isWaterfallProject ? (
                                    <Card
                                        className="bg-violet-50 dark:bg-violet-500/5 border-violet-200 dark:border-violet-500/20 cursor-pointer hover:border-violet-400 transition-all"
                                        onClick={openCrBreakdown}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardDescription className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Change Request Status</CardDescription>
                                                    <CardTitle className="text-xl mt-1">
                                                        {summary.change_request_count ?? 0}{' '}
                                                        <span className="text-sm font-normal text-slate-500 uppercase ml-1">CR</span>
                                                    </CardTitle>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Total Nilai</div>
                                                    <div className="text-lg font-bold text-violet-700 dark:text-violet-300">
                                                        {formatCurrency(summary.change_request_total_value ?? 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ) : (() => {
                                    const usedPct = (Number(summary.allocated_hours || 0) / (Number(summary.total_manhours) || 1)) * 100;
                                    const remaining = Number(summary.fifo_remaining_hours ?? summary.remaining_hours ?? 0);
                                    const isOverQuota = remaining < 0;
                                    return (
                                        <Card
                                            className="border-blue-200 dark:border-blue-500/20 cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-400/60 active:scale-[0.99] transition-all group"
                                            onClick={loadQuotaBreakdown}
                                        >
                                            <CardHeader className="pb-4">
                                                {/* Header row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                                                            <Clock className="size-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                            Manhour Quota
                                                        </span>
                                                    </div>
                                                    <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                                                        <ArrowUpRight className="size-3.5" />
                                                        Lihat breakdown
                                                    </span>
                                                </div>

                                                {/* Stats grid */}
                                                <div className="mt-4 grid grid-cols-3 gap-2">
                                                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Quota</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-white">{formatHours(summary.total_manhours)}h</p>
                                                        {summary.has_topup_manhours && (
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                                                +{formatHours(summary.topup_hours_total)}h top up
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3">
                                                        <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Allocated</p>
                                                        <p className="text-base font-bold text-amber-700 dark:text-amber-300">{formatHours(summary.allocated_hours)}h</p>
                                                        <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">{usedPct.toFixed(1)}% used</p>
                                                    </div>
                                                    <div className={`rounded-lg p-3 border ${isOverQuota ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/40' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40'}`}>
                                                        <p className={`text-[10px] font-bold uppercase mb-1 ${isOverQuota ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>Remaining</p>
                                                        <p className={`text-base font-bold ${isOverQuota ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                                            {formatHours(Math.abs(remaining))}h
                                                        </p>
                                                        <p className={`text-[10px] mt-0.5 ${isOverQuota ? 'text-rose-500 dark:text-rose-400' : 'text-blue-400'}`}>
                                                            {isOverQuota ? 'over quota' : 'FIFO'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mt-3">
                                                    <Progress
                                                        value={Math.min(100, usedPct)}
                                                        className={`h-2 ${isOverQuota ? '[&>div]:bg-rose-500' : '[&>div]:bg-blue-500'}`}
                                                    />
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    );
                                })()}
                            </div>
                                </TabsContent>

                                <TabsContent value="allocation" className="mt-4">
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <PieChart className="size-5 text-primary" /> Allocation Breakdown
                                        </CardTitle>
                                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                            <Info className="size-3" />
                                            {allocationTab === 'expense'
                                                ? `${allocationPercentage.toFixed(1)}% of quotation used`
                                                : `${incomeActionLabel} total: ${formatCurrency(activeAllocationTotal)}`}
                                        </div>
                                    </div>
                                    {allocationTab === 'expense' ? (
                                        <Progress value={allocationPercentage} className="h-2 mt-2" />
                                    ) : (
                                        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                            Pemasukan berasal dari transaksi {incomeActionLabel}.
                                        </div>
                                    )}
                                    <div className="mt-4 inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-900/40">
                                        <button
                                            type="button"
                                            onClick={() => { setAllocationTab('expense'); setAllocPage(1); }}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                                allocationTab === 'expense'
                                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            Pengeluaran ({expenseAllocations.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setAllocationTab('income'); setAllocPage(1); }}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                                allocationTab === 'income'
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            Pemasukan ({incomeAllocations.length})
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {allocationTab === 'expense' && expenseByUser.length > 0 && (
                                        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/30 p-4">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                                                Pengeluaran per user (realisasi)
                                            </p>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                                            <th className="text-left font-medium pb-2 pr-4">User</th>
                                                            <th className="text-right font-medium pb-2 pr-4">Baris</th>
                                                            <th className="text-right font-medium pb-2 pr-4">Plan</th>
                                                            <th className="text-right font-medium pb-2">Realisasi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {expenseByUser.map((row) => (
                                                            <tr key={row.user_id ?? 'none'}>
                                                                <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">
                                                                    {row.user_name}
                                                                </td>
                                                                <td className="py-2 pr-4 text-right text-slate-600">{row.line_count}</td>
                                                                <td className="py-2 pr-4 text-right text-slate-600">
                                                                    {formatCurrency(row.planned_total)}
                                                                </td>
                                                                <td className="py-2 text-right font-semibold text-slate-900 dark:text-white">
                                                                    {formatCurrency(row.realized_total)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                                                    <th className="text-left font-medium pb-3 px-2">Category</th>
                                                    {allocationTab === 'expense' && (
                                                        <th className="text-left font-medium pb-3 px-2">User</th>
                                                    )}
                                                    <th className="text-left font-medium pb-3 px-2">Description</th>
                                                    <th className="text-right font-medium pb-3 px-2 w-40">
                                                        {allocationTab === 'expense' ? 'Final Expense' : 'Amount'}
                                                    </th>
                                                    <th className="text-right font-medium pb-3 px-2 w-40"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {activeAllocations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={allocationTab === 'expense' ? 5 : 4} className="py-8 text-center text-slate-400 italic">
                                                            {allocationTab === 'income'
                                                                ? `Belum ada pemasukan (${incomeActionLabel}) untuk project ini.`
                                                                : 'Belum ada pengeluaran. Tambahkan alokasi di bawah.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    pagedAllocations.map(alloc => (
                                                        <tr key={alloc.id} className="group">
                                                            <td className="py-3 px-2">
                                                                <span className="font-medium text-slate-900 dark:text-white">
                                                                    {alloc.category_name}
                                                                    {alloc.is_topup ? (
                                                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold uppercase tracking-tight">
                                                                            {formatIncomeBadge(alloc)}
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </td>
                                                            {allocationTab === 'expense' && (
                                                                <td className="py-3 px-2 text-slate-600 dark:text-slate-300">
                                                                    {alloc.user_name || (
                                                                        <span className="text-slate-400 italic">—</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            <td className="py-3 px-2 text-slate-500">{alloc.description || '-'}</td>
                                                            <td className={`py-3 px-2 text-right font-medium ${alloc.is_topup ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                                                                {alloc.is_topup ? (
                                                                    <>{`+${formatCurrency(alloc.amount)}`}</>
                                                                ) : (
                                                                    <div className="flex flex-col items-end">
                                                                        {(() => {
                                                                            const targetPaid = Number(alloc.realized_amount ?? alloc.amount ?? 0);
                                                                            const currentPaidRaw = Number(alloc.paid_amount || 0);
                                                                            const currentPaid = Math.max(0, Math.min(currentPaidRaw, targetPaid));
                                                                            const remainingPaid = Math.max(0, targetPaid - currentPaid);
                                                                            const isFullyPaid = remainingPaid <= 0 && targetPaid > 0;

                                                                            return (
                                                                                <>
                                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                                            {formatCurrency(alloc.realized_amount ?? alloc.amount)}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400">
                                                                            Plan: {formatCurrency(alloc.amount)}
                                                                            {alloc.realized_amount !== null && alloc.realized_amount !== undefined ? ' | Realized' : ' | Pending'}
                                                                            {` | Paid: ${formatCurrency(currentPaid)} / ${formatCurrency(targetPaid)}`}
                                                                        </span>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`mt-1 text-[10px] ${
                                                                                isFullyPaid
                                                                                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40'
                                                                                    : 'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30'
                                                                            }`}
                                                                        >
                                                                            {isFullyPaid ? 'Lunas' : `Sisa ${formatCurrency(remainingPaid)}`}
                                                                        </Badge>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-2 text-right">
                                                                {!alloc.is_topup && allocationTab === 'expense' && (
                                                                    <div className="inline-flex items-center gap-1">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openEditAllocationModal(alloc)}
                                                                            className="h-7 px-2 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                                                                            title="Edit pengeluaran"
                                                                        >
                                                                            <Pencil className="size-3 mr-1" />
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openRealizationModal(alloc)}
                                                                            className="h-7 px-2 text-[10px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300"
                                                                        >
                                                                            Realization
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            disabled={markingPaidId === alloc.id}
                                                                            onClick={() => handleMarkPaid(alloc, 'add')}
                                                                            className="h-7 px-2 text-[10px] font-bold border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-300"
                                                                            title="Tambah pembayaran (termin)"
                                                                        >
                                                                            {markingPaidId === alloc.id ? (
                                                                                <Loader2 className="size-3 animate-spin" />
                                                                            ) : (
                                                                                <CircleDollarSign className="size-3 mr-1 inline" />
                                                                            )}
                                                                            Tambah Paid
                                                                        </Button>
                                                                        {Number(alloc.paid_amount || 0) > 0 && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                disabled={markingPaidId === alloc.id}
                                                                                onClick={() => handleMarkPaid(alloc, 'reset')}
                                                                                className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-rose-600"
                                                                                title="Reset nilai pembayaran"
                                                                            >
                                                                                Reset
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAllocation(alloc.id)}
                                                                            className="size-7 text-slate-300 hover:text-red-500">
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {activeAllocations.length > allocPageSize && (
                                        <div className="mt-4">
                                            <PaginationControls
                                                page={allocPage}
                                                pageSize={allocPageSize}
                                                total={activeAllocations.length}
                                                onPageChange={setAllocPage}
                                                onPageSizeChange={(s) => { setAllocPageSize(s); setAllocPage(1); }}
                                            />
                                        </div>
                                    )}

                                    {/* Add Allocation Form */}
                                    {allocationTab === 'expense' ? (
                                        <form onSubmit={handleAddAllocation} className="mt-6 p-4 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                                            <p className="text-[11px] text-slate-500 mb-4">
                                                User opsional — untuk melacak pengeluaran per orang di ringkasan di atas.
                                                {projectMemberOptions.length === 0 && (
                                                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                                                        Belum ada user terdaftar di sistem.
                                                    </span>
                                                )}
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">User (opsional)</span>
                                                    <UserSearchInput
                                                        value={newAllocation.user_id}
                                                        onChange={(v) => setNewAllocation({ ...newAllocation, user_id: v })}
                                                        options={projectMemberOptions}
                                                        placeholder="Cari user..."
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">Amount</span>
                                                    <div className="relative">
                                                        <Banknote className="absolute left-3 top-3 size-3.5 text-slate-400" />
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
                                    ) : (
                                        <div className="mt-6 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 text-xs text-emerald-700 dark:text-emerald-300">
                                            Pemasukan dicatat dari transaksi <strong>{incomeActionLabel}</strong>. Gunakan card {incomeActionLabel} di atas untuk menambah pemasukan.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                <ArrowUpRight className="size-4 text-primary" />
                                <span>Note: Allocations are used to track internal and external costs against the formal quotation. This does not affect the actual manhour billing.</span>
                            </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </div>
                )}

            </div>

            {/* Top Up Modal */}
            {isTopUpOpen && !isWaterfallProject && (
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
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
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
                                            {projectRolesList.map(r => {
                                                const q = quotaBreakdown.find(qb => qb.project_role_id === r.id);
                                                const qRem = q
                                                    ? (q.fifo_remaining_hours != null
                                                        ? q.fifo_remaining_hours
                                                        : q.quota_hours - q.allocated_hours)
                                                    : 0;
                                                const label = q ? `${r.name} (Cur: ${q.quota_hours}h, Rem: ${formatHours(qRem)}h FIFO)` : r.name;
                                                return <option key={r.id} value={r.id}>{label}</option>
                                            })}
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

            {/* Change Request Modal (Waterfall) */}
            {isChangeRequestOpen && isWaterfallProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="size-5 text-violet-600" /> Change Request
                            </CardTitle>
                            <CardDescription>Tambah nilai quotation akibat perubahan scope pada project Waterfall.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleChangeRequest}>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal CR</label>
                                    <Input
                                        type="date"
                                        value={changeRequestData.cr_date}
                                        onChange={(e) => setChangeRequestData({ ...changeRequestData, cr_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fitur yang CR</label>
                                    <Input
                                        placeholder="Nama fitur / scope yang berubah..."
                                        value={changeRequestData.cr_feature}
                                        onChange={(e) => setChangeRequestData({ ...changeRequestData, cr_feature: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Nilai (Rp)</label>
                                    <Input
                                        type="number"
                                        placeholder="Ex: 5000000"
                                        value={changeRequestData.additional_quotation}
                                        onChange={(e) => setChangeRequestData({ ...changeRequestData, additional_quotation: e.target.value })}
                                        required
                                    />
                                </div>
                            </CardContent>
                            <div className="p-6 pt-2 flex items-center justify-end gap-3 border-t">
                                <Button type="button" variant="ghost" onClick={() => setIsChangeRequestOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Submit Change Request</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Change Request Breakdown Modal (Waterfall) */}
            {isCrDetailsOpen && isWaterfallProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <FileEdit className="size-5 text-violet-600" /> Change Request Breakdown
                            </CardTitle>
                            <CardDescription>
                                Daftar change request untuk {summary?.project_name}. Total {summary?.change_request_count ?? 0} CR · {formatCurrency(summary?.change_request_total_value ?? 0)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                                            <th className="text-left font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Tanggal CR</th>
                                            <th className="text-left font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Fitur yang CR</th>
                                            <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Total Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {changeRequestList.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="py-8 text-center text-slate-400 italic">
                                                    Belum ada change request untuk project ini.
                                                </td>
                                            </tr>
                                        ) : (
                                            changeRequestList.map((cr) => (
                                                <tr key={cr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="py-4 px-2 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                                        {formatCrDate(cr.cr_date, cr.created_at)}
                                                    </td>
                                                    <td className="py-4 px-2 text-slate-700 dark:text-slate-300">
                                                        {cr.cr_feature || '-'}
                                                    </td>
                                                    <td className="py-4 px-2 text-right font-bold text-violet-700 dark:text-violet-300 whitespace-nowrap">
                                                        {formatCurrency(cr.amount ?? 0)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                        <div className="p-6 pt-2 flex items-center justify-end border-t mt-4">
                            <Button variant="outline" onClick={() => setIsCrDetailsOpen(false)}>Close</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Quota Details Modal */}
            {isQuotaDetailsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={closeQuotaDetails}>
                    <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="size-5 text-primary" /> Manhour Quota Breakdown
                            </CardTitle>
                            <CardDescription>
                                FIFO: Initial dipakai dulu, lalu setiap Top Up berurutan. Detail per role di bawah.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {loadingQuotas ? (
                                <div className="py-20 text-center text-slate-500">Loading breakdown...</div>
                            ) : (
                                <div className="space-y-5">
                                    {quotaMeta?.manhour_buckets?.length > 0 && (
                                        <div className="rounded-lg border border-primary/20 p-4 bg-primary/5">
                                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                                                Project total (FIFO)
                                            </h4>
                                            <ManhourBucketBreakdown
                                                buckets={quotaMeta.manhour_buckets}
                                                overflowHours={quotaMeta.mh_overflow_hours}
                                                hasTopup={Number(quotaMeta?.totals?.topup_total_manhours || 0) > 0}
                                                compact
                                            />
                                        </div>
                                    )}
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">General Quota</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">Separated Base vs Top Up</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${hasGeneralTopUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                    {hasGeneralTopUp ? 'Top Up Applied' : 'No Top Up'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                            <div className="rounded-md bg-white dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] font-bold uppercase text-slate-500">Base</div>
                                                <div className="text-base font-bold text-slate-900 dark:text-white">{formatHours(generalQuota.base_quota_hours)}h</div>
                                            </div>
                                            <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 p-3 border border-emerald-200 dark:border-emerald-900/40">
                                                <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-300">Top Up</div>
                                                <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">+{formatHours(generalQuota.topup_quota_hours)}h</div>
                                            </div>
                                            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-900/40">
                                                <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-300">Current</div>
                                                <div className="text-base font-bold text-blue-700 dark:text-blue-300">{formatHours(generalQuota.current_quota_hours)}h</div>
                                            </div>
                                            <div className="rounded-md bg-white dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] font-bold uppercase text-slate-500">Allocated</div>
                                                <div className="text-base font-bold text-slate-900 dark:text-white">{formatHours(generalQuota.allocated_hours)}h</div>
                                            </div>
                                            <div className="rounded-md bg-white dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] font-bold uppercase text-slate-500">Remaining</div>
                                                <div className={`text-base font-bold ${(generalQuota.remaining_hours ?? 0) < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {formatHours(generalQuota.remaining_hours)}h
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500">
                                                <th className="text-left font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Project Role</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Base Quota</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Top Up</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Type</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Current Quota</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Allocated</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Actual Used</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px]">Remaining</th>
                                                <th className="text-right font-bold pb-3 px-2 uppercase tracking-tight text-[10px] w-32">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {quotaBreakdown.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="py-8 text-center text-slate-400 italic">No role quotas defined for this project.</td>
                                                </tr>
                                            ) : (
                                                quotaBreakdown.map(item => {
                                                    const remaining = roleFifoRemaining(item);
                                                    const consumed = Number(item.fifo_consumed_hours ?? item.allocated_hours ?? 0);
                                                    const percentUsed = (consumed / (item.quota_hours || 1)) * 100;
                                                    const isInactive = item.is_active === false;
                                                    const canDeactivate = !isInactive
                                                        && Number(item.quota_hours || 0) <= 0
                                                        && Number(item.task_count || 0) === 0;

                                                    return (
                                                        <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                                                            <td className="py-4 px-2">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-bold text-slate-900 dark:text-white">{item.role_name}</span>
                                                                        {isInactive ? (
                                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase">Nonaktif</Badge>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className="w-32">
                                                                        <Progress value={percentUsed} className="h-1" color={percentUsed > 90 ? 'bg-red-500' : 'bg-primary'} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-right font-medium text-slate-600 dark:text-slate-400">{formatHours(item.base_quota_hours)} <span className="text-[10px]">HRS</span></td>
                                                            <td className="py-4 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">+{formatHours(item.topup_hours)} <span className="text-[10px]">HRS</span></td>
                                                            <td className="py-4 px-2 text-right">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${Number(item.topup_hours || 0) > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                                    {Number(item.topup_hours || 0) > 0 ? 'Top Up' : 'Non Top Up'}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-2 text-right font-medium text-slate-600 dark:text-slate-400">{formatHours(item.quota_hours)} <span className="text-[10px]">HRS</span></td>
                                                            <td className="py-4 px-2 text-right font-bold text-slate-900 dark:text-white">
                                                                {formatHours(item.allocated_hours)} <span className="text-[10px]">HRS</span>
                                                            </td>
                                                            <td className="py-4 px-2 text-right font-medium text-slate-600 dark:text-slate-400">{formatHours(item.actual_hours)} <span className="text-[10px]">HRS</span></td>
                                                            <td className={`py-4 px-2 text-right font-bold ${remaining <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                {formatHours(remaining)} <span className="text-[10px]">HRS</span>
                                                            </td>
                                                            <td className="py-4 px-2 text-right">
                                                                {canDeactivate ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40"
                                                                        disabled={deactivatingQuotaId === item.id}
                                                                        onClick={() => handleDeactivateQuota(item)}
                                                                    >
                                                                        {deactivatingQuotaId === item.id ? (
                                                                            <Loader2 className="size-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Ban className="size-3.5" />
                                                                        )}
                                                                        Nonaktifkan
                                                                    </Button>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                </div>
                            )}
                        </CardContent>
                        <div className="p-6 pt-2 flex items-center justify-end border-t mt-4">
                            <Button variant="outline" onClick={closeQuotaDetails}>Close Details</Button>
                        </div>
                    </Card>
                </div>
            )}

            <Dialog open={isSwitchMhOpen} onOpenChange={setIsSwitchMhOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="size-5 text-primary" />
                            Switch MH antar kategori
                        </DialogTitle>
                        <DialogDescription>
                            Pindahkan sisa quota MH yang belum dialokasikan ke task. Total manhour project tidak berubah.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSwitchMh} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dari kategori</label>
                            <select
                                value={switchMhData.from_key}
                                onChange={(e) => {
                                    const fromKey = e.target.value;
                                    const nextTo = switchTargetOptions.find((o) => o.key !== fromKey)?.key || '';
                                    setSwitchMhData((prev) => ({ ...prev, from_key: fromKey, to_key: nextTo }));
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm"
                                required
                            >
                                {switchSourceOptions.length === 0 ? (
                                    <option value="">Tidak ada sumber quota tersedia</option>
                                ) : (
                                    switchSourceOptions.map((opt) => (
                                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ke kategori</label>
                            <select
                                value={switchMhData.to_key}
                                onChange={(e) => setSwitchMhData((prev) => ({ ...prev, to_key: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm"
                                required
                            >
                                <option value="">Pilih tujuan</option>
                                {switchTargetOptions.map((opt) => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah jam (MH)</label>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Contoh: 8"
                                value={switchMhData.hours}
                                onChange={(e) => setSwitchMhData((prev) => ({ ...prev, hours: e.target.value }))}
                                required
                            />
                            {switchMhData.from_key ? (
                                <p className="text-xs text-slate-500">
                                    Maksimal {formatHours(getTransferRemaining(switchMhData.from_key))} jam dari sumber ini.
                                </p>
                            ) : null}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSwitchMhOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSwitchingMh || switchSourceOptions.length === 0 || !switchMhData.to_key}
                            >
                                {isSwitchingMh ? 'Memindahkan…' : 'Pindahkan MH'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditAllocationModalOpen} onOpenChange={setIsEditAllocationModalOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Edit Pengeluaran</DialogTitle>
                        <DialogDescription>
                            Ubah kategori, user, nominal plan, atau keterangan. Realisasi tetap diatur lewat tombol Realization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Kategori</span>
                            <select
                                value={editAllocationForm.category_id}
                                onChange={(e) => setEditAllocationForm({ ...editAllocationForm, category_id: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm"
                                required
                            >
                                <option value="">Pilih kategori</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">User (opsional)</span>
                            <UserSearchInput
                                value={editAllocationForm.user_id}
                                onChange={(v) => setEditAllocationForm({ ...editAllocationForm, user_id: v })}
                                options={projectMemberOptions}
                                placeholder="Cari user..."
                            />
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Nominal plan (IDR)</span>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editAllocationForm.amount}
                                onChange={(e) => setEditAllocationForm({ ...editAllocationForm, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Keterangan</span>
                            <Input
                                value={editAllocationForm.description}
                                onChange={(e) => setEditAllocationForm({ ...editAllocationForm, description: e.target.value })}
                                placeholder="Opsional"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsEditAllocationModalOpen(false);
                                setEditingAllocation(null);
                            }}
                        >
                            Batal
                        </Button>
                        <Button type="button" onClick={submitEditAllocation} disabled={isSavingEditAllocation}>
                            {isSavingEditAllocation ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRealizationModalOpen} onOpenChange={setIsRealizationModalOpen}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>Set Realization Amount</DialogTitle>
                        <DialogDescription>
                            {selectedAllocationForRealization
                                ? `Input nominal realisasi untuk kategori "${selectedAllocationForRealization.category_name}".`
                                : 'Input nominal realisasi.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/30">
                            <p className="text-xs text-slate-500">Planned Amount</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {selectedAllocationForRealization ? formatCurrency(selectedAllocationForRealization.amount || 0) : '-'}
                            </p>
                        </div>
                        <label className="space-y-2 block">
                            <span className="text-sm font-medium">Realization Amount (IDR)</span>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={realizationAmountInput}
                                onChange={(e) => setRealizationAmountInput(e.target.value)}
                                placeholder="0"
                            />
                        </label>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsRealizationModalOpen(false);
                                setSelectedAllocationForRealization(null);
                                setRealizationAmountInput('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={submitRealization} disabled={isSavingRealization}>
                            {isSavingRealization ? 'Saving...' : 'Save Realization'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
