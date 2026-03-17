import { useState, useEffect, useMemo } from 'react';
import { fetchAPI } from '../services/api';
import { 
    Plus, MoreHorizontal, FileText, Presentation, PencilLine, 
    CheckCircle2, XCircle, Search, Filter, Loader2, Banknote, 
    Building2, Upload, Clock, TrendingUp, Target, Users, ArrowUpRight 
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from 'react-router-dom';

const PIPELINE_STAGES = [
    { id: 'Lead', label: 'Inbound Lead', color: 'bg-rose-100', text: 'text-rose-700', icon: Users, accent: 'bg-rose-500' },
    { id: 'Proposal', label: 'Proposal Phase', color: 'bg-indigo-100', text: 'text-indigo-700', icon: FileText, accent: 'bg-indigo-500' },
    { id: 'Presentation', label: 'Pitch/Presentation', color: 'bg-purple-100', text: 'text-purple-700', icon: Presentation, accent: 'bg-purple-500' },
    { id: 'Quotation', label: 'Negotiation', color: 'bg-orange-100', text: 'text-orange-700', icon: Banknote, accent: 'bg-orange-500' }
];

export default function Presales() {
    const navigate = useNavigate();
    const { view } = useParams();
    const showHistory = view === 'results';
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadLeads = async () => {
        setLoading(true);
        try {
            const res = await fetchAPI('/presales');
            if (res.data) {
                setLeads(res.data);
            }
        } catch (error) {
            console.error("Failed to load leads", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const stats = useMemo(() => {
        const active = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
        const won = leads.filter(l => l.status === 'Won');
        const totalValue = active.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);
        const winRate = leads.length ? Math.round((won.length / leads.length) * 100) : 0;
        
        return {
            activeCount: active.length,
            totalValue,
            winRate,
            leadsCount: leads.length
        };
    }, [leads]);

    const handleAddLead = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.target);
        const rawVal = formData.get('estimated_value');
        const payload = {
            name: formData.get('name'),
            sector: formData.get('sector'),
            estimated_value: rawVal ? parseFloat(rawVal) : 0,
            description: formData.get('description')
        };

        try {
            await fetchAPI('/presales', { method: 'POST', body: JSON.stringify(payload) });
            setIsAddModalOpen(false);
            loadLeads();
        } catch (error) {
            alert("Error creating lead: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (lead, newStatus) => {
        try {
            await fetchAPI(`/presales/${lead.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            loadLeads();
            if (newStatus === 'Won') {
                navigate('/create-project', { state: { fromLead: lead } });
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        if (payload.quotation_value) payload.quotation_value = parseFloat(payload.quotation_value);
        if (payload.estimated_value) payload.estimated_value = parseFloat(payload.estimated_value);

        try {
            await fetchAPI(`/presales/${selectedLead.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            setIsEditModalOpen(false);
            loadLeads();
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayedLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                l.sector?.toLowerCase().includes(searchTerm.toLowerCase());
            const isActive = l.status !== 'Won' && l.status !== 'Lost';
            return matchesSearch && (showHistory ? !isActive : isActive);
        });
    }, [leads, searchTerm, showHistory]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR',
            maximumFractionDigits: 0 
        }).format(val || 0);
    };

    const StatCard = ({ title, value, icon: Icon, trend, color }) => (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <Icon size={80} />
            </div>
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
                        <Icon className={`size-5 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
                    {trend && <span className="text-xs font-bold text-emerald-500 flex items-center">{trend} <ArrowUpRight className="size-3" /></span>}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC] dark:bg-background-dark h-full animate-fade">
            <div className="px-8 pt-8 pb-4 shrink-0">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Presales Pipeline</h1>
                            <Badge className="bg-primary/10 text-primary border-none font-bold">PRO VERSION</Badge>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Track opportunities and maximize your conversion rate.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="bg-white dark:bg-slate-900 shadow-sm border-slate-200" onClick={() => loadLeads()}>
                            <TrendingUp className="size-4 mr-2" />
                            Force Refresh
                        </Button>
                        <Button className="shadow-lg shadow-primary/20 gap-2 h-11 px-6 rounded-xl" onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="size-5" />
                            New Opportunity
                        </Button>
                    </div>
                </div>

                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        title="Active Pipeline" 
                        value={stats.activeCount} 
                        icon={Target} 
                        color="bg-primary"
                    />
                    <StatCard 
                        title="Total Value" 
                        value={formatCurrency(stats.totalValue)} 
                        icon={Banknote} 
                        color="bg-emerald-500"
                        trend="+12%"
                    />
                    <StatCard 
                        title="Win Rate" 
                        value={`${stats.winRate}%`} 
                        icon={TrendingUp} 
                        color="bg-violet-500"
                    />
                    <StatCard 
                        title="Database Size" 
                        value={stats.leadsCount} 
                        icon={Users} 
                        color="bg-amber-500"
                    />
                </div>

                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Filter leads by name or industry..."
                            className="pl-11 bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <Button
                            variant={!showHistory ? "default" : "ghost"}
                            className={`rounded-lg h-9 gap-2 px-4 ${!showHistory ? 'shadow-sm' : 'text-slate-500'}`}
                            onClick={() => navigate('/presales')}
                        >
                            <TrendingUp className="size-4" /> Active
                        </Button>
                        <Button
                            variant={showHistory ? "default" : "ghost"}
                            className={`rounded-lg h-9 gap-2 px-4 ${showHistory ? 'shadow-sm' : 'text-slate-500'}`}
                            onClick={() => navigate('/presales/results')}
                        >
                            <Clock className="size-4" /> Results
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto px-8 pb-8 no-scrollbar">
                <div className="flex gap-10 min-w-max h-full pb-10">
                    {showHistory ? (
                        ['Won', 'Lost'].map(status => (
                            <div key={status} className="w-[340px] flex flex-col h-full">
                                <div className="flex items-center justify-between px-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-3 rounded-full ${status === 'Won' ? 'bg-emerald-400' : 'bg-rose-400'} ring-8 ${status === 'Won' ? 'ring-emerald-500/5' : 'ring-rose-500/5'}`}></div>
                                        <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-[12px] tracking-[0.2em]">{status}</h3>
                                        <Badge className="bg-white dark:bg-slate-800 text-slate-500 shadow-sm border-slate-100 dark:border-slate-700 px-2 py-0 h-5 font-bold rounded-full">
                                            {displayedLeads.filter(l => l.status === status).length}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col gap-5 overflow-y-auto no-scrollbar px-1">
                                    {displayedLeads.filter(l => l.status === status).map(lead => (
                                        <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setIsEditModalOpen(true); }} onAction={handleUpdateStatus} formatCurrency={formatCurrency} />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        PIPELINE_STAGES.map(stage => (
                            <div key={stage.id} className="w-[340px] flex flex-col h-full">
                                <div className="flex items-center justify-between px-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-2xl ${stage.color} ${stage.text}`}>
                                            <stage.icon className="size-5" />
                                        </div>
                                        <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm tracking-tight">{stage.label}</h3>
                                        <div className={`size-6 rounded-full ${stage.color} flex items-center justify-center text-[10px] font-black ${stage.text}`}>
                                            {displayedLeads.filter(l => l.status === stage.id).length}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="size-9 rounded-xl text-slate-400 hover:bg-white hover:shadow-sm" onClick={() => setIsAddModalOpen(true)}><Plus size={20} /></Button>
                                </div>

                                <div className="flex-1 flex flex-col gap-5 overflow-y-auto no-scrollbar px-1 min-h-0">
                                    {displayedLeads.filter(l => l.status === stage.id).map(lead => (
                                        <LeadCard key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setIsEditModalOpen(true); }} onAction={handleUpdateStatus} formatCurrency={formatCurrency} />
                                    ))}
                                    <button 
                                        onClick={() => setIsAddModalOpen(true)}
                                        className={`w-full flex items-center justify-center gap-2 py-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:border-${stage.accent.replace('bg-', '')} hover:bg-${stage.accent.replace('bg-', '')}/5 hover:text-${stage.accent.replace('bg-', '')} transition-all group`}
                                    >
                                        <Plus className="size-5 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black uppercase tracking-[0.1em]">Add New Opportunity</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals remain mostly the same but with refined styling */}
            <AddLeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddLead} isSubmitting={isSubmitting} />
            <EditLeadModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleUpdateDetails} lead={selectedLead} isSubmitting={isSubmitting} />
        </div>
    );
}

