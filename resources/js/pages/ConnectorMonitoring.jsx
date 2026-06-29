import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
    Cable, Check, Send, Loader2, X, Lock,
    ChevronDown, ChevronRight, LayoutGrid, List,
    Wifi, WifiOff, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const EVENTS = ['allocation.created', 'allocation.updated', 'allocation.realized', 'allocation.paid', 'allocation.deleted'];

function WebhookBadge({ webhookUrl }) {
    if (webhookUrl) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                <ExternalLink className="size-2.5" /> Terkonfigurasi
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">
            <WifiOff className="size-2.5" /> Belum dikonfigurasi
        </span>
    );
}

function StatusBadge({ isActive }) {
    return (
        <span className={cn(
            'inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
            isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        )}>
            {isActive ? 'Aktif' : 'Nonaktif'}
        </span>
    );
}

/* ─── Shared detail panel ─── */
function ConnectorDetail({ local, setLocal, canUpdate }) {
    const [webhookInput, setWebhookInput] = useState(local.webhook_url || '');
    const [saving,       setSaving]       = useState(false);
    const [testing,      setTesting]      = useState(false);
    const [testResult,   setTestResult]   = useState(null);

    useEffect(() => { setWebhookInput(local.webhook_url || ''); }, [local.webhook_url]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetchAPI(`/global-integrations/${local.id}`, {
                method: 'PUT',
                body: JSON.stringify({ webhook_url: webhookInput || null }),
            });
            setLocal(res.data);
        } catch (e) { alert('Gagal menyimpan: ' + e.message); }
        finally { setSaving(false); }
    };

    const test = async () => {
        setTesting(true); setTestResult(null);
        try {
            const res = await fetchAPI(`/global-integrations/${local.id}/test`, { method: 'POST' });
            setTestResult({ success: res.success, message: res.message });
            setLocal(prev => ({
                ...prev,
                webhook_test_status: res.success ? 'success' : 'failed',
                webhook_test_sent_at: new Date().toISOString(),
            }));
        } catch (e) { setTestResult({ success: false, message: e.message }); }
        finally { setTesting(false); }
    };

    return (
        <div className="space-y-5">
            {/* Status baris */}
            {(local.webhook_last_status || local.webhook_test_status) && (
                <div className="flex flex-wrap items-center gap-4">
                    {local.webhook_last_status && (
                        <span className="text-xs text-slate-400">
                            Live: <span className={local.webhook_last_status === 'success' ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                                {local.webhook_last_status}
                            </span>
                            {local.webhook_last_sent_at && ` · ${new Date(local.webhook_last_sent_at).toLocaleString('id-ID')}`}
                        </span>
                    )}
                    {local.webhook_test_status && (
                        <span className="text-xs text-slate-400">
                            Test: <span className={local.webhook_test_status === 'success' ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                                {local.webhook_test_status}
                            </span>
                            {local.webhook_test_sent_at && ` · ${new Date(local.webhook_test_sent_at).toLocaleString('id-ID')}`}
                        </span>
                    )}
                </div>
            )}

            {/* Webhook URL */}
            <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Webhook URL Tujuan</label>
                <div className="flex gap-2">
                    <Input
                        className="text-sm h-9"
                        placeholder="https://sistem-kamu.com/webhook/hubtask"
                        value={webhookInput}
                        onChange={e => setWebhookInput(e.target.value)}
                        disabled={!canUpdate}
                    />
                    {canUpdate && (
                        <Button size="sm" className="shrink-0 h-9" onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Simpan'}
                        </Button>
                    )}
                </div>
                <p className="text-xs text-slate-400">HubTask akan POST ke URL ini setiap ada perubahan allocation.</p>
            </div>

            {/* Events */}
            <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Events yang dikirim</label>
                <div className="flex flex-wrap gap-1.5">
                    {EVENTS.map(e => (
                        <span key={e} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">{e}</span>
                    ))}
                </div>
            </div>

            {/* Test */}
            {local.webhook_url && canUpdate && (
                <div className="space-y-2">
                    <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={test} disabled={testing}>
                        {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        Test Webhook
                    </Button>
                    {testResult && (
                        <p className={cn('text-xs flex items-center gap-1', testResult.success ? 'text-emerald-600' : 'text-rose-600')}>
                            {testResult.success ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                            {testResult.message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── List view item (accordion) ─── */
function ListItem({ config, canUpdate, onUpdated }) {
    const [expanded, setExpanded] = useState(false);
    const [local,    setLocal]    = useState(config);

    useEffect(() => { setLocal(config); }, [config]);

    const handleUpdate = (updated) => { setLocal(updated); onUpdated(updated); };

    return (
        <div className={cn(
            'rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900 transition-all',
            local.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800 opacity-60',
        )}>
            <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors select-none"
                onClick={() => setExpanded(v => !v)}
            >
                <div className={cn(
                    'size-9 rounded-lg flex items-center justify-center shrink-0',
                    local.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                )}>
                    <Cable className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{local.name}</span>
                        <StatusBadge isActive={local.is_active} />
                        <WebhookBadge webhookUrl={local.webhook_url} />
                    </div>
                    {local.webhook_url && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            → {local.webhook_url}
                        </p>
                    )}
                    {local.webhook_test_status && (
                        <span className={cn(
                            'text-[10px] font-medium',
                            local.webhook_test_status === 'success' ? 'text-emerald-600' : 'text-rose-500',
                        )}>
                            Test: {local.webhook_test_status}
                            {local.webhook_test_sent_at && ` · ${new Date(local.webhook_test_sent_at).toLocaleDateString('id-ID')}`}
                        </span>
                    )}
                </div>
                {expanded
                    ? <ChevronDown className="size-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="size-4 text-slate-400 shrink-0" />}
            </div>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-5">
                    <ConnectorDetail local={local} setLocal={handleUpdate} canUpdate={canUpdate} />
                </div>
            )}
        </div>
    );
}

/* ─── Card view item (grid → dialog) ─── */
function GridCard({ config, canUpdate, onUpdated }) {
    const [open,  setOpen]  = useState(false);
    const [local, setLocal] = useState(config);

    useEffect(() => { setLocal(config); }, [config]);

    const handleUpdate = (updated) => { setLocal(updated); onUpdated(updated); };

    const testStatus = local.webhook_test_status;

    return (
        <>
            <div
                onClick={() => setOpen(true)}
                className={cn(
                    'rounded-xl border shadow-sm bg-white dark:bg-slate-900 p-4 cursor-pointer',
                    'hover:shadow-md hover:border-primary/30 transition-all select-none',
                    local.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800 opacity-60',
                )}
            >
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={cn(
                        'size-10 rounded-xl flex items-center justify-center shrink-0',
                        local.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                    )}>
                        <Cable className="size-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <StatusBadge isActive={local.is_active} />
                        <WebhookBadge webhookUrl={local.webhook_url} />
                    </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug mb-1">
                    {local.name}
                </p>

                {local.webhook_url ? (
                    <p className="text-[10px] text-slate-400 truncate">→ {local.webhook_url}</p>
                ) : (
                    <p className="text-[10px] text-slate-400 italic">Webhook URL belum diisi</p>
                )}

                {testStatus && (
                    <p className={cn(
                        'text-[10px] font-medium mt-2',
                        testStatus === 'success' ? 'text-emerald-600' : 'text-rose-500',
                    )}>
                        Test: {testStatus}
                        {local.webhook_test_sent_at && ` · ${new Date(local.webhook_test_sent_at).toLocaleDateString('id-ID')}`}
                    </p>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Cable className="size-4 text-primary" />
                            {local.name}
                        </DialogTitle>
                    </DialogHeader>
                    <ConnectorDetail local={local} setLocal={handleUpdate} canUpdate={canUpdate} />
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ─── Page ─── */
export default function ConnectorMonitoring() {
    const { user }  = useAuth();
    const canUpdate = hasPermission(user, 'finance_monitoring.update');

    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get('view') === 'list' ? 'list' : 'card';
    const setView = (v) => setSearchParams(prev => { prev.set('view', v); return prev; });

    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchAPI('/global-integrations');
            setConfigs(res.data || []);
        } catch { setError('Gagal memuat konfigurasi connector.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (canUpdate) load(); else setLoading(false); }, [load, canUpdate]);

    const configuredCount = configs.filter(c => c.webhook_url).length;
    const activeCount     = configs.filter(c => c.is_active).length;

    const onUpdated = (updated) => setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Cable className="size-6 text-primary shrink-0" />
                        Connector Monitoring
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Kelola webhook outbound — kirim event dari HubTask ke sistem eksternal.
                    </p>
                </div>

                {/* View toggle */}
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 self-start shrink-0">
                    <button
                        onClick={() => setView('card')}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                            view === 'card'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                        )}
                    >
                        <LayoutGrid className="size-3.5" /> Card
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                            view === 'list'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                        )}
                    >
                        <List className="size-3.5" /> List
                    </button>
                </div>
            </div>

            {/* Stats */}
            {configs.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span><strong className="text-slate-700 dark:text-slate-200">{configs.length}</strong> konfigurasi</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-blue-600">{activeCount}</strong> aktif</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-emerald-600">{configuredCount}</strong> terkonfigurasi</span>
                </div>
            )}

            {/* Content */}
            {!canUpdate ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <Lock className="size-4" /> Anda tidak memiliki akses untuk melihat konfigurasi connector.
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                    <Loader2 className="size-5 animate-spin" /> Memuat konfigurasi…
                </div>
            ) : error ? (
                <div className="flex items-center justify-center gap-2 py-16 text-rose-500 text-sm">
                    <X className="size-4 shrink-0" /> {error}
                    <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={load}>Coba lagi</Button>
                </div>
            ) : configs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50">
                    <Cable className="size-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Belum ada konfigurasi connector</p>
                    <p className="text-xs mt-1">Buat konfigurasi di menu Integrasi API terlebih dahulu.</p>
                </div>
            ) : view === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {configs.map(config => (
                        <GridCard key={config.id} config={config} canUpdate={canUpdate} onUpdated={onUpdated} />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {configs.map(config => (
                        <ListItem key={config.id} config={config} canUpdate={canUpdate} onUpdated={onUpdated} />
                    ))}
                </div>
            )}
        </div>
    );
}
