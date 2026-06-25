import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
    Plug, Copy, Check, RefreshCw, Eye, EyeOff,
    Loader2, X, ChevronRight, Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const METHOD_COLOR = {
    GET: 'bg-blue-500',
    POST: 'bg-emerald-500',
    PUT: 'bg-amber-500',
    DELETE: 'bg-rose-500',
};

function TabBar({ value, onChange, options }) {
    return (
        <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`text-xs px-3 py-1 rounded-md transition-colors ${
                        value === opt.value
                            ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white font-medium'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function EndpointRow({ method, path, summary, children }) {
    return (
        <details className="group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none list-none">
                <span className={`text-[10px] font-bold text-white ${METHOD_COLOR[method]} px-2 py-0.5 rounded min-w-[46px] text-center shrink-0`}>
                    {method}
                </span>
                <code className="text-xs font-mono text-slate-700 dark:text-slate-300 flex-1 truncate">{path}</code>
                <span className="text-xs text-slate-400 shrink-0 hidden sm:block pr-1">{summary}</span>
                <ChevronRight className="size-3.5 text-slate-400 shrink-0 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-4">
                {children}
            </div>
        </details>
    );
}

function ParamTable({ title, rows }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{title}</p>
            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                        <tr>
                            <th className="px-3 py-2 font-semibold text-slate-500">Field</th>
                            <th className="px-3 py-2 font-semibold text-slate-500">Tipe</th>
                            <th className="px-3 py-2 font-semibold text-slate-500">Wajib</th>
                            <th className="px-3 py-2 font-semibold text-slate-500">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.map((row, i) => (
                            <tr key={i}>
                                <td className="px-3 py-2">
                                    <code className={`font-mono ${row.required === true ? 'text-primary' : 'text-slate-500'}`}>{row.name}</code>
                                </td>
                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.type}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    {row.required === true && <span className="text-rose-500 font-medium">Ya</span>}
                                    {row.required === false && <span className="text-slate-400">Tidak</span>}
                                    {typeof row.required === 'string' && <span className="text-amber-500 font-medium">{row.required}</span>}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{row.desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function JsonBlock({ status, body }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Response {status}</p>
            <pre className="text-xs bg-slate-900 text-emerald-300 rounded-lg p-3 overflow-x-auto leading-relaxed">{body}</pre>
        </div>
    );
}

function CurlBlock({ curl, id, copied, onCopy }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">cURL</p>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    onClick={() => onCopy(curl, id)}>
                    {copied === id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />} Salin
                </Button>
            </div>
            <pre className="text-xs bg-slate-900 text-slate-300 rounded-lg p-3 overflow-x-auto leading-relaxed">{curl}</pre>
        </div>
    );
}

function ApiDocs({ apiKey, copied, onCopy }) {
    const url = `${window.location.origin}/api/external/allocations`;
    const key = apiKey ?? 'your_api_key';

    return (
        <div className="space-y-3">
            {/* Auth */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Authentication</p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-md font-mono truncate">
                        X-Api-Key: {key}
                    </code>
                    <Button size="icon" variant="ghost" className="shrink-0 size-6" onClick={() => onCopy(key, 'auth')}>
                        {copied === 'auth' ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-slate-400" />}
                    </Button>
                </div>
                <p className="text-[10px] text-amber-500 dark:text-amber-600">
                    Sertakan header ini di setiap request. Gunakan <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">project_id</code> di body POST untuk menentukan project tujuan.
                </p>
            </div>

            {/* GET */}
            <EndpointRow method="GET" path="/api/external/allocations" summary="List allocations">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Mengambil semua allocation dari semua project. Gunakan query parameter <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">project_id</code> untuk filter per project.
                </p>
                <ParamTable title="Query Parameters" rows={[
                    { name: 'project_id', type: 'integer', required: false, desc: 'Filter allocation berdasarkan project tertentu.' },
                ]} />
                <JsonBlock status={200} body={`{
  "data": [
    {
      "id": 1,
      "project_id": 3,
      "project_name": "Project Alpha",
      "category_id": 2,
      "category_name": "Development",
      "amount": 5000000,
      "description": "Sprint 1",
      "realized_amount": null,
      "realized_at": null,
      "paid_amount": null,
      "paid_at": null,
      "is_topup": false,
      "created_at": "2026-06-25T10:00:00.000000Z"
    }
  ]
}`} />
                <CurlBlock id="get" copied={copied} onCopy={onCopy}
                    curl={`curl "${url}" \\\n  -H "X-Api-Key: ${key}"`} />
            </EndpointRow>

            {/* POST */}
            <EndpointRow method="POST" path="/api/external/allocations" summary="Buat allocation baru">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Membuat allocation baru. <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">project_id</code> wajib disertakan untuk menentukan project tujuan.
                </p>
                <ParamTable title="Request Body (application/json)" rows={[
                    { name: 'category', type: 'string', required: true, desc: 'Nama kategori (maks 255). Dibuat otomatis jika belum ada.' },
                    { name: 'amount', type: 'number', required: true, desc: 'Nilai allocation. Min 0.' },
                    { name: 'project_id', type: 'integer', required: true, desc: 'ID project tujuan.' },
                    { name: 'description', type: 'string', required: false, desc: 'Keterangan allocation. Maks 1000 karakter.' },
                    { name: 'realized_amount', type: 'number', required: false, desc: 'Nilai realisasi. realized_at otomatis diisi.' },
                    { name: 'paid_amount', type: 'number', required: false, desc: 'Nilai pembayaran.' },
                    { name: 'paid_at', type: 'date', required: false, desc: 'Tanggal bayar (YYYY-MM-DD). Default hari ini jika paid_amount diisi.' },
                ]} />
                <JsonBlock status={201} body={`{
  "message": "Allocation created.",
  "data": {
    "id": 5,
    "project_id": 3,
    "amount": 5000000,
    "description": "Sprint 1",
    "realized_amount": null,
    "realized_at": null,
    "paid_amount": null,
    "paid_at": null,
    "created_at": "2026-06-25T10:00:00+00:00",
    "updated_at": "2026-06-25T10:00:00+00:00"
  }
}`} />
                <CurlBlock id="post" copied={copied} onCopy={onCopy}
                    curl={`curl -X POST "${url}" \\\n  -H "X-Api-Key: ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"project_id":3,"category":"Development","amount":5000000,"description":"Sprint 1"}'`} />
            </EndpointRow>

            {/* PUT */}
            <EndpointRow method="PUT" path="/api/external/allocations/{id}" summary="Update allocation">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Update field allocation secara partial. Hanya field yang dikirim yang diperbarui.
                </p>
                <ParamTable title="Path Parameter" rows={[
                    { name: 'id', type: 'integer', required: true, desc: 'ID allocation yang akan diupdate.' },
                ]} />
                <ParamTable title="Request Body — semua opsional" rows={[
                    { name: 'amount', type: 'number', required: false, desc: 'Nilai allocation baru. Min 0.' },
                    { name: 'description', type: 'string | null', required: false, desc: 'Deskripsi baru. Kirim null untuk menghapus.' },
                    { name: 'realized_amount', type: 'number | null', required: false, desc: 'Nilai realisasi. realized_at otomatis diisi jika belum ada.' },
                    { name: 'paid_amount', type: 'number | null', required: false, desc: 'Nilai pembayaran.' },
                    { name: 'paid_at', type: 'date | null', required: false, desc: 'Tanggal bayar (YYYY-MM-DD).' },
                ]} />
                <JsonBlock status={200} body={`{
  "message": "Allocation updated.",
  "data": {
    "id": 5,
    "project_id": 3,
    "amount": 5000000,
    "description": "Sprint 1",
    "realized_amount": 4500000,
    "realized_at": "2026-06-25",
    "paid_amount": null,
    "paid_at": null,
    "created_at": "2026-06-25T10:00:00+00:00",
    "updated_at": "2026-06-25T11:00:00+00:00"
  }
}`} />
                <CurlBlock id="put" copied={copied} onCopy={onCopy}
                    curl={`curl -X PUT "${url}/5" \\\n  -H "X-Api-Key: ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"realized_amount":4500000}'`} />
            </EndpointRow>

            {/* DELETE */}
            <EndpointRow method="DELETE" path="/api/external/allocations/{id}" summary="Hapus allocation">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Menghapus allocation secara permanen.
                </p>
                <ParamTable title="Path Parameter" rows={[
                    { name: 'id', type: 'integer', required: true, desc: 'ID allocation yang akan dihapus.' },
                ]} />
                <JsonBlock status={200} body={`{\n  "message": "Allocation deleted."\n}`} />
                <CurlBlock id="delete" copied={copied} onCopy={onCopy}
                    curl={`curl -X DELETE "${url}/5" \\\n  -H "X-Api-Key: ${key}"`} />
            </EndpointRow>
        </div>
    );
}

