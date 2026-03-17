import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Signup() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (data.password !== data.password_confirmation) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            const res = await signup(data);
            if (res.success) {
                navigate('/');
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#000040] relative overflow-hidden font-sans">
            <div className="absolute top-[-10%] right-[-10%] size-96 bg-accent/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] size-96 bg-primary/30 rounded-full blur-[100px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="size-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                            <img src="/logo.png" alt="Noohtify Logo" className="size-9 object-contain" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight text-center">Join Noohtify</h2>
                        <p className="text-slate-400 font-medium mt-1">Create your project management account</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-200 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="size-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                                <Input
                                    required
                                    placeholder="John Doe"
                                    className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-accent focus:border-accent transition-all"
                                    value={data.name}
                                    onChange={e => setData({ ...data, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                                <Input
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-accent focus:border-accent transition-all"
                                    value={data.email}
                                    onChange={e => setData({ ...data, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                                    <Input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-accent focus:border-accent transition-all"
                                        value={data.password}
                                        onChange={e => setData({ ...data, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                                    <Input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-accent focus:border-accent transition-all"
                                        value={data.password_confirmation}
                                        onChange={e => setData({ ...data, password_confirmation: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-accent hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                        >
                            {isLoading ? (
                                <RefreshCcw className="size-5 animate-spin mr-2" />
                            ) : (
                                <UserPlus className="size-5 mr-2" />
                            )}
                            Create Account
                        </Button>

                        <div className="pt-4 text-center">
                            <p className="text-slate-400 text-sm">
                                Already have an account? 
                                <Link to="/login" className="text-accent font-bold hover:underline ml-2">Login Here</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
