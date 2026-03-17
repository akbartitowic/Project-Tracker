import { useState } from 'react';
import { fetchAPI } from '../services/api';
import { Settings, Database, AlertTriangle, RefreshCcw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

export default function SystemSettings() {
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

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
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <Settings className="size-8 text-primary" />
                    System Settings
                </h1>
                <p className="text-slate-500 font-medium mt-1">Configure global application behavior and data management.</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-rose-100 dark:border-rose-900/30 overflow-hidden shadow-sm">
                    <CardHeader className="bg-rose-50/50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/20">
                        <div className="flex items-center gap-3 text-rose-600">
                            <Database className="size-5" />
                            <CardTitle className="text-lg">Data Management</CardTitle>
                        </div>
                        <CardDescription className="text-rose-600/70">Destructive actions for clearing system records.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Reset Transactional Data</h4>
                                <p className="text-sm text-slate-500 max-w-md mt-1">
                                    Clears all Projects, Tasks, Manhours, and Presales data. <br />
                                    <span className="font-bold text-rose-500">Master data like Users and Roles will be preserved.</span>
                                </p>
                            </div>
                            <Button variant="destructive" onClick={resetFlow} className="gap-2 shadow-lg shadow-rose-500/20 h-11 px-6">
                                <RefreshCcw className="size-4" />
                                Reset System Data
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
                                <div className="mx-auto size-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                                    <AlertTriangle className="size-6 text-rose-600" />
                                </div>
                                <DialogTitle className="text-center text-xl font-bold text-slate-900">Are you absolutely sure?</DialogTitle>
                                <DialogDescription className="text-center">
                                    This action will permanently delete all projects and work records. It cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                                <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button variant="destructive" onClick={() => setResetStep(2)} className="flex-1">Yes, Continue</Button>
                            </DialogFooter>
                        </>
                    )}

                    {resetStep === 2 && (
                        <>
                            <DialogHeader>
                                <div className="mx-auto size-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                                    <ShieldAlert className="size-6 text-orange-600" />
                                </div>
                                <DialogTitle className="text-center text-xl font-bold text-slate-900">Final Confirmation</DialogTitle>
                                <DialogDescription className="text-center">
                                    Please confirm that you want to wipe all records. Users and access controls will remain untouched.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                                <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button variant="destructive" onClick={handleResetData} disabled={isLoading} className="flex-1">
                                    {isLoading ? <RefreshCcw className="size-4 animate-spin mr-2" /> : null}
                                    Confirm Reset
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {resetStep === 3 && (
                        <>
                            <div className="py-6 flex flex-col items-center">
                                <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="size-10 text-emerald-600 animate-in zoom-in duration-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Success!</h3>
                                <p className="text-slate-500 text-center">{successMessage}</p>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => window.location.reload()} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    Great, Refresh Now
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
