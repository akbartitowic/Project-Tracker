import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    Check,
    Clock,
    Inbox,
    LayoutGrid,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

function ProjectCompanyIcon({ logoUrl, projectName }) {
    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={projectName ? `${projectName} company logo` : 'Company logo'}
                className="size-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
            />
        );
    }
    return (
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Briefcase className="size-5" />
        </div>
    );
}

const PRIORITY_BORDER = {
    High:   'border-l-rose-400',
    Medium: 'border-l-amber-400',
    Low:    'border-l-slate-300 dark:border-l-slate-600',
};

const PRIORITY_BADGE = {
    High:   'border-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/30',
    Medium: 'border-amber-200 text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    Low:    'border-slate-200 text-slate-500 bg-slate-50 dark:bg-slate-800/50',
};

function formatMh(val) {
    const n = Number(val);
    return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export default function ProjectBoardBacklog() {
    const { projectId } = useParams();
    const navigate    = useNavigate();
    const { user }    = useAuth();
    const canUpdate   = hasPermission(user, 'project_board.update');

    const [project,     setProject]     = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [backlogItems, setBacklogItems] = useState([]);
    const [backlogLoading, setBacklogLoading] = useState(false);
    const [boardTasks,  setBoardTasks]  = useState([]);

    // Add form
    const [addTitle,        setAddTitle]        = useState('');
    const [addFeatureTitle, setAddFeatureTitle] = useState('');
    const [addDescription,  setAddDescription]  = useState('');
    const [addPriority,     setAddPriority]     = useState('Medium');
    const [addMh,           setAddMh]           = useState('');
    const [isAdding,        setIsAdding]        = useState(false);

    // Promote dialog
    const [promoteItem,      setPromoteItem]      = useState(null);
    const [promoteAsSubtask, setPromoteAsSubtask] = useState(false);
    const [promoteParentId,  setPromoteParentId]  = useState('');
    const [isPromoting,      setIsPromoting]      = useState(false);

    // Inline edit
    const [editingId,          setEditingId]          = useState(null);
    const [editTitle,          setEditTitle]          = useState('');
    const [editFeatureTitle,   setEditFeatureTitle]   = useState('');
    const [editDescription,    setEditDescription]    = useState('');
    const [editPriority,       setEditPriority]       = useState('Medium');
    const [editMh,             setEditMh]             = useState('');
    const [isSavingEdit,       setIsSavingEdit]       = useState(false);

    // Add dialog
    const [showAddDialog,    setShowAddDialog]    = useState(false);

    // Multi-select
    const [selectedIds,           setSelectedIds]           = useState(new Set());
    const [showBulkPromoteDialog, setShowBulkPromoteDialog] = useState(false);
    const [bulkAsSubtask,         setBulkAsSubtask]         = useState(false);
    const [bulkParentId,          setBulkParentId]          = useState('');
    const [isPromotingBulk,       setIsPromotingBulk]       = useState(false);

    const allSelected  = backlogItems.length > 0 && selectedIds.size === backlogItems.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < backlogItems.length;
    const totalMh = backlogItems.reduce((sum, item) => sum + (Number(item.estimated_hours) || 0), 0);
    const selectedMh = backlogItems.reduce(
        (sum, item) => sum + (selectedIds.has(item.id) ? (Number(item.estimated_hours) || 0) : 0),
        0,
    );
    const uncheckedMh = totalMh - selectedMh;

    const handleToggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(backlogItems.map((i) => i.id)));
        }
    };

    const openBulkPromoteDialog = () => {
        setBulkAsSubtask(false);
        setBulkParentId('');
        setShowBulkPromoteDialog(true);
    };

    const confirmBulkPromote = async () => {
        if (selectedIds.size === 0 || !canUpdate) return;
        setIsPromotingBulk(true);
        try {
            const body = bulkAsSubtask && bulkParentId
                ? { parent_task_id: Number(bulkParentId) }
                : {};
            await Promise.all(
                [...selectedIds].map((id) =>
                    fetchAPI(`/tasks/${id}/promote`, { method: 'POST', body: JSON.stringify(body) })
                )
            );
            setSelectedIds(new Set());
            setShowBulkPromoteDialog(false);
            const [backlogRes, tasksRes] = await Promise.all([
                fetchAPI(`/tasks/backlog?project_id=${projectId}`),
                fetchAPI(`/tasks?project_id=${projectId}`),
            ]);
            setBacklogItems(backlogRes.data || []);
            setBoardTasks(tasksRes.data || []);
        } catch (err) {
            alert(err.message || 'Gagal memindahkan task ke board.');
        } finally {
            setIsPromotingBulk(false);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditTitle(item.title);
        setEditFeatureTitle(item.feature_title && item.feature_title !== item.title ? item.feature_title : '');
        setEditDescription(item.description || '');
        setEditPriority(item.priority || 'Medium');
        setEditMh(Number(item.estimated_hours) > 0 ? String(item.estimated_hours) : '');
    };

    const cancelEdit = () => setEditingId(null);

    const handleSaveEdit = async (item) => {
        if (!editTitle.trim()) return;
        setIsSavingEdit(true);
        try {
            const mhValue = parseFloat(editMh);
            await fetchAPI(`/tasks/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: editTitle.trim(),
                    feature_title: editFeatureTitle.trim() || editTitle.trim(),
                    description: editDescription.trim() || null,
                    priority: editPriority,
                    status: item.status || 'To Do',
                    estimated_hours: mhValue > 0 ? mhValue : 0,
                }),
            });
            setEditingId(null);
            await loadBacklog();
        } catch (err) {
            alert(err.message || 'Gagal menyimpan perubahan.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const loadBacklog = useCallback(async () => {
        if (!projectId) return;
        setBacklogLoading(true);
        try {
            const res = await fetchAPI(`/tasks/backlog?project_id=${projectId}`);
            setBacklogItems(res.data || []);
        } catch (err) {
            console.error('Failed to load backlog', err);
        } finally {
            setBacklogLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (!projectId) { navigate('/board'); return; }
        const load = async () => {
            setPageLoading(true);
            try {
                const projectsRes = await fetchAPI('/projects');
                const found = (projectsRes.data || []).find(
                    (p) => p.id.toString() === projectId.toString(),
                );
                if (!found) { navigate('/board'); return; }
                setProject(found);
                const [backlogRes, tasksRes] = await Promise.all([
                    fetchAPI(`/tasks/backlog?project_id=${projectId}`),
                    fetchAPI(`/tasks?project_id=${projectId}`),
                ]);
                setBacklogItems(backlogRes.data || []);
                setBoardTasks(tasksRes.data || []);
            } catch (err) {
                console.error('Failed to load backlog page', err);
            } finally {
                setPageLoading(false);
            }
        };
        load();
    }, [projectId, navigate]);

    const handleAdd = async () => {
        if (!addTitle.trim() || !canUpdate) return;
        setIsAdding(true);
        try {
            const mhValue = parseFloat(addMh);
            await fetchAPI('/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    title: addTitle.trim(),
                    feature_title: addFeatureTitle.trim() || addTitle.trim(),
                    description: addDescription.trim() || null,
                    priority: addPriority,
                    status: 'To Do',
                    project_id: Number(projectId),
                    is_backlog: true,
                    ...(mhValue > 0 ? { estimated_hours: mhValue } : {}),
                }),
            });
            setAddTitle('');
            setAddFeatureTitle('');
            setAddDescription('');
            setAddPriority('Medium');
            setAddMh('');
            setShowAddDialog(false);
            await loadBacklog();
        } catch (err) {
            alert(err.message || 'Gagal menambah backlog.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Hapus item backlog ini?') || !canUpdate) return;
        try {
            await fetchAPI(`/tasks/${itemId}`, { method: 'DELETE' });
            setBacklogItems((prev) => prev.filter((i) => i.id !== itemId));
            if (promoteItem?.id === itemId) setPromoteItem(null);
        } catch (err) {
            alert(err.message || 'Gagal menghapus backlog.');
        }
    };

    const handlePromote = async () => {
        if (!promoteItem || !canUpdate) return;
        setIsPromoting(true);
        try {
            const body = {};
            if (promoteAsSubtask && promoteParentId) {
                body.parent_task_id = Number(promoteParentId);
            }
            await fetchAPI(`/tasks/${promoteItem.id}/promote`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            setPromoteItem(null);
            setPromoteAsSubtask(false);
            setPromoteParentId('');
            const [backlogRes, tasksRes] = await Promise.all([
                fetchAPI(`/tasks/backlog?project_id=${projectId}`),
                fetchAPI(`/tasks?project_id=${projectId}`),
            ]);
            setBacklogItems(backlogRes.data || []);
            setBoardTasks(tasksRes.data || []);
        } catch (err) {
            alert(err.message || 'Gagal memindahkan ke board.');
        } finally {
            setIsPromoting(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50 dark:bg-[#000040]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white to-slate-50 dark:from-[#000040] dark:via-[#0a0e2e] dark:to-background-dark" />
            <div className="pointer-events-none absolute -top-24 -left-24 size-[28rem] rounded-full bg-accent/10 blur-[120px] dark:bg-accent/15" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 size-[32rem] rounded-full bg-primary/10 blur-[130px] dark:bg-accent/10" />

            {/* ── Top bar ── */}
            <div className="relative shrink-0 bg-white/70 backdrop-blur-xl dark:bg-[#151b28]/90 border-b border-white/60 dark:border-white/10 px-4 sm:px-6 py-3">
                <div className="w-full flex items-center justify-between gap-4">
                    {/* Left: breadcrumb */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/board/${projectId}`)}
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
                        >
                            <ArrowLeft className="size-4" />
                            <span className="hidden sm:inline">Board</span>
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 shrink-0">/</span>
                        <div className="flex items-center gap-2 min-w-0">
                            <ProjectCompanyIcon
                                logoUrl={project.company_logo_url}
                                projectName={project.name}
                            />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {project.name}
                            </span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700 shrink-0">/</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Inbox className="size-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">Backlog</span>
                        </div>
                    </div>

                    {/* Right: nav shortcuts */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-slate-600 dark:text-slate-300"
                            onClick={() => navigate(`/board/${projectId}`)}
                        >
                            <LayoutGrid className="size-3.5" />
                            <span className="hidden sm:inline">Buka Board</span>
                        </Button>
                        {canUpdate && (
                            <Button
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => setShowAddDialog(true)}
                            >
                                <Plus className="size-3.5" />
                                <span className="hidden sm:inline">Tambah</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="relative flex-1 min-h-0 overflow-y-auto">
                <div className="w-full px-4 sm:px-6 py-5 space-y-3">

                    {/* List header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <Inbox className="size-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Daftar Backlog</span>
                            {backlogItems.length > 0 && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="text-slate-500 dark:text-slate-400">{backlogItems.length} task</span>
                                </>
                            )}
                            {selectedIds.size > 0 && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="font-semibold text-primary">{selectedIds.size} dipilih</span>
                                </>
                            )}
                        </div>
                        {backlogLoading && <Loader2 className="size-4 animate-spin text-slate-400" />}
                    </div>

                    {/* Empty state */}
                    {!backlogLoading && backlogItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-300/70 dark:border-white/10 rounded-xl bg-white/50 backdrop-blur-sm dark:bg-white/5">
                            <Inbox className="size-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Backlog masih kosong</p>
                            <p className="text-xs mt-1 text-slate-400">
                                {canUpdate
                                    ? 'Klik tombol "Tambah" di kanan atas untuk menambahkan item'
                                    : 'Belum ada item backlog untuk project ini'}
                            </p>
                        </div>
                    )}

                    {/* Table */}
                    {backlogItems.length > 0 && (
                        <div className="bg-white/70 backdrop-blur-xl dark:bg-[#151b28] rounded-xl border border-white/60 dark:border-white/10 shadow-sm dark:shadow-xl overflow-hidden">

                            {/* Table header row */}
                            <div className="grid items-center gap-0 border-b border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 px-4 py-2"
                                style={{ gridTemplateColumns: canUpdate ? '36px 1fr 100px 80px 100px' : '1fr 100px 80px' }}>
                                {canUpdate && (
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="size-4 rounded cursor-pointer accent-primary"
                                            checked={allSelected}
                                            ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                            onChange={handleSelectAll}
                                            title={allSelected ? 'Batal pilih semua' : 'Pilih semua'}
                                        />
                                    </div>
                                )}
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 pl-1">Task</div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Prioritas</div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">MH</div>
                                {canUpdate && <div />}
                            </div>

                            {/* Rows */}
                            {backlogItems.map((item, index) => {
                                const isEditing = editingId === item.id;
                                const isChecked = selectedIds.has(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            index > 0 && 'border-t border-slate-100 dark:border-slate-800',
                                            isEditing && 'ring-inset ring-2 ring-primary/20 bg-primary/5',
                                            !isEditing && isChecked && 'bg-primary/[0.04] dark:bg-primary/10',
                                        )}
                                    >
                                        {isEditing ? (
                                            /* ── Edit mode (full-width) ── */
                                            <div className="px-4 py-4 space-y-3">
                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Judul *</label>
                                                        <Input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Feature / Modul</label>
                                                        <Input value={editFeatureTitle} onChange={(e) => setEditFeatureTitle(e.target.value)} className="h-8 text-sm" placeholder="Opsional..." />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Deskripsi</label>
                                                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="text-sm resize-none" placeholder="Opsional..." />
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prioritas</label>
                                                        <Select value={editPriority} onValueChange={setEditPriority}>
                                                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="High">High</SelectItem>
                                                                <SelectItem value="Medium">Medium</SelectItem>
                                                                <SelectItem value="Low">Low</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estimasi MH</label>
                                                        <div className="relative">
                                                            <Input type="number" min="0" step="0.5" placeholder="0" value={editMh} onChange={(e) => setEditMh(e.target.value)} className="h-8 text-sm pr-9" />
                                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 pointer-events-none">MH</span>
                                                        </div>
                                                    </div>
                                                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={cancelEdit} disabled={isSavingEdit}>
                                                            <X className="size-3" /> Batal
                                                        </Button>
                                                        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleSaveEdit(item)} disabled={!editTitle.trim() || isSavingEdit}>
                                                            {isSavingEdit ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                                            Simpan
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* ── View row ── */
                                            <div
                                                className="grid items-center gap-0 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                                style={{ gridTemplateColumns: canUpdate ? '36px 1fr 100px 80px 100px' : '1fr 100px 80px' }}
                                            >
                                                {canUpdate && (
                                                    <div className="flex items-center shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded cursor-pointer accent-primary"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleSelect(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                )}
                                                {/* Title */}
                                                <div className="min-w-0 pl-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug truncate">
                                                        {item.title}
                                                    </p>
                                                    {item.feature_title && item.feature_title !== item.title && (
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{item.feature_title}</p>
                                                    )}
                                                    {item.description && (
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                                                    )}
                                                </div>
                                                {/* Priority */}
                                                <div>
                                                    <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', PRIORITY_BADGE[item.priority])}>
                                                        {item.priority}
                                                    </Badge>
                                                </div>
                                                {/* MH */}
                                                <div>
                                                    {Number(item.estimated_hours) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 h-5">
                                                            <Clock className="size-2.5" />
                                                            {formatMh(item.estimated_hours)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-300 dark:text-slate-700">—</span>
                                                    )}
                                                </div>
                                                {/* Actions */}
                                                {canUpdate && (
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <button
                                                            type="button"
                                                            title="Pindah ke Board"
                                                            onClick={() => { setPromoteItem(item); setPromoteAsSubtask(false); setPromoteParentId(''); }}
                                                            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                        >
                                                            <ArrowRight className="size-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Edit"
                                                            onClick={() => startEdit(item)}
                                                            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Hapus"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Footer: total MH */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 px-4 py-2.5">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Total {backlogItems.length} task
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    {selectedIds.size > 0 ? (
                                        <>
                                            <span
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 rounded-full px-2 h-5"
                                                title={`Total MH ${selectedIds.size} task yang dicentang`}
                                            >
                                                <Clock className="size-2.5" />
                                                Dicentang: {formatMh(selectedMh)} MH
                                            </span>
                                            <span
                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/60 rounded-full px-2 h-5"
                                                title={`Total MH ${backlogItems.length - selectedIds.size} task yang belum dicentang`}
                                            >
                                                <Clock className="size-2.5" />
                                                Belum: {formatMh(uncheckedMh)} MH
                                            </span>
                                        </>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 rounded-full px-2 h-5">
                                            <Clock className="size-2.5" />
                                            {formatMh(totalMh)} MH
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bulk action bar ── */}
            {canUpdate && selectedIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl dark:bg-[#151b28]/95 border-t border-white/60 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3 animate-in slide-in-from-bottom-4 duration-200">
                    <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold px-2 h-5 min-w-[20px]">
                                {selectedIds.size}
                            </span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                task dipilih
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setSelectedIds(new Set())}
                                disabled={isPromotingBulk}
                            >
                                Batalkan
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 gap-1.5 text-xs shadow-sm shadow-primary/20"
                                onClick={openBulkPromoteDialog}
                                disabled={isPromotingBulk}
                            >
                                <ArrowRight className="size-3.5" />
                                Pindah {selectedIds.size} Task ke Board
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add dialog ── */}
            <Dialog open={showAddDialog} onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) { setAddTitle(''); setAddFeatureTitle(''); setAddDescription(''); setAddPriority('Medium'); setAddMh(''); }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="size-4 text-primary" />
                            Tambah ke Backlog
                        </DialogTitle>
                        <DialogDescription>
                            Isi detail task yang akan ditambahkan ke backlog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-1">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Judul <span className="text-rose-400">*</span>
                            </label>
                            <Input
                                autoFocus
                                placeholder="Nama task..."
                                value={addTitle}
                                onChange={(e) => setAddTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdd()}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Feature / Modul
                            </label>
                            <Input
                                placeholder="Opsional..."
                                value={addFeatureTitle}
                                onChange={(e) => setAddFeatureTitle(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Deskripsi
                            </label>
                            <Textarea
                                placeholder="Detail atau catatan tambahan..."
                                value={addDescription}
                                onChange={(e) => setAddDescription(e.target.value)}
                                rows={3}
                                className="text-sm resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Prioritas
                                </label>
                                <Select value={addPriority} onValueChange={setAddPriority}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Estimasi MH
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        placeholder="0"
                                        value={addMh}
                                        onChange={(e) => setAddMh(e.target.value)}
                                        className="h-9 text-sm pr-9"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 pointer-events-none">
                                        MH
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(false)} disabled={isAdding}>
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            disabled={!addTitle.trim() || isAdding}
                            onClick={handleAdd}
                            className="gap-1.5"
                        >
                            {isAdding
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <Plus className="size-3.5" />}
                            Tambah ke Backlog
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk promote dialog ── */}
            <Dialog open={showBulkPromoteDialog} onOpenChange={(open) => { if (!open) setShowBulkPromoteDialog(false); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRight className="size-4 text-primary" />
                            Pindah {selectedIds.size} Task ke Board
                        </DialogTitle>
                        <DialogDescription>
                            Pilih cara memindahkan <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedIds.size} task</span> yang dipilih ke board.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-1">
                        <label className={cn(
                            'flex items-start gap-3 rounded-lg border-2 p-3.5 cursor-pointer transition-colors',
                            !bulkAsSubtask
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                        )}>
                            <input
                                type="radio"
                                name="bulk_promote_type"
                                className="mt-0.5 accent-primary"
                                checked={!bulkAsSubtask}
                                onChange={() => { setBulkAsSubtask(false); setBulkParentId(''); }}
                            />
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Sebagai Task baru</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Semua task masuk ke kolom "To Do" sebagai task mandiri
                                </p>
                            </div>
                        </label>

                        <label className={cn(
                            'flex items-start gap-3 rounded-lg border-2 p-3.5 cursor-pointer transition-colors',
                            bulkAsSubtask
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                        )}>
                            <input
                                type="radio"
                                name="bulk_promote_type"
                                className="mt-0.5 accent-primary"
                                checked={bulkAsSubtask}
                                onChange={() => setBulkAsSubtask(true)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Sebagai Subtask</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Jadikan semua task sebagai subtask dari satu task di board
                                </p>
                                {bulkAsSubtask && (
                                    <Select value={bulkParentId} onValueChange={setBulkParentId}>
                                        <SelectTrigger className="mt-2.5 h-9 text-sm">
                                            <SelectValue placeholder="Pilih parent task..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boardTasks.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.feature_title ? `[${t.feature_title}] ` : ''}{t.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </label>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowBulkPromoteDialog(false)} disabled={isPromotingBulk}>
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            disabled={isPromotingBulk || (bulkAsSubtask && !bulkParentId)}
                            onClick={confirmBulkPromote}
                            className="gap-1.5"
                        >
                            {isPromotingBulk
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <ArrowRight className="size-3.5" />}
                            Pindah ke Board
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Promote dialog ── */}
            <Dialog open={!!promoteItem} onOpenChange={(open) => { if (!open) setPromoteItem(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRight className="size-4 text-primary" />
                            Pindah ke Board
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Pilih cara memindahkan task ke board.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Task info card */}
                    {promoteItem && (
                        <div className={cn(
                            'rounded-lg border-l-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 space-y-1.5',
                            PRIORITY_BORDER[promoteItem.priority] ?? 'border-l-slate-300',
                        )}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                                        {promoteItem.title}
                                    </p>
                                    {promoteItem.feature_title && promoteItem.feature_title !== promoteItem.title && (
                                        <p className="text-xs text-slate-500 mt-0.5">{promoteItem.feature_title}</p>
                                    )}
                                </div>
                                <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 shrink-0 mt-0.5', PRIORITY_BADGE[promoteItem.priority])}>
                                    {promoteItem.priority}
                                </Badge>
                            </div>
                            {promoteItem.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                    {promoteItem.description}
                                </p>
                            )}
                            {Number(promoteItem.estimated_hours) > 0 && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Clock className="size-3" />
                                    Estimasi {formatMh(promoteItem.estimated_hours)} MH
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2 py-1">
                        <label className={cn(
                            'flex items-start gap-3 rounded-lg border-2 p-3.5 cursor-pointer transition-colors',
                            !promoteAsSubtask
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                        )}>
                            <input
                                type="radio"
                                name="promote_type"
                                className="mt-0.5 accent-primary"
                                checked={!promoteAsSubtask}
                                onChange={() => { setPromoteAsSubtask(false); setPromoteParentId(''); }}
                            />
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Sebagai Task baru</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Masuk ke kolom "To Do" sebagai task mandiri
                                </p>
                            </div>
                        </label>

                        <label className={cn(
                            'flex items-start gap-3 rounded-lg border-2 p-3.5 cursor-pointer transition-colors',
                            promoteAsSubtask
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                        )}>
                            <input
                                type="radio"
                                name="promote_type"
                                className="mt-0.5 accent-primary"
                                checked={promoteAsSubtask}
                                onChange={() => setPromoteAsSubtask(true)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Sebagai Subtask</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Jadikan subtask dari task yang sudah ada di board
                                </p>
                                {promoteAsSubtask && (
                                    <Select value={promoteParentId} onValueChange={setPromoteParentId}>
                                        <SelectTrigger className="mt-2.5 h-9 text-sm">
                                            <SelectValue placeholder="Pilih parent task..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boardTasks.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.feature_title ? `[${t.feature_title}] ` : ''}{t.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </label>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPromoteItem(null)}>
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            disabled={isPromoting || (promoteAsSubtask && !promoteParentId)}
                            onClick={handlePromote}
                            className="gap-1.5"
                        >
                            {isPromoting
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <ArrowRight className="size-3.5" />}
                            Pindah ke Board
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
