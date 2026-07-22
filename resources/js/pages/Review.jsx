import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PaginationControls from '../components/ui/PaginationControls';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
    Star, LayoutGrid, List, Loader2, X, Lock,
    KanbanSquare, ChevronRight, Settings2, Clock,
    Send, ArrowLeft, Info, MessageSquare, Plus, AlertCircle, AlertTriangle,
    Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const fmtDateWIB = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        timeZone: 'Asia/Jakarta',
    });
};

/* ── Score helpers ── */
const LEVELS = [
    { min: 80,  label: 'Baik',            color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
    { min: 60,  label: 'Cukup',           color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500',   ring: 'ring-amber-200'   },
    { min: 0,   label: 'Perlu Perbaikan', color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',       dot: 'bg-rose-500',    ring: 'ring-rose-200'    },
];

function getLevel(score) {
    if (score == null) return null;
    return LEVELS.find(l => score >= l.min) ?? LEVELS[2];
}

function ScorePill({ score, label }) {
    const level = getLevel(score);
    if (!level) {
        return (
            <div className="flex flex-col items-center gap-0.5">
                <div className="size-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="text-[9px] text-slate-400 text-center leading-tight">{label}</span>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div className={cn('size-2 rounded-full', level.dot)} />
            <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300">{Math.round(score)}%</span>
            <span className="text-[9px] text-slate-400 text-center leading-tight">{label}</span>
        </div>
    );
}

function LevelBadge({ score }) {
    const level = getLevel(score);
    if (!level) return null;
    return (
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', level.bg, level.color)}>
            <span className={cn('size-1.5 rounded-full', level.dot)} />
            {level.label}
        </span>
    );
}

/* ── Methodology badge ── */
const METHODOLOGY_STYLE = {
    'Agile Scrum': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    'Waterfall':   'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
};

const STATUS_STYLE = {
    'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Planning':    'bg-blue-50 text-blue-600 border-blue-200',
    'Done':        'bg-slate-100 text-slate-500 border-slate-200',
};

/* ── Review result section (shown on card/row) ── */
function ReviewResultBar({ summary, overall, onClick }) {
    const hasSummary = summary?.length > 0;
    const hasAnySubmitted = summary?.some(s => s.submitted);

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 hover:opacity-80 transition-opacity text-left"
        >
            {hasSummary ? (
                <div className="flex items-center gap-3 flex-1">
                    {summary.map((s) => (
                        <ScorePill
                            key={s.evaluation_id}
                            score={s.submitted ? s.total_score : null}
                            label={`Eval ${s.evaluation_order}`}
                        />
                    ))}
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex flex-col items-center gap-0.5">
                        {overall != null
                            ? <LevelBadge score={overall} />
                            : <span className="text-[9px] text-slate-400 italic">Belum ada</span>}
                        <span className="text-[9px] text-slate-400">Overall</span>
                    </div>
                </div>
            ) : (
                <span className="text-[11px] text-slate-400 italic flex-1">Lihat & isi review</span>
            )}
            <ChevronRight className="size-3 text-slate-400 shrink-0" />
        </button>
    );
}

/* ── Score input (1-10) ── */
function ScoreInput({ value, onChange }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(s => (
                <button
                    key={s}
                    type="button"
                    onClick={() => onChange(s)}
                    className={cn(
                        'flex size-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                        s === value
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-primary/50 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                    )}
                >
                    {s}
                </button>
            ))}
            {value > 0 && (
                <span className="ml-1 text-xs text-slate-500">{value}/10</span>
            )}
        </div>
    );
}

/* ── Submit Review form ── */
function ReviewSubmitForm({ project, evaluation, onSubmitted, onCancel }) {
    const [answers, setAnswers] = useState(() =>
        (evaluation.questions ?? []).map(q => ({ question_id: q.id, score: 0, comment: '' }))
    );
    const [notes,       setNotes]       = useState('');
    const [saving,      setSaving]      = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const allAnswered = answers.every(a => a.score > 0);

    const setScore   = (idx, score)   => setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, score } : a));
    const setComment = (idx, comment) => setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, comment } : a));

    const handleSubmit = async () => {
        if (!allAnswered) return;
        setSaving(true);
        setSubmitError(null);
        try {
            const res = await fetchAPI(`/projects/${project.id}/evaluations/${evaluation.id}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ answers, notes }),
            });
            onSubmitted(res.data);
        } catch (e) { setSubmitError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{evaluation.name}</p>
                <p className="text-[11px] text-slate-400">{evaluation.trigger_label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{evaluation.focus}</p>
            </div>

            {submitError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20 px-3.5 py-3">
                    <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Gagal Submit</p>
                        <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">{submitError}</p>
                    </div>
                    <button onClick={() => setSubmitError(null)} className="text-rose-400 hover:text-rose-600 shrink-0">
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {(evaluation.questions ?? []).map((q, idx) => (
                    <div key={q.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800 dark:text-white">{q.question}</p>
                                {q.description && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 flex gap-1">
                                        <Info className="size-3 shrink-0 mt-0.5" />{q.description}
                                    </p>
                                )}
                                <p className="text-[10px] text-primary mt-0.5">Bobot: {q.weight}%</p>
                            </div>
                        </div>
                        <div className="pl-7 space-y-1.5">
                            <ScoreInput value={answers[idx].score} onChange={s => setScore(idx, s)} />
                            <textarea
                                rows={1}
                                placeholder="Komentar (opsional)…"
                                value={answers[idx].comment}
                                onChange={e => setComment(idx, e.target.value)}
                                className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary text-slate-700 dark:text-slate-300"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Catatan Umum (opsional)</label>
                <textarea
                    rows={2}
                    placeholder="Catatan keseluruhan untuk evaluasi ini…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={!allAnswered || saving}>
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Submit Evaluasi
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Batal</Button>
                {!allAnswered && <span className="text-xs text-slate-400 ml-1">Semua pertanyaan wajib diisi.</span>}
            </div>
        </div>
    );
}

/* ── Review detail (answers summary of one review) ── */
function ReviewDetail({ review }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] text-slate-400">{review.trigger_label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Oleh {review.submitted_by} · {new Date(review.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <LevelBadge score={review.total_score} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{review.total_score?.toFixed(1)}%</span>
                </div>
            </div>

            <div className="space-y-3">
                {review.answers?.map((a, idx) => {
                    const level = getLevel((a.score / 10) * 100);
                    return (
                        <div key={a.question_id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 dark:text-white">{a.question}</p>
                                    <p className="text-[10px] text-primary">Bobot {a.weight}%</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn('text-sm font-bold', level?.color)}>{a.score}/10</span>
                                </div>
                            </div>
                            {a.comment && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 pl-7 flex gap-1.5">
                                    <MessageSquare className="size-3 shrink-0 mt-0.5" />{a.comment}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {review.notes && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Catatan Umum</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{review.notes}</p>
                </div>
            )}
        </div>
    );
}

/* ── Share link panel (per evaluation, inside dialog) ── */
function ShareLinkPanel({ project, evaluation }) {
    const [tokens,   setTokens]   = useState(null); // null = not loaded yet
    const [loading,  setLoading]  = useState(false);
    const [creating, setCreating] = useState(false);
    const [copied,   setCopied]   = useState(null);
    const [open,     setOpen]     = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchAPI(`/projects/${project.id}/evaluations/${evaluation.id}/tokens`);
            setTokens(res.data ?? []);
        } catch { setTokens([]); }
        finally { setLoading(false); }
    };

    const handleOpen = () => {
        setOpen(v => {
            if (!v && tokens === null) load();
            return !v;
        });
    };

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await fetchAPI(`/projects/${project.id}/evaluations/${evaluation.id}/tokens`, { method: 'POST' });
            setTokens(prev => [res.data, ...(prev ?? [])]);
        } catch (e) { alert('Gagal membuat link: ' + e.message); }
        finally { setCreating(false); }
    };

    const handleDeactivate = async (id) => {
        try {
            await fetchAPI(`/review/tokens/${id}`, { method: 'DELETE' });
            setTokens(prev => prev.map(t => t.id === id ? { ...t, is_active: false, is_usable: false } : t));
        } catch (e) { alert('Gagal: ' + e.message); }
    };

    const copyUrl = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="border-t border-slate-100 dark:border-slate-800">
            <button
                onClick={handleOpen}
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <LinkIcon className="size-3.5 text-slate-400" /> Bagikan Link Publik
                </span>
                <ChevronRight className={cn('size-3.5 text-slate-400 transition-transform', open && 'rotate-90')} />
            </button>

            {open && (
                <div className="px-4 pb-3 space-y-2.5 bg-slate-50/60 dark:bg-slate-800/20">
                    {loading ? (
                        <div className="flex items-center gap-2 py-2 text-slate-400 text-xs">
                            <Loader2 className="size-3.5 animate-spin" /> Memuat…
                        </div>
                    ) : (
                        <>
                            {/* Existing tokens */}
                            {(tokens ?? []).map(t => (
                                <div key={t.id} className={cn(
                                    'rounded-lg border px-3 py-2 space-y-1',
                                    t.is_usable
                                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10'
                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 opacity-60',
                                )}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn(
                                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                            t.is_usable
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500',
                                        )}>
                                            {t.is_usable ? 'Aktif' : t.is_active ? 'Kadaluarsa' : 'Nonaktif'}
                                        </span>
                                        {t.expires_at && (
                                            <span className="text-[10px] text-slate-400">
                                                Hingga {new Date(t.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <code className="flex-1 text-[11px] text-slate-600 dark:text-slate-300 truncate bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 font-mono">
                                            {t.url}
                                        </code>
                                        <button
                                            onClick={() => copyUrl(t.url, t.id)}
                                            className="shrink-0 text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            {copied === t.id ? 'Disalin!' : 'Salin'}
                                        </button>
                                        {t.is_usable && (
                                            <button
                                                onClick={() => handleDeactivate(t.id)}
                                                className="shrink-0 text-xs text-rose-500 hover:text-rose-700 px-1 py-1"
                                                title="Nonaktifkan link"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Create button */}
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 w-full"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating
                                    ? <Loader2 className="size-3 animate-spin" />
                                    : <Plus className="size-3" />
                                }
                                Buat Link Baru
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Summary Dialog ── */
function ReviewSummaryDialog({ open, onClose, project, canSubmit, canConfig }) {
    const [summary,   setSummary]   = useState(null);
    const [allReviews, setAllReviews] = useState({});
    const [loading,   setLoading]   = useState(true);
    const [activeEval, setActiveEval] = useState(null); // evaluation object for submit form
    const [detailReview, setDetailReview] = useState(null); // review object to view answers
    const [evals,     setEvals]     = useState([]);

    const [triggerStatuses, setTriggerStatuses] = useState({});

    const load = useCallback(async () => {
        if (!open || !project) return;
        setLoading(true);
        try {
            const [summaryRes, reviewsRes, evalsRes, triggerRes] = await Promise.all([
                fetchAPI(`/projects/${project.id}/reviews/summary`),
                fetchAPI(`/projects/${project.id}/reviews`),
                fetchAPI(`/review/evaluations?methodology=${encodeURIComponent(project.methodology ?? '')}`),
                fetchAPI(`/projects/${project.id}/reviews/trigger-status`),
            ]);
            setSummary(summaryRes);
            setAllReviews(reviewsRes.data ?? {});
            setEvals(evalsRes.data ?? []);
            const tsMap = {};
            (triggerRes.data ?? []).forEach(t => { tsMap[t.evaluation_id] = t; });
            setTriggerStatuses(tsMap);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [open, project]);

    useEffect(() => { load(); }, [load]);

    const handleSubmitted = (newReview) => {
        setActiveEval(null);
        load();
    };

    if (!project) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Star className="size-4 text-primary" />
                        {project.name}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                        <Loader2 className="size-5 animate-spin" /> Memuat data review…
                    </div>
                ) : detailReview ? (
                    <div className="space-y-3">
                        <button onClick={() => setDetailReview(null)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <ArrowLeft className="size-3" /> Kembali ke ringkasan
                        </button>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{detailReview.evaluation_name}</p>
                        <ReviewDetail review={detailReview} />
                    </div>
                ) : activeEval ? (
                    <div className="space-y-3">
                        <button onClick={() => setActiveEval(null)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <ArrowLeft className="size-3" /> Batal
                        </button>
                        <ReviewSubmitForm
                            project={project}
                            evaluation={activeEval}
                            onSubmitted={handleSubmitted}
                            onCancel={() => setActiveEval(null)}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Overall score */}
                        {summary?.overall != null && (
                            <div className={cn(
                                'rounded-xl border p-4 flex items-center justify-between',
                                getLevel(summary.overall)?.bg,
                            )}>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Skor Overall</p>
                                    <p className={cn('text-3xl font-bold mt-0.5', getLevel(summary.overall)?.color)}>
                                        {summary.overall?.toFixed(1)}%
                                    </p>
                                </div>
                                <LevelBadge score={summary.overall} />
                            </div>
                        )}

                        {/* Per evaluation */}
                        <div className="space-y-3">
                            {(summary?.data ?? []).map((s) => {
                                const level      = getLevel(s.submitted ? s.total_score : null);
                                const evalDetail = evals.find(e => e.id === s.evaluation_id);
                                const history    = (allReviews[s.evaluation_id] ?? []);

                                return (
                                    <div key={s.evaluation_id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {/* Eval header */}
                                        <div className="px-4 py-3 bg-white dark:bg-slate-900">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{s.evaluation_name}</p>
                                                    <p className="text-[11px] text-slate-400">{s.trigger_label}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {s.submitted
                                                        ? <><LevelBadge score={s.total_score} /><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.total_score?.toFixed(1)}%</span></>
                                                        : <span className="text-[11px] text-slate-400 italic">Belum ada review</span>
                                                    }
                                                </div>
                                            </div>
                                            {/* Trigger status bar */}
                                            {(() => {
                                                const ts = triggerStatuses[s.evaluation_id];
                                                if (!ts || ts.current_value == null || ts.trigger_value == null) return null;
                                                const triggered = ts.is_triggered;
                                                const pct = Math.min(ts.current_value, 100);
                                                const isTaskType = ts.trigger_type === 'task_done_percentage' || ts.trigger_type === 'project_percentage';
                                                const isMh = ts.trigger_type === 'mh_percentage';
                                                const label = isMh
                                                    ? (ts.trigger_basis === 'topup_mh' ? 'MH top-up terpakai' : 'MH terpakai')
                                                    : 'task selesai';
                                                return (
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center justify-between text-[11px]">
                                                            <span className="text-slate-400">{ts.current_value}% {label}</span>
                                                            <span className={cn(
                                                                'font-semibold px-1.5 py-0.5 rounded-full text-[10px]',
                                                                triggered
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                                                            )}>
                                                                {triggered ? 'Siap review' : `Belum (target ${ts.trigger_value}%)`}
                                                            </span>
                                                        </div>
                                                        <div className="relative h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                                            <div
                                                                className={cn('h-full rounded-full transition-all', triggered ? 'bg-emerald-500' : 'bg-amber-400')}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                            {/* Threshold marker */}
                                                            <div
                                                                className="absolute top-0 h-full w-0.5 bg-slate-500/40 dark:bg-slate-300/30"
                                                                style={{ left: `${Math.min(ts.trigger_value, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* History list */}
                                        {history.length > 0 && (
                                            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                                {history.map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => setDetailReview(r)}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                                    >
                                                        <div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                                                Oleh <strong>{r.submitted_by}</strong>
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {new Date(r.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <LevelBadge score={r.total_score} />
                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{r.total_score?.toFixed(1)}%</span>
                                                            <ChevronRight className="size-3.5 text-slate-400" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Submit button (internal) */}
                                        {canSubmit && evalDetail && (
                                            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-white dark:bg-slate-900">
                                                <Button
                                                    size="sm" variant="outline"
                                                    className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                                                    onClick={() => setActiveEval(evalDetail)}
                                                >
                                                    <Plus className="size-3" />
                                                    {s.submitted ? 'Submit Review Baru' : 'Submit Review Pertama'}
                                                </Button>
                                            </div>
                                        )}

                                        {/* Share public link (canConfig only) */}
                                        {canConfig && evalDetail && (
                                            <ShareLinkPanel project={project} evaluation={evalDetail} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ── Review Dashboard ── */
function ReviewDashboard({ summaries, projects }) {
    if (projects.length === 0) return null;

    const withReview = projects.filter(p => summaries[p.id]?.overall != null);
    const avgScore = withReview.length > 0
        ? withReview.reduce((acc, p) => acc + summaries[p.id].overall, 0) / withReview.length
        : null;

    const byLevel = { 'Baik': 0, 'Cukup': 0, 'Perlu Perbaikan': 0 };
    withReview.forEach(p => {
        const level = getLevel(summaries[p.id].overall);
        if (level) byLevel[level.label] = (byLevel[level.label] ?? 0) + 1;
    });

    const lowScoreProjects  = projects.filter(p => summaries[p.id]?.overall != null && summaries[p.id].overall < 60);
    const unreviewedActive  = projects.filter(p => p.status === 'In Progress' && summaries[p.id]?.overall == null);
    const warnings = [
        ...lowScoreProjects.map(p => ({ project: p, type: 'low',        label: `${summaries[p.id].overall.toFixed(1)}% — skor rendah` })),
        ...unreviewedActive.map(p => ({ project: p, type: 'unreviewed', label: 'Aktif & belum direview' })),
    ];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#151b28] dark:shadow-xl p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sudah Review</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {withReview.length}
                        <span className="text-sm font-normal text-slate-400">/{projects.length}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">project</p>
                </div>

                <div className={cn(
                    'rounded-xl border p-4',
                    avgScore != null ? getLevel(avgScore)?.bg : 'border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#151b28] dark:shadow-xl',
                )}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rata-rata Skor</p>
                    {avgScore != null ? (
                        <div className="flex items-end gap-2 mt-1">
                            <p className={cn('text-2xl font-bold', getLevel(avgScore)?.color)}>
                                {avgScore.toFixed(1)}%
                            </p>
                            <div className="mb-0.5"><LevelBadge score={avgScore} /></div>
                        </div>
                    ) : (
                        <p className="text-2xl font-bold text-slate-300 dark:text-slate-600 mt-1">—</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">keseluruhan</p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-500">Baik</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{byLevel['Baik']}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">≥ 80%</p>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-400">Perlu Perbaikan</p>
                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{byLevel['Perlu Perbaikan']}</p>
                    <p className="text-xs text-rose-400 mt-0.5">&lt; 60%</p>
                </div>
            </div>

            {warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {warnings.length} project perlu perhatian
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {warnings.map(({ project, type, label }) => (
                            <div
                                key={`${type}-${project.id}`}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
                                    type === 'low'
                                        ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20'
                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
                                )}
                            >
                                <span className={cn(
                                    'size-1.5 rounded-full shrink-0',
                                    type === 'low' ? 'bg-rose-400' : 'bg-slate-400',
                                )} />
                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                                    {project.name}
                                </span>
                                <span className={cn(
                                    'text-[10px]',
                                    type === 'low' ? 'text-rose-500' : 'text-slate-400',
                                )}>
                                    · {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Project card (grid view) ── */
function ProjectGridCard({ project, onOpenSummary, summaryData }) {
    const s = summaryData;
    return (
        <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#151b28] shadow-sm hover:shadow-md dark:shadow-xl hover:border-primary/30 transition-all overflow-hidden">
            <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className={cn(
                        'size-10 rounded-xl flex items-center justify-center shrink-0',
                        project.status === 'In Progress' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                    )}>
                        <KanbanSquare className="size-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={cn('inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border', METHODOLOGY_STYLE[project.methodology] ?? 'bg-slate-100 text-slate-400 border-slate-200')}>
                            {project.methodology ?? '—'}
                        </span>
                        <span className={cn('inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border', STATUS_STYLE[project.status] ?? 'bg-slate-100 text-slate-400 border-slate-200')}>
                            {project.status}
                        </span>
                    </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {project.name}
                </p>

                {(project.start_date || project.end_date) && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {fmtDateWIB(project.start_date)} → {fmtDateWIB(project.end_date)}
                    </p>
                )}

                <ReviewResultBar
                    summary={s?.data}
                    overall={s?.overall}
                    onClick={() => onOpenSummary(project)}
                />
            </div>
        </div>
    );
}

/* ── Project list row ── */
function ProjectListRow({ project, onOpenSummary, summaryData }) {
    const s = summaryData;
    return (
        <div className="px-4 py-3.5 bg-white/70 backdrop-blur-xl dark:bg-[#151b28] rounded-xl border border-white/60 dark:border-white/10 shadow-sm dark:shadow-xl hover:border-primary/20 transition-colors space-y-2.5">
            <div className="flex items-center gap-4">
                <div className={cn(
                    'size-9 rounded-lg flex items-center justify-center shrink-0',
                    project.status === 'In Progress' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                )}>
                    <KanbanSquare className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{project.name}</span>
                        <span className={cn('inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border', METHODOLOGY_STYLE[project.methodology] ?? 'bg-slate-100 text-slate-400 border-slate-200')}>
                            {project.methodology ?? '—'}
                        </span>
                        <span className={cn('inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border', STATUS_STYLE[project.status] ?? 'bg-slate-100 text-slate-400 border-slate-200')}>
                            {project.status}
                        </span>
                    </div>
                    {(project.start_date || project.end_date) && (
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="size-2.5" />{fmtDateWIB(project.start_date)} → {fmtDateWIB(project.end_date)}
                        </p>
                    )}
                </div>
            </div>

            <ReviewResultBar
                summary={s?.data}
                overall={s?.overall}
                onClick={() => onOpenSummary(project)}
            />
        </div>
    );
}

/* ── Page ── */
export default function Review() {
    const { user }  = useAuth();
    const canRead   = hasPermission(user, 'review.read');
    const canConfig = hasPermission(user, 'review.update');
    const canSubmit = hasPermission(user, 'review.create');

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const view    = searchParams.get('view') === 'list' ? 'list' : 'card';
    const setView = (v) => setSearchParams(prev => { prev.set('view', v); return prev; });

    // Summary dialog state lives in the URL (?project=<id>) so it's linkable,
    // shareable, and closes on browser back — not just local component state.
    const summaryProjectId = searchParams.get('project');
    const openSummary  = (project) => setSearchParams(prev => { prev.set('project', String(project.id)); return prev; });
    const closeSummary = () => setSearchParams(prev => { prev.delete('project'); return prev; });

    const [projects,       setProjects]       = useState([]);
    const [summaries,      setSummaries]      = useState({});
    const [loading,        setLoading]        = useState(true);
    const [page,           setPage]           = useState(1);
    const [pageSize,       setPageSize]       = useState(12);
    const [error,          setError]          = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchAPI('/projects');
            const list = res.data ?? res ?? [];
            setProjects(list);

            // Load summaries for all projects in parallel
            const results = await Promise.allSettled(
                list.map(p => fetchAPI(`/projects/${p.id}/reviews/summary`))
            );
            const map = {};
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') map[list[i].id] = r.value;
            });
            setSummaries(map);
        } catch { setError('Gagal memuat daftar project.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (canRead) load(); else setLoading(false); }, [load, canRead]);

    const activeCount    = projects.filter(p => p.status === 'In Progress').length;
    const agileCount     = projects.filter(p => p.methodology === 'Agile Scrum').length;
    const waterfallCount = projects.filter(p => p.methodology === 'Waterfall').length;

    const sortedProjects = useMemo(
        () => [...projects].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        [projects]
    );
    const pagedProjects = useMemo(
        () => sortedProjects.slice((page - 1) * pageSize, page * pageSize),
        [sortedProjects, page, pageSize]
    );
    const summaryProject = useMemo(
        () => (summaryProjectId ? projects.find(p => String(p.id) === summaryProjectId) ?? null : null),
        [projects, summaryProjectId]
    );

    return (
        <div className="relative min-h-full overflow-hidden bg-slate-50 dark:bg-[#000040]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white to-slate-50 dark:from-[#000040] dark:via-[#0a0e2e] dark:to-background-dark" />
            <div className="pointer-events-none absolute -top-24 -left-24 size-[28rem] rounded-full bg-accent/10 blur-[120px] dark:bg-accent/15" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 size-[32rem] rounded-full bg-primary/10 blur-[130px] dark:bg-accent/10" />
            <div className="relative w-full px-4 py-5 sm:px-6 lg:px-8 pb-16 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Star className="size-6 text-primary shrink-0" />
                        Review
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Evaluasi berkala kinerja tim per project berdasarkan metodologi yang digunakan.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start shrink-0">
                    {canConfig && (
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/review/config')}>
                            <Settings2 className="size-3.5" /> Konfigurasi
                        </Button>
                    )}
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                    {['card', 'list'].map(v => (
                        <button key={v} onClick={() => setView(v)} className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                            view === v
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                        )}>
                            {v === 'card' ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />}
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            {projects.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span><strong className="text-slate-700 dark:text-slate-200">{projects.length}</strong> project</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-emerald-600">{activeCount}</strong> aktif</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-blue-600">{agileCount}</strong> Agile</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span><strong className="text-violet-600">{waterfallCount}</strong> Waterfall</span>
                </div>
            )}

            {/* Dashboard */}
            {canRead && !loading && !error && (
                <ReviewDashboard summaries={summaries} projects={projects} />
            )}

            {/* Content */}
            {!canRead ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <Lock className="size-4" /> Anda tidak memiliki akses ke menu Review.
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                    <Loader2 className="size-5 animate-spin" /> Memuat…
                </div>
            ) : error ? (
                <div className="flex items-center justify-center gap-2 py-16 text-rose-500 text-sm">
                    <X className="size-4 shrink-0" /> {error}
                    <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={load}>Coba lagi</Button>
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-300/70 dark:border-white/10 rounded-xl bg-white/50 backdrop-blur-sm dark:bg-white/5">
                    <Star className="size-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Belum ada project</p>
                </div>
            ) : view === 'card' ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pagedProjects.map(p => (
                            <ProjectGridCard
                                key={p.id} project={p}
                                onOpenSummary={openSummary}
                                summaryData={summaries[p.id]}
                            />
                        ))}
                    </div>
                    <PaginationControls
                        page={page} pageSize={pageSize} total={sortedProjects.length}
                        onPageChange={setPage}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                </div>
            ) : (
                <div className="space-y-2.5">
                    {pagedProjects.map(p => (
                        <ProjectListRow
                            key={p.id} project={p}
                            onOpenSummary={openSummary}
                            summaryData={summaries[p.id]}
                        />
                    ))}
                    <PaginationControls
                        page={page} pageSize={pageSize} total={sortedProjects.length}
                        onPageChange={setPage}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                </div>
            )}

            {/* Summary dialog */}
            <ReviewSummaryDialog
                open={summaryProject !== null}
                onClose={closeSummary}
                project={summaryProject}
                canSubmit={canSubmit}
                canConfig={canConfig}
            />
            </div>
        </div>
    );
}
