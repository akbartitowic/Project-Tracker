import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Save, CheckCircle2, Shield, Code, Bug } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Profile() {
    const { user, updateProfile } = useAuth();
    const [data, setData] = useState({
        name: user?.name || '',
        nickname: user?.nickname || '',
        email: user?.email || '',
        phone_number: user?.phone_number || '',
        task_email_notifications_enabled: user?.task_email_notifications_enabled ?? true,
        timezone: user?.timezone || 'Asia/Jakarta',
        password: '',
        password_confirmation: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        if (data.password && data.password !== data.password_confirmation) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            setIsLoading(false);
            return;
        }

        try {
            const res = await updateProfile(data);
            if (res.success) {
                if (res.forceLogout) {
                    alert('Password berhasil diubah. Semua sesi/device akan logout — silakan login kembali.');
                    window.location.href = '/login';
                    return;
                }
                setMessage({ type: 'success', text: res.message });
                setData(prev => ({ ...prev, password: '', password_confirmation: '' }));
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-full overflow-hidden bg-slate-50 transition-colors duration-200 dark:bg-[#000040]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white to-slate-50 dark:from-[#000040] dark:via-[#0a0e2e] dark:to-background-dark" />
            <div className="pointer-events-none absolute -top-24 -left-24 size-[28rem] rounded-full bg-accent/10 blur-[120px] dark:bg-accent/15" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 size-[32rem] rounded-full bg-primary/10 blur-[130px] dark:bg-accent/10" />

            <div className="relative z-10 w-full space-y-8 px-4 py-5 sm:px-6 lg:px-8 pb-16">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <User className="size-8 text-primary" />
                        My Profile
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage your personal information and security settings.</p>
                </div>
                {(() => {
                    const roleName = user?.role_name || user?.role?.name || 'Member';
                    let RoleIcon = User;
                    let roleClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                    let iconClass = 'text-slate-500';
                    
                    if (roleName.includes('Manager') || roleName.includes('Admin')) { 
                        RoleIcon = Shield; 
                        roleClass = 'bg-purple-100/80 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'; 
                        iconClass = 'text-purple-600 dark:text-purple-400';
                    } else if (roleName.includes('Developer') || roleName.includes('Programmer')) { 
                        RoleIcon = Code; 
                        roleClass = 'bg-blue-100/80 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'; 
                        iconClass = 'text-blue-600 dark:text-blue-400';
                    } else if (roleName.includes('QA') || roleName.includes('Tester')) { 
                        RoleIcon = Bug; 
                        roleClass = 'bg-amber-100/80 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'; 
                        iconClass = 'text-amber-600 dark:text-amber-400';
                    }

                    return (
                        <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${roleClass}`}>
                            <RoleIcon className={`size-4 ${iconClass}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">{roleName}</span>
                        </div>
                    );
                })()}
            </header>

            {message.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 border ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 className="size-5" /> : <Shield className="size-5" />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg">Account Information</CardTitle>
                            <CardDescription>Basic details associated with your Noohtify account.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            required
                                            className="pl-11 h-11 rounded-xl focus:ring-primary"
                                            value={data.name}
                                            onChange={e => setData({ ...data, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Nickname <span className="normal-case text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            className="pl-11 h-11 rounded-xl focus:ring-primary"
                                            placeholder="Nama panggilan"
                                            value={data.nickname}
                                            onChange={e => setData({ ...data, nickname: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 ml-1">Jika diisi, nama ini yang tampil di sidebar.</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        className="pl-11 h-11 rounded-xl focus:ring-primary"
                                        placeholder="+62 8xx xxxx xxxx"
                                        value={data.phone_number}
                                        onChange={e => setData({ ...data, phone_number: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type="email"
                                        required
                                        className="pl-11 h-11 rounded-xl focus:ring-primary"
                                        value={data.email}
                                        onChange={e => setData({ ...data, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Timezone</label>
                                <Select
                                    value={data.timezone || 'Asia/Jakarta'}
                                    onValueChange={(value) => setData({ ...data, timezone: value })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                                        <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                                        <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                                        <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                                        <SelectItem value="UTC">UTC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg">Notification Preferences</CardTitle>
                            <CardDescription>Control task assignment and reminder emails.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
                                <Checkbox
                                    checked={data.task_email_notifications_enabled === true}
                                    onCheckedChange={(checked) => setData({
                                        ...data,
                                        task_email_notifications_enabled: checked === true,
                                    })}
                                />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        Task email notifications
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Kirim email saat task di-assign dan reminder harian saat due task belum Done/Hold.
                                    </p>
                                </div>
                            </label>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg">Change Password</CardTitle>
                            <CardDescription>Leave blank if you don't want to change your password.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">New Password</label>
                                    <div className="relative group">
                                        <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                                        <PasswordInput
                                            className="h-11 rounded-xl pl-11 focus-visible:ring-primary"
                                            placeholder="Min. 8 characters"
                                            value={data.password}
                                            onChange={e => setData({ ...data, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm New Password</label>
                                    <div className="relative group">
                                        <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                                        <PasswordInput
                                            className="h-11 rounded-xl pl-11 focus-visible:ring-primary"
                                            value={data.password_confirmation}
                                            onChange={e => setData({ ...data, password_confirmation: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <RefreshCcw className="size-4 animate-spin mr-2" />
                            ) : (
                                <Save className="size-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/10 overflow-hidden text-center p-8">
                        <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/30 shadow-xl">
                            <span className="text-4xl font-black text-primary uppercase">{user?.name?.charAt(0)}</span>
                        </div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight">{user?.name}</h3>
                        <p className="text-sm text-slate-500 font-medium">{user?.email}</p>
                        <div className="mt-6 pt-6 border-t border-primary/10">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Since</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'March 2026'}
                            </p>
                        </div>
                    </Card>
                </div>
            </form>
            </div>
        </div>
    );
}

const RefreshCcw = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
);
