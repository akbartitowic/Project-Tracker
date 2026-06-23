import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Building2, Loader2, ArrowLeft } from 'lucide-react';

function toSlug(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
}

export default function OrgCreate() {
    const navigate = useNavigate();
    const { refreshOrganizations } = useAuth();
    const appDomain = import.meta.env.VITE_APP_DOMAIN;

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function handleNameChange(e) {
        const val = e.target.value;
        setName(val);
        if (!slugEdited) {
            setSlug(toSlug(val));
        }
    }

    function handleSlugChange(e) {
        setSlugEdited(true);
        setSlug(toSlug(e.target.value));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError('');
        try {
            const res = await fetchAPI('/organizations', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), slug: slug || undefined }),
            });

            await refreshOrganizations();

            if (appDomain) {
                window.location.href = `${window.location.protocol}//${res.slug}.${appDomain}`;
            } else {
                localStorage.setItem('org_slug', res.slug);
                window.location.href = '/';
            }
        } catch (err) {
            setError(err.message || 'Gagal membuat organisasi.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <Building2 className="size-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Buat Organisasi</h1>
                    <p className="text-slate-400 mt-1 text-sm">Workspace baru untuk tim Anda</p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="org-name">Nama Organisasi</Label>
                                <Input
                                    id="org-name"
                                    placeholder="Nama perusahaan atau tim Anda"
                                    value={name}
                                    onChange={handleNameChange}
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="org-slug">URL Workspace</Label>
                                <div className="flex items-center gap-0">
                                    <Input
                                        id="org-slug"
                                        className="rounded-r-none border-r-0 font-mono text-sm"
                                        value={slug}
                                        onChange={handleSlugChange}
                                        disabled={loading}
                                        placeholder="nama-org"
                                    />
                                    <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                                        .{appDomain || 'localhost'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Hanya huruf kecil, angka, dan tanda hubung.
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-rose-500">{error}</p>
                            )}

                            <Button type="submit" className="w-full" disabled={loading || !name.trim() || !slug}>
                                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                {loading ? 'Membuat...' : 'Buat Organisasi'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Button
                    variant="ghost"
                    className="w-full gap-2 text-slate-400"
                    onClick={() => navigate('/select-org')}
                >
                    <ArrowLeft className="size-4" />
                    Kembali ke daftar organisasi
                </Button>
            </div>
        </div>
    );
}
