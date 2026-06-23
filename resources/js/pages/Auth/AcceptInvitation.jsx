import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Building2, Loader2, Check, X } from 'lucide-react';

export default function AcceptInvitation() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user, login, signup, refreshOrganizations } = useAuth();
    const appDomain = import.meta.env.VITE_APP_DOMAIN;

    const [invitation, setInvitation] = useState(null);
    const [fetchError, setFetchError] = useState('');
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [loading, setLoading] = useState(false);
    const [actionError, setActionError] = useState('');
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        fetchAPI(`/invitations/${token}`)
            .then((data) => {
                setInvitation(data);
                setForm((f) => ({ ...f, email: data.email }));
            })
            .catch((err) => setFetchError(err.message || 'Undangan tidak ditemukan atau sudah kadaluarsa.'));
    }, [token]);

    function redirectToOrg(slug) {
        if (appDomain) {
            window.location.href = `${window.location.protocol}//${slug}.${appDomain}`;
        } else {
            localStorage.setItem('org_slug', slug);
            navigate('/');
        }
    }

    async function acceptInvite() {
        setLoading(true);
        setActionError('');
        try {
            const res = await fetchAPI(`/invitations/${token}/accept`, { method: 'POST' });
            await refreshOrganizations();
            setAccepted(true);
            setTimeout(() => redirectToOrg(res.slug), 1500);
        } catch (err) {
            setActionError(err.message || 'Gagal menerima undangan.');
        } finally {
            setLoading(false);
        }
    }

    async function handleAuth(e) {
        e.preventDefault();
        setLoading(true);
        setActionError('');
        try {
            if (mode === 'login') {
                const res = await login(form.email, form.password);
                if (!res.success) throw new Error(res.message || 'Login gagal.');
            } else {
                const res = await signup({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                    invitation_token: token,
                });
                if (!res.success) throw new Error(res.message || 'Registrasi gagal.');
                // signup with token already accepts invite, just redirect
                await refreshOrganizations();
                setAccepted(true);
                if (invitation?.organization?.slug) {
                    setTimeout(() => redirectToOrg(invitation.organization.slug), 1500);
                }
                return;
            }
            // After login, accept the invite
            await acceptInvite();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetchError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-6 text-center space-y-3">
                        <X className="size-10 text-rose-500 mx-auto" />
                        <p className="font-medium">{fetchError}</p>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Ke halaman login</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-6 text-center space-y-3">
                        <Check className="size-10 text-emerald-500 mx-auto" />
                        <p className="font-medium">Berhasil bergabung ke <strong>{invitation.organization.name}</strong>!</p>
                        <p className="text-sm text-slate-400">Mengalihkan ke workspace...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md space-y-5">
                {/* Invitation card */}
                <Card>
                    <CardContent className="pt-5 flex items-start gap-4">
                        <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <Building2 className="size-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{invitation.organization.name}</p>
                            <p className="text-sm text-slate-400">
                                Anda diundang oleh <strong className="text-slate-300">{invitation.invited_by.name}</strong> sebagai <strong className="text-slate-300">{invitation.role.name}</strong>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* If already logged in and email matches */}
                {user && user.email.toLowerCase() === invitation.email.toLowerCase() ? (
                    <Card>
                        <CardContent className="pt-5 space-y-4">
                            <p className="text-sm text-slate-300">
                                Login sebagai <strong>{user.email}</strong>
                            </p>
                            {actionError && <p className="text-sm text-rose-500">{actionError}</p>}
                            <Button className="w-full" onClick={acceptInvite} disabled={loading}>
                                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                Terima Undangan
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="pt-5">
                            {/* Mode toggle */}
                            <div className="flex gap-1 mb-5 p-1 bg-slate-800 rounded-lg">
                                {['login', 'signup'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {m === 'login' ? 'Sudah punya akun' : 'Daftar baru'}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleAuth} className="space-y-4">
                                {mode === 'signup' && (
                                    <div className="space-y-1.5">
                                        <Label>Nama Lengkap</Label>
                                        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama kamu" required disabled={loading} />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <Label>Email</Label>
                                    <Input type="email" value={form.email} readOnly className="bg-slate-800 text-slate-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Password</Label>
                                    <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required disabled={loading} />
                                </div>
                                {mode === 'signup' && (
                                    <div className="space-y-1.5">
                                        <Label>Konfirmasi Password</Label>
                                        <Input type="password" value={form.password_confirmation} onChange={e => setForm(f => ({ ...f, password_confirmation: e.target.value }))} placeholder="••••••••" required disabled={loading} />
                                    </div>
                                )}
                                {actionError && <p className="text-sm text-rose-500">{actionError}</p>}
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                    {mode === 'login' ? 'Login & Terima Undangan' : 'Daftar & Bergabung'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
