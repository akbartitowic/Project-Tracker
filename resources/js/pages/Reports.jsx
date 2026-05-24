import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import {
    Briefcase,
    Building2,
    FileText,
    TrendingUp,
    Users,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    Loader2,
    ChevronDown,
    ChevronRight,
    Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ManhourBucketBreakdown from '@/components/ManhourBucketBreakdown';

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);

const formatHours = (value) => {
    const num = Number(value || 0);
    return Number.isInteger(num) ? `${num}` : num.toFixed(1);
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

/** Margin % uses 2 decimals so small expenses are not shown as misleading 100%. */
const formatMarginPercent = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(2)}%`;
};

const formatMonthLabel = (ym) => {
    if (!ym) return '—';
    const [y, m] = String(ym).split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    if (Number.isNaN(date.getTime())) return ym;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

function healthFromBurn(burn, hasQuota) {
    if (!hasQuota) return { label: 'No quota', tone: 'slate' };
    if (burn > 100) return { label: 'Over budget', tone: 'rose' };
    if (burn > 85) return { label: 'At risk', tone: 'amber' };
    if (burn <= 80) return { label: 'On track', tone: 'emerald' };
    return { label: 'Watch', tone: 'blue' };
}

const healthBadgeClass = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
    slate: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-600',
};

function SectionTable({ children, className = '' }) {
    return (
        <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
            <table className="w-full text-left text-sm">{children}</table>
        </div>
    );
}

function expenseFilterDefaults() {
    const today = new Date();
    const year = today.getFullYear();
    return {
        yearStart: `${year}-01-01`,
        today: today.toISOString().slice(0, 10),
        currentMonth: today.toISOString().slice(0, 7),
    };
}

function ExpenseAmountCells({ row }) {
    return (
        <>
            <td className="px-4 py-3 text-right text-slate-600">{row.line_count}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                {formatCurrency(row.total_amount)}
            </td>
            <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                {formatCurrency(row.paid_amount)}
                <span className="block text-[10px] text-slate-400 font-normal">{row.paid_count} baris</span>
            </td>
            <td className="px-4 py-3 text-right text-amber-800 dark:text-amber-400">
                {formatCurrency(row.unpaid_amount)}
                <span className="block text-[10px] text-slate-400 font-normal">{row.unpaid_count} baris</span>
            </td>
        </>
    );
}

function ExpenseProjectRows({ projects, parentKey, compact = false }) {
    if (!projects?.length) return null;
    const cellClass = compact ? 'py-2' : 'py-3';
    return projects.map((proj) => (
        <tr key={`${parentKey}-${proj.project_id}`} className="bg-slate-50/40 dark:bg-slate-800/20 text-sm">
            <td className={`px-4 ${cellClass} pl-10 text-slate-600 dark:text-slate-300`}>{proj.project_name}</td>
            <td className={`px-4 ${cellClass} text-right text-slate-500`}>{proj.line_count}</td>
            <td className={`px-4 ${cellClass} text-right text-slate-700 dark:text-slate-200`}>
                {formatCurrency(proj.total_amount)}
            </td>
            <td className={`px-4 ${cellClass} text-right text-emerald-600 dark:text-emerald-400`}>
                {formatCurrency(proj.paid_amount)}
            </td>
            <td className={`px-4 ${cellClass} text-right text-amber-700 dark:text-amber-400`}>
                {formatCurrency(proj.unpaid_amount)}
            </td>
        </tr>
    ));
}

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [efficiencyData, setEfficiencyData] = useState([]);
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [companyProjectRows, setCompanyProjectRows] = useState([]);
    const [companyFinancials, setCompanyFinancials] = useState([]);
    const [companyFinancialTotals, setCompanyFinancialTotals] = useState(null);
    const [expenseByUser, setExpenseByUser] = useState([]);
    const [expenseByCategory, setExpenseByCategory] = useState([]);
    const [expensePaymentTotals, setExpensePaymentTotals] = useState(null);
    const [expenseFilterMeta, setExpenseFilterMeta] = useState(null);
    const [expenseLoading, setExpenseLoading] = useState(false);
    const expenseDefaults = useMemo(() => expenseFilterDefaults(), []);
    const [expenseFilterMode, setExpenseFilterMode] = useState('ytd');
    const [expenseMonth, setExpenseMonth] = useState(expenseDefaults.currentMonth);
    const [expenseStartDate, setExpenseStartDate] = useState(expenseDefaults.yearStart);
    const [expenseEndDate, setExpenseEndDate] = useState(expenseDefaults.today);
    const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set());
    const [expandedCompanyIds, setExpandedCompanyIds] = useState(() => new Set());
    const [expandedExpenseUserIds, setExpandedExpenseUserIds] = useState(() => new Set());
    const [expandedExpenseCategoryIds, setExpandedExpenseCategoryIds] = useState(() => new Set());

    const loadExpenseBreakdown = useCallback(async () => {
        setExpenseLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('filter_mode', expenseFilterMode);
            if (expenseFilterMode === 'month') {
                params.set('month', expenseMonth);
            } else if (expenseFilterMode === 'custom') {
                params.set('start_date', expenseStartDate);
                params.set('end_date', expenseEndDate);
            }
            const expensePayRes = await fetchAPI(`/reports/expense-payment-breakdown?${params.toString()}`);
            if (Array.isArray(expensePayRes.by_user)) setExpenseByUser(expensePayRes.by_user);
            if (Array.isArray(expensePayRes.by_category)) setExpenseByCategory(expensePayRes.by_category);
            if (expensePayRes.totals) setExpensePaymentTotals(expensePayRes.totals);
            if (expensePayRes.filters) setExpenseFilterMeta(expensePayRes.filters);
            setExpandedExpenseUserIds(new Set());
            setExpandedExpenseCategoryIds(new Set());
        } catch (err) {
            console.error('Failed to load expense breakdown', err);
        } finally {
            setExpenseLoading(false);
        }
    }, [expenseFilterMode, expenseMonth, expenseStartDate, expenseEndDate]);

    useEffect(() => {
        const loadReportData = async () => {
            setLoading(true);
            try {
                const [statsRes, effRes, trendRes, companyRes, companyFinRes] = await Promise.all([
                    fetchAPI('/stats'),
                    fetchAPI('/reports/efficiency'),
                    fetchAPI('/reports/revenue-trend'),
                    fetchAPI('/reports/company-projects'),
                    fetchAPI('/reports/company-financials'),
                ]);
                if (statsRes.data) setStats(statsRes.data);
                if (effRes.data) setEfficiencyData(effRes.data);
                if (trendRes.data) setRevenueTrend(trendRes.data);
                if (companyRes.data) setCompanyProjectRows(companyRes.data);
                if (companyFinRes.data) setCompanyFinancials(companyFinRes.data);
                if (companyFinRes.totals) setCompanyFinancialTotals(companyFinRes.totals);
            } catch (err) {
                console.error('Failed to load reports data', err);
            } finally {
                setLoading(false);
            }
        };
        loadReportData();
    }, []);

    useEffect(() => {
        if (expenseFilterMode === 'custom') return;
        loadExpenseBreakdown();
    }, [expenseFilterMode, expenseMonth, loadExpenseBreakdown]);

    const toggleExpenseUserExpand = (userId) => {
        setExpandedExpenseUserIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleExpenseCategoryExpand = (categoryId) => {
        setExpandedExpenseCategoryIds((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) next.delete(categoryId);
            else next.add(categoryId);
            return next;
        });
    };

    const taskStatusRows = useMemo(() => {
        const counts = stats?.taskStatusCounts || {};
        const total = Object.values(counts).reduce((s, n) => s + Number(n || 0), 0);
        return ['To Do', 'In Progress', 'Review', 'Reopen', 'Done'].map((status) => {
            const count = Number(counts[status] || 0);
            return {
                status,
                count,
                share: total > 0 ? (count / total) * 100 : 0,
            };
        });
    }, [stats]);

    const userPaymentTotals = useMemo(() => {
        const empty = {
            line_count: 0,
            total_amount: 0,
            paid_amount: 0,
            unpaid_amount: 0,
            paid_count: 0,
            unpaid_count: 0,
        };
        if (expenseByUser.length === 0) return empty;
        return expenseByUser.reduce(
            (acc, row) => ({
                line_count: acc.line_count + Number(row.line_count || 0),
                total_amount: acc.total_amount + Number(row.total_amount || 0),
                paid_amount: acc.paid_amount + Number(row.paid_amount || 0),
                unpaid_amount: acc.unpaid_amount + Number(row.unpaid_amount || 0),
                paid_count: acc.paid_count + Number(row.paid_count || 0),
                unpaid_count: acc.unpaid_count + Number(row.unpaid_count || 0),
            }),
            empty
        );
    }, [expenseByUser]);

    const projectRows = useMemo(() => {
        return efficiencyData.map((p) => {
            const quota = Number(p.estimated_hours || 0);
            const allocated = Number(p.allocated_hours || 0);
            const actual = Number(p.actual_hours || 0);
            const burn = Number(p.burn_percentage || 0);
            const hasQuota = quota > 0;
            const variance = hasQuota ? allocated - quota : actual - allocated;
            const health = healthFromBurn(burn, hasQuota);
            return {
                ...p,
                quota,
                allocated,
                actual,
                burn,
                hasQuota,
                variance,
                health,
                manhour_buckets: p.manhour_buckets || [],
                has_topup: Boolean(p.has_topup),
                base_quota_hours: Number(p.base_quota_hours ?? quota),
                topup_total_hours: Number(p.topup_total_hours ?? 0),
                mh_overflow_hours: Number(p.mh_overflow_hours ?? 0),
            };
        });
    }, [efficiencyData]);

    const toggleProjectExpand = (projectId) => {
        setExpandedProjectIds((prev) => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    const toggleCompanyExpand = (companyKey) => {
        setExpandedCompanyIds((prev) => {
            const next = new Set(prev);
            if (next.has(companyKey)) next.delete(companyKey);
            else next.add(companyKey);
            return next;
        });
    };

    const companyFinancialKey = (row) => (row.company_id != null ? String(row.company_id) : '__none__');

    const portfolioSummary = useMemo(() => {
        const onTrack = projectRows.filter((p) => p.health.tone === 'emerald').length;
        const atRisk = projectRows.filter((p) => ['amber', 'rose'].includes(p.health.tone)).length;
        const totalQuota = projectRows.reduce((s, p) => s + p.quota, 0);
        const totalAllocated = projectRows.reduce((s, p) => s + p.allocated, 0);
        const totalActual = projectRows.reduce((s, p) => s + p.actual, 0);
        return { onTrack, atRisk, totalQuota, totalAllocated, totalActual };
    }, [projectRows]);

    const portfolioByCompany = useMemo(() => {
        const groups = new Map();
        for (const p of projectRows) {
            const companyKey = p.company_id != null ? String(p.company_id) : '__none__';
            const companyName = p.company_name || 'Tanpa perusahaan';
            if (!groups.has(companyKey)) {
                groups.set(companyKey, {
                    company_id: p.company_id,
                    company_name: companyName,
                    project_count: 0,
                    quota: 0,
                    allocated: 0,
                });
            }
            const g = groups.get(companyKey);
            g.project_count += 1;
            g.quota += p.quota;
            g.allocated += p.allocated;
        }
        return Array.from(groups.values()).sort(
            (a, b) => b.quota - a.quota || String(a.company_name).localeCompare(String(b.company_name))
        );
    }, [projectRows]);

    const revenueTotals = useMemo(() => {
        return revenueTrend.reduce(
            (acc, row) => ({
                billed: acc.billed + Number(row.billed || 0),
                cost: acc.cost + Number(row.cost || 0),
            }),
            { billed: 0, cost: 0 }
        );
    }, [revenueTrend]);

    const companyProjectTotals = useMemo(() => {
        return companyProjectRows.reduce(
            (acc, row) => ({
                companies: acc.companies + 1,
                projects: acc.projects + Number(row.total_projects || 0),
                active: acc.active + Number(row.active_projects || 0),
                done: acc.done + Number(row.done_projects || 0),
            }),
            { companies: 0, projects: 0, active: 0, done: 0 }
        );
    }, [companyProjectRows]);

    const companyStatusBadgeClass = {
        Active: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
        'All done': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-[50vh] text-slate-500">
                <Loader2 className="size-8 animate-spin text-primary mr-3" />
                Loading reports…
            </div>
        );
    }

    const s = stats || {};

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Reports Overview
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                            High-level portfolio snapshot with detailed breakdowns by project, task status, and monthly financial trend.
                        </p>
                    </div>
                    <Button asChild className="gap-2 shrink-0">
                        <Link to="/generate-report">
                            <FileText className="size-4" />
                            Generate project PDF
                            <ArrowUpRight className="size-4 opacity-70" />
                        </Link>
                    </Button>
                </div>

                {/* Executive summary */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Executive summary</CardTitle>
                        <CardDescription>Key metrics across the entire workspace</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                    <td colSpan={4} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        Portfolio
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 w-[28%]">Total projects</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{s.totalProjects ?? 0}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 w-[28%]">Active / Done</td>
                                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                                        <span className="font-semibold">{s.activeProjects ?? 0}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span>{s.doneProjects ?? 0}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Methodology mix</td>
                                    <td className="px-4 py-3 text-slate-900 dark:text-white" colSpan={3}>
                                        Agile Scrum <span className="font-semibold">{s.scrumProjects ?? 0}</span>
                                        <span className="text-slate-300 dark:text-slate-600 mx-2">·</span>
                                        Waterfall <span className="font-semibold">{s.waterfallProjects ?? 0}</span>
                                    </td>
                                </tr>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                    <td colSpan={4} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        Delivery &amp; effort
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Open tasks</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white" colSpan={3}>
                                        {s.activeTasks ?? 0}
                                    </td>
                                </tr>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                                    <td colSpan={4} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        Allocated vs quota (per company)
                                    </td>
                                </tr>
                                {portfolioByCompany.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-slate-400 italic text-sm">
                                            Tidak ada data project.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {portfolioByCompany.map((row) => {
                                            const usedPct =
                                                row.quota > 0 ? (row.allocated / row.quota) * 100 : null;
                                            return (
                                                <tr key={row.company_id ?? row.company_name}>
                                                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                                        <span className="flex items-center gap-2">
                                                            <Building2 className="size-3.5 text-slate-400 shrink-0" />
                                                            {row.company_name}
                                                        </span>
                                                        <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                                                            {row.project_count} project
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-900 dark:text-white" colSpan={3}>
                                                        <span className="font-semibold">{formatHours(row.allocated)}</span>
                                                        <span className="text-slate-400 mx-1">/</span>
                                                        <span>{formatHours(row.quota)} hrs</span>
                                                        {usedPct != null && (
                                                            <span
                                                                className={`ml-2 text-xs font-medium ${
                                                                    usedPct > 100
                                                                        ? 'text-rose-600 dark:text-rose-400'
                                                                        : usedPct > 85
                                                                          ? 'text-amber-600 dark:text-amber-400'
                                                                          : 'text-slate-500'
                                                                }`}
                                                            >
                                                                ({formatPercent(usedPct)} used)
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/30 font-semibold">
                                            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">Total portfolio</td>
                                            <td className="px-4 py-2.5 text-slate-900 dark:text-white" colSpan={3}>
                                                <span>{formatHours(portfolioSummary.totalAllocated)}</span>
                                                <span className="text-slate-400 mx-1">/</span>
                                                <span>{formatHours(portfolioSummary.totalQuota)} hrs</span>
                                                {portfolioSummary.totalQuota > 0 && (
                                                    <span className="ml-2 text-xs text-slate-500 font-normal">
                                                        ({formatPercent(
                                                            (portfolioSummary.totalAllocated / portfolioSummary.totalQuota) * 100
                                                        )}{' '}
                                                        used)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </>
                                )}
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Project health</td>
                                    <td className="px-4 py-3" colSpan={3}>
                                        <span className="inline-flex items-center gap-1.5 mr-4">
                                            <CheckCircle2 className="size-4 text-emerald-500" />
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{portfolioSummary.onTrack}</span>
                                            <span className="text-slate-500">on track</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <AlertTriangle className="size-4 text-amber-500" />
                                            <span className="font-semibold text-amber-600 dark:text-amber-400">{portfolioSummary.atRisk}</span>
                                            <span className="text-slate-500">at risk / over</span>
                                        </span>
                                    </td>
                                </tr>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                    <td colSpan={4} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        Financial (high level)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Total quotation value</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(s.totalRevenue)}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Net margin</td>
                                    <td className="px-4 py-3">
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.totalMargin)}</span>
                                        <span className="text-xs text-slate-500 ml-2">({formatMarginPercent(s.marginPercentage)})</span>
                                    </td>
                                </tr>
                            </tbody>
                        </SectionTable>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick KPI strip */}
                    <Card className="lg:col-span-3 border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                                {[
                                    { icon: Briefcase, label: 'Projects', value: s.totalProjects ?? 0, sub: `${s.activeProjects ?? 0} active` },
                                    { icon: Users, label: 'Open tasks', value: s.activeTasks ?? 0, sub: 'Not done' },
                                    { icon: TrendingUp, label: 'Margin', value: formatMarginPercent(s.marginPercentage), sub: formatCurrency(s.totalMargin) },
                                ].map(({ icon: Icon, label, value, sub }) => (
                                    <div key={label} className="px-5 py-4 flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Company project summary */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Projects by company</CardTitle>
                        <CardDescription>
                            How many converted projects each company has, and whether delivery is still active or all done
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Company</th>
                                    <th className="px-4 py-3 font-medium text-right">Total projects</th>
                                    <th className="px-4 py-3 font-medium text-right">Active</th>
                                    <th className="px-4 py-3 font-medium text-right">All done</th>
                                    <th className="px-4 py-3 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {companyProjectRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">
                                            No company-linked projects yet. Projects appear here after presale conversion.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {companyProjectRows.map((row) => (
                                            <tr key={row.company_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {row.logo_url ? (
                                                            <img
                                                                src={row.logo_url}
                                                                alt={row.company_name}
                                                                className="size-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="size-9 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                                                <Building2 className="size-4" />
                                                            </div>
                                                        )}
                                                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                                                            {row.company_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                                                    {row.total_projects}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                                                    {row.active_projects}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                                    {row.done_projects}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={companyStatusBadgeClass[row.status] || companyStatusBadgeClass.Active}
                                                    >
                                                        {row.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                                            <td className="px-4 py-3 text-slate-900 dark:text-white">
                                                Total ({companyProjectTotals.companies} companies)
                                            </td>
                                            <td className="px-4 py-3 text-right">{companyProjectTotals.projects}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                                                {companyProjectTotals.active}
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                                                {companyProjectTotals.done}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-500 font-normal text-xs">
                                                Portfolio
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </SectionTable>
                    </CardContent>
                </Card>

                {/* Company financial breakdown */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Company financial breakdown</CardTitle>
                        <CardDescription>
                            Nilai quotation per company, pengeluaran alokasi (planning &amp; realized), dan margin — expand baris untuk detail per project
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-2 py-3 font-medium w-8" aria-label="Expand" />
                                    <th className="px-4 py-3 font-medium text-left">Company / Project</th>
                                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                                    <th className="px-4 py-3 font-medium text-right">Expense (plan)</th>
                                    <th className="px-4 py-3 font-medium text-right">Expense (real)</th>
                                    <th className="px-4 py-3 font-medium text-right">Margin</th>
                                    <th className="px-4 py-3 font-medium text-right">Margin %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {companyFinancials.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">
                                            No financial data available for companies.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {companyFinancials.map((company) => {
                                            const key = companyFinancialKey(company);
                                            const expanded = expandedCompanyIds.has(key);
                                            const marginClass =
                                                company.margin >= 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400';
                                            return (
                                                <Fragment key={key}>
                                                    <tr className="bg-slate-50/60 dark:bg-slate-800/25 hover:bg-slate-100/80 dark:hover:bg-slate-800/40">
                                                        <td className="px-2 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                                                                onClick={() => toggleCompanyExpand(key)}
                                                                aria-expanded={expanded}
                                                                aria-label={expanded ? 'Tutup breakdown project' : 'Buka breakdown project'}
                                                            >
                                                                {expanded ? (
                                                                    <ChevronDown className="size-4" />
                                                                ) : (
                                                                    <ChevronRight className="size-4" />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                {company.logo_url ? (
                                                                    <img
                                                                        src={company.logo_url}
                                                                        alt={company.company_name}
                                                                        className="size-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                                                                    />
                                                                ) : (
                                                                    <div className="size-9 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                                                        <Building2 className="size-4" />
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                                        {company.company_name}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                                        {company.project_count} project
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(company.revenue)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                            {formatCurrency(company.planning_expense)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                            {formatCurrency(company.realized_expense)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-semibold ${marginClass}`}>
                                                            {formatCurrency(company.margin)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-medium ${marginClass}`}>
                                                            {formatMarginPercent(company.margin_percentage)}
                                                        </td>
                                                    </tr>
                                                    {expanded &&
                                                        (company.projects || []).map((proj) => {
                                                            const projMarginClass =
                                                                proj.margin >= 0
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : 'text-rose-600 dark:text-rose-400';
                                                            return (
                                                                <tr
                                                                    key={proj.project_id}
                                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-sm"
                                                                >
                                                                    <td className="px-2 py-2" />
                                                                    <td className="px-4 py-2 pl-10">
                                                                        <p className="font-medium text-slate-800 dark:text-slate-200">
                                                                            {proj.project_name}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                                                            {proj.methodology || '—'}
                                                                            <span className="mx-1">·</span>
                                                                            {proj.status}
                                                                        </p>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right text-slate-900 dark:text-white">
                                                                        {formatCurrency(proj.revenue)}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right text-slate-500">
                                                                        {formatCurrency(proj.planning_expense)}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right text-slate-500">
                                                                        {formatCurrency(proj.realized_expense)}
                                                                    </td>
                                                                    <td className={`px-4 py-2 text-right font-medium ${projMarginClass}`}>
                                                                        {formatCurrency(proj.margin)}
                                                                    </td>
                                                                    <td className={`px-4 py-2 text-right ${projMarginClass}`}>
                                                                        {formatMarginPercent(proj.margin_percentage)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </Fragment>
                                            );
                                        })}
                                        {companyFinancialTotals && (
                                            <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold border-t border-slate-200 dark:border-slate-700">
                                                <td className="px-2 py-3" />
                                                <td className="px-4 py-3 text-slate-900 dark:text-white">
                                                    Total ({companyFinancialTotals.company_count} companies,{' '}
                                                    {companyFinancialTotals.project_count} projects)
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {formatCurrency(companyFinancialTotals.revenue)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {formatCurrency(companyFinancialTotals.planning_expense)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {formatCurrency(companyFinancialTotals.realized_expense)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right ${
                                                        companyFinancialTotals.margin >= 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-rose-600 dark:text-rose-400'
                                                    }`}
                                                >
                                                    {formatCurrency(companyFinancialTotals.margin)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right ${
                                                        companyFinancialTotals.margin >= 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-rose-600 dark:text-rose-400'
                                                    }`}
                                                >
                                                    {formatMarginPercent(companyFinancialTotals.margin_percentage)}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </SectionTable>
                        <p className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                            Revenue = quotation value project. Expense = alokasi non-top-up (planning: amount; realized: nilai realisasi jika sudah diisi di Finance Monitoring).
                            Margin % = (Revenue − Expense real) ÷ Revenue — ditampilkan 2 desimal agar expense kecil tidak terlihat sebagai 100%.
                        </p>
                    </CardContent>
                </Card>

                {/* Expense paid / unpaid by user & category */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Wallet className="size-4 text-primary" />
                            Pengeluaran per user &amp; kategori (Paid / Unpaid)
                        </CardTitle>
                        <CardDescription>
                            Total pengeluaran (realisasi jika sudah diisi, else plan) dari Finance Monitoring — breakdown status pembayaran
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Rentang</p>
                                    <select
                                        value={expenseFilterMode}
                                        onChange={(e) => setExpenseFilterMode(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                                    >
                                        <option value="ytd">Tahun berjalan (1 Jan – hari ini)</option>
                                        <option value="month">Per bulan</option>
                                        <option value="custom">Tanggal kustom</option>
                                    </select>
                                </div>
                                {expenseFilterMode === 'month' && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Bulan</p>
                                        <Input
                                            type="month"
                                            value={expenseMonth}
                                            onChange={(e) => setExpenseMonth(e.target.value)}
                                            className="w-[180px]"
                                        />
                                    </div>
                                )}
                                {expenseFilterMode === 'custom' && (
                                    <>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Dari</p>
                                            <Input
                                                type="date"
                                                value={expenseStartDate}
                                                onChange={(e) => setExpenseStartDate(e.target.value)}
                                                className="w-[160px]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Sampai</p>
                                            <Input
                                                type="date"
                                                value={expenseEndDate}
                                                onChange={(e) => setExpenseEndDate(e.target.value)}
                                                className="w-[160px]"
                                            />
                                        </div>
                                        <Button type="button" size="sm" onClick={loadExpenseBreakdown} disabled={expenseLoading}>
                                            Terapkan
                                        </Button>
                                    </>
                                )}
                                {expenseLoading && (
                                    <span className="text-xs text-slate-500 flex items-center gap-1 pb-2">
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Memuat…
                                    </span>
                                )}
                            </div>
                            {expenseFilterMeta && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Periode aktif: <span className="font-semibold">{expenseFilterMeta.label}</span>
                                    {' '}({expenseFilterMeta.start_date} → {expenseFilterMeta.end_date})
                                </p>
                            )}
                        </div>

                        {expensePaymentTotals && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/30">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                                        {formatCurrency(expensePaymentTotals.total_amount)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{expensePaymentTotals.line_count} baris</p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 p-3 bg-emerald-50/60 dark:bg-emerald-950/20">
                                    <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Paid</p>
                                    <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                                        {formatCurrency(expensePaymentTotals.paid_amount)}
                                    </p>
                                    <p className="text-[10px] text-emerald-600/80 mt-0.5">{expensePaymentTotals.paid_count} baris</p>
                                </div>
                                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 p-3 bg-amber-50/60 dark:bg-amber-950/20">
                                    <p className="text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-400">Unpaid</p>
                                    <p className="text-lg font-bold text-amber-900 dark:text-amber-300 tabular-nums">
                                        {formatCurrency(expensePaymentTotals.unpaid_amount)}
                                    </p>
                                    <p className="text-[10px] text-amber-700/80 mt-0.5">{expensePaymentTotals.unpaid_count} baris</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/30 flex flex-col justify-center">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Paid share</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                                        {expensePaymentTotals.total_amount > 0
                                            ? formatPercent((expensePaymentTotals.paid_amount / expensePaymentTotals.total_amount) * 100)
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                                <Users className="size-4 text-slate-500" />
                                Per user
                            </h3>
                            <p className="text-[11px] text-slate-500 mb-2">Hanya pengeluaran yang sudah punya user.</p>
                            <SectionTable>
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="px-2 py-3 font-medium w-8" aria-label="Expand" />
                                        <th className="px-4 py-3 font-medium text-left">User / Project</th>
                                        <th className="px-4 py-3 font-medium text-right">Baris</th>
                                        <th className="px-4 py-3 font-medium text-right">Total</th>
                                        <th className="px-4 py-3 font-medium text-right">Paid</th>
                                        <th className="px-4 py-3 font-medium text-right">Unpaid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {expenseByUser.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                                Belum ada pengeluaran dengan user pada periode ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {expenseByUser.map((row) => {
                                                const userExpanded = expandedExpenseUserIds.has(row.user_id);
                                                const hasProjects = (row.projects || []).length > 0;
                                                return (
                                                    <Fragment key={row.user_id}>
                                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                            <td className="px-2 py-3 text-center">
                                                                {hasProjects ? (
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                                                                        onClick={() => toggleExpenseUserExpand(row.user_id)}
                                                                        aria-expanded={userExpanded}
                                                                    >
                                                                        {userExpanded ? (
                                                                            <ChevronDown className="size-4" />
                                                                        ) : (
                                                                            <ChevronRight className="size-4" />
                                                                        )}
                                                                    </button>
                                                                ) : null}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                                {row.user_name}
                                                            </td>
                                                            <ExpenseAmountCells row={row} />
                                                        </tr>
                                                        {userExpanded && (
                                                            <ExpenseProjectRows
                                                                projects={row.projects}
                                                                parentKey={`user-${row.user_id}`}
                                                                compact
                                                            />
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                            {expenseByUser.length > 0 && (
                                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                                                    <td className="px-2 py-3" />
                                                    <td className="px-4 py-3">Subtotal (per user)</td>
                                                    <td className="px-4 py-3 text-right">{userPaymentTotals.line_count}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(userPaymentTotals.total_amount)}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                                                        {formatCurrency(userPaymentTotals.paid_amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-amber-800 dark:text-amber-400">
                                                        {formatCurrency(userPaymentTotals.unpaid_amount)}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )}
                                </tbody>
                            </SectionTable>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                                <FileText className="size-4 text-slate-500" />
                                Per kategori
                            </h3>
                            <p className="text-[11px] text-slate-500 mb-2">Semua pengeluaran per kategori, termasuk yang belum punya user.</p>
                            <SectionTable>
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="px-2 py-3 font-medium w-8" aria-label="Expand" />
                                        <th className="px-4 py-3 font-medium text-left">Kategori / Project</th>
                                        <th className="px-4 py-3 font-medium text-right">Baris</th>
                                        <th className="px-4 py-3 font-medium text-right">Total</th>
                                        <th className="px-4 py-3 font-medium text-right">Paid</th>
                                        <th className="px-4 py-3 font-medium text-right">Unpaid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {expenseByCategory.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                                Belum ada kategori finance terdaftar.
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {expenseByCategory.map((row) => {
                                                const catExpanded = expandedExpenseCategoryIds.has(row.category_id);
                                                const hasProjects = (row.projects || []).length > 0;
                                                return (
                                                    <Fragment key={row.category_id}>
                                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                            <td className="px-2 py-3 text-center">
                                                                {hasProjects ? (
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                                                                        onClick={() => toggleExpenseCategoryExpand(row.category_id)}
                                                                        aria-expanded={catExpanded}
                                                                    >
                                                                        {catExpanded ? (
                                                                            <ChevronDown className="size-4" />
                                                                        ) : (
                                                                            <ChevronRight className="size-4" />
                                                                        )}
                                                                    </button>
                                                                ) : null}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                                {row.category_name}
                                                            </td>
                                                            <ExpenseAmountCells row={row} />
                                                        </tr>
                                                        {catExpanded && (
                                                            <ExpenseProjectRows
                                                                projects={row.projects}
                                                                parentKey={`cat-${row.category_id}`}
                                                                compact
                                                            />
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                            {expensePaymentTotals && (
                                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                                                    <td className="px-2 py-3" />
                                                    <td className="px-4 py-3">Total (semua pengeluaran)</td>
                                                    <td className="px-4 py-3 text-right">{expensePaymentTotals.line_count}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(expensePaymentTotals.total_amount)}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                                                        {formatCurrency(expensePaymentTotals.paid_amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-amber-800 dark:text-amber-400">
                                                        {formatCurrency(expensePaymentTotals.unpaid_amount)}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )}
                                </tbody>
                            </SectionTable>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Filter berdasarkan tanggal input pengeluaran (`created_at`). Nominal = COALESCE(realisasi, plan). Paid/Unpaid dari akumulasi `paid_amount`. Klik panah untuk detail per project.
                        </p>
                    </CardContent>
                </Card>

                {/* Task status table */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Task status distribution</CardTitle>
                        <CardDescription>Workload breakdown by kanban status</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Tasks</th>
                                    <th className="px-4 py-3 font-medium text-right">Share</th>
                                    <th className="px-4 py-3 font-medium w-[40%]">Distribution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {taskStatusRows.map((row) => (
                                    <tr key={row.status} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.status}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{row.count}</td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatPercent(row.share)}</td>
                                        <td className="px-4 py-3">
                                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{ width: `${Math.min(100, row.share)}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </SectionTable>
                    </CardContent>
                </Card>

                {/* Project portfolio table */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Project portfolio &amp; manhour health</CardTitle>
                        <CardDescription>
                            Per-project quota, allocation, and burn rate. FIFO: Initial dipakai dulu, lalu Top Up #1, #2, … Expand baris untuk detail per pool.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-2 py-3 font-medium w-8" aria-label="Expand" />
                                    <th className="px-4 py-3 font-medium text-left">Project</th>
                                    <th className="px-4 py-3 font-medium text-left">Methodology</th>
                                    <th className="px-4 py-3 font-medium text-right">Quota</th>
                                    <th className="px-4 py-3 font-medium text-right">Base</th>
                                    <th className="px-4 py-3 font-medium text-right">Top up</th>
                                    <th className="px-4 py-3 font-medium text-right">Allocated</th>
                                    <th className="px-4 py-3 font-medium text-right">Burn</th>
                                    <th className="px-4 py-3 font-medium text-right">Variance</th>
                                    <th className="px-4 py-3 font-medium text-center">Health</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {projectRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center text-slate-400 italic">
                                            No projects found.
                                        </td>
                                    </tr>
                                ) : (
                                    projectRows.map((p) => {
                                        const expanded = expandedProjectIds.has(p.id);
                                        const canExpand = p.hasQuota;
                                        return (
                                            <Fragment key={p.id}>
                                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                    <td className="px-2 py-3 text-center">
                                                        {canExpand ? (
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                                                                onClick={() => toggleProjectExpand(p.id)}
                                                                aria-expanded={expanded}
                                                                aria-label={expanded ? 'Tutup breakdown MH' : 'Buka breakdown MH'}
                                                            >
                                                                {expanded ? (
                                                                    <ChevronDown className="size-4" />
                                                                ) : (
                                                                    <ChevronRight className="size-4" />
                                                                )}
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                        {p.name}
                                                        {p.has_topup && (
                                                            <span className="block text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                                                                {p.manhour_buckets?.filter((b) => b.kind === 'topup').length || 0} top-up
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.methodology || '—'}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                        {p.hasQuota ? `${formatHours(p.quota)}h` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                        {p.hasQuota ? `${formatHours(p.base_quota_hours)}h` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                                                        {p.has_topup ? `+${formatHours(p.topup_total_hours)}h` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">{formatHours(p.allocated)}h</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {p.hasQuota ? (
                                                            <span
                                                                className={
                                                                    p.burn > 100
                                                                        ? 'font-semibold text-rose-600 dark:text-rose-400'
                                                                        : p.burn > 85
                                                                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                                                                          : 'font-medium text-slate-700 dark:text-slate-300'
                                                                }
                                                            >
                                                                {formatPercent(p.burn)}
                                                            </span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                        {p.hasQuota
                                                            ? `${p.variance >= 0 ? '+' : ''}${formatHours(p.variance)}h`
                                                            : `${formatHours(p.actual - p.allocated)}h`}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant="outline" className={healthBadgeClass[p.health.tone]}>
                                                            {p.health.label}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                                {expanded && canExpand && (
                                                    <tr>
                                                        <td colSpan={11} className="p-0">
                                                            <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
                                                                <ManhourBucketBreakdown
                                                                    buckets={p.manhour_buckets}
                                                                    overflowHours={p.mh_overflow_hours}
                                                                    hasTopup={p.has_topup}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </SectionTable>
                    </CardContent>
                </Card>

                {/* Revenue trend table */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Monthly financial trend</CardTitle>
                        <CardDescription>
                            Billed quotation value vs internal cost by project start month (last 6 periods)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Period</th>
                                    <th className="px-4 py-3 font-medium text-right">Billed value</th>
                                    <th className="px-4 py-3 font-medium text-right">Internal cost</th>
                                    <th className="px-4 py-3 font-medium text-right">Margin</th>
                                    <th className="px-4 py-3 font-medium text-right">Margin %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {revenueTrend.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">
                                            No revenue data for the selected periods.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {revenueTrend.map((row, idx) => {
                                            const billed = Number(row.billed || 0);
                                            const cost = Number(row.cost || 0);
                                            const margin = billed - cost;
                                            const marginPct = billed > 0 ? (margin / billed) * 100 : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {formatMonthLabel(row.month)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(billed)}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                        {formatCurrency(cost)}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 text-right font-semibold ${
                                                            margin >= 0
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-rose-600 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {formatCurrency(margin)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                        {formatPercent(marginPct)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                                            <td className="px-4 py-3 text-slate-900 dark:text-white">Total (shown periods)</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(revenueTotals.billed)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(revenueTotals.cost)}</td>
                                            <td
                                                className={`px-4 py-3 text-right ${
                                                    revenueTotals.billed - revenueTotals.cost >= 0
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-rose-600 dark:text-rose-400'
                                                }`}
                                            >
                                                {formatCurrency(revenueTotals.billed - revenueTotals.cost)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {revenueTotals.billed > 0
                                                    ? formatPercent(
                                                          ((revenueTotals.billed - revenueTotals.cost) / revenueTotals.billed) * 100
                                                      )
                                                    : '—'}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </SectionTable>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
