import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
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
    Plug,
    Copy,
    Check,
    RefreshCw,
    Send,
    Eye,
    EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ManhourBucketBreakdown from '@/components/ManhourBucketBreakdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Methodology</th>
                    <th className="px-4 py-3 font-medium text-right">Quotation value</th>
                    <th className="px-4 py-3 font-medium text-right w-28">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map((proj) => (
                    <tr
                        key={proj.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                        onClick={() => onSelectProject(proj.id)}
                    >
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <ProjectCompanyIcon
                                    logoUrl={proj.company_logo_url}
                                    projectName={proj.name}
                                />
                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                    {proj.name}
                                </span>
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <Badge
                                variant="outline"
                                className={`font-normal ${projectStatusBadgeClass[proj.status] || projectStatusBadgeClass.Planning}`}
                            >
                                {proj.status || 'Planning'}
                            </Badge>
                        </td>
                        <td className="px-4 py-3">
                            {proj.methodology ? (
                                <Badge variant="outline" className="font-normal">
                                    {proj.methodology}
                                </Badge>
                            ) : (
                                <span className="text-slate-400">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(proj.quotation_value || 0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectProject(proj.id);
                                }}
                            >
                                Open
                                <ArrowUpRight className="size-3.5" />
                            </Button>
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
    const { user } = useAuth();
    const canUpdate = hasPermission(user, 'finance_monitoring.update');
    const [projects, setProjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [projectRolesList, setProjectRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [summary, setSummary] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [allocationTab, setAllocationTab] = useState('expense');

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

    // Integration / API states
    const [integration, setIntegration] = useState(null);
    const [integrationLoading, setIntegrationLoading] = useState(false);
    const [integrationError, setIntegrationError] = useState(null);
    const [webhookUrlInput, setWebhookUrlInput] = useState('');
    const [savingWebhook, setSavingWebhook] = useState(false);
    const [togglingActive, setTogglingActive] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [testingWebhook, setTestingWebhook] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [copiedKey, setCopiedKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const selectedProjectData = useMemo(
        () => projects.find((project) => project.id === selectedProject) || null,
        [projects, selectedProject]
    );
    const isWaterfallProject = useMemo(() => {
        const methodology = (selectedProjectData?.methodology ?? summary?.methodology ?? '').toLowerCase();
        return methodology.includes('waterfall');
    }, [selectedProjectData, summary]);

    const loadIntegration = useCallback(async (projectId) => {
        const id = Number(projectId);
        if (!id) return;
        setIntegrationLoading(true);
        setIntegrationError(null);
        setIntegration(null);
        setTestResult(null);
        setShowApiKey(false);
        setShowSecret(false);
        try {
            const res = await fetchAPI(`/projects/${id}/integration`);
            setIntegration(res.data);
            setWebhookUrlInput(res.data.webhook_url || '');
        } catch (e) {
            setIntegrationError('Gagal memuat konfigurasi integrasi.');
        } finally {
            setIntegrationLoading(false);
        }
    }, []);

    const toggleActive = async () => {
        if (!selectedProject || !integration) return;
        setTogglingActive(true);
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/integration`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: !integration.is_active }),
            });
            setIntegration(res.data);
        } catch (e) {
            alert('Gagal mengubah status integrasi: ' + e.message);
        } finally {
            setTogglingActive(false);
        }
    };

    const saveWebhookUrl = async () => {
        if (!selectedProject) return;
        setSavingWebhook(true);
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/integration`, {
                method: 'PUT',
                body: JSON.stringify({ webhook_url: webhookUrlInput || null }),
            });
            setIntegration(res.data);
        } catch (e) {
            alert('Gagal menyimpan webhook URL: ' + e.message);
        } finally {
            setSavingWebhook(false);
        }
    };

    const regenerateApiKey = async () => {
        if (!selectedProject) return;
        if (!window.confirm('API key lama akan langsung tidak berlaku. Lanjutkan?')) return;
        setRegenerating(true);
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/integration/regenerate-key`, { method: 'POST' });
            setIntegration(res.data);
            setShowApiKey(true);
        } catch (e) {
            alert('Gagal regenerate key: ' + e.message);
        } finally {
            setRegenerating(false);
        }
    };

    const testWebhook = async () => {
        if (!selectedProject) return;
        setTestingWebhook(true);
        setTestResult(null);
        try {
            const res = await fetchAPI(`/projects/${selectedProject}/integration/test`, { method: 'POST' });
            setTestResult({ success: res.success, message: res.message });
            setIntegration((prev) => prev ? {
                ...prev,
                webhook_test_status: res.success ? 'success' : 'failed',
                webhook_test_sent_at: new Date().toISOString(),
            } : prev);
        } catch (e) {
            setTestResult({ success: false, message: e.message });
        } finally {
            setTestingWebhook(false);
        }
    };

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(''), 2000);
        });
    };

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
        loadIntegration(project.id);
    }, [projectIdParam, projects, navigate, loadProjectFinance, loadIntegration]);

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

    const allocationPercentage = summary ? (summary.total_allocated / (summary.quotation_value || 1)) * 100 : 0;
    const allocations = summary?.allocations || [];
    const expenseAllocations = allocations.filter((alloc) => !alloc.is_topup);
    const incomeAllocations = allocations.filter((alloc) => alloc.is_topup);
    const activeAllocations = allocationTab === 'income' ? incomeAllocations : expenseAllocations;
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
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-16">
                {!isDetailView ? (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Finance Monitoring
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                                    Track quotation, cost allocations, margin, and manhour quota per project.
                                </p>
                            </div>
                            <div className="relative w-full sm:w-72 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                <Input
                                    placeholder="Search projects..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardContent className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
                                    <Loader2 className="size-5 animate-spin" />
                                    Loading projects…
                                </CardContent>
                            </Card>
                        ) : filteredProjects.length === 0 ? (
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardContent className="py-16 text-center text-slate-500 text-sm">
                                    {searchTerm ? 'No projects match your search.' : 'No projects available.'}
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold">Active projects</CardTitle>
                                        <CardDescription>
                                            Planning or in progress · {activeProjects.length} project(s)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {activeProjects.length === 0 ? (
                                            <div className="py-10 text-center text-slate-500 text-sm border-t border-slate-100 dark:border-slate-800">
                                                {searchTerm ? 'No active projects match your search.' : 'No active projects.'}
                                            </div>
                                        ) : (
                                            <FinanceProjectTable projects={activeProjects} onSelectProject={selectProject} />
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold">Completed projects</CardTitle>
                                        <CardDescription>
                                            Marked as done on board · {completedProjects.length} project(s)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {completedProjects.length === 0 ? (
                                            <div className="py-10 text-center text-slate-500 text-sm border-t border-slate-100 dark:border-slate-800">
                                                {searchTerm ? 'No completed projects match your search.' : 'No completed projects.'}
                                            </div>
                                        ) : (
                                            <FinanceProjectTable projects={completedProjects} onSelectProject={selectProject} />
                                        )}
                                    </CardContent>
                                </Card>

                                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                    Showing {filteredProjects.length} of {projects.length} project(s)
                                    {searchTerm ? ` matching "${searchTerm}"` : ''}
                                </p>
                            </>
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
                                ) : (
                                    <Card className="bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 cursor-pointer hover:border-blue-400 transition-all"
                                         onClick={loadQuotaBreakdown}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardDescription className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Manhour Quota Status</CardDescription>
                                                    <CardTitle className="text-xl mt-1">
                                                        {summary.allocated_hours}/{summary.total_manhours} <span className="text-sm font-normal text-slate-500 uppercase ml-1">Hours</span>
                                                    </CardTitle>
                                                    {summary.has_topup_manhours ? (
                                                        <div className="mt-2 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5">
                                                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                                                Top Up MH +{formatHours(summary.topup_hours_total)}h
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Remaining</div>
                                                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                        {formatHours(summary.fifo_remaining_hours ?? summary.remaining_hours)}{' '}
                                                        <span className="text-xs font-normal opacity-70">Hrs (FIFO)</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Progress value={(summary.allocated_hours / (summary.total_manhours || 1)) * 100} className="h-1.5 mt-3" />
                                        </CardHeader>
                                    </Card>
                                )}
                            </div>

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
                                            onClick={() => setAllocationTab('expense')}
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
                                            onClick={() => setAllocationTab('income')}
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
                                                    activeAllocations.map(alloc => (
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
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
                            <Button variant="outline" onClick={() => setIsQuotaDetailsOpen(false)}>Close Details</Button>
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

            {/* ── Integrasi API Section ── */}
            {selectedProject && (
                <div className="mt-6 px-4 md:px-6 pb-10">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Plug className="size-4 text-primary" />
                                <CardTitle className="text-base">Integrasi API</CardTitle>
                            </div>
                            <CardDescription>
                                Hubungkan aplikasi lain ke finance monitoring project ini melalui API.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {integrationLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                                    <Loader2 className="size-4 animate-spin" /> Memuat konfigurasi...
                                </div>
                            ) : integrationError ? (
                                <div className="flex items-center gap-2 text-sm text-rose-500 py-4">
                                    <X className="size-4" /> {integrationError}
                                    <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={() => loadIntegration(selectedProject)}>
                                        Coba lagi
                                    </Button>
                                </div>
                            ) : integration ? (
                                <div className="space-y-6">

                                    {/* Status row */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-slate-500">Status integrasi:</span>
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${integration.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {integration.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                        {canUpdate && (
                                            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={toggleActive} disabled={togglingActive}>
                                                {togglingActive ? <Loader2 className="size-3 animate-spin" /> : (integration.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                                            </Button>
                                        )}
                                        {integration.webhook_last_status && (
                                            <span className="text-xs text-slate-400 ml-2">
                                                Live webhook:
                                                <span className={`ml-1 font-medium ${integration.webhook_last_status === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {integration.webhook_last_status}
                                                </span>
                                                {integration.webhook_last_sent_at && ` · ${new Date(integration.webhook_last_sent_at).toLocaleString('id-ID')}`}
                                            </span>
                                        )}
                                        {integration.webhook_test_status && (
                                            <span className="text-xs text-slate-400">
                                                Test:
                                                <span className={`ml-1 font-medium ${integration.webhook_test_status === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {integration.webhook_test_status}
                                                </span>
                                                {integration.webhook_test_sent_at && ` · ${new Date(integration.webhook_test_sent_at).toLocaleString('id-ID')}`}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left: Inbound API */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">
                                                Inbound — App lain → HubTask
                                            </h4>

                                            {/* Endpoint URL */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Endpoint URL</label>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                        {integration.inbound_endpoint}
                                                    </code>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8"
                                                        onClick={() => copyToClipboard(integration.inbound_endpoint, 'endpoint')}>
                                                        {copiedKey === 'endpoint' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* API Key */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">API Key (X-Api-Key header)</label>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                        {showApiKey ? integration.inbound_api_key : '•'.repeat(24)}
                                                    </code>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8"
                                                        onClick={() => setShowApiKey((v) => !v)}>
                                                        {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                    </Button>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8"
                                                        onClick={() => copyToClipboard(integration.inbound_api_key, 'apikey')}>
                                                        {copiedKey === 'apikey' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                    </Button>
                                                    {canUpdate && (
                                                        <Button size="icon" variant="outline" className="shrink-0 size-8"
                                                            onClick={regenerateApiKey} disabled={regenerating}
                                                            title="Regenerate API Key">
                                                            <RefreshCw className={`size-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">Kirim header: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-Api-Key: {'{api_key}'}</code></p>
                                            </div>

                                            {/* Webhook Secret */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook Secret (HMAC-SHA256)</label>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                        {showSecret ? integration.webhook_secret : '•'.repeat(20)}
                                                    </code>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8"
                                                        onClick={() => setShowSecret((v) => !v)}>
                                                        {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                    </Button>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8"
                                                        onClick={() => copyToClipboard(integration.webhook_secret, 'secret')}>
                                                        {copiedKey === 'secret' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-slate-400">Verifikasi header <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-Webhook-Signature</code> dari HubTask.</p>
                                            </div>
                                        </div>

                                        {/* Right: Outbound Webhook */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">
                                                Outbound — HubTask → App lain
                                            </h4>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook URL Tujuan</label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        className="text-sm h-9"
                                                        placeholder="https://app-kamu.com/webhook/hubtask"
                                                        value={webhookUrlInput}
                                                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                                                        disabled={!canUpdate}
                                                    />
                                                    {canUpdate && (
                                                        <Button size="sm" className="shrink-0 h-9" onClick={saveWebhookUrl} disabled={savingWebhook}>
                                                            {savingWebhook ? <Loader2 className="size-3.5 animate-spin" /> : 'Simpan'}
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">
                                                    HubTask akan POST ke URL ini setiap ada perubahan allocation.
                                                </p>
                                            </div>

                                            {/* Events info */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Events yang dikirim</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['allocation.created', 'allocation.updated', 'allocation.realized', 'allocation.paid', 'allocation.deleted'].map((e) => (
                                                        <span key={e} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{e}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Test webhook */}
                                            {canUpdate && integration.webhook_url && (
                                                <div className="space-y-2">
                                                    <Button variant="outline" size="sm" className="gap-1.5 h-8"
                                                        onClick={testWebhook} disabled={testingWebhook}>
                                                        {testingWebhook
                                                            ? <Loader2 className="size-3.5 animate-spin" />
                                                            : <Send className="size-3.5" />}
                                                        Test Webhook
                                                    </Button>
                                                    {testResult && (
                                                        <p className={`text-xs flex items-center gap-1 ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {testResult.success ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                                            {testResult.message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* API Usage Example */}
                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 select-none">
                                            Contoh penggunaan API
                                        </summary>
                                        <div className="mt-3 space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                            <div>
                                                <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">Tambah allocation (POST)</p>
                                                <pre className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-slate-700 dark:text-slate-300">{`curl -X POST ${integration.inbound_endpoint} \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"category":"Development","amount":5000000,"description":"Sprint 1"}'`}</pre>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">Edit allocation (PUT)</p>
                                                <pre className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-slate-700 dark:text-slate-300">{`curl -X PUT ${integration.inbound_endpoint}/{id} \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":6000000,"realized_amount":5500000,"paid_amount":5500000}'`}</pre>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
