import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { 
    TrendingUp, 
    Calendar, 
    ArrowUpRight, 
    ArrowDownRight, 
    Plus, 
    Trash2, 
    Filter,
    DollarSign,
    Briefcase,
    Activity,
    CreditCard,
    LayoutDashboard,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FinanceReport() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        gross_income: 0,
        project_expenses: 0,
        income_after_project_expenses: 0,
        opex_total: 0,
        capex_total: 0,
        net_revenue: 0,
        records: []
    });

    const [filters, setFilters] = useState({
        start_date: new Date(new Date().getFullYear(), 0, 2).toISOString().split('T')[0], // Jan 1st (UTC fix)
        end_date: new Date().toISOString().split('T')[0]
    });

    const [newRecord, setNewRecord] = useState({
        type: 'OPEX',
        frequency: 'one-time', // 'one-time', 'monthly', 'yearly'
        amount: '',
        monthly_amount: '',
        yearly_amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
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
                amount: parseFloat(newRecord.amount)
            };

            if (newRecord.type === 'OPEX' && newRecord.frequency !== 'one-time') {
                payload.recurring_months = 12;
            }

            await fetchAPI('/financial-reports/records', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            setNewRecord({ ...newRecord, amount: '', monthly_amount: '', yearly_amount: '', description: '' });
            loadData();
        } catch (error) {
            alert('Failed to add record: ' + error.message);
        }
    };

    const handleAmountChange = (val, source) => {
        const num = parseFloat(val) || 0;
        if (source === 'amount') {
            setNewRecord({ ...newRecord, amount: val });
        } else if (source === 'monthly') {
            setNewRecord({ 
                ...newRecord, 
                monthly_amount: val, 
                yearly_amount: (num * 12).toString(),
                amount: val 
            });
        } else if (source === 'yearly') {
            setNewRecord({ 
                ...newRecord, 
                yearly_amount: val, 
                monthly_amount: (num / 12).toFixed(0),
                amount: (num / 12).toFixed(0)
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
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header omitted for brevity in chunking but fully present in original */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 italic tracking-tight">
                       <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="size-8" />
                       </div>
                        FINANCE REPORT
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide flex items-center gap-2">
                        Comprehensive financial health overview and expense management.
                    </p>
                </div>

                {/* Filters */}
                <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
                    <CardContent className="p-3 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-primary" />
                            <Input 
                                type="date" 
                                value={filters.start_date}
                                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                                className="h-9 w-40 bg-white dark:bg-slate-900 border-none shadow-sm font-medium"
                            />
                        </div>
                        <span className="text-slate-400 font-bold">TO</span>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="date" 
                                value={filters.end_date}
                                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                                className="h-9 w-40 bg-white dark:bg-slate-900 border-none shadow-sm font-medium"
                            />
                        </div>
                        <Button size="icon" variant="ghost" className="size-9 rounded-lg hover:bg-white dark:hover:bg-slate-800" onClick={loadData}>
                            <Filter className="size-4 text-primary" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {/* 1. Gross Income */}
                <Card className="overflow-hidden border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-1">
                    <div className="h-1 bg-blue-500"></div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                                <DollarSign className="size-5" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-slate-400 uppercase">Gross Revenue</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white">
                            {formatCurrency(summary.gross_income)}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400">Total project quotations in range</CardDescription>
                    </CardHeader>
                </Card>

                {/* 2. Project Expenses */}
                <Card className="overflow-hidden border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-1">
                    <div className="h-1 bg-amber-500"></div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500">
                                <Briefcase className="size-5" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-slate-400 uppercase">Project Expenses</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white text-amber-600 dark:text-amber-400">
                            {formatCurrency(summary.project_expenses)}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400">Allocated budget for projects</CardDescription>
                    </CardHeader>
                </Card>

                {/* 3. Income After Project Expenses */}
                <Card className="overflow-hidden border-none bg-slate-900 dark:bg-slate-800 shadow-2xl transition-all hover:-translate-y-1 ring-4 ring-primary/10">
                    <div className="h-1 bg-primary"></div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                <Activity className="size-5" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-slate-500 uppercase">Margin After Project</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-white">
                            {formatCurrency(summary.income_after_project_expenses)}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400">Available for operations & business</CardDescription>
                    </CardHeader>
                </Card>

                {/* 4. OPEX */}
                <Card className="overflow-hidden border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-1">
                    <div className="h-1 bg-rose-500"></div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                                <CreditCard className="size-5" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-slate-400 uppercase">OPEX Total</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white text-rose-500">
                            {formatCurrency(summary.opex_total)}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400">Operating Expenses</CardDescription>
                    </CardHeader>
                </Card>

                {/* 5. CAPEX */}
                <Card className="overflow-hidden border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-1">
                    <div className="h-1 bg-indigo-500"></div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
                                <LayoutDashboard className="size-5" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-slate-400 uppercase">CAPEX Total</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white text-indigo-500">
                            {formatCurrency(summary.capex_total)}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold text-slate-400">Capital Expenditure</CardDescription>
                    </CardHeader>
                </Card>

                {/* 6. Net Revenue */}
                <Card className={`overflow-hidden border-none shadow-xl transition-all hover:-translate-y-1 ${summary.net_revenue >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-white/20 text-white">
                                <TrendingUp className="size-5" />
                            </div>
                            <span className="text-[10px] font-black italic tracking-widest text-white/60 uppercase">Net Revenue</span>
                        </div>
                        <CardTitle className="text-4xl font-black">
                            {formatCurrency(summary.net_revenue)}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold text-white/70">Final profit after all deductions</CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Management Table */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <Card className="border-none shadow-2xl dark:bg-slate-900/50 backdrop-blur-md">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between pb-6">
                            <div>
                                <CardTitle className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white">FINANCIAL RECORDS</CardTitle>
                                <CardDescription className="font-medium text-slate-500">Listing all OPEX and CAPEX entries in the selected range.</CardDescription>
                            </div>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center gap-2 px-4 h-10 shadow-lg shadow-primary/20">
                                <Plus className="size-4" /> ADD SYSTEM ENTRY
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black italic tracking-[0.2em] text-slate-400 uppercase">
                                            <th className="px-6 py-4 text-left">Date</th>
                                            <th className="px-6 py-4 text-left">Type</th>
                                            <th className="px-6 py-4 text-left">Description</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {summary.records.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">No records found for this period. Use the form to add one.</td>
                                            </tr>
                                        ) : (
                                            summary.records.map((record) => (
                                                <tr key={record.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                        {new Date(record.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'})}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-black italic tracking-widest px-2.5 py-1 rounded-lg ${record.type === 'OPEX' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                                            {record.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {record.description}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white tabular-nums">
                                                        {formatCurrency(record.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button 
                                                            onClick={() => handleDeleteRecord(record.id)}
                                                            className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Side Entry Form */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 transition-all hover:shadow-primary/10">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-black italic tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                                <Plus className="size-5 text-primary" /> NEW ENTRY
                            </CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Record new operational or capital expenses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddRecord} className="flex flex-col gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">Entry Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewRecord({...newRecord, type: 'OPEX'})}
                                            className={`py-3 rounded-xl font-black italic tracking-widest text-xs transition-all ${newRecord.type === 'OPEX' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                                        >
                                            OPEX
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewRecord({...newRecord, type: 'CAPEX', frequency: 'one-time'})}
                                            className={`py-3 rounded-xl font-black italic tracking-widest text-xs transition-all ${newRecord.type === 'CAPEX' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                                        >
                                            CAPEX
                                        </button>
                                    </div>
                                </div>

                                {newRecord.type === 'OPEX' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">Frequency</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['one-time', 'monthly', 'yearly'].map((freq) => (
                                                <button
                                                    key={freq}
                                                    type="button"
                                                    onClick={() => setNewRecord({...newRecord, frequency: freq})}
                                                    className={`py-2 rounded-lg font-bold text-[10px] uppercase tracking-tighter transition-all ${newRecord.frequency === freq ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                                                >
                                                    {freq}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {newRecord.frequency === 'one-time' ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">Amount (IDR)</label>
                                            <Input 
                                                type="number"
                                                placeholder="0"
                                                value={newRecord.amount}
                                                onChange={(e) => handleAmountChange(e.target.value, 'amount')}
                                                className="bg-slate-50 dark:bg-slate-800 border-none h-12 rounded-xl text-lg font-black tracking-tight focus-visible:ring-primary text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">Monthly (IDR)</label>
                                                <Input 
                                                    type="number"
                                                    placeholder="0"
                                                    value={newRecord.monthly_amount}
                                                    onChange={(e) => handleAmountChange(e.target.value, 'monthly')}
                                                    className="bg-slate-50 dark:bg-slate-800 border-none h-12 rounded-xl text-sm font-black tracking-tight focus-visible:ring-primary text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">Yearly (IDR)</label>
                                                <Input 
                                                    type="number"
                                                    placeholder="0"
                                                    value={newRecord.yearly_amount}
                                                    onChange={(e) => handleAmountChange(e.target.value, 'yearly')}
                                                    className="bg-slate-50 dark:bg-slate-800 border-none h-12 rounded-xl text-sm font-black tracking-tight focus-visible:ring-primary text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                                        {newRecord.frequency === 'one-time' ? 'Transaction Date' : 'Start Date'}
                                    </label>
                                    <Input 
                                        type="date"
                                        value={newRecord.date}
                                        onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                                        className="bg-slate-50 dark:bg-slate-800 border-none h-12 rounded-xl font-bold tracking-tight focus-visible:ring-primary text-slate-900 dark:text-white"
                                        required
                                    />
                                    {newRecord.frequency !== 'one-time' && (
                                        <p className="text-[10px] text-slate-400 font-bold italic mt-1">
                                            * This will generate 12 monthly records starting from this date.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black italic tracking-widest text-slate-400 dark:text-slate-500 uppercase">Description</label>
                                    <Input 
                                        placeholder="What was this for?"
                                        value={newRecord.description}
                                        onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                                        className="bg-slate-50 dark:bg-slate-800 border-none h-12 rounded-xl font-bold tracking-tight focus-visible:ring-primary text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-black italic tracking-widest text-sm shadow-xl shadow-primary/20 mt-2">
                                    {newRecord.frequency === 'one-time' ? 'SECURE TRANSACTION' : 'SECURE RECURRING ENTRIES'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                            <AlertCircle className="size-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black italic text-slate-800 dark:text-white uppercase tracking-tight">Pro Tip</h4>
                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                                Use OPEX for recurring costs (salaries, rent) and CAPEX for one-time assets (hardware, licenses). This keeps your revenue projections accurate.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