export default function IntegrasiMonitoring() {
    const { user } = useAuth();
    const canUpdate = hasPermission(user, 'finance_monitoring.update');

    const [globalData, setGlobalData] = useState(null);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [gToggling, setGToggling] = useState(false);
    const [gRegenerating, setGRegenerating] = useState(false);
    const [gCopied, setGCopied] = useState('');
    const [gShowKey, setGShowKey] = useState(false);
    const [gShowSecret, setGShowSecret] = useState(false);
    const [activeTab, setActiveTab] = useState('config');
    const [docCopied, setDocCopied] = useState('');

    const loadGlobal = useCallback(async () => {
        setGlobalLoading(true);
        setGlobalError(null);
        try {
            const res = await fetchAPI('/global-integration');
            setGlobalData(res.data);
        } catch {
            setGlobalError('Gagal memuat konfigurasi global integration.');
        } finally {
            setGlobalLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canUpdate) loadGlobal();
    }, [loadGlobal, canUpdate]);

    const toggleGlobal = async () => {
        if (!globalData) return;
        setGToggling(true);
        try {
            const res = await fetchAPI('/global-integration', { method: 'PUT', body: JSON.stringify({ is_active: !globalData.is_active }) });
            setGlobalData(res.data);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setGToggling(false); }
    };

    const regenerateGlobal = async () => {
        if (!confirm('Global API key lama akan langsung tidak berlaku. Lanjutkan?')) return;
        setGRegenerating(true);
        try {
            const res = await fetchAPI('/global-integration/regenerate-key', { method: 'POST' });
            setGlobalData(res.data);
            setGShowKey(true);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setGRegenerating(false); }
    };

    const copy = (text, key, setter) => {
        navigator.clipboard.writeText(text).then(() => { setter(key); setTimeout(() => setter(''), 2000); });
    };

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Plug className="size-7 text-primary shrink-0" />
                    Integrasi Monitoring
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Kelola API key inbound — terima data dari sistem eksternal ke HubTask.
                </p>
            </div>

            {!canUpdate ? (
                <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
                        <Lock className="size-4" /> Anda tidak memiliki akses untuk melihat konfigurasi integrasi.
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Plug className="size-4 text-primary shrink-0" />
                                <div>
                                    <CardTitle className="text-base">Integrasi API</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">Konfigurasi inbound — sistem eksternal → HubTask</CardDescription>
                                </div>
                            </div>
                            <TabBar
                                value={activeTab}
                                onChange={setActiveTab}
                                options={[
                                    { value: 'config', label: 'Konfigurasi' },
                                    { value: 'docs', label: 'Dokumentasi API' },
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {globalLoading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
                                <Loader2 className="size-4 animate-spin" /> Memuat konfigurasi…
                            </div>
                        ) : globalError ? (
                            <div className="flex items-center gap-2 text-sm text-rose-500 py-4">
                                <X className="size-4 shrink-0" /> {globalError}
                                <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={loadGlobal}>Coba lagi</Button>
                            </div>
                        ) : globalData ? (
                            activeTab === 'config' ? (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-slate-500">Status:</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${globalData.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                            {globalData.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={toggleGlobal} disabled={gToggling}>
                                            {gToggling ? <Loader2 className="size-3 animate-spin" /> : (globalData.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Endpoint URL</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">{globalData.inbound_endpoint}</code>
                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copy(globalData.inbound_endpoint, 'endpoint', setGCopied)}>
                                                    {gCopied === 'endpoint' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-amber-600 dark:text-amber-400">Saat POST, wajib sertakan <code className="bg-amber-50 dark:bg-amber-900/30 px-1 rounded">project_id</code> di body.</p>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">API Key (X-Api-Key)</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                    {gShowKey ? globalData.inbound_api_key : '•'.repeat(24)}
                                                </code>
                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setGShowKey(v => !v)}>
                                                    {gShowKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                </Button>
                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copy(globalData.inbound_api_key, 'apikey', setGCopied)}>
                                                    {gCopied === 'apikey' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                </Button>
                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={regenerateGlobal} disabled={gRegenerating} title="Regenerate">
                                                    <RefreshCw className={`size-3.5 ${gRegenerating ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook Secret (HMAC-SHA256)</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                    {gShowSecret ? globalData.webhook_secret : '•'.repeat(20)}
                                                </code>
                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setGShowSecret(v => !v)}>
                                                    {gShowSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                </Button>
                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copy(globalData.webhook_secret, 'secret', setGCopied)}>
                                                    {gCopied === 'secret' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-400">Verifikasi header <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-Webhook-Signature</code> dari HubTask.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ApiDocs
                                    apiKey={globalData.inbound_api_key}
                                    copied={docCopied}
                                    onCopy={(text, key) => copy(text, key, setDocCopied)}
                                />
                            )
                        ) : null}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
