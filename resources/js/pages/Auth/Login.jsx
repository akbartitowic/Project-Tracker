import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await login(credentials.email, credentials.password);
            if (res.success) {
                navigate('/');
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#000040] relative overflow-hidden font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] size-96 bg-accent/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] size-96 bg-primary/30 rounded-full blur-[100px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <div className="size-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                            <img src="/logo.png" alt="Noohtify Logo" className="size-10 object-contain" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Welcome Back</h2>
                        <p className="text-slate-400 font-medium mt-1">Login to Noohtify Software Management</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-200 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="size-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                                <Input
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="pl-12 h-13 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-accent focus:border-accent transition-all"
                                    value={credentials.email}
                                    onChange={e => setCredentials({ ...credentials, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500 group-focus-within:text-accent transition-colors" />
                                <Input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="pl-12 h-13 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-accent focus:border-accent transition-all"
                                    value={credentials.password}
                                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-13 bg-accent hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                        >
                            {isLoading ? (
                                <RefreshCcw className="size-5 animate-spin mr-2" />
                            ) : (
                                <LogIn className="size-5 mr-2" />
                            )}
                            Sign In to Dashboard
                        </Button>

                        <div className="pt-6 text-center">
                            <p className="text-slate-400 text-sm">
                                Don't have an account? 
                                <Link to="/signup" className="text-accent font-bold hover:underline ml-2">Sign Up Free</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const RefreshCcw = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
);
