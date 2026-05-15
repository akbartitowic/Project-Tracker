import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import {
    TrendingUp,
    Calendar,
    Plus,
    Trash2,
    Filter,
    DollarSign,
    Briefcase,
    Activity,
    CreditCard,
    LayoutDashboard,
    AlertCircle,
    Loader2,
    Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function SectionTable({ children, className = '' }) {
    return (
        <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
            <table className="w-full text-sm">{children}</table>
        </div>
    );
}

export default function FinanceReport() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        gross_income: 0,
        project_expenses: 0,
        project_expenses_realized: 0,
        income_after_project_expenses: 0,
        income_after_project_expenses_realized: 0,
        opex_total: 0,
        capex_total: 0,
        net_revenue: 0,
        net_revenue_realized: 0,
        records: [],
    });

    const [filters, setFilters] = useState({
        start_date: new Date(new Date().getFullYear(), 0, 2).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const [newRecord, setNewRecord] = useState({
        type: 'OPEX',
        duration: 1,
        amount: '',
        monthly_amount: '',
        yearly_amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await fetchAPI(`/financial-reports/summary?${query}`);
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to load financial report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    const handleAddRecord = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                type: newRecord.type,
                date: newRecord.date,
                description: newRecord.description,
                amount: parseFloat(newRecord.amount),
            };

            if (newRecord.type === 'OPEX') {
                payload.recurring_months = parseInt(newRecord.duration);
            }

            await fetchAPI('/financial-reports/records', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setNewRecord({ ...newRecord, amount: '', monthly_amount: '', yearly_amount: '', description: '' });
            loadData();
        } catch (error) {
            alert('Failed to add record: ' + error.message);
        }
    };

    const handleAmountChange = (val, source) => {
        const num = parseFloat(val) || 0;
        if (source === 'amount' || source === 'monthly') {
            setNewRecord({
                ...newRecord,
                monthly_amount: val,
                yearly_amount: (num * 12).toString(),
                amount: val,
            });
        } else if (source === 'yearly') {
            setNewRecord({
                ...newRecord,
                yearly_amount: val,
                monthly_amount: (num / 12).toFixed(0),
                amount: (num / 12).toFixed(0),
            });
        }
    };

    const handleDeleteRecord = async (id) => {
        if (!confirm('Delete this record?')) return;
        try {
            await fetchAPI(`/financial-reports/records/${id}`, { method: 'DELETE' });
            loadData();
        } catch (error) {
            alert('Failed to delete record');
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val || 0);
    };

    const projectExpensesRealized = summary.project_expenses_realized ?? summary.project_expenses;
    const incomeAfterRealized = summary.income_after_project_expenses_realized ?? summary.income_after_project_expenses;
    const netRevenueRealized = summary.net_revenue_realized ?? summary.net_revenue;

    const plRows = [
        {
            label: 'Gross income',
            hint: 'Total project quotation created within the filter date range (forecast, not cash-in).',
            forecast: summary.gross_income,
            realized: null,
            emphasis: false,
        },
        {
            label: 'Project expenses',
            hint: 'Allocation costs excluding top-up rows. Realized uses Finance Monitoring values when set.',
            forecast: summary.project_expenses,
            realized: projectExpensesRealized,
            emphasis: false,
            negative: true,
        },
        {
            label: 'Income after project expenses',
            hint: 'Gross income minus project expenses (each basis).',
            forecast: summary.income_after_project_expenses,
            realized: incomeAfterRealized,
            emphasis: true,
        },
        {
            label: 'OPEX',
            hint: 'Full calendar year of the filter start date (not limited to the date range).',
            forecast: summary.opex_total,
            realized: null,
            negative: true,
        },
        {
            label: 'CAPEX',
            hint: 'Full calendar year of the filter start date (not limited to the date range).',
            forecast: summary.capex_total,
            realized: null,
            negative: true,
        },
        {
            label: 'Net revenue',
            hint: 'Income after project (forecast/realized) minus OPEX and CAPEX for that year.',
            forecast: summary.net_revenue,
            realized: netRevenueRealized,
            emphasis: true,
            total: true,
        },
    ];

    return (
        <div className="mx-auto max-w-[1280px] animate-in fade-in p-4 pb-16 duration-500 sm:p-6 sm:pb-20 lg:p-8 space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <TrendingUp className="size-6" />
                        </span>
                        Finance Report
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Profit &amp; loss summary with planning vs realization for project costs, plus OPEX and CAPEX entries.
                    </p>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                    <CardContent className="p-3 flex flex-wrap items-center gap-2 sm:gap-3">
                        <Calendar className="size-4 text-slate-500 shrink-0" />
                        <Input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                            className="h-9 w-[140px] sm:w-36"
                        />
                        <span className="text-xs text-slate-400 font-medium">to</span>
                        <Input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                            className="h-9 w-[140px] sm:w-36"
                        />
                        <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={loadData} disabled={loading}>
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Filter className="size-4" />}
                            Apply
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <details className="group rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                    <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    How to read these numbers
                    <span className="ml-auto text-xs text-slate-500 group-open:hidden">Show</span>
                    <span className="ml-auto text-xs text-slate-500 hidden group-open:inline">Hide</span>
                </summary>
                <ul className="px-4 pb-4 pt-0 text-[13px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside border-t border-blue-200/50 dark:border-blue-900/30">
                    <li>
                        <strong className="font-medium text-slate-800 dark:text-slate-200">Gross income</strong> — quotation value for projects created in the filter range (forecast).
                    </li>
                    <li>
                        <strong className="font-medium text-slate-800 dark:text-slate-200">Project expenses</strong> — planning uses allocation amount; realization uses realized amount from monitoring when available.
                    </li>
                    <li>
                        <strong className="font-medium text-slate-800 dark:text-slate-200">Top-up Scrum</strong> is excluded from project expenses here.
                    </li>
                    <li>
                        <strong className="font-medium text-slate-800 dark:text-slate-200">OPEX / CAPEX</strong> — summed for the full calendar year of the filter start date.
                    </li>
                </ul>
            </details>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                    <Loader2 className="size-8 animate-spin text-primary mr-3" />
                    Loading report…
                </div>
            ) : (
                <>
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Profit &amp; loss summary</CardTitle>
                            <CardDescription>
                                Period: {filters.start_date} — {filters.end_date}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 pb-2">
                            <SectionTable>
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-left w-[40%]">Line item</th>
                                        <th className="px-4 py-3 font-medium text-right">Forecast / planning</th>
                                        <th className="px-4 py-3 font-medium text-right">Realization</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {plRows.map((row) => (
                                        <tr
                                            key={row.label}
                                            className={
                                                row.total
                                                    ? 'bg-slate-50/90 dark:bg-slate-800/40 font-semibold'
                                                    : row.emphasis
                                                      ? 'bg-primary/5 dark:bg-primary/10'
                                                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                                            }
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-medium text-slate-900 dark:text-white">{row.label}</div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug max-w-md">
                                                    {row.hint}
                                                </p>
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right tabular-nums align-top whitespace-nowrap ${
                                                    row.negative ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                                                } ${row.total && summary.net_revenue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : ''} ${
                                                    row.total && summary.net_revenue < 0 ? 'text-rose-600 dark:text-rose-400' : ''
                                                }`}
                                            >
                                                {row.negative && row.forecast ? '− ' : ''}
                                                {formatCurrency(row.forecast)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums align-top whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                {row.realized != null ? (
                                                    <>
                                                        {row.negative && row.realized ? '− ' : ''}
                                                        <span
                                                            className={
                                                                row.total
                                                                    ? netRevenueRealized >= 0
                                                                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                                                        : 'text-rose-600 dark:text-rose-400 font-semibold'
                                                                    : ''
                                                            }
                                                        >
                                                            {formatCurrency(row.realized)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </SectionTable>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { icon: DollarSign, label: 'Gross', value: formatCurrency(summary.gross_income), color: 'text-blue-600' },
                            { icon: Briefcase, label: 'Project (plan)', value: formatCurrency(summary.project_expenses), color: 'text-amber-600' },
                            { icon: Briefcase, label: 'Project (real)', value: formatCurrency(projectExpensesRealized), color: 'text-orange-600' },
                            { icon: Activity, label: 'Margin (plan)', value: formatCurrency(summary.income_after_project_expenses), color: 'text-slate-700 dark:text-slate-200' },
                            { icon: CreditCard, label: 'OPEX', value: formatCurrency(summary.opex_total), color: 'text-rose-600' },
                            { icon: LayoutDashboard, label: 'Net (real)', value: formatCurrency(netRevenueRealized), color: netRevenueRealized >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <Card key={label} className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className={`size-4 ${color}`} />
                                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                                    </div>
                                    <p className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3 pb-4">
                                    <div>
                                        <CardTitle className="text-base font-semibold">OPEX &amp; CAPEX records</CardTitle>
                                        <CardDescription>Entries in the selected date range</CardDescription>
                                    </div>
                                    <Button size="sm" className="gap-2 shrink-0">
                                        <Plus className="size-4" />
                                        Add system entry
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <SectionTable className="border-0 rounded-none">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                                <th className="px-4 py-3 text-left font-medium">Type</th>
                                                <th className="px-4 py-3 text-left font-medium">Description</th>
                                                <th className="px-4 py-3 text-right font-medium">Monthly</th>
                                                <th className="px-4 py-3 text-right font-medium">Yearly</th>
                                                <th className="px-4 py-3 text-center font-medium w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {summary.records.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                                                        No records in this period. Add one using the form on the right.
                                                    </td>
                                                </tr>
                                            ) : (
                                                summary.records.map((record) => (
                                                    <tr
                                                        key={record.id}
                                                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                                    >
                                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                            {new Date(record.date).toLocaleDateString('id-ID', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    record.type === 'OPEX'
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400'
                                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400'
                                                                }
                                                            >
                                                                {record.type}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={record.description}>
                                                            {record.description}
                                                        </td>
                                                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                                                            {record.type === 'OPEX' ? formatCurrency(record.amount) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                                                            {record.type === 'OPEX' ? formatCurrency(record.amount * 12) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRecord(record.id)}
                                                                className="p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                                aria-label="Delete record"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </SectionTable>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-4">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm sticky top-4">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Plus className="size-4 text-primary" />
                                        New entry
                                    </CardTitle>
                                    <CardDescription>Record operational (OPEX) or capital (CAPEX) expense</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAddRecord} className="flex flex-col gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Entry type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewRecord({ ...newRecord, type: 'OPEX' })}
                                                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                        newRecord.type === 'OPEX'
                                                            ? 'bg-primary text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    OPEX
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewRecord({ ...newRecord, type: 'CAPEX', frequency: 'one-time' })}
                                                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                        newRecord.type === 'CAPEX'
                                                            ? 'bg-primary text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    CAPEX
                                                </button>
                                            </div>
                                        </div>

                                        {newRecord.type === 'OPEX' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration</label>
                                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                        {newRecord.duration} {newRecord.duration > 1 ? 'months' : 'month'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="12"
                                                    step="1"
                                                    value={newRecord.duration}
                                                    onChange={(e) => setNewRecord({ ...newRecord, duration: e.target.value })}
                                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>1 mo</span>
                                                    <span>6 mo</span>
                                                    <span>12 mo</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {newRecord.duration == 1 ? (
                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (IDR)</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={newRecord.amount}
                                                        onChange={(e) => handleAmountChange(e.target.value, 'amount')}
                                                        required
                                                    />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly</label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={newRecord.monthly_amount}
                                                            onChange={(e) => handleAmountChange(e.target.value, 'monthly')}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Yearly</label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={newRecord.yearly_amount}
                                                            onChange={(e) => handleAmountChange(e.target.value, 'yearly')}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {newRecord.frequency === 'one-time' ? 'Transaction date' : 'Start date'}
                                            </label>
                                            <Input
                                                type="date"
                                                value={newRecord.date}
                                                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                                                required
                                            />
                                            {newRecord.frequency !== 'one-time' && (
                                                <p className="text-[11px] text-slate-500">
                                                    Generates 12 monthly records from this date.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                            <Input
                                                placeholder="What was this for?"
                                                value={newRecord.description}
                                                onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <Button type="submit" className="w-full">
                                            {newRecord.frequency === 'one-time' ? 'Save entry' : 'Save recurring entries'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex gap-3">
                                <AlertCircle className="size-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Use <strong className="font-medium">Forecast</strong> for budgeting; compare with{' '}
                                    <strong className="font-medium">Realization</strong> after filling amounts in Finance Monitoring.
                                    Per-project detail is in Realization Report.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