function LeadCard({ lead, onClick, onAction, formatCurrency }) {
    const stage = PIPELINE_STAGES.find(s => s.id === lead.status) || { accent: 'bg-primary' };
    
    return (
        <Card 
            className="group relative hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer border-none bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none animate-in-card min-h-[180px]" 
            onClick={onClick}
        >
            <div className={`absolute top-0 left-0 w-1.5 h-full ${stage.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className="px-3 py-1 text-[10px] font-black tracking-widest uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 border-none rounded-full">
                        {lead.sector || 'General'}
                    </Badge>
                    
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-full text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" 
                            onClick={(e) => { e.stopPropagation(); onAction(lead, 'Won'); }}
                        >
                            <CheckCircle2 size={16} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                            onClick={(e) => { e.stopPropagation(); onAction(lead, 'Lost'); }}
                        >
                            <XCircle size={16} />
                        </Button>
                    </div>
                </div>

                <h4 className="font-black text-slate-800 dark:text-white text-lg mb-6 leading-tight group-hover:text-primary transition-colors">
                    {lead.name}
                </h4>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <Banknote className="size-4 text-emerald-500" />
                            </div>
                            <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                {formatCurrency(lead.estimated_value)}
                            </span>
                        </div>
                        
                        <div className="flex -space-x-2">
                            <div className="size-8 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-indigo-100 to-primary/20 flex items-center justify-center text-[11px] font-black text-primary uppercase shadow-sm">
                                {lead.name.charAt(0)}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex gap-2">
                            {lead.proposal_doc_url && (
                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500" title="Proposal Ready">
                                    <FileText className="size-4" />
                                </div>
                            )}
                            {lead.presentation_log && (
                                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500" title="Presentation Logged">
                                    <Presentation className="size-4" />
                                </div>
                            )}
                            {!lead.proposal_doc_url && !lead.presentation_log && (
                                <span className="text-[11px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-wider">No artifacts</span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-400">
                            <Clock size={14} />
                            <span className="text-[11px] font-black uppercase tracking-widest">
                                {new Date(lead.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AddLeadModal({ isOpen, onClose, onSubmit, isSubmitting }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl border-none shadow-2xl">
                <DialogHeader>
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <Plus size={24} />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">New Opportunity</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">Kickstart a new sales cycle by entering the lead details.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="flex flex-col gap-6 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Identity</label>
                        <Input name="name" required placeholder="Client Name (e.g. PT Arta Graha)" className="h-12 rounded-xl bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Sector</label>
                            <Input name="sector" placeholder="e.g. Fintech" className="h-12 rounded-xl bg-slate-50 border-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Est. Value</label>
                            <div className="relative">
                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                <Input name="estimated_value" type="number" placeholder="Budget (Rp)" className="h-12 pl-9 rounded-xl bg-slate-50 border-none shadow-inner" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Context</label>
                        <Textarea name="description" placeholder="Briefly describe the pain points and project scope..." className="min-h-[100px] rounded-2xl bg-slate-50 border-none shadow-inner" />
                    </div>
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-12">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 px-8 shadow-lg shadow-primary/25">
                            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="size-4 mr-2" />}
                            Initialize Lead
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditLeadModal({ isOpen, onClose, onSubmit, lead, isSubmitting }) {
    if (!lead) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-primary to-indigo-600 p-8 flex items-end">
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">Deal Engineering</h2>
                </div>
                <div className="p-8 pb-4 max-h-[75vh] overflow-y-auto no-scrollbar">
                    <form onSubmit={onSubmit} className="flex flex-col gap-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Client</label>
                                <Input name="name" defaultValue={lead.name} required className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vertical</label>
                                <Input name="sector" defaultValue={lead.sector} className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Business Objective</label>
                            <Textarea name="description" defaultValue={lead.description} className="rounded-2xl bg-slate-50 border-none min-h-[80px]" />
                        </div>

                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-black uppercase text-primary tracking-[0.1em]">Execution Workflow</h4>
                            
                            <div className="grid grid-cols-1 gap-5">
                                <div className="p-4 rounded-2xl bg-blue-500 bg-opacity-5 border border-blue-100 dark:border-blue-900/30">
                                    <label className="text-xs font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-3"><Upload size={14} /> Proposal Artifacts</label>
                                    <Input name="proposal_doc_url" defaultValue={lead.proposal_doc_url} placeholder="Sharepoint/G-Drive URL..." className="bg-white dark:bg-slate-800 border-none shadow-sm h-10 rounded-lg text-sm text-slate-900 dark:text-white" />
                                </div>

                                <div className="p-4 rounded-2xl bg-purple-500 bg-opacity-5 border border-purple-100 dark:border-purple-900/30">
                                    <label className="text-xs font-bold flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-3"><Presentation size={14} /> Intelligence & Feedback</label>
                                    <Textarea name="presentation_log" defaultValue={lead.presentation_log} placeholder="Key meeting notes..." className="bg-white dark:bg-slate-800 border-none shadow-sm rounded-lg min-h-[80px] text-sm text-slate-900 dark:text-white" />
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-500 bg-opacity-5 border border-amber-100 dark:border-amber-900/30">
                                    <label className="text-xs font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-3"><Banknote size={14} /> Official Financials</label>
                                    <Input name="quotation_value" type="number" defaultValue={lead.quotation_value} placeholder="Official Quote (IDR)" className="bg-white dark:bg-slate-800 border-none shadow-sm h-10 rounded-lg text-sm text-slate-900 dark:text-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pipeline State</label>
                                    <Select name="status" defaultValue={lead.status}>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PIPELINE_STAGES.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="font-bold">{s.label}</SelectItem>
                                            ))}
                                            <SelectItem value="Lost" className="font-bold text-rose-500">Archive (Lost)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 h-11">
                                    <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20">
                                        {isSubmitting ? <Loader2 className="animate-spin size-4" /> : 'Apply Intelligence'}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl px-4 text-slate-400">Close</Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="h-4 bg-slate-50 dark:bg-slate-900"></div>
            </DialogContent>
        </Dialog>
    );
}
