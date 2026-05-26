import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAPI } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    PROJECT_NOTE_CATEGORY_LIST,
    PROJECT_NOTE_CATEGORIES,
    getProjectNoteCategoryLabel,
} from '../../utils/projectNoteCategories';
import {
    BookOpen,
    ExternalLink,
    Link2,
    Loader2,
    Pencil,
    Trash2,
    CalendarDays,
} from 'lucide-react';

function formatNoteTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const emptyForm = (category) => ({
    category,
    title: '',
    body: '',
    url: '',
});

const categoryIcon = {
    weekly: CalendarDays,
    development: Link2,
    document: BookOpen,
};

export default function ProjectNotesPanel({
    projectId,
    projectName,
    currentUserId,
    canDeleteAny = false,
}) {
    const [activeCategory, setActiveCategory] = useState('weekly');
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState(emptyForm('weekly'));
    const [editingId, setEditingId] = useState(null);

    const meta = PROJECT_NOTE_CATEGORIES[activeCategory];
    const isLink = meta?.isLink;

    const loadNotes = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchAPI(`/projects/${projectId}/notes`);
            setNotes(res.data || []);
        } catch (e) {
            setError(e.message || 'Gagal memuat project notes.');
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    useEffect(() => {
        setForm(emptyForm(activeCategory));
        setEditingId(null);
        setError('');
    }, [activeCategory]);

    const notesInCategory = useMemo(
        () => notes.filter((n) => n.category === activeCategory),
        [notes, activeCategory],
    );

    const countsByCategory = useMemo(() => {
        const counts = { weekly: 0, development: 0, document: 0 };
        for (const n of notes) {
            if (counts[n.category] !== undefined) counts[n.category] += 1;
        }
        return counts;
    }, [notes]);

    const resetForm = () => {
        setForm(emptyForm(activeCategory));
        setEditingId(null);
    };

    const openEdit = (note) => {
        setActiveCategory(note.category);
        setEditingId(note.id);
        setForm({
            category: note.category,
            title: note.title || '',
            body: note.body || '',
            url: note.url || '',
        });
    };

    const buildPayload = () => ({
        category: activeCategory,
        title: form.title.trim() || null,
        body: form.body.trim() || null,
        url: form.url.trim() || null,
    });

    const handleSave = async () => {
        if (!projectId) return;
        setSaving(true);
        setError('');
        try {
            const payload = buildPayload();
            if (editingId) {
                const res = await fetchAPI(`/projects/${projectId}/notes/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                setNotes((prev) =>
                    prev.map((n) => (n.id === editingId ? res.data : n)),
                );
            } else {
                const res = await fetchAPI(`/projects/${projectId}/notes`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                setNotes((prev) => [res.data, ...prev]);
            }
            resetForm();
        } catch (e) {
            setError(e.message || 'Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (noteId) => {
        if (!window.confirm('Hapus catatan ini?')) return;
        setDeletingId(noteId);
        setError('');
        try {
            await fetchAPI(`/projects/${projectId}/notes/${noteId}`, { method: 'DELETE' });
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
            if (editingId === noteId) resetForm();
        } catch (e) {
            setError(e.message || 'Gagal menghapus.');
        } finally {
            setDeletingId(null);
        }
    };

    if (!projectId) return null;

    return (
        <div className="flex flex-col min-h-0 flex-1 gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Catatan project untuk <strong className="text-slate-700 dark:text-slate-200">{projectName}</strong>
                — note, link development, dan dokumen.
            </p>

            <div className="flex flex-wrap gap-2">
                {PROJECT_NOTE_CATEGORY_LIST.map((cat) => {
                    const Icon = categoryIcon[cat.key] || BookOpen;
                    const active = activeCategory === cat.key;
                    return (
                        <button
                            key={cat.key}
                            type="button"
                            onClick={() => setActiveCategory(cat.key)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                                active
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            {getProjectNoteCategoryLabel(cat.key)}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {countsByCategory[cat.key] || 0}
                            </Badge>
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-slate-500">{meta?.description}</p>

            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 max-h-[280px] overflow-y-auto min-h-[120px]">
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-slate-500">
                        <Loader2 className="size-5 animate-spin mr-2" />
                        Memuat…
                    </div>
                ) : notesInCategory.length === 0 ? (
                    <p className="text-xs text-slate-500 italic px-4 py-8 text-center">
                        Belum ada {getProjectNoteCategoryLabel(activeCategory).toLowerCase()}.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                        {notesInCategory.map((note) => {
                            const isOwn = Number(note.user_id) === Number(currentUserId);
                            const canManage = isOwn || canDeleteAny;

                            return (
                                <li key={note.id} className="px-4 py-3">
                                    <div className="flex items-start gap-3">
                                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {(note.user_name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                {note.title && (
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                        {note.title}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-400">
                                                    {note.user_name} · {formatNoteTime(note.created_at)}
                                                </span>
                                            </div>
                                            {note.body && (
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                                                    {note.body}
                                                </p>
                                            )}
                                            {note.url && (
                                                <a
                                                    href={note.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1 break-all"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="size-3.5 shrink-0" />
                                                    {note.url}
                                                </a>
                                            )}
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10"
                                                    onClick={() => openEdit(note)}
                                                    aria-label="Edit"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    onClick={() => handleDelete(note.id)}
                                                    disabled={deletingId === note.id}
                                                    aria-label="Hapus"
                                                >
                                                    {deletingId === note.id ? (
                                                        <Loader2 className="size-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="size-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {editingId ? 'Edit' : 'Tambah'} — {getProjectNoteCategoryLabel(activeCategory)}
                </p>
                {isLink ? (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Judul link *</label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Contoh: Repo GitHub, Figma Design"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">URL *</label>
                            <Input
                                type="url"
                                value={form.url}
                                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                                placeholder="https://..."
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Keterangan (opsional)</label>
                            <Textarea
                                value={form.body}
                                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                                placeholder="Catatan singkat tentang link ini"
                                className="min-h-[60px] text-sm resize-y"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Judul (opsional)</label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Contoh: Kickoff meeting, Sprint review"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Catatan *</label>
                            <Textarea
                                value={form.body}
                                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                                placeholder="Ringkasan progress, blocker, rencana minggu depan..."
                                className="min-h-[100px] text-sm resize-y"
                            />
                        </div>
                    </>
                )}
                <div className="flex gap-2 justify-end">
                    {editingId && (
                        <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                            Batal
                        </Button>
                    )}
                    <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
                        {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                        {editingId ? 'Simpan perubahan' : 'Tambah'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
