import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Building2, Plus, LogOut } from 'lucide-react';

export default function OrgSelect() {
    const { organizations, logout } = useAuth();
    const navigate = useNavigate();

    const appDomain = import.meta.env.VITE_APP_DOMAIN;

    function enterOrg(org) {
        if (appDomain) {
            window.location.href = `${window.location.protocol}//${org.slug}.${appDomain}`;
        } else {
            // Fallback for local dev without subdomain: store org slug in localStorage
            localStorage.setItem('org_slug', org.slug);
            window.location.href = '/';
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white">Pilih Organisasi</h1>
                    <p className="text-slate-400 mt-1 text-sm">Pilih workspace yang ingin dibuka</p>
                </div>

                <div className="space-y-3">
                    {organizations.map((org) => (
                        <button
                            key={org.id}
                            onClick={() => enterOrg(org)}
                            className="w-full text-left"
                        >
                            <Card className="hover:border-primary/60 hover:bg-slate-800/50 transition-colors cursor-pointer">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                        <Building2 className="size-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{org.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{org.slug}.{appDomain || 'localhost'}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        org.plan === 'enterprise' ? 'bg-yellow-500/20 text-yellow-400' :
                                        org.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {org.plan}
                                    </span>
                                </CardContent>
                            </Card>
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => navigate('/create-org')}
                    >
                        <Plus className="size-4" />
                        Buat Organisasi Baru
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full gap-2 text-slate-400"
                        onClick={logout}
                    >
                        <LogOut className="size-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
