import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Cable, Check, Send, Loader2, X, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EVENTS = ['allocation.created', 'allocation.updated', 'allocation.realized', 'allocation.paid', 'allocation.deleted'];

export default function ConnectorMonitoring() {
    const { user } = useAuth();
    const canUpdate = hasPermission(user, 'finance_monitoring.update');

    const [globalData, setGlobalData] = useState(null);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [webhookInput, setWebhookInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const loadGlobal = useCallback(async () => {
        setGlobalLoading(true);
        setGlobalError(null);
        try {
            const res = await fetchAPI('/global-integration');
            setGlobalData(res.data);
            setWebhookInput(res.data.webhook_url || '');
            setTestResult(null);
        } catch {
            setGlobalError('Gagal memuat konfigurasi connector.');
        } finally {
            setGlobalLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canUpdate) loadGlobal();
    }, [loadGlobal, canUpdate]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetchAPI('/global-integration', { method: 'PUT', body: JSON.stringify({ webhook_url: webhookInput || null }) });
            setGlobalData(res.data);
        } catch (e) { alert('Gagal menyimpan: ' + e.message); }
        finally { setSaving(false); }
    };

    const test = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetchAPI('/global-integration/test', { method: 'POST' });
            setTestResult({ success: res.success, message: res.message });
            setGlobalData(prev => prev ? {
                ...prev,
                webhook_test_status: res.success ? 'success' : 'failed',
                webhook_test_sent_at: new Date().toISOString(),
            } : prev);
        } catch (e) { setTestResult({ success: false, message: e.message }); }
        finally { setTesting(false); }
    };

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Cable className="size-7 text-primary shrink-0" />
                    Connector Monitoring
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Kelola webhook outbound — kirim event dari HubTask ke sistem eksternal.
                </p>
            </div>

            {!canUpdate ? (
                <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
                        <Lock className="size-4" /> Anda tidak memiliki akses untuk melihat konfigurasi connector.
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Cable className="size-4 text-primary shrink-0" />
                            <div>
                                <CardTitle className="text-base">Connector Webhook</CardTitle>
                                <CardDescription className="text-xs mt-0.5">Konfigurasi outbound — HubTask → sistem eksternal</CardDescription>
                            </div>
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
                            <div className="space-y-5">
                                {/* Live/test status */}
                                {(globalData.webhook_last_status || globalData.webhook_test_status) && (
                                    <div className="flex flex-wrap items-center gap-4">
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
                                )}

                                {/* Webhook URL */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook URL Tujuan</label>
                                    <div className="flex gap-2">
                                        <Input
                                            className="text-sm h-9"
                                            placeholder="https://erp-kamu.com/webhook/hubtask"
                                            value={webhookInput}
                                            onChange={e => setWebhookInput(e.target.value)}
                                        />
                                        <Button size="sm" className="shrink-0 h-9" onClick={save} disabled={saving}>
                                            {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Simpan'}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-400">HubTask akan POST ke URL ini setiap ada perubahan allocation.</p>
                                </div>

                                {/* Events */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Events yang dikirim</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {EVENTS.map(e => (
                                            <span key={e} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{e}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Test */}
                                {globalData.webhook_url && (
                                    <div className="space-y-2">
                                        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={test} disabled={testing}>
                                            {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                            Test Webhook
                                        </Button>
                                        {testResult && (
                                            <p className={`text-xs flex items-center gap-1 ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {testResult.success ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                                {testResult.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
