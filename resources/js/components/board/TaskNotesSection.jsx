import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Finds an in-progress "@query" right before the cursor, e.g. typing "@And" mid-sentence.
// Returns null once a space/newline breaks the token, or if "@" isn't at a word boundary
// (so "email@x.com" doesn't trigger the mention dropdown).
function detectMentionTrigger(text, cursor) {
    const uptoCursor = text.slice(0, cursor);
    const at = uptoCursor.lastIndexOf('@');
    if (at === -1) return null;

    const between = uptoCursor.slice(at + 1);
    if (/\s/.test(between)) return null;

    const before = at === 0 ? '' : uptoCursor[at - 1];
    if (before && !/\s/.test(before)) return null;

    return { start: at, query: between };
}

// Wraps "@Name" occurrences (matched against this note's recorded mentions) in a highlighted span.
// Longest names are matched first so a shorter name can't shadow a longer one that starts the same way.
function renderMentionHighlights(body, mentions) {
    if (!mentions || mentions.length === 0) return body;

    const sorted = [...mentions].sort((a, b) => b.name.length - a.name.length);
    const pattern = new RegExp(`@(${sorted.map((m) => escapeRegExp(m.name)).join('|')})(?![A-Za-z0-9])`, 'g');

    const parts = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = pattern.exec(body)) !== null) {
        if (match.index > lastIndex) {
            parts.push(body.slice(lastIndex, match.index));
        }
        parts.push(
            <span key={`mention-${key++}`} className="text-primary font-semibold">
                @{match[1]}
            </span>
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < body.length) {
        parts.push(body.slice(lastIndex));
    }
    return parts;
}

export default function TaskNotesSection({
    taskId,
    taskLabel,
    currentUserId,
    canDeleteAny = false,
    compact = false,
    mentionableUsers = [],
}) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [body, setBody] = useState('');
    const [posting, setPosting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState('');
    const [mentionState, setMentionState] = useState(null); // { start, query } | null
    const [mentionIndex, setMentionIndex] = useState(0);
    const textareaRef = useRef(null);

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

    const filteredMentions = useMemo(() => {
        if (!mentionState) return [];
        const q = mentionState.query.toLowerCase();
        return mentionableUsers.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 6);
    }, [mentionState, mentionableUsers]);

    const activeMentionIndex = filteredMentions.length
        ? Math.min(mentionIndex, filteredMentions.length - 1)
        : 0;

    const handleBodyChange = (e) => {
        const newText = e.target.value;
        setBody(newText);
        setMentionState(detectMentionTrigger(newText, e.target.selectionStart));
        setMentionIndex(0);
    };

    const selectMention = (user) => {
        if (!mentionState || !user) return;
        const cursor = textareaRef.current ? textareaRef.current.selectionStart : body.length;
        const before = body.slice(0, mentionState.start);
        const after = body.slice(cursor);
        const insertion = `@${user.name} `;
        const newText = before + insertion + after;

        setBody(newText);
        setMentionState(null);
        setMentionIndex(0);

        requestAnimationFrame(() => {
            if (textareaRef.current) {
                const pos = before.length + insertion.length;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(pos, pos);
            }
        });
    };

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
            setMentionState(null);
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
                                                {renderMentionHighlights(note.body, note.mentions)}
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
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={body}
                        onChange={handleBodyChange}
                        onBlur={() => {
                            // Delay so a mousedown selection on the dropdown below still registers first.
                            window.setTimeout(() => setMentionState(null), 150);
                        }}
                        onKeyDown={(e) => {
                            if (mentionState && filteredMentions.length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setMentionIndex((i) => (i + 1) % filteredMentions.length);
                                    return;
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
                                    return;
                                }
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    selectMention(filteredMentions[activeMentionIndex]);
                                    return;
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setMentionState(null);
                                    return;
                                }
                            }
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handlePost();
                            }
                        }}
                        placeholder="Tulis catatan atau komentar… (ketik @ untuk mention, Ctrl+Enter untuk kirim)"
                        className="min-h-[72px] resize-y text-sm"
                        maxLength={5000}
                    />
                    {mentionState && filteredMentions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 z-20 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg text-sm">
                            {filteredMentions.map((u, idx) => (
                                <li key={u.id}>
                                    <button
                                        type="button"
                                        className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                                            idx === activeMentionIndex
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectMention(u);
                                        }}
                                    >
                                        <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {u.name.charAt(0).toUpperCase()}
                                        </span>
                                        {u.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
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
