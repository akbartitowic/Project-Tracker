import { Badge } from '@/components/ui/badge';

const formatHours = (value) => {
    const num = Number(value || 0);
    return Number.isInteger(num) ? `${num}` : num.toFixed(1);
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export default function ManhourBucketBreakdown({ buckets, overflowHours, hasTopup, compact = false }) {
    if (!buckets?.length) {
        return <p className="text-xs text-slate-500 italic">Tidak ada kuota manhour.</p>;
    }

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-300">FIFO:</strong> konsumsi menguras{' '}
                <strong>Initial</strong> dulu, lalu <strong>Top Up #1</strong>, <strong>#2</strong>, … sesuai urutan tanggal.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wide">
                        <tr>
                            <th className="text-left px-3 py-2 font-medium">Urutan / Pool</th>
                            <th className="text-right px-3 py-2 font-medium">Kuota</th>
                            <th className="text-right px-3 py-2 font-medium">Terpakai</th>
                            <th className="text-right px-3 py-2 font-medium">Sisa</th>
                            <th className="text-right px-3 py-2 font-medium">Sisa %</th>
                            {!compact && <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Catatan</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {buckets.map((b) => (
                            <tr key={`${b.kind}-${b.order}-${b.topup_id ?? 'base'}`}>
                                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                    <span className="inline-flex items-center gap-2 flex-wrap">
                                        {b.kind === 'base' ? (
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-400">
                                                Initial
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-bold uppercase border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300"
                                            >
                                                Top Up
                                            </Badge>
                                        )}
                                        {b.label}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-right">{formatHours(b.quota_hours)}h</td>
                                <td className="px-3 py-2 text-right font-medium">{formatHours(b.consumed_hours)}h</td>
                                <td className="px-3 py-2 text-right">{formatHours(b.remaining_hours)}h</td>
                                <td className="px-3 py-2 text-right">
                                    <span
                                        className={
                                            b.remaining_pct <= 15
                                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                                : b.remaining_pct <= 30
                                                  ? 'font-semibold text-amber-600 dark:text-amber-400'
                                                  : 'text-slate-600 dark:text-slate-300'
                                        }
                                    >
                                        {formatPercent(b.remaining_pct)}
                                    </span>
                                </td>
                                {!compact && (
                                    <td className="px-3 py-2 text-slate-500 hidden sm:table-cell max-w-[200px] truncate">
                                        {b.description || '—'}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasTopup && Number(overflowHours) > 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Alokasi melebihi total kuota (Initial + semua Top Up): +{formatHours(overflowHours)}h.
                </p>
            )}
        </div>
    );
}
