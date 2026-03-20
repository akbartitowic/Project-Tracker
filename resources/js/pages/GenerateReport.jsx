import { useState, useEffect } from 'react';
import { fetchAPI, getApiUrl } from '../services/api';
import { FileText, Download, Eye, Loader2, Calendar, Briefcase, Filter, ChevronLeft, Mail, Send, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';

export default function GenerateReport() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [range, setRange] = useState('weekly');
    const [loading, setLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailData, setEmailData] = useState({
        emails: '',
        subject: '',
        body: ''
    });
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await fetchAPI('/reports/projects');
                if (res.data) setProjects(res.data);
            } catch (err) {
                console.error("Failed to load projects", err);
            } finally {
                setProjectsLoading(false);
            }
        };
        loadProjects();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            const project = projects.find(p => p.id.toString() === selectedProject.toString());
            setEmailData(prev => ({
                ...prev,
                subject: `Project Report: ${project?.name} (${range})`,
                body: `Hello,\n\nPlease find attached the ${range} project report for "${project?.name}".\n\nBest regards,\nProject Tracker System`
            }));
        }
    }, [selectedProject, range, projects]);

    const handlePreview = async () => {
        if (!selectedProject) return;
        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    project_id: selectedProject,
                    range: range,
                    preview: true
                })
            });

            if (!response.ok) throw new Error('Failed to generate report');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedProject) return;
        setLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    project_id: selectedProject,
                    range: range,
                    preview: false
                })
            });

            if (!response.ok) throw new Error('Failed to download report');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Report-${projects.find(p => p.id.toString() === selectedProject.toString())?.name}-${range}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!selectedProject || !emailData.emails) return;
        setIsSendingEmail(true);
        try {
            const res = await fetchAPI('/reports/send-email', {
                method: 'POST',
                body: JSON.stringify({
                    project_id: selectedProject,
                    range: range,
                    emails: emailData.emails,
                    subject: emailData.subject,
                    body: emailData.body
                })
            });

            if (res.status === 'success') {
                setEmailSuccess(true);
                setTimeout(() => {
                    setIsEmailModalOpen(false);
                    setEmailSuccess(false);
                }, 2000);
            }
        } catch (err) {
            alert("Email Error: " + err.message);
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-background-dark pb-10">
            <header className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b28]">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/reports')} className="rounded-full">
                        <ChevronLeft className="size-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Generate Project Report</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Configure, export, and email detailed project performance reports.</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
                {/* Configuration Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-[#1e2532]">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Filter className="size-4 text-primary" />
                                Report Filter
                            </CardTitle>
                            <CardDescription>Select project and timeframe</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase className="size-3" />
                                    Project
                                </label>
                                <Select value={selectedProject} onValueChange={setSelectedProject}>
                                    <SelectTrigger className="bg-white dark:bg-slate-800">
                                        <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map(project => (
                                            <SelectItem key={project.id} value={project.id.toString()}>{project.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar className="size-3" />
                                    Time Range
                                </label>
                                <Select value={range} onValueChange={setRange}>
                                    <SelectTrigger className="bg-white dark:bg-slate-800">
                                        <SelectValue placeholder="Select range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <Button 
                                    onClick={handlePreview} 
                                    className="w-full gap-2 shadow-lg shadow-primary/20 h-10" 
                                    disabled={!selectedProject || loading}
                                >
                                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                                    Preview PDF
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button 
                                        variant="outline" 
                                        onClick={handleDownload} 
                                        className="gap-2 border-slate-200 dark:border-slate-700 h-10"
                                        disabled={!selectedProject || loading}
                                    >
                                        <Download className="size-4" />
                                        Download
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setIsEmailModalOpen(true)}
                                        className="gap-2 border-primary/20 hover:bg-primary/5 text-primary h-10"
                                        disabled={!selectedProject || loading}
                                    >
                                        <Mail className="size-4" />
                                        Email
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg shadow-primary/5 bg-primary/5 border-primary/10">
                        <CardContent className="p-4 flex gap-3">
                            <FileText className="size-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-tight">Report Insights</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                    The report includes complete task audit logs and developer man-hours based on the specified range.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Area */}
                <div className="flex-1 h-full min-h-[500px] lg:min-h-0 bg-white dark:bg-[#151b28] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                    {previewUrl ? (
                        <iframe 
                            src={previewUrl} 
                            className="w-full h-full border-none rounded-xl"
                            title="Report Preview"
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                            <div className="size-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
                                <FileText className="size-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Ready for Preview</h3>
                            <p className="max-w-xs text-sm leading-relaxed">Select a project and timeframe, then click preview to generate the PDF visualization.</p>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="size-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
                                <p className="text-sm font-black text-primary uppercase tracking-widest">Generating PDF...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Report Dialog */}
            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogContent className="sm:max-w-[500px] border-none shadow-2xl dark:bg-[#1e2532]">
                    {emailSuccess ? (
                        <div className="py-12 flex flex-col items-center text-center">
                            <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-6">
                                <CheckCircle2 className="size-12 text-emerald-600 animate-in zoom-in duration-300" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Email Sent!</h3>
                            <p className="text-slate-500 dark:text-slate-400">The report has been successfully dispatched to the recipients.</p>
                        </div>
                    ) : (
                        <>
                            <DialogHeader>
                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <Mail className="size-6 text-primary" />
                                </div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Email Report</DialogTitle>
                                <DialogDescription>Send the generated PDF report directly to stakeholders.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipients (comma separated)</label>
                                    <Input 
                                        placeholder="stakeholder@company.com, boss@company.com" 
                                        value={emailData.emails} 
                                        onChange={(e) => setEmailData({...emailData, emails: e.target.value})}
                                        className="bg-slate-50 dark:bg-slate-900/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                                    <Input 
                                        placeholder="Monthly Project Report" 
                                        value={emailData.subject} 
                                        onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                                        className="bg-slate-50 dark:bg-slate-900/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Body</label>
                                    <Textarea 
                                        placeholder="Write a message..." 
                                        rows={4}
                                        value={emailData.body} 
                                        onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                                        className="bg-slate-50 dark:bg-slate-900/50 resize-none"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-3">
                                <DialogClose asChild>
                                    <Button variant="ghost" className="flex-1">Cancel</Button>
                                </DialogClose>
                                <Button 
                                    onClick={handleSendEmail} 
                                    disabled={!emailData.emails || isSendingEmail} 
                                    className="flex-1 gap-2 shadow-lg shadow-primary/20"
                                >
                                    {isSendingEmail ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    Send Report
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
