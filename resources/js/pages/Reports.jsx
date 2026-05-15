import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import {
    Briefcase,
    Building2,
    Clock,
    FileText,
    TrendingUp,
    Users,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [efficiencyData, setEfficiencyData] = useState([]);
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [companyProjectRows, setCompanyProjectRows] = useState([]);

    useEffect(() => {
        const loadReportData = async () => {
            setLoading(true);
            try {
                const [statsRes, effRes, trendRes, companyRes] = await Promise.all([
                    fetchAPI('/stats'),
                    fetchAPI('/reports/efficiency'),
                    fetchAPI('/reports/revenue-trend'),
                    fetchAPI('/reports/company-projects'),
                ]);
                if (statsRes.data) setStats(statsRes.data);
                if (effRes.data) setEfficiencyData(effRes.data);
                if (trendRes.data) setRevenueTrend(trendRes.data);
                if (companyRes.data) setCompanyProjectRows(companyRes.data);
            } catch (err) {
                console.error('Failed to load reports data', err);
            } finally {
                setLoading(false);
            }
        };
        loadReportData();
    }, []);

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
            };
        });
    }, [efficiencyData]);

    const portfolioSummary = useMemo(() => {
        const onTrack = projectRows.filter((p) => p.health.tone === 'emerald').length;
        const atRisk = projectRows.filter((p) => ['amber', 'rose'].includes(p.health.tone)).length;
        const totalQuota = projectRows.reduce((s, p) => s + p.quota, 0);
        const totalAllocated = projectRows.reduce((s, p) => s + p.allocated, 0);
        const totalActual = projectRows.reduce((s, p) => s + p.actual, 0);
        return { onTrack, atRisk, totalQuota, totalAllocated, totalActual };
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
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{s.activeTasks ?? 0}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Logged manhours (all time)</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{formatHours(s.totalHours)} hrs</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Allocated vs quota (portfolio)</td>
                                    <td className="px-4 py-3 text-slate-900 dark:text-white" colSpan={3}>
                                        <span className="font-semibold">{formatHours(portfolioSummary.totalAllocated)}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span>{formatHours(portfolioSummary.totalQuota)} hrs</span>
                                        {portfolioSummary.totalQuota > 0 && (
                                            <span className="ml-2 text-xs text-slate-500">
                                                ({formatPercent((portfolioSummary.totalAllocated / portfolioSummary.totalQuota) * 100)} used)
                                            </span>
                                        )}
                                    </td>
                                </tr>
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
                                        <span className="text-xs text-slate-500 ml-2">({formatPercent(s.marginPercentage)})</span>
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
                            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                                {[
                                    { icon: Briefcase, label: 'Projects', value: s.totalProjects ?? 0, sub: `${s.activeProjects ?? 0} active` },
                                    { icon: Users, label: 'Open tasks', value: s.activeTasks ?? 0, sub: 'Not done' },
                                    { icon: Clock, label: 'Logged hours', value: `${formatHours(s.totalHours)}h`, sub: 'All projects' },
                                    { icon: TrendingUp, label: 'Margin', value: formatPercent(s.marginPercentage), sub: formatCurrency(s.totalMargin) },
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
                            Per-project quota, allocation, burn rate, and logged actuals — sorted by burn (highest first)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <SectionTable>
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-left">Project</th>
                                    <th className="px-4 py-3 font-medium text-left">Methodology</th>
                                    <th className="px-4 py-3 font-medium text-right">Quota</th>
                                    <th className="px-4 py-3 font-medium text-right">Allocated</th>
                                    <th className="px-4 py-3 font-medium text-right">Logged actual</th>
                                    <th className="px-4 py-3 font-medium text-right">Burn</th>
                                    <th className="px-4 py-3 font-medium text-right">Variance</th>
                                    <th className="px-4 py-3 font-medium text-center">Health</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {projectRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-slate-400 italic">
                                            No projects found.
                                        </td>
                                    </tr>
                                ) : (
                                    projectRows.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.methodology || '—'}</td>
                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                {p.hasQuota ? `${formatHours(p.quota)}h` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">{formatHours(p.allocated)}h</td>
                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatHours(p.actual)}h</td>
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
                                    ))
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
