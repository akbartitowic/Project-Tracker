import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
    Plug, Copy, Check, RefreshCw, Send, Eye, EyeOff,
    Loader2, X, ChevronDown, ChevronRight, Briefcase, Search, Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EVENTS = ['allocation.created', 'allocation.updated', 'allocation.realized', 'allocation.paid', 'allocation.deleted'];

const STATUS_BADGE = {
    Planning: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400',
    Done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400',
};

function ProjectIcon({ logoUrl, name }) {
    if (logoUrl) {
        return (
            <img src={logoUrl} alt={name}
                className="size-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0" />
        );
    }
    return (
        <div className="size-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
            <Briefcase className="size-4" />
        </div>
    );
}

export default function IntegrationProjects() {
    const { user } = useAuth();
    const canUpdate = hasPermission(user, 'finance_monitoring.update');

    /* ── Global integration ── */
    const [globalData, setGlobalData] = useState(null);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [gWebhookInput, setGWebhookInput] = useState('');
    const [gSaving, setGSaving] = useState(false);
    const [gToggling, setGToggling] = useState(false);
    const [gRegenerating, setGRegenerating] = useState(false);
    const [gTesting, setGTesting] = useState(false);
    const [gTestResult, setGTestResult] = useState(null);
    const [gCopied, setGCopied] = useState('');
    const [gShowKey, setGShowKey] = useState(false);
    const [gShowSecret, setGShowSecret] = useState(false);

    /* ── Projects list ── */
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [search, setSearch] = useState('');

    /* ── Expanded project ── */
    const [expandedId, setExpandedId] = useState(null);
    const [pData, setPData] = useState(null);
    const [pLoading, setPLoading] = useState(false);
    const [pError, setPError] = useState(null);
    const [pWebhookInput, setPWebhookInput] = useState('');
    const [pSaving, setPSaving] = useState(false);
    const [pToggling, setPToggling] = useState(false);
    const [pRegenerating, setPRegenerating] = useState(false);
    const [pTesting, setPTesting] = useState(false);
    const [pTestResult, setPTestResult] = useState(null);
    const [pCopied, setPCopied] = useState('');
    const [pShowKey, setPShowKey] = useState(false);
    const [pShowSecret, setPShowSecret] = useState(false);

    /* ── Loaders ── */
    const loadGlobal = useCallback(async () => {
        setGlobalLoading(true);
        setGlobalError(null);
        try {
            const res = await fetchAPI('/global-integration');
            setGlobalData(res.data);
            setGWebhookInput(res.data.webhook_url || '');
            setGTestResult(null);
        } catch {
            setGlobalError('Gagal memuat konfigurasi global integration.');
        } finally {
            setGlobalLoading(false);
        }
    }, []);

    const loadProjectIntegration = useCallback(async (projectId) => {
        setPLoading(true);
        setPError(null);
        setPData(null);
        setPTestResult(null);
        setPShowKey(false);
        setPShowSecret(false);
        try {
            const res = await fetchAPI(`/projects/${projectId}/integration`);
            setPData(res.data);
            setPWebhookInput(res.data.webhook_url || '');
        } catch {
            setPError('Gagal memuat konfigurasi integrasi project.');
        } finally {
            setPLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await fetchAPI('/projects');
                setProjects(res.data || []);
            } catch { /* silently fail */ }
            finally { setProjectsLoading(false); }
        };
        loadProjects();
        if (canUpdate) loadGlobal();
    }, [loadGlobal, canUpdate]);

    /* ── Global actions ── */
    const saveGlobal = async () => {
        setGSaving(true);
        try {
            const res = await fetchAPI('/global-integration', { method: 'PUT', body: JSON.stringify({ webhook_url: gWebhookInput || null }) });
            setGlobalData(res.data);
        } catch (e) { alert('Gagal menyimpan: ' + e.message); }
        finally { setGSaving(false); }
    };

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

    const testGlobal = async () => {
        setGTesting(true);
        setGTestResult(null);
        try {
            const res = await fetchAPI('/global-integration/test', { method: 'POST' });
            setGTestResult({ success: res.success, message: res.message });
            setGlobalData(prev => prev ? { ...prev, webhook_test_status: res.success ? 'success' : 'failed', webhook_test_sent_at: new Date().toISOString() } : prev);
        } catch (e) { setGTestResult({ success: false, message: e.message }); }
        finally { setGTesting(false); }
    };

    const copyGlobal = (text, key) => {
        navigator.clipboard.writeText(text).then(() => { setGCopied(key); setTimeout(() => setGCopied(''), 2000); });
    };

    /* ── Project expand ── */
    const toggleExpand = (projectId) => {
        if (expandedId === projectId) {
            setExpandedId(null);
            setPData(null);
        } else {
            setExpandedId(projectId);
            loadProjectIntegration(projectId);
        }
    };

    /* ── Per-project actions ── */
    const saveProject = async () => {
        if (!expandedId) return;
        setPSaving(true);
        try {
            const res = await fetchAPI(`/projects/${expandedId}/integration`, { method: 'PUT', body: JSON.stringify({ webhook_url: pWebhookInput || null }) });
            setPData(res.data);
        } catch (e) { alert('Gagal menyimpan: ' + e.message); }
        finally { setPSaving(false); }
    };

    const toggleProject = async () => {
        if (!expandedId || !pData) return;
        setPToggling(true);
        try {
            const res = await fetchAPI(`/projects/${expandedId}/integration`, { method: 'PUT', body: JSON.stringify({ is_active: !pData.is_active }) });
            setPData(res.data);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setPToggling(false); }
    };

    const regenerateProject = async () => {
        if (!expandedId) return;
        if (!confirm('API key lama akan langsung tidak berlaku. Lanjutkan?')) return;
        setPRegenerating(true);
        try {
            const res = await fetchAPI(`/projects/${expandedId}/integration/regenerate-key`, { method: 'POST' });
            setPData(res.data);
            setPShowKey(true);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setPRegenerating(false); }
    };

    const testProject = async () => {
        if (!expandedId) return;
        setPTesting(true);
        setPTestResult(null);
        try {
            const res = await fetchAPI(`/projects/${expandedId}/integration/test`, { method: 'POST' });
            setPTestResult({ success: res.success, message: res.message });
            setPData(prev => prev ? { ...prev, webhook_test_status: res.success ? 'success' : 'failed', webhook_test_sent_at: new Date().toISOString() } : prev);
        } catch (e) { setPTestResult({ success: false, message: e.message }); }
        finally { setPTesting(false); }
    };

    const copyProject = (text, key) => {
        navigator.clipboard.writeText(text).then(() => { setPCopied(key); setTimeout(() => setPCopied(''), 2000); });
    };

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Plug className="size-7 text-primary shrink-0" />
                    Konfigurasi Integrasi API
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Kelola API key inbound dan webhook outbound untuk menghubungkan HubTask dengan sistem eksternal.
                </p>
            </div>

            {!canUpdate ? (
                <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
                        <Lock className="size-4" /> Anda tidak memiliki akses untuk melihat konfigurasi integrasi.
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ── Global Integration Card ── */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Plug className="size-4 text-primary" />
                                    <CardTitle className="text-base">Integrasi API Global</CardTitle>
                                </div>
                                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">Semua Project</span>
                            </div>
                            <CardDescription>
                                Satu API key dan webhook untuk semua project — cocok untuk ERP, akuntansi, atau sistem terpusat.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {globalLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
                                    <Loader2 className="size-4 animate-spin" /> Memuat konfigurasi global…
                                </div>
                            ) : globalError ? (
                                <div className="flex items-center gap-2 text-sm text-rose-500 py-4">
                                    <X className="size-4 shrink-0" /> {globalError}
                                    <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={loadGlobal}>Coba lagi</Button>
                                </div>
                            ) : globalData ? (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-slate-500">Status:</span>
                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${globalData.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                            {globalData.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={toggleGlobal} disabled={gToggling}>
                                            {gToggling ? <Loader2 className="size-3 animate-spin" /> : (globalData.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                                        </Button>
                                        {globalData.webhook_last_status && (
                                            <span className="text-xs text-slate-400">
                                                Live: <span className={`font-medium ${globalData.webhook_last_status === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>{globalData.webhook_last_status}</span>
                                                {globalData.webhook_last_sent_at && ` · ${new Date(globalData.webhook_last_sent_at).toLocaleString('id-ID')}`}
                                            </span>
                                        )}
                                        {globalData.webhook_test_status && (
                                            <span className="text-xs text-slate-400">
                                                Test: <span className={`font-medium ${globalData.webhook_test_status === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>{globalData.webhook_test_status}</span>
                                                {globalData.webhook_test_sent_at && ` · ${new Date(globalData.webhook_test_sent_at).toLocaleString('id-ID')}`}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                                Inbound — App lain → HubTask
                                            </h4>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Endpoint URL</label>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">{globalData.inbound_endpoint}</code>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copyGlobal(globalData.inbound_endpoint, 'g-endpoint')}>
                                                        {gCopied === 'g-endpoint' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                                    Saat POST, wajib sertakan <code className="bg-amber-50 dark:bg-amber-900/30 px-1 rounded">project_id</code> di body.
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Global API Key (X-Api-Key)</label>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                        {gShowKey ? globalData.inbound_api_key : '•'.repeat(24)}
                                                    </code>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setGShowKey(v => !v)}>
                                                        {gShowKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                    </Button>
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copyGlobal(globalData.inbound_api_key, 'g-apikey')}>
                                                        {gCopied === 'g-apikey' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
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
                                                    <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copyGlobal(globalData.webhook_secret, 'g-secret')}>
                                                        {gCopied === 'g-secret' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-slate-400">Verifikasi header <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-Webhook-Signature</code> dari HubTask.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                                Outbound — HubTask → App lain
                                            </h4>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook URL Tujuan</label>
                                                <div className="flex gap-2">
                                                    <Input className="text-sm h-9" placeholder="https://erp-kamu.com/webhook/hubtask" value={gWebhookInput} onChange={e => setGWebhookInput(e.target.value)} />
                                                    <Button size="sm" className="shrink-0 h-9" onClick={saveGlobal} disabled={gSaving}>
                                                        {gSaving ? <Loader2 className="size-3.5 animate-spin" /> : 'Simpan'}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-slate-400">HubTask akan POST ke URL ini untuk perubahan allocation di <strong>semua project</strong>.</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Events yang dikirim</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {EVENTS.map(e => <span key={e} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{e}</span>)}
                                                </div>
                                            </div>
                                            {globalData.webhook_url && (
                                                <div className="space-y-2">
                                                    <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={testGlobal} disabled={gTesting}>
                                                        {gTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                                        Test Webhook
                                                    </Button>
                                                    {gTestResult && (
                                                        <p className={`text-xs flex items-center gap-1 ${gTestResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {gTestResult.success ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                                            {gTestResult.message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 select-none">
                                            Contoh penggunaan (Global Key)
                                        </summary>
                                        <div className="mt-3 space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                            <div>
                                                <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">POST — tambah allocation ke project</p>
                                                <pre className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-slate-700 dark:text-slate-300">{`curl -X POST ${globalData.inbound_endpoint} \\
  -H "X-Api-Key: ${globalData.inbound_api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id":1,"category":"Development","amount":5000000,"description":"Sprint 1"}'`}</pre>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">GET — list allocation (opsional filter project)</p>
                                                <pre className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-slate-700 dark:text-slate-300">{`curl "${globalData.inbound_endpoint}?project_id=1" \\
  -H "X-Api-Key: ${globalData.inbound_api_key}"`}</pre>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* ── Per-Project Integration ── */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Integrasi Per Project</h2>
                                <p className="text-xs text-slate-500 mt-0.5">API key dan webhook terpisah per project — klik project untuk melihat atau mengubah konfigurasinya.</p>
                            </div>
                            <div className="relative w-full sm:w-56 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                                <Input placeholder="Cari project…" className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>

                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            {projectsLoading ? (
                                <CardContent className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
                                    <Loader2 className="size-4 animate-spin" /> Memuat project…
                                </CardContent>
                            ) : filteredProjects.length === 0 ? (
                                <CardContent className="py-12 text-center text-slate-400 text-sm">
                                    {search ? `Tidak ada project yang cocok dengan "${search}".` : 'Belum ada project.'}
                                </CardContent>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredProjects.map(project => {
                                        const expanded = expandedId === project.id;
                                        return (
                                            <div key={project.id}>
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                                    onClick={() => toggleExpand(project.id)}
                                                >
                                                    <ProjectIcon logoUrl={project.company_logo_url} name={project.name} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{project.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[project.status] || STATUS_BADGE.Planning}`}>
                                                                {project.status || 'Planning'}
                                                            </span>
                                                            {project.methodology && (
                                                                <span className="text-[10px] text-slate-400">{project.methodology}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {expanded
                                                        ? <ChevronDown className="size-4 text-slate-400 shrink-0" />
                                                        : <ChevronRight className="size-4 text-slate-400 shrink-0" />
                                                    }
                                                </button>

                                                {expanded && (
                                                    <div className="px-4 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                                                        {pLoading ? (
                                                            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                                                                <Loader2 className="size-4 animate-spin" /> Memuat konfigurasi…
                                                            </div>
                                                        ) : pError ? (
                                                            <div className="flex items-center gap-2 text-sm text-rose-500 py-4">
                                                                <X className="size-4 shrink-0" /> {pError}
                                                                <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={() => loadProjectIntegration(project.id)}>Coba lagi</Button>
                                                            </div>
                                                        ) : pData ? (
                                                            <div className="space-y-6">
                                                                {/* Status */}
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="text-sm text-slate-500">Status:</span>
                                                                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${pData.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                                                        {pData.is_active ? 'Aktif' : 'Nonaktif'}
                                                                    </span>
                                                                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={toggleProject} disabled={pToggling}>
                                                                        {pToggling ? <Loader2 className="size-3 animate-spin" /> : (pData.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                                                                    </Button>
                                                                    {pData.webhook_last_status && (
                                                                        <span className="text-xs text-slate-400">
                                                                            Live: <span className={`font-medium ${pData.webhook_last_status === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>{pData.webhook_last_status}</span>
                                                                            {pData.webhook_last_sent_at && ` · ${new Date(pData.webhook_last_sent_at).toLocaleString('id-ID')}`}
                                                                        </span>
                                                                    )}
                                                                    {pData.webhook_test_status && (
                                                                        <span className="text-xs text-slate-400">
                                                                            Test: <span className={`font-medium ${pData.webhook_test_status === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>{pData.webhook_test_status}</span>
                                                                            {pData.webhook_test_sent_at && ` · ${new Date(pData.webhook_test_sent_at).toLocaleString('id-ID')}`}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                    {/* Inbound */}
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                                                            Inbound — App lain → HubTask
                                                                        </h4>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Endpoint URL</label>
                                                                            <div className="flex items-center gap-2">
                                                                                <code className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">{pData.inbound_endpoint}</code>
                                                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copyProject(pData.inbound_endpoint, 'p-endpoint')}>
                                                                                    {pCopied === 'p-endpoint' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">API Key (X-Api-Key)</label>
                                                                            <div className="flex items-center gap-2">
                                                                                <code className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                                                    {pShowKey ? pData.inbound_api_key : '•'.repeat(24)}
                                                                                </code>
                                                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setPShowKey(v => !v)}>
                                                                                    {pShowKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                                                </Button>
                                                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copyProject(pData.inbound_api_key, 'p-apikey')}>
                                                                                    {pCopied === 'p-apikey' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                                                </Button>
                                                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={regenerateProject} disabled={pRegenerating} title="Regenerate">
                                                                                    <RefreshCw className={`size-3.5 ${pRegenerating ? 'animate-spin' : ''}`} />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook Secret (HMAC-SHA256)</label>
                                                                            <div className="flex items-center gap-2">
                                                                                <code className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                                                                    {pShowSecret ? pData.webhook_secret : '•'.repeat(20)}
                                                                                </code>
                                                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setPShowSecret(v => !v)}>
                                                                                    {pShowSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                                                </Button>
                                                                                <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copyProject(pData.webhook_secret, 'p-secret')}>
                                                                                    {pCopied === 'p-secret' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                                                                </Button>
                                                                            </div>
                                                                            <p className="text-xs text-slate-400">Verifikasi header <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-Webhook-Signature</code>.</p>
                                                                        </div>
                                                                    </div>
                                                                    {/* Outbound */}
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                                                                            Outbound — HubTask → App lain
                                                                        </h4>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook URL Tujuan</label>
                                                                            <div className="flex gap-2">
                                                                                <Input className="text-sm h-9" placeholder="https://app-kamu.com/webhook/hubtask" value={pWebhookInput} onChange={e => setPWebhookInput(e.target.value)} />
                                                                                <Button size="sm" className="shrink-0 h-9" onClick={saveProject} disabled={pSaving}>
                                                                                    {pSaving ? <Loader2 className="size-3.5 animate-spin" /> : 'Simpan'}
                                                                                </Button>
                                                                            </div>
                                                                            <p className="text-xs text-slate-400">HubTask akan POST ke URL ini untuk perubahan allocation di project ini.</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Events yang dikirim</label>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {EVENTS.map(e => <span key={e} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{e}</span>)}
                                                                            </div>
                                                                        </div>
                                                                        {pData.webhook_url && (
                                                                            <div className="space-y-2">
                                                                                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={testProject} disabled={pTesting}>
                                                                                    {pTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                                                                    Test Webhook
                                                                                </Button>
                                                                                {pTestResult && (
                                                                                    <p className={`text-xs flex items-center gap-1 ${pTestResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                                        {pTestResult.success ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                                                                        {pTestResult.message}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <details className="text-xs">
                                                                    <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 select-none">
                                                                        Contoh penggunaan API
                                                                    </summary>
                                                                    <div className="mt-3 space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                                                        <div>
                                                                            <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">POST — tambah allocation</p>
                                                                            <pre className="bg-white dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-slate-700 dark:text-slate-300">{`curl -X POST ${pData.inbound_endpoint} \\
  -H "X-Api-Key: ${pData.inbound_api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"category":"Development","amount":5000000}'`}</pre>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">PUT — update realization</p>
                                                                            <pre className="bg-white dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-slate-700 dark:text-slate-300">{`curl -X PUT ${pData.inbound_endpoint}/{id} \\
  -H "X-Api-Key: ${pData.inbound_api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"realized_amount":4500000}'`}</pre>
                                                                        </div>
                                                                    </div>
                                                                </details>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
