import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Settings, Database, AlertTriangle, RefreshCcw, CheckCircle2, ShieldAlert, Mail, Save, Loader2, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function SystemSettings() {
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // SMTP Settings State
    const [smtpSettings, setSmtpSettings] = useState({
        mail_host: '',
        mail_port: '',
        mail_username: '',
        mail_password: '',
        mail_encryption: 'tls',
        mail_from_address: '',
        mail_from_name: ''
    });
    const [isSmtpLoading, setIsSmtpLoading] = useState(true);
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const keys = Object.keys(smtpSettings).join(',');
                const res = await fetchAPI(`/settings/all?keys=${keys}`);
                if (res.status === 'success' && res.data) {
                    setSmtpSettings(prev => ({
                        ...prev,
                        ...res.data
                    }));
                }
            } catch (err) {
                console.error("Failed to load SMTP settings", err);
            } finally {
                setIsSmtpLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSmtpChange = (e) => {
        const { name, value } = e.target;
        setSmtpSettings(prev => ({ ...prev, [name]: value }));
    };

    const saveSmtpSettings = async () => {
        setIsSavingSmtp(true);
        try {
            await fetchAPI('/settings/update', {
                method: 'POST',
                body: JSON.stringify(smtpSettings)
            });
            alert("SMTP Settings updated successfully");
        } catch (err) {
            alert("Error saving SMTP settings: " + err.message);
        } finally {
            setIsSavingSmtp(false);
        }
    };

    const testSmtpConnection = async () => {
        setIsTestingSmtp(true);
        try {
            const res = await fetchAPI('/settings/test-smtp', {
                method: 'POST',
                body: JSON.stringify(smtpSettings)
            });
            if (res.status === 'success') {
                alert(res.message);
            } else {
                alert("Test Failed: " + res.message);
            }
        } catch (err) {
            alert("Network Error: " + err.message);
        } finally {
            setIsTestingSmtp(false);
        }
    };

    const handleResetData = async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI('/system/reset', { method: 'POST' });
            if (res.status === 'success') {
                setSuccessMessage(res.message);
                setResetStep(3);
            } else {
                alert(res.message || "Failed to reset data");
                setIsResetModalOpen(false);
            }
        } catch (err) {
            alert("Error: " + err.message);
            setIsResetModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    const resetFlow = () => {
        setIsResetModalOpen(true);
        setResetStep(1);
        setSuccessMessage('');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10 pb-20 text-slate-900 dark:text-white transition-colors duration-200">
            <header>
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Settings className="size-10 text-primary" />
                </div>
                <h1 className="text-3xl font-black tracking-tight">System Settings</h1>
                <p className="text-slate-500 font-medium mt-1">Global configuration, SMTP mail server & system maintenance.</p>
            </header>

            <div className="grid grid-cols-1 gap-10">
                {/* SMTP Configuration */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden bg-white dark:bg-[#1e2532]">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3 text-primary">
                            <Mail className="size-5" />
                            <CardTitle className="text-lg font-bold">SMTP Configuration</CardTitle>
                        </div>
                        <CardDescription>Configure the outgoing mail server for notifications and reports.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        {isSmtpLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="size-8 text-primary animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SMTP Host</label>
                                    <Input name="mail_host" value={smtpSettings.mail_host} onChange={handleSmtpChange} placeholder="smtp.gmail.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SMTP Port</label>
                                    <Input name="mail_port" value={smtpSettings.mail_port} onChange={handleSmtpChange} placeholder="587" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                                    <Input name="mail_username" value={smtpSettings.mail_username} onChange={handleSmtpChange} placeholder="email@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                    <Input name="mail_password" type="password" value={smtpSettings.mail_password} onChange={handleSmtpChange} placeholder="********" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Encryption</label>
                                    <Input name="mail_encryption" value={smtpSettings.mail_encryption} onChange={handleSmtpChange} placeholder="tls or ssl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Address</label>
                                    <Input name="mail_from_address" value={smtpSettings.mail_from_address} onChange={handleSmtpChange} placeholder="no-reply@app.com" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Name</label>
                                    <Input name="mail_from_name" value={smtpSettings.mail_from_name} onChange={handleSmtpChange} placeholder="Project Tracker System" />
                                </div>
                                <div className="md:col-span-2 pt-6 flex flex-col sm:flex-row gap-4">
                                    <Button 
                                        variant="outline" 
                                        onClick={testSmtpConnection} 
                                        disabled={isTestingSmtp || !smtpSettings.mail_host}
                                        className="flex-1 gap-2 h-11 border-slate-200 dark:border-slate-700 font-bold"
                                    >
                                        {isTestingSmtp ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
                                        Test Connection
                                    </Button>
                                    <Button 
                                        onClick={saveSmtpSettings} 
                                        disabled={isSavingSmtp} 
                                        className="flex-1 gap-2 shadow-lg shadow-primary/20 h-11 text-base font-bold"
                                    >
                                        {isSavingSmtp ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                                        Save Configuration
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Data Maintenance */}
                <Card className="border-rose-100 dark:border-rose-900/30 overflow-hidden shadow-xl shadow-rose-200/5 bg-white dark:bg-[#1e2532]">
                    <CardHeader className="bg-rose-50/50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/20">
                        <div className="flex items-center gap-3 text-rose-600">
                            <Database className="size-5" />
                            <CardTitle className="text-lg font-bold">Data Maintenance</CardTitle>
                        </div>
                        <CardDescription className="text-rose-600/70">Wipe transactional records and reset the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h4 className="font-bold text-lg">Reset Transactional Data</h4>
                                <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
                                    Removes all Projects, Tasks, Manhours, and Presales logs. <br />
                                    <span className="font-bold text-rose-500">Authentication and Roles will stay intact.</span>
                                </p>
                            </div>
                            <Button variant="destructive" onClick={resetFlow} className="gap-2 shadow-lg shadow-rose-500/20 h-11 px-8 font-bold">
                                <RefreshCcw className="size-4" />
                                Wipe Records
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reset Confirmation Dialog */}
            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    {resetStep === 1 && (
                        <>
                            <DialogHeader>
                                <div className="mx-auto size-16 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center mb-4">
                                    <AlertTriangle className="size-8 text-rose-600" />
                                </div>
                                <DialogTitle className="text-center text-2xl font-black">Are you sure?</DialogTitle>
                                <DialogDescription className="text-center mt-2">
                                    This will wipe all transaction records. This action is irreversible.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} className="flex-1">Take me back</Button>
                                <Button variant="destructive" onClick={() => setResetStep(2)} className="flex-1">Yes, Continue</Button>
                            </DialogFooter>
                        </>
                    )}

                    {resetStep === 2 && (
                        <>
                            <DialogHeader>
                                <div className="mx-auto size-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                                    <ShieldAlert className="size-8 text-orange-600" />
                                </div>
                                <DialogTitle className="text-center text-2xl font-black">Final Warning</DialogTitle>
                                <DialogDescription className="text-center mt-2">
                                    Users and Roles will remain. All project-related data will be gone forever.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button variant="destructive" onClick={handleResetData} disabled={isLoading} className="flex-1 gap-2">
                                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                                    Confirm & Wipe
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {resetStep === 3 && (
                        <>
                            <div className="py-8 flex flex-col items-center">
                                <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                                    <CheckCircle2 className="size-12 text-emerald-600 animate-in zoom-in duration-500" />
                                </div>
                                <h3 className="text-3xl font-black mb-2">Clean Slate!</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-center font-medium">{successMessage}</p>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => window.location.reload()} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-bold">
                                    Wonderful, Reload UI
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
