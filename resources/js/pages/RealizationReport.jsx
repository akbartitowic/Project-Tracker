import { useEffect, useMemo, useState } from 'react';
import { fetchAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrendingUp, Search } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
}).format(val || 0);

const formatPercent = (val) => `${Number(val || 0).toFixed(1)}%`;

const methodologyLabel = (value) => {
    const normalized = String(value || '').toLowerCase();
    return normalized.includes('waterfall') ? 'Waterfall' : 'Scrum';
};

export default function RealizationReport() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({
        initial_income: 0,
        topup_income: 0,
        planning_income: 0,
        planning_expense: 0,
        final_expense: 0,
        remaining_margin: 0,
        margin_percentage: 0,
    });
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetchAPI('/financial-reports/project-realization');
                setRows(res.data || []);
                setTotals(res.totals || {});
            } catch (error) {
                console.error('Failed to load realization report:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return rows;
        return rows.filter((item) => item.project_name.toLowerCase().includes(keyword));
    }, [rows, search]);

    return (
        <div className="mx-auto max-w-[1450px] p-4 pb-16 sm:p-6 sm:pb-20 lg:p-8">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="size-7 text-primary" /> Realization Report
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Ringkasan finance per project: pemasukan awal, top up, planning vs realisasi pengeluaran, sisa margin, dan persentase margin.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3 xl:grid-cols-7">
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Pemasukan Awal</p><p className="text-lg font-bold">{formatCurrency(totals.initial_income)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Top Up</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.topup_income)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Planning Pemasukan</p><p className="text-lg font-bold text-blue-600">{formatCurrency(totals.planning_income)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Planning Pengeluaran</p><p className="text-lg font-bold text-amber-600">{formatCurrency(totals.planning_expense)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Realisasi Pengeluaran</p><p className="text-lg font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totals.final_expense ?? 0)}</p><p className="text-[10px] text-slate-400 mt-1 leading-tight">Nilai aktual / input realization</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Sisa Margin</p><p className={`text-lg font-bold ${Number(totals.remaining_margin || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totals.remaining_margin)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-[11px] text-slate-500 uppercase">Persentase</p><p className={`text-lg font-bold ${Number(totals.margin_percentage || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatPercent(totals.margin_percentage)}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>Project Finance Realization</CardTitle>
                            <CardDescription>Per project: pemasukan, planning pengeluaran (anggaran), dan realisasi pengeluaran (nominal realization).</CardDescription>
                        </div>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                            <Input
                                className="pl-10"
                                placeholder="Cari project..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
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
                                    <th className="text-left font-medium pb-3 px-2">Method</th>
                                    <th className="text-right font-medium pb-3 px-2">Pemasukan Awal</th>
                                    <th className="text-right font-medium pb-3 px-2">Top Up</th>
                                    <th className="text-right font-medium pb-3 px-2">Planning Pemasukan</th>
                                    <th className="text-right font-medium pb-3 px-2">Planning Pengeluaran</th>
                                    <th className="text-right font-medium pb-3 px-2">Realisasi Pengeluaran</th>
                                    <th className="text-right font-medium pb-3 px-2">Sisa Margin</th>
                                    <th className="text-right font-medium pb-3 px-2">Persentase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {loading ? (
                                    <tr><td colSpan="9" className="py-10 text-center text-slate-400">Loading...</td></tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr><td colSpan="9" className="py-10 text-center text-slate-400">Tidak ada data project.</td></tr>
                                ) : (
                                    filteredRows.map((row) => (
                                        <tr key={row.project_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">{row.project_name}</td>
                                            <td className="py-3 px-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${methodologyLabel(row.methodology) === 'Waterfall' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                    {methodologyLabel(row.methodology)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-right">{formatCurrency(row.initial_income)}</td>
                                            <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(row.topup_income)}</td>
                                            <td className="py-3 px-2 text-right font-semibold">{formatCurrency(row.planning_income)}</td>
                                            <td className="py-3 px-2 text-right text-amber-600 dark:text-amber-400">{formatCurrency(row.planning_expense)}</td>
                                            <td className="py-3 px-2 text-right font-semibold text-orange-700 dark:text-orange-400">{formatCurrency(row.final_expense ?? 0)}</td>
                                            <td className={`py-3 px-2 text-right font-semibold ${Number(row.remaining_margin) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {formatCurrency(row.remaining_margin)}
                                            </td>
                                            <td className={`py-3 px-2 text-right font-semibold ${Number(row.margin_percentage) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {formatPercent(row.margin_percentage)}
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
    );
}
