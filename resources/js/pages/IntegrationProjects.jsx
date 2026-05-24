import { useEffect, useMemo, useState, Fragment } from 'react';
import { fetchAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Copy,
    Check,
    Plug,
    Loader2,
    Search,
    ChevronDown,
    ChevronRight,
    ArrowDownLeft,
    ArrowUpRight,
    Link2,
    ArrowRight,
} from 'lucide-react';

const SCHEMA_OVERVIEW = [
    { from: 'companies', to: 'sales_pitches', via: 'sales_pitches.company_id → companies.id' },
    { from: 'sales_pitches', to: 'presales', via: 'presales.sales_pitch_id → sales_pitches.id (1:1)' },
    { from: 'presales', to: 'projects', via: 'presales.converted_project_id → projects.id' },
    { from: 'projects', to: 'project_allocations', via: 'project_allocations.project_id → projects.id' },
    { from: 'projects', to: 'tasks', via: 'tasks.project_id → projects.id' },
    { from: 'projects', to: 'project_members', via: 'project_members.project_id → projects.id' },
    { from: 'projects', to: 'manhours', via: 'manhours.project_id → projects.id' },
];

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);

const formatMarginPercent = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(2)}%`;
};

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STAGE_LABELS = {
    sales: 'Sales',
    presale: 'Presale / New Project',
    project: 'Project',
};

const STAGE_BADGE = {
    sales: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400',
    presale: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400',
    project: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400',
};

function CopyIdButton({ value, label = 'Copy' }) {
    const [copied, setCopied] = useState(false);
    if (value == null || value === '') return <span className="text-slate-400">—</span>;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(String(value));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert('Gagal menyalin');
        }
    };

    return (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 font-mono text-xs" onClick={handleCopy}>
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            {copied ? 'OK' : label}
        </Button>
    );
}

function IdCell({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5 min-w-[120px]">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
            <div className="flex items-center gap-1">
                <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">{value ?? '—'}</span>
                {value != null && <CopyIdButton value={value} />}
            </div>
        </div>
    );
}

const TABLE_LABELS = {
    companies: 'Company',
    sales_pitches: 'Sales Pitch',
    presales: 'Presale',
    projects: 'Project',
};

function RelationMini({ pipeline }) {
    if (!pipeline?.length) return <span className="text-slate-400">—</span>;
    return (
        <div className="flex items-center gap-1 flex-wrap" title="Company → Sales → Presale → Project">
            {pipeline.map((node, index) => (
                <Fragment key={node.table}>
                    {index > 0 && <ArrowRight className="size-3 text-slate-300 shrink-0" />}
                    <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            node.linked
                                ? 'bg-primary/15 text-primary'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}
                        title={`${node.table}${node.id != null ? ` #${node.id}` : ''}`}
                    >
                        {TABLE_LABELS[node.table]?.charAt(0) || '?'}
                    </span>
                </Fragment>
            ))}
        </div>
    );
}

function RelationPipeline({ pipeline }) {
    return (
        <div className="flex flex-wrap items-stretch gap-2">
            {pipeline.map((node, index) => (
                <Fragment key={node.table}>
                    {index > 0 && (
                        <div className="flex items-center text-slate-400 px-1">
                            <ArrowRight className="size-4" />
                        </div>
                    )}
                    <div
                        className={`flex-1 min-w-[140px] rounded-lg border p-3 ${
                            node.linked
                                ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                                : 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
                        }`}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{node.table}</p>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                            {TABLE_LABELS[node.table] || node.table}
                        </p>
                        <p className="font-mono text-sm font-bold mt-1 text-slate-900 dark:text-white">
                            {node.id != null ? `#${node.id}` : '—'}
                        </p>
                        {node.label && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{node.label}</p>
                        )}
                    </div>
                </Fragment>
            ))}
        </div>
    );
}

