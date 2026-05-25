import { useCallback, useEffect, useState } from 'react';
import { fetchAPI } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Trash2 } from 'lucide-react';

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

export default function TaskNotesSection({
    taskId,
    taskLabel,
    currentUserId,
    canDeleteAny = false,
    compact = false,
}) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [body, setBody] = useState('');
    const [posting, setPosting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');

    const loadNotes = useCallback(async () => {
        if (!taskId) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchAPI(`/tasks/${taskId}/notes`);
            setNotes(res.data || []);
        } catch (e) {
            setError(e.message || 'Gagal memuat catatan.');
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const handlePost = async () => {
        const text = body.trim();
        if (!text || !taskId) return;
        setPosting(true);
        setError('');
        try {
            const res = await fetchAPI(`/tasks/${taskId}/notes`, {
                method: 'POST',
                body: JSON.stringify({ body: text }),
            });
            if (res.data) {
                setNotes((prev) => [...prev, res.data]);
            } else {
                await loadNotes();
            }
            setBody('');
        } catch (err) {
            setError(err.message || 'Gagal menyimpan catatan.');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (noteId) => {
        if (!window.confirm('Hapus catatan ini?')) return;
        setDeletingId(noteId);
        setError('');
        try {
            await fetchAPI(`/tasks/${taskId}/notes/${noteId}`, { method: 'DELETE' });
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch (err) {
            setError(err.message || 'Gagal menghapus catatan.');
        } finally {
            setDeletingId(null);
        }
    };

    if (!taskId) {
        return (
            <p className="text-xs text-slate-500 italic">Simpan task terlebih dahulu untuk menambah catatan.</p>
        );
    }

    return (
        <div
            className={compact ? 'space-y-3' : 'space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4'}
            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
        >
            {!compact && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" />
                    Notes & comments
                    {taskLabel && (
                        <span className="font-normal normal-case text-slate-400 truncate">· {taskLabel}</span>
                    )}
                </p>
            )}

            {error && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <div
                className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 ${
                    compact ? 'max-h-[280px]' : 'max-h-[320px]'
                } overflow-y-auto`}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                        <Loader2 className="size-5 animate-spin mr-2" />
                        Memuat…
                    </div>
                ) : notes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic px-3 py-6 text-center">
                        Belum ada catatan. Anggota project dapat menambahkan komentar di sini.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                        {notes.map((note) => {
                            const isOwn = Number(note.user_id) === Number(currentUserId);
                            const canDelete = isOwn || canDeleteAny;

                            return (
                                <li key={note.id} className="px-3 py-3">
                                    <div className="flex items-start gap-2.5">
                                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {(note.user_name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                    {note.user_name || 'User'}
                                                    {isOwn && (
                                                        <span className="text-slate-400 font-normal ml-1">(Anda)</span>
                                                    )}
                                                </p>
                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                    {formatNoteTime(note.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap break-words">
                                                {note.body}
                                            </p>
                                        </div>
                                        {canDelete && (
                                            <button
                                                type="button"
                                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 shrink-0"
                                                onClick={() => handleDelete(note.id)}
                                                disabled={deletingId === note.id}
                                                aria-label="Hapus catatan"
                                            >
                                                {deletingId === note.id ? (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="size-3.5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="space-y-2">
                <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handlePost();
                        }
                    }}
                    placeholder="Tulis catatan atau komentar… (Ctrl+Enter untuk kirim)"
                    className="min-h-[72px] resize-y text-sm"
                    maxLength={5000}
                />
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">{body.length}/5000</span>
                    <Button
                        type="button"
                        size="sm"
                        disabled={posting || !body.trim()}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePost();
                        }}
                    >
                        {posting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                        Kirim catatan
                    </Button>
                </div>
            </div>
        </div>
    );
}
