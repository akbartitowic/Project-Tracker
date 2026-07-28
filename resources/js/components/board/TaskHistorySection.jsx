import { useCallback, useEffect, useState } from 'react';
import { fetchAPI } from '../../services/api';
import { History, Loader2 } from 'lucide-react';

function formatHistoryTime(iso) {
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

/** Renders one change as a readable Indonesian sentence fragment — the field name stays bold, values are code-styled. */
function ChangeDescription({ entry }) {
    const { field, old_value: oldValue, new_value: newValue } = entry;

    if (field === 'Deskripsi') {
        return <>mengubah <span className="font-semibold text-slate-700 dark:text-slate-200">{field}</span></>;
    }

    if (!oldValue && newValue) {
        return (
            <>
                mengatur <span className="font-semibold text-slate-700 dark:text-slate-200">{field}</span> menjadi{' '}
                <code className="rounded bg-primary/10 px-1 py-0.5 text-primary">{newValue}</code>
            </>
        );
    }

    if (oldValue && !newValue) {
        return (
            <>
                menghapus <span className="font-semibold text-slate-700 dark:text-slate-200">{field}</span>{' '}
                <span className="text-slate-400">(sebelumnya <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{oldValue}</code>)</span>
            </>
        );
    }

    return (
        <>
            mengubah <span className="font-semibold text-slate-700 dark:text-slate-200">{field}</span> dari{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 line-through dark:bg-slate-800">{oldValue}</code> menjadi{' '}
            <code className="rounded bg-primary/10 px-1 py-0.5 text-primary">{newValue}</code>
        </>
    );
}

export default function TaskHistorySection({ taskId }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const load = useCallback(async (nextPage) => {
        if (!taskId) return;
        nextPage === 1 ? setLoading(true) : setLoadingMore(true);
        setError('');
        try {
            const res = await fetchAPI(`/tasks/${taskId}/history?page=${nextPage}`);
            setEntries((prev) => (nextPage === 1 ? (res.data || []) : [...prev, ...(res.data || [])]));
            setHasMore(!!res.has_more);
            setPage(nextPage);
        } catch (e) {
            setError(e.message || 'Gagal memuat riwayat perubahan.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [taskId]);

    useEffect(() => {
        setEntries([]);
        setPage(1);
        setHasMore(false);
        load(1);
    }, [load]);

    if (!taskId) {
        return (
            <p className="text-xs text-slate-500 italic">Simpan task terlebih dahulu untuk melihat riwayat perubahan.</p>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <History className="size-3.5" />
                Riwayat Perubahan
            </p>

            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

            <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                        <Loader2 className="size-5 animate-spin mr-2" />
                        Memuat…
                    </div>
                ) : entries.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs italic text-slate-500">
                        Belum ada perubahan tercatat untuk task ini.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                        {entries.map((entry) => (
                            <li key={entry.id} className="px-3 py-3">
                                <div className="flex items-start gap-2.5">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {(entry.user_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {entry.user_name || 'User'}
                                            </p>
                                            <span className="shrink-0 text-[10px] text-slate-400">
                                                {formatHistoryTime(entry.created_at)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 break-words">
                                            <ChangeDescription entry={entry} />
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {hasMore && !loading && (
                <button
                    type="button"
                    onClick={() => load(page + 1)}
                    disabled={loadingMore}
                    className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800/50"
                >
                    {loadingMore ? (
                        <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Memuat…</span>
                    ) : (
                        'Muat lebih banyak'
                    )}
                </button>
            )}
        </div>
    );
}