function RelationsDetail({ relations }) {
    if (!relations) return null;
    const { pipeline = [], foreign_keys = [], child_tables = [] } = relations;

    return (
        <div className="space-y-4 col-span-full">
            <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
                <Link2 className="size-3.5" /> Relasi data
            </p>
            <RelationPipeline pipeline={pipeline} />
            {foreign_keys.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Dari (tabel.kolom)</th>
                                <th className="px-3 py-2 text-left font-medium w-8" />
                                <th className="px-3 py-2 text-left font-medium">Ke (tabel.kolom)</th>
                                <th className="px-3 py-2 text-center font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {foreign_keys.map((fk, idx) => (
                                <tr key={idx} className={fk.linked ? '' : 'bg-amber-50/50 dark:bg-amber-950/20'}>
                                    <td className="px-3 py-2 font-mono">
                                        {fk.from_table}.{fk.from_column}
                                        {fk.from_id != null && (
                                            <span className="block text-slate-500">row #{fk.from_id}</span>
                                        )}
                                        {fk.from_columns && (
                                            <span className="block text-slate-500">{fk.from_columns}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-slate-400">→</td>
                                    <td className="px-3 py-2 font-mono">
                                        {fk.to_table}.{fk.to_column}
                                        {fk.to_id != null && (
                                            <span className="block text-primary font-semibold">#{fk.to_id}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {fk.linked ? (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px]">
                                                Terhubung
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-700 border-amber-200 text-[10px]">
                                                {fk.note || 'Belum ada'}
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {child_tables.length > 0 && (
                <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">Tabel anak (project_id)</p>
                    <div className="flex flex-wrap gap-2">
                        {child_tables.map((child) => (
                            <div
                                key={child.table}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                            >
                                <span className="font-mono font-semibold">{child.table}</span>
                                <span className="text-slate-500"> .{child.fk_column}</span>
                                <span className="text-slate-400"> = </span>
                                <span className="font-mono text-primary">#{child.fk_value}</span>
                                <span className="ml-2 text-slate-500">({child.count} baris)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MoneyLine({ label, value, muted }) {
    if (value == null || value === '' || Number(value) === 0) return null;
    return (
        <div className={`flex justify-between gap-4 text-xs ${muted ? 'text-slate-500' : ''}`}>
            <span>{label}</span>
            <span className="font-medium tabular-nums">{formatCurrency(value)}</span>
        </div>
    );
}

export default function IntegrationProjects() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('all');
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetchAPI('/integration/registry');
                setRows(res.data || []);
                setMeta(res.meta || null);
            } catch (error) {
                console.error('Failed to load integration registry:', error);
                alert('Gagal memuat data integrasi: ' + error.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (stageFilter !== 'all' && row.stage !== stageFilter) return false;
            if (!keyword) return true;
            const haystack = [
                row.record_id,
                row.display_name,
                row.company_name,
                row.ids?.sales_pitch_id,
                row.ids?.presale_id,
                row.ids?.project_id,
                row.ids?.company_id,
                row.sales?.outcome,
                row.sales?.current_step,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(keyword);
        });
    }, [rows, search, stageFilter]);

    const toggleExpand = (recordId) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(recordId)) next.delete(recordId);
            else next.add(recordId);
            return next;
        });
    };

    const totals = meta?.totals;

    return (
        <div className="mx-auto max-w-[1500px] p-4 pb-16 sm:p-6 sm:pb-20 lg:p-8">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plug className="size-8 text-primary" />
                    Integrasi — Sales to Project
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-3xl">
                    Registry end-to-end dari <strong>Sales pitch</strong> → <strong>Presale</strong> → <strong>Project</strong>,
                    dengan ID untuk dihubungkan ke sistem eksternal dan ringkasan <strong>uang masuk</strong> / <strong>uang keluar</strong>.
                </p>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Link2 className="size-4 text-primary" />
                        Peta relasi database
                    </CardTitle>
                    <CardDescription>
                        Foreign key utama untuk integrasi sistem eksternal — gunakan ID di kolom kanan saat menyambungkan data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {SCHEMA_OVERVIEW.map((edge) => (
                            <div
                                key={edge.via}
                                className="flex flex-col gap-1 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs"
                            >
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    {edge.from} → {edge.to}
                                </span>
                                <span className="font-mono text-[11px] text-primary">{edge.via}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {totals && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                <ArrowDownLeft className="size-4" />
                                <span className="text-[11px] font-semibold uppercase tracking-wide">Uang masuk (efektif)</span>
                            </div>
                            <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.money_in_effective)}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Prioritas: quotation project → presale → deal sales</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-amber-600 mb-1">
                                <ArrowUpRight className="size-4" />
                                <span className="text-[11px] font-semibold uppercase tracking-wide">Uang keluar (plan)</span>
                            </div>
                            <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.money_out_planning)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-orange-600 mb-1">
                                <ArrowUpRight className="size-4" />
                                <span className="text-[11px] font-semibold uppercase tracking-wide">Uang keluar (real)</span>
                            </div>
                            <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.money_out_realized)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-4">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Margin (real)</span>
                            <p
                                className={`text-lg font-bold tabular-nums mt-1 ${
                                    totals.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                            >
                                {formatCurrency(totals.margin)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{formatMarginPercent(totals.margin_percentage)}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                        <Input
                            className="pl-10"
                            placeholder="Cari nama, ID sales / presale / project, company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: `Semua (${rows.length})` },
                            { key: 'sales', label: `Sales (${meta?.by_stage?.sales ?? 0})` },
                            { key: 'presale', label: `Presale (${meta?.by_stage?.presale ?? 0})` },
                            { key: 'project', label: `Project (${meta?.by_stage?.project ?? 0})` },
                        ].map(({ key, label }) => (
                            <Button
                                key={key}
                                type="button"
                                size="sm"
                                variant={stageFilter === key ? 'default' : 'outline'}
                                onClick={() => setStageFilter(key)}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Registry pipeline</CardTitle>
                    <CardDescription>
                        Expand baris untuk melihat ID tiap tahap dan breakdown pemasukan / pengeluaran. Project ID ={' '}
                        <span className="font-mono">projects.id</span> di database.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-2 py-3 w-8" />
                                    <th className="px-4 py-3 font-medium">Deal / Project</th>
                                    <th className="px-4 py-3 font-medium">Tahap</th>
                                    <th className="px-4 py-3 font-medium">Relasi</th>
                                    <th className="px-4 py-3 font-medium text-right">Uang masuk</th>
                                    <th className="px-4 py-3 font-medium text-right">Keluar (real)</th>
                                    <th className="px-4 py-3 font-medium text-right">Margin</th>
                                    <th className="px-4 py-3 font-medium">Project ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                            <Loader2 className="size-6 animate-spin inline-block mr-2" />
                                            Memuat registry...
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                                            Tidak ada data.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row) => {
                                        const expanded = expandedIds.has(row.record_id);
                                        const fin = row.financial || {};
                                        const marginClass =
                                            fin.margin >= 0
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-rose-600 dark:text-rose-400';

                                        return (
                                            <Fragment key={row.record_id}>
                                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                    <td className="px-2 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700"
                                                            onClick={() => toggleExpand(row.record_id)}
                                                            aria-expanded={expanded}
                                                        >
                                                            {expanded ? (
                                                                <ChevronDown className="size-4" />
                                                            ) : (
                                                                <ChevronRight className="size-4" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {row.display_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{row.company_name || '—'}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={STAGE_BADGE[row.stage] || ''}>
                                                            {STAGE_LABELS[row.stage] || row.stage}
                                                        </Badge>
                                                        {row.sales?.outcome && (
                                                            <span className="block text-[10px] text-slate-500 mt-1 uppercase">
                                                                {row.sales.outcome}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <RelationMini pipeline={row.relations?.pipeline} />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                                        {formatCurrency(fin.money_in?.effective)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                                        {formatCurrency(fin.money_out?.realized_expense)}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${marginClass}`}>
                                                        {formatCurrency(fin.margin)}
                                                        <span className="block text-[10px] font-normal">
                                                            {formatMarginPercent(fin.margin_percentage)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {row.ids?.project_id ? (
                                                            <span className="font-mono font-bold text-primary">
                                                                {row.ids.project_id}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {expanded && (
                                                    <tr className="bg-slate-50/80 dark:bg-slate-800/20">
                                                        <td colSpan={8} className="px-4 py-4">
                                                            <RelationsDetail relations={row.relations} />
                                                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                                                                <div className="space-y-3">
                                                                    <p className="text-xs font-bold uppercase text-slate-500">
                                                                        ID untuk integrasi
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-4">
                                                                        <IdCell label="Sales pitch ID" value={row.ids?.sales_pitch_id} />
                                                                        <IdCell label="Presale ID" value={row.ids?.presale_id} />
                                                                        <IdCell label="Project ID" value={row.ids?.project_id} />
                                                                        <IdCell label="Company ID" value={row.ids?.company_id} />
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-lg border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-2">
                                                                    <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                                        <ArrowDownLeft className="size-3.5" /> Uang masuk
                                                                    </p>
                                                                    <MoneyLine label="Sales — estimasi" value={fin.money_in?.sales_estimated} muted />
                                                                    <MoneyLine label="Sales — final deal" value={fin.money_in?.sales_final_deal} muted />
                                                                    <MoneyLine label="Sales — quotation" value={fin.money_in?.sales_quotation} muted />
                                                                    <MoneyLine label="Presale — estimasi" value={fin.money_in?.presale_estimated} muted />
                                                                    <MoneyLine label="Presale — quotation" value={fin.money_in?.presale_quotation} muted />
                                                                    <MoneyLine label="Project — quotation" value={fin.money_in?.project_quotation} />
                                                                    <MoneyLine label="Top up (Scrum)" value={fin.money_in?.topup_income} muted />
                                                                    <div className="border-t border-emerald-200/60 dark:border-emerald-800/40 pt-2 flex justify-between text-sm font-semibold">
                                                                        <span>Efektif</span>
                                                                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                                                                            {formatCurrency(fin.money_in?.effective)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-4 space-y-2">
                                                                    <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400 flex items-center gap-1">
                                                                        <ArrowUpRight className="size-3.5" /> Uang keluar
                                                                    </p>
                                                                    <MoneyLine label="Planning (alokasi)" value={fin.money_out?.planning_expense} />
                                                                    <MoneyLine label="Realisasi" value={fin.money_out?.realized_expense} />
                                                                    {row.stage !== 'project' && (
                                                                        <p className="text-[10px] text-slate-500 italic pt-1">
                                                                            Pengeluaran project tercatat setelah deal menjadi project.
                                                                        </p>
                                                                    )}
                                                                    {row.sales && (
                                                                        <div className="pt-2 border-t border-amber-200/60 text-[11px] text-slate-600 space-y-1">
                                                                            <p>
                                                                                Sales: {row.sales.current_step}
                                                                                {row.sales.closed_at && ` · closed ${formatDate(row.sales.closed_at)}`}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {row.project && (
                                                                        <div className="pt-2 border-t border-amber-200/60 text-[11px] text-slate-600">
                                                                            Project: {row.project.status} · {row.project.methodology || '—'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
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
