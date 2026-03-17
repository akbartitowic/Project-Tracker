import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Plus, MoreHorizontal, FileText, Presentation, PencilLine, CheckCircle2, XCircle, Search, Filter, Loader2, DollarSign, Building2, Upload, Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';

const PIPELINE_STAGES = [
    { id: 'Lead', label: 'Lead', color: 'bg-slate-500' },
    { id: 'Proposal', label: 'Proposal', color: 'bg-blue-500' },
    { id: 'Presentation', label: 'Presentation', color: 'bg-purple-500' },
    { id: 'Quotation', label: 'Quotation', color: 'bg-orange-500' }
];

export default function Presales() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showHistory, setShowHistory] = useState(false);

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
                if (showHistory) {
                    setLeads(res.data.filter(l => l.status === 'Won' || l.status === 'Lost'));
                } else {
                    setLeads(res.data.filter(l => l.status !== 'Won' && l.status !== 'Lost'));
                }
            }
        } catch (error) {
            console.error("Failed to load leads", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, [showHistory]);

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

        if (isNaN(payload.estimated_value)) payload.estimated_value = 0;

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
                // Navigate to initiation
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

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.sector?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLeadsByStage = (stage) => filteredLeads.filter(l => l.status === stage);

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50 dark:bg-background-dark h-full">
            <div className="p-8 shrink-0">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Presales Pipeline</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage leads and opportunities from intake to winning.</p>
                    </div>
                    <Button className="shadow-lg shadow-primary/20" onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="size-5 mr-2" />
                        New Opportunity
                    </Button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Search leads or sectors..."
                            className="pl-10 bg-white dark:bg-slate-900 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={showHistory ? "default" : "outline"}
                        className="gap-2"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        <Clock className="size-4" />
                        {showHistory ? "View Active Pipeline" : "View History (Won/Lost)"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto p-8 pt-0">
                <div className="flex gap-6 min-w-max h-full pb-6">
                    {showHistory ? (
                        ['Won', 'Lost'].map(status => (
                            <div key={status} className="w-80 flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${status === 'Won' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">{status}</h3>
                                        <Badge variant="secondary" className="px-1.5 py-0 h-5">
                                            {filteredLeads.filter(l => l.status === status).length}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1">
                                    {filteredLeads.filter(l => l.status === status).map(lead => (
                                        <Card key={lead.id} className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm" onClick={() => {
                                            setSelectedLead(lead);
                                            setIsEditModalOpen(true);
                                        }}>
                                            <CardContent className="p-4">
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 truncate">{lead.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                    <DollarSign className="size-3.5 text-emerald-500" />
                                                    <span className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(lead.quotation_value || lead.estimated_value || 0)}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px]">{lead.sector || 'General'}</Badge>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        PIPELINE_STAGES.map(stage => (
                            <div key={stage.id} className="w-80 flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${stage.color}`}></span>
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">{stage.label}</h3>
                                        <Badge variant="secondary" className="px-1.5 py-0 h-5">{getLeadsByStage(stage.id).length}</Badge>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1">
                                    {getLeadsByStage(stage.id).map(lead => (
                                        <Card key={lead.id} className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm" onClick={() => {
                                            setSelectedLead(lead);
                                            setIsEditModalOpen(true);
                                        }}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500 border-slate-200">
                                                        {lead.sector || 'General'}
                                                    </Badge>
                                                    <button className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="size-4" />
                                                    </button>
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 truncate">{lead.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                                    <DollarSign className="size-3.5 text-emerald-500" />
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(lead.estimated_value || 0)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex gap-2">
                                                        {lead.proposal_doc_url && <FileText className="size-3.5 text-blue-500" title="Proposal Uploaded" />}
                                                        {lead.presentation_log && <Presentation className="size-3.5 text-purple-500" title="Presentation Logged" />}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateStatus(lead, 'Won');
                                                        }}>
                                                            <CheckCircle2 className="size-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateStatus(lead, 'Lost');
                                                        }}>
                                                            <XCircle className="size-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                        <DialogDescription>Input basic client information to start the pipeline.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddLead} className="flex flex-col gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Client Name</label>
                            <Input name="name" required placeholder="e.g. PT Bank Central" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Industry Sector</label>
                                <Input name="sector" placeholder="e.g. Finance" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Est. Value (IDR)</label>
                                <Input name="estimated_value" type="number" placeholder="0" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Description</label>
                            <Textarea name="description" placeholder="Brief project overview..." />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Create Lead
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit / Workflow Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Lead Details & Workflow</DialogTitle>
                    </DialogHeader>
                    {selectedLead && (
                        <form onSubmit={handleUpdateDetails} className="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2"><Building2 className="size-4 text-slate-400" /> Client Name</label>
                                    <Input name="name" defaultValue={selectedLead.name} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Sector</label>
                                    <Input name="sector" defaultValue={selectedLead.sector} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2"><PencilLine className="size-4 text-slate-400" /> Description</label>
                                <Textarea name="description" defaultValue={selectedLead.description} />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Workflow Progress</h4>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2 text-blue-600"><Upload className="size-4" /> Proposal Document (URL)</label>
                                    <Input name="proposal_doc_url" defaultValue={selectedLead.proposal_doc_url} placeholder="https://sharepoint.com/proposal-v1" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2 text-purple-600"><Presentation className="size-4" /> Presentation Log & Feedback</label>
                                    <Textarea name="presentation_log" defaultValue={selectedLead.presentation_log} placeholder="Client was impressed with..." />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2 text-orange-600"><DollarSign className="size-4" /> Official Quotation Value (IDR)</label>
                                    <Input name="quotation_value" type="number" defaultValue={selectedLead.quotation_value} placeholder="0" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Current Status</label>
                                    <Select name="status" defaultValue={selectedLead.status}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PIPELINE_STAGES.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                            ))}
                                            <SelectItem value="Lost">Lost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Close</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
