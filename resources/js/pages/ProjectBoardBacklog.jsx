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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50 dark:bg-background-dark">

            {/* ── Top bar ── */}
            <div className="shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
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
                    </div>
                </div>
            </div>

            {/* ── Body: two-column ── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="w-full px-4 sm:px-6 py-6">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">

                        {/* ── Left: add form (sticky on desktop) ── */}
                        {canUpdate && (
                            <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-6">
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            <Plus className="size-4 text-primary" />
                                            Tambah ke Backlog
                                        </h2>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        {/* Title */}
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                Judul <span className="text-rose-400">*</span>
                                            </label>
                                            <Input
                                                placeholder="Nama task..."
                                                value={addTitle}
                                                onChange={(e) => setAddTitle(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdd()}
                                                className="h-9 text-sm"
                                            />
                                        </div>

                                        {/* Feature / Modul */}
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

                                        {/* Description */}
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

                                        {/* Priority + MH */}
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

                                        <Button
                                            className="w-full gap-2 mt-1"
                                            disabled={!addTitle.trim() || isAdding}
                                            onClick={handleAdd}
                                        >
                                            {isAdding
                                                ? <Loader2 className="size-4 animate-spin" />
                                                : <Plus className="size-4" />}
                                            Tambah ke Backlog
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Right: backlog list ── */}
                        <div className="flex-1 min-w-0 space-y-3">
                            {/* List header */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Inbox className="size-4 text-slate-400" />
                                    Daftar Backlog
                                    {backlogItems.length > 0 && (
                                        <span className="inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">
                                            {backlogItems.length}
                                        </span>
                                    )}
                                </h2>
                                {backlogLoading && (
                                    <Loader2 className="size-4 animate-spin text-slate-400" />
                                )}
                            </div>

                            {/* Empty state */}
                            {!backlogLoading && backlogItems.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50">
                                    <Inbox className="size-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Backlog masih kosong</p>
                                    <p className="text-xs mt-1 text-slate-400">
                                        {canUpdate
                                            ? 'Gunakan form di samping untuk menambahkan item'
                                            : 'Belum ada item backlog untuk project ini'}
                                    </p>
                                </div>
                            )}

                            {/* Items */}
                            {backlogItems.map((item) => {
                                const isEditing = editingId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 shadow-sm transition-shadow',
                                            isEditing ? 'shadow-md ring-2 ring-primary/20' : 'hover:shadow-md',
                                            PRIORITY_BORDER[isEditing ? editPriority : item.priority] ?? 'border-l-slate-300',
                                        )}
                                    >
                                        {isEditing ? (
                                            /* ── Edit mode ── */
                                            <div className="px-4 pt-3.5 pb-3 space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Judul *</label>
                                                    <Input
                                                        autoFocus
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Feature / Modul</label>
                                                    <Input
                                                        value={editFeatureTitle}
                                                        onChange={(e) => setEditFeatureTitle(e.target.value)}
                                                        className="h-8 text-sm"
                                                        placeholder="Opsional..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Deskripsi</label>
                                                    <Textarea
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        rows={3}
                                                        className="text-sm resize-none"
                                                        placeholder="Opsional..."
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prioritas</label>
                                                        <Select value={editPriority} onValueChange={setEditPriority}>
                                                            <SelectTrigger className="h-8 text-sm">
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
                                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estimasi MH</label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.5"
                                                                placeholder="0"
                                                                value={editMh}
                                                                onChange={(e) => setEditMh(e.target.value)}
                                                                className="h-8 text-sm pr-9"
                                                            />
                                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 pointer-events-none">MH</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={cancelEdit} disabled={isSavingEdit}>
                                                        <X className="size-3" /> Batal
                                                    </Button>
                                                    <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleSaveEdit(item)} disabled={!editTitle.trim() || isSavingEdit}>
                                                        {isSavingEdit ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                                        Simpan
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* ── View mode ── */
                                            <div className="px-4 pt-3.5 pb-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                                                            {item.title}
                                                        </p>
                                                        {item.feature_title && item.feature_title !== item.title && (
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{item.feature_title}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                                        <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', PRIORITY_BADGE[item.priority])}>
                                                            {item.priority}
                                                        </Badge>
                                                        {Number(item.estimated_hours) > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 h-5">
                                                                <Clock className="size-2.5" />
                                                                {formatMh(item.estimated_hours)} MH
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {item.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                                        {item.description}
                                                    </p>
                                                )}

                                                {canUpdate && (
                                                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs gap-1.5 shadow-sm shadow-primary/20"
                                                            onClick={() => {
                                                                setPromoteItem(item);
                                                                setPromoteAsSubtask(false);
                                                                setPromoteParentId('');
                                                            }}
                                                        >
                                                            <ArrowRight className="size-3" />
                                                            Pindah ke Board
                                                        </Button>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEdit(item)}
                                                                className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(item.id)}
                                                                className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Promote dialog ── */}
            <Dialog open={!!promoteItem} onOpenChange={(open) => { if (!open) setPromoteItem(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRight className="size-4 text-primary" />
                            Pindah ke Board
                        </DialogTitle>
                        <DialogDescription>
                            Pilih cara memindahkan{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                "{promoteItem?.title}"
                            </span>{' '}
                            ke board.
                        </DialogDescription>
                    </DialogHeader>

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
