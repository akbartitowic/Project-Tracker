import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
    Plug, Copy, Check, RefreshCw, Eye, EyeOff,
    Loader2, X, ChevronDown, ChevronRight, Lock,
    Plus, Trash2, Wifi, WifiOff, LayoutGrid, List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function StatusBadge({ isActive }) {
    return (
        <span className={cn(
            'inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
            isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        )}>
            {isActive ? 'Aktif' : 'Nonaktif'}
        </span>
    );
}

function UsageBadge({ lastUsedAt }) {
    if (lastUsedAt) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                <Wifi className="size-2.5" /> Terhubung
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">
            <WifiOff className="size-2.5" /> Belum digunakan
        </span>
    );
}

/* ─── Shared detail panel (used in both list expand & card dialog) ─── */
function ConfigDetail({ local, setLocal, canUpdate, onUpdated, onDeleted, onClose }) {
    const [showKey,      setShowKey]      = useState(false);
    const [showSecret,   setShowSecret]   = useState(false);
    const [copied,       setCopied]       = useState('');
    const [nameInput,    setNameInput]    = useState(local.name);
    const [editingName,  setEditingName]  = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [toggling,     setToggling]     = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [confirmDel,   setConfirmDel]   = useState(false);
    const [deleting,     setDeleting]     = useState(false);

    const copy = (text, key) => {
        navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 2000); });
    };

    const saveName = async () => {
        if (!nameInput.trim() || nameInput.trim() === local.name) { setEditingName(false); return; }
        setSaving(true);
        try {
            const res = await fetchAPI(`/global-integrations/${local.id}`, { method: 'PUT', body: JSON.stringify({ name: nameInput.trim() }) });
            setLocal(res.data); onUpdated(res.data); setEditingName(false);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setSaving(false); }
    };

    const toggle = async () => {
        setToggling(true);
        try {
            const res = await fetchAPI(`/global-integrations/${local.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !local.is_active }) });
            setLocal(res.data); onUpdated(res.data);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setToggling(false); }
    };

    const regenerate = async () => {
        if (!confirm('API key lama akan langsung tidak berlaku dan status koneksi akan direset. Lanjutkan?')) return;
        setRegenerating(true);
        try {
            const res = await fetchAPI(`/global-integrations/${local.id}/regenerate-key`, { method: 'POST' });
            setLocal(res.data); onUpdated(res.data); setShowKey(true);
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setRegenerating(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await fetchAPI(`/global-integrations/${local.id}`, { method: 'DELETE' });
            onDeleted(local.id);
            onClose?.();
        } catch (e) { alert('Gagal: ' + e.message); }
        finally { setDeleting(false); setConfirmDel(false); }
    };

    return (
        <>
            <div className="space-y-5">
                {/* Name + toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    {editingName ? (
                        <div className="flex items-center gap-2">
                            <Input
                                autoFocus
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                                className="h-8 text-sm w-56"
                            />
                            <Button size="sm" className="h-8 gap-1 text-xs" onClick={saveName} disabled={saving || !nameInput.trim()}>
                                {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Simpan
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditingName(false); setNameInput(local.name); }}>
                                Batal
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 dark:text-white">{local.name}</span>
                            {canUpdate && (
                                <button onClick={() => setEditingName(true)} className="text-[11px] text-primary underline underline-offset-2 hover:no-underline">
                                    Ubah nama
                                </button>
                            )}
                        </div>
                    )}
                    {canUpdate && (
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={toggle} disabled={toggling}>
                            {toggling ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                            {local.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                    )}
                </div>

                {/* Inbound credentials */}
                <div className="space-y-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                        Inbound — Sistem ini → HubTask
                    </h4>
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Endpoint URL</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                {local.inbound_endpoint}
                            </code>
                            <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copy(local.inbound_endpoint, 'ep')}>
                                {copied === 'ep' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">API Key (X-Api-Key)</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                {showKey ? local.inbound_api_key : '•'.repeat(32)}
                            </code>
                            <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setShowKey(v => !v)}>
                                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </Button>
                            <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copy(local.inbound_api_key, 'key')}>
                                {copied === 'key' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                            </Button>
                            {canUpdate && (
                                <Button size="icon" variant="outline" className="shrink-0 size-8" title="Regenerate API Key" onClick={regenerate} disabled={regenerating}>
                                    <RefreshCw className={cn('size-3.5', regenerating && 'animate-spin')} />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Webhook Secret (HMAC-SHA256)</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 truncate">
                                {showSecret ? local.webhook_secret : '•'.repeat(24)}
                            </code>
                            <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => setShowSecret(v => !v)}>
                                {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </Button>
                            <Button size="icon" variant="outline" className="shrink-0 size-8" onClick={() => copy(local.webhook_secret, 'sec')}>
                                {copied === 'sec' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400">Verifikasi header <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-Webhook-Signature</code>.</p>
                    </div>
                </div>

                {/* Delete */}
                {canUpdate && (
                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => setConfirmDel(true)}
                        >
                            <Trash2 className="size-3" /> Hapus Konfigurasi
                        </Button>
                    </div>
                )}
            </div>

            {/* Delete confirm */}
            <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Trash2 className="size-4" /> Hapus Konfigurasi
                        </DialogTitle>
                        <DialogDescription>
                            Konfigurasi <strong className="text-slate-700 dark:text-slate-200">"{local.name}"</strong> dan API key-nya akan dihapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-1">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDel(false)} disabled={deleting}>Batal</Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5">
                            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                            Ya, Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ─── List view item (accordion) ─── */
function ListItem({ config, canUpdate, onUpdated, onDeleted }) {
    const [expanded, setExpanded] = useState(false);
    const [local,    setLocal]    = useState(config);

    useEffect(() => { setLocal(config); }, [config]);

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
                    <Plug className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{local.name}</span>
                        <StatusBadge isActive={local.is_active} />
                        <UsageBadge lastUsedAt={local.last_used_at} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] text-slate-400 font-mono">
                            {local.inbound_api_key.slice(0, 15)}••••••••••••
                        </code>
                        {local.last_used_at && (
                            <span className="text-[10px] text-slate-400">
                                · {new Date(local.last_used_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
                {expanded
                    ? <ChevronDown className="size-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="size-4 text-slate-400 shrink-0" />}
            </div>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-5">
                    <ConfigDetail
                        local={local}
                        setLocal={setLocal}
                        canUpdate={canUpdate}
                        onUpdated={onUpdated}
                        onDeleted={onDeleted}
                    />
                </div>
            )}
        </div>
    );
}

/* ─── Card view item (grid card → dialog) ─── */
function GridCard({ config, canUpdate, onUpdated, onDeleted }) {
    const [open,  setOpen]  = useState(false);
    const [local, setLocal] = useState(config);

    useEffect(() => { setLocal(config); }, [config]);

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
                        <Plug className="size-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <StatusBadge isActive={local.is_active} />
                        <UsageBadge lastUsedAt={local.last_used_at} />
                    </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug mb-1">
                    {local.name}
                </p>
                <code className="text-[10px] text-slate-400 font-mono block truncate">
                    {local.inbound_api_key.slice(0, 20)}••••
                </code>
                {local.last_used_at && (
                    <p className="text-[10px] text-slate-400 mt-2">
                        Terakhir: {new Date(local.last_used_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plug className="size-4 text-primary" />
                            {local.name}
                        </DialogTitle>
                    </DialogHeader>
                    <ConfigDetail
                        local={local}
                        setLocal={setLocal}
                        canUpdate={canUpdate}
                        onUpdated={onUpdated}
                        onDeleted={(id) => { onDeleted(id); setOpen(false); }}
                        onClose={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ─── Page ─── */
export default function IntegrationProjects() {
    const { user }  = useAuth();
    const canUpdate = hasPermission(user, 'finance_monitoring.update');

    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get('view') === 'list' ? 'list' : 'card';

    const setView = (v) => setSearchParams(prev => { prev.set('view', v); return prev; });

    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [adding,  setAdding]  = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchAPI('/global-integrations');
            setConfigs(res.data || []);
        } catch { setError('Gagal memuat konfigurasi integrasi.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        try {
            const res = await fetchAPI('/global-integrations', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
            setConfigs(prev => [...prev, res.data]);
            setShowAdd(false);
            setNewName('');
        } catch (e) { alert('Gagal membuat konfigurasi: ' + e.message); }
        finally { setAdding(false); }
    };

    const connectedCount = configs.filter(c => c.last_used_at).length;
    const activeCount    = configs.filter(c => c.is_active).length;

    const sharedProps = {
        canUpdate,
        onUpdated: (updated) => setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c)),
        onDeleted: (id)      => setConfigs(prev => prev.filter(c => c.id !== id)),
    };

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Plug className="size-6 text-primary shrink-0" />
                        Integrasi API
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Kelola koneksi sistem eksternal ke HubTask. Setiap konfigurasi punya API key unik tersendiri.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* View toggle */}
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
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

                    {canUpdate && (
                        <Button size="sm" className="gap-1.5" onClick={() => { setNewName(''); setShowAdd(true); }}>
                            <Plus className="size-3.5" />
                            Tambah Konfigurasi
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            {configs.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span><strong className="text-slate-700 dark:text-slate-200">{configs.length}</strong> konfigurasi</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-emerald-600">{activeCount}</strong> aktif</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-blue-600">{connectedCount}</strong> terhubung</span>
                </div>
            )}

            {/* Content */}
            {!canUpdate ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <Lock className="size-4" /> Anda tidak memiliki akses untuk melihat konfigurasi integrasi.
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
                    <Plug className="size-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Belum ada konfigurasi integrasi</p>
                    <p className="text-xs mt-1">Klik "Tambah Konfigurasi" untuk membuat koneksi pertama.</p>
                </div>
            ) : view === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {configs.map(config => (
                        <GridCard key={config.id} config={config} {...sharedProps} />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {configs.map(config => (
                        <ListItem key={config.id} config={config} {...sharedProps} />
                    ))}
                </div>
            )}

            {/* Add dialog */}
            <Dialog open={showAdd} onOpenChange={open => { if (!open) setShowAdd(false); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="size-4 text-primary" />
                            Tambah Konfigurasi Baru
                        </DialogTitle>
                        <DialogDescription>
                            Masukkan nama sistem atau layanan yang akan terhubung ke HubTask. Satu konfigurasi hanya untuk satu sistem.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1 py-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Nama Sistem / Layanan <span className="text-rose-400">*</span>
                        </label>
                        <Input
                            autoFocus
                            placeholder="cth: ERP Odoo, Billing System, CRM Salesforce…"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            className="h-9 text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            API key unik akan otomatis dibuat untuk konfigurasi ini.
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} disabled={adding}>Batal</Button>
                        <Button size="sm" className="gap-1.5" disabled={!newName.trim() || adding} onClick={handleAdd}>
                            {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                            Buat Konfigurasi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
