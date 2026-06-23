import { useEffect, useState, useCallback } from 'react';
import { fetchAPI } from '../services/api';
import { useCurrentOrg } from '../hooks/useCurrentOrg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Building2, Users, Mail, Loader2, X, Trash2, Crown, Send, RefreshCw } from 'lucide-react';

const PLAN_COLORS = {
    free:       'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    pro:        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    enterprise: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

export default function OrgSettings() {
    const org = useCurrentOrg();

    const [members, setMembers]         = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [roles, setRoles]             = useState([]);
    const [limits, setLimits]           = useState(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');

    // Invite form
    const [inviteEmail, setInviteEmail]   = useState('');
    const [inviteRole, setInviteRole]     = useState('');
    const [inviting, setInviting]         = useState(false);
    const [inviteMsg, setInviteMsg]       = useState({ text: '', type: '' });

    const load = useCallback(async () => {
        if (!org) return;
        setLoading(true);
        setError('');
        try {
            const [m, i, r, l] = await Promise.all([
                fetchAPI(`/organizations/${org.id}/members`),
                fetchAPI(`/organizations/${org.id}/invitations`),
                fetchAPI(`/organizations/${org.id}/roles`),
                fetchAPI('/tenant/limits'),
            ]);
            setMembers(m);
            setInvitations(i);
            setRoles(r);
            setLimits(l);
        } catch (err) {
            setError(err.message || 'Gagal memuat data organisasi.');
        } finally {
            setLoading(false);
        }
    }, [org]);

    useEffect(() => { load(); }, [load]);

    async function handleInvite(e) {
        e.preventDefault();
        if (!inviteEmail || !inviteRole) return;
        setInviting(true);
        setInviteMsg({ text: '', type: '' });
        try {
            const res = await fetchAPI(`/organizations/${org.id}/invitations`, {
                method: 'POST',
                body: JSON.stringify({ email: inviteEmail, role_id: Number(inviteRole) }),
            });
            setInviteMsg({ text: res.message, type: 'success' });
            setInviteEmail('');
            setInviteRole('');
            load();
        } catch (err) {
            setInviteMsg({ text: err.message || 'Gagal mengirim undangan.', type: 'error' });
        } finally {
            setInviting(false);
        }
    }

    async function revokeInvite(invId) {
        try {
            await fetchAPI(`/organizations/${org.id}/invitations/${invId}`, { method: 'DELETE' });
            setInvitations((prev) => prev.filter((i) => i.id !== invId));
        } catch (err) {
            alert(err.message);
        }
    }

    async function removeMember(userId) {
        if (!confirm('Hapus anggota ini dari organisasi?')) return;
        try {
            await fetchAPI(`/organizations/${org.id}/members/${userId}`, { method: 'DELETE' });
            setMembers((prev) => prev.filter((m) => m.user.id !== userId));
            load();
        } catch (err) {
            alert(err.message);
        }
    }

    if (!org) {
        return (
            <div className="w-full px-4 py-10 text-center text-slate-400">
                Halaman ini hanya tersedia di dalam workspace organisasi.
            </div>
        );
    }

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 className="size-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{org.name}</h1>
                    <p className="text-sm text-slate-500">{org.slug}.{import.meta.env.VITE_APP_DOMAIN || 'localhost'}</p>
                </div>
                <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${PLAN_COLORS[org.plan] || PLAN_COLORS.free}`}>
                    {org.plan}
                </span>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-3">
                    <X className="size-4 shrink-0" /> {error}
                    <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={load}>
                        <RefreshCw className="size-3.5" />
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Members */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="size-4" /> Anggota
                                {limits && (
                                    <span className="ml-auto text-xs font-normal text-slate-400">
                                        {limits.users.current} / {limits.users.max ?? '∞'}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                                    <Loader2 className="size-4 animate-spin" /> Memuat...
                                </div>
                            ) : (
                                <div className="divide-y dark:divide-slate-800">
                                    {members.map((m) => (
                                        <div key={m.id} className="flex items-center gap-3 py-3">
                                            <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-primary">
                                                    {m.user.name?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{m.user.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{m.user.email}</p>
                                            </div>
                                            <span className="text-xs text-slate-500 shrink-0">{m.role?.name ?? '—'}</span>
                                            {m.user.id === org.owner_id
                                                ? <Crown className="size-4 text-yellow-500 shrink-0" title="Owner" />
                                                : (
                                                    <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-rose-500 shrink-0"
                                                        onClick={() => removeMember(m.user.id)}>
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                )
                                            }
                                        </div>
                                    ))}
                                    {members.length === 0 && <p className="text-sm text-slate-400 py-3">Belum ada anggota.</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending invitations */}
                    {invitations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Mail className="size-4" /> Undangan Tertunda
                                    <span className="ml-1 size-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                                        {invitations.length}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y dark:divide-slate-800">
                                    {invitations.map((inv) => (
                                        <div key={inv.id} className="flex items-center gap-3 py-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{inv.email}</p>
                                                <p className="text-xs text-slate-400">
                                                    {inv.role?.name} · Diundang oleh {inv.invited_by?.name}
                                                </p>
                                            </div>
                                            <Button size="icon" variant="ghost" className="size-7 text-slate-400 hover:text-rose-500 shrink-0"
                                                onClick={() => revokeInvite(inv.id)} title="Batalkan undangan">
                                                <X className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right column — Invite form + Plan info */}
                <div className="space-y-6">

                    {/* Invite form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Send className="size-4" /> Undang Anggota
                            </CardTitle>
                            <CardDescription>Kirim undangan via email</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="nama@email.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        disabled={inviting}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole} disabled={inviting}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih role..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((r) => (
                                                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {inviteMsg.text && (
                                    <p className={`text-sm ${inviteMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {inviteMsg.text}
                                    </p>
                                )}

                                <Button type="submit" className="w-full gap-2" disabled={inviting || !inviteEmail || !inviteRole}>
                                    {inviting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    {inviting ? 'Mengirim...' : 'Kirim Undangan'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Plan info */}
                    {limits && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Plan & Limits</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Plan saat ini</span>
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${PLAN_COLORS[limits.plan] || PLAN_COLORS.free}`}>
                                        {limits.plan}
                                    </span>
                                </div>

                                {/* Users */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Pengguna</span>
                                        <span className="font-medium">
                                            {limits.users.current} / {limits.users.max ?? '∞'}
                                        </span>
                                    </div>
                                    {limits.users.max && (
                                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{ width: `${Math.min(100, (limits.users.current / limits.users.max) * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Projects */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Project</span>
                                        <span className="font-medium">
                                            {limits.projects.current} / {limits.projects.max ?? '∞'}
                                        </span>
                                    </div>
                                    {limits.projects.max && (
                                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{ width: `${Math.min(100, (limits.projects.current / limits.projects.max) * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {limits.plan === 'free' && (
                                    <p className="text-xs text-slate-400 pt-1">
                                        Upgrade ke Pro untuk lebih banyak anggota dan project.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
