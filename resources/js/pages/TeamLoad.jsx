import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { ExternalLink, Loader2, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    LOAD_DAY_WIDTH,
    LOAD_ROW_HEIGHT,
    buildLoadMonthBands,
    formatLoadDateLong,
    formatLoadMh,
    formatWeekdayHeader,
    isWeekendDate,
    loadCellClasses,
    loadPeakDotClass,
} from '../utils/teamLoad';

const LABEL_COL_WIDTH = 120;

export default function TeamLoad() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [cellDetail, setCellDetail] = useState(null);
    const chartScrollRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetchAPI('/team-load');
                setPayload(res);
                const users = res.users || [];
                if (users.length && !selectedUserId) {
                    setSelectedUserId(users[0].id);
                }
            } catch (err) {
                console.error('Failed to load team load', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const users = payload?.users || [];
    const timelineDays = payload?.timeline_days || payload?.weekdays || [];
    const selectedUser = useMemo(
        () => users.find((u) => u.id === selectedUserId) || null,
        [users, selectedUserId],
    );

    const monthBands = useMemo(
        () => buildLoadMonthBands(timelineDays, LOAD_DAY_WIDTH),
        [timelineDays],
    );

    const chartWidth = timelineDays.length * LOAD_DAY_WIDTH;
    const todayKey = useMemo(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    const openCellDetail = (date, mh) => {
        if (!selectedUser || mh <= 0 || isWeekendDate(date)) return;
        const items = selectedUser.daily_details?.[date] || [];
        setCellDetail({ date, mh, items });
    };

    const scrollToToday = () => {
        const el = chartScrollRef.current;
        if (!el || !timelineDays.length) return;
        const idx = timelineDays.indexOf(todayKey);
        if (idx < 0) return;
        const target =
            LABEL_COL_WIDTH + idx * LOAD_DAY_WIDTH - el.clientWidth / 2 + LOAD_DAY_WIDTH / 2;
        el.scrollLeft = Math.max(0, target);
    };

    useLayoutEffect(() => {
        if (loading || !selectedUser || !timelineDays.length) return;
        scrollToToday();
        const frame = requestAnimationFrame(() => scrollToToday());
        return () => cancelAnimationFrame(frame);
    }, [loading, selectedUser?.id, timelineDays.length, todayKey]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[320px]">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-6 gap-4">
            <div className="shrink-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Load</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Beban MH harian dari task ter-assign (start & due date terisi). MH dibagi rata
                    per hari kerja (Sen–Jum). Sabtu–Minggu ditampilkan dengan MH 0.
                </p>
                {payload?.range_start && (
                    <p className="text-xs text-slate-400 mt-1">
                        Periode: {payload.range_start} — {payload.range_end}
                    </p>
                )}
            </div>

            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                <Card className="w-64 shrink-0 flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <Users className="size-3.5" />
                            Users ({users.length})
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {users.map((user) => {
                            const active = user.id === selectedUserId;
                            return (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={cn(
                                        'w-full text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 transition-colors',
                                        active
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'size-2 rounded-full shrink-0',
                                            loadPeakDotClass(user.peak_mh),
                                        )}
                                        title={`Peak ${formatLoadMh(user.peak_mh)} MH`}
                                    />
                                    <span className="text-sm font-medium truncate flex-1">
                                        {user.name}
                                    </span>
                                    {user.peak_mh > 0 && (
                                        <span className="text-[10px] text-slate-400 shrink-0">
                                            max {formatLoadMh(user.peak_mh)}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                <Card className="flex-1 min-w-0 flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden">
                    {!selectedUser ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                            Pilih user di sebelah kiri
                        </div>
                    ) : (
                        <>
                            <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-semibold text-slate-900 dark:text-white">
                                    {selectedUser.name}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Hijau ≤5 MH · Oranye 5–8 MH · Merah &gt;8 MH
                                </p>
                            </div>

                            <div ref={chartScrollRef} className="flex-1 overflow-auto min-h-0">
                                <div style={{ minWidth: chartWidth + LABEL_COL_WIDTH }}>
                                    <div className="sticky top-0 z-10 bg-white dark:bg-[#151b28] border-b border-slate-200 dark:border-slate-800">
                                        <div
                                            className="flex h-6 border-b border-slate-100 dark:border-slate-800"
                                            style={{ marginLeft: LABEL_COL_WIDTH }}
                                        >
                                            {monthBands.map((m) => (
                                                <div
                                                    key={m.key}
                                                    className="text-[10px] font-bold uppercase tracking-wide text-slate-500 px-1 flex items-center border-r border-slate-100 dark:border-slate-800"
                                                    style={{ width: m.days * LOAD_DAY_WIDTH }}
                                                >
                                                    {m.label}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex">
                                            <div
                                                className="shrink-0 border-r border-slate-200 dark:border-slate-800 px-2 flex items-center text-[10px] font-bold uppercase text-slate-500"
                                                style={{ width: LABEL_COL_WIDTH, height: LOAD_ROW_HEIGHT }}
                                            >
                                                MH / hari
                                            </div>
                                            <div className="flex h-[40px]">
                                                {timelineDays.map((date) => {
                                                    const isToday = date === todayKey;
                                                    const weekend = isWeekendDate(date);
                                                    return (
                                                        <div
                                                            key={date}
                                                            className={cn(
                                                                'text-[10px] flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800 text-slate-500',
                                                                weekend && 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-400',
                                                                isToday && 'bg-primary/10 text-primary font-semibold',
                                                            )}
                                                            style={{ width: LOAD_DAY_WIDTH }}
                                                        >
                                                            <span>{formatWeekdayHeader(date)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                                        <div
                                            className="shrink-0 border-r border-slate-200 dark:border-slate-800 px-2 flex items-center text-xs text-slate-600 dark:text-slate-300"
                                            style={{ width: LABEL_COL_WIDTH, height: LOAD_ROW_HEIGHT }}
                                        >
                                            Load
                                        </div>
                                        <div className="flex" style={{ height: LOAD_ROW_HEIGHT }}>
                                            {timelineDays.map((date) => {
                                                const mh = selectedUser.daily_mh?.[date] ?? 0;
                                                const isToday = date === todayKey;
                                                const weekend = isWeekendDate(date);
                                                const hasLoad = mh > 0;
                                                return (
                                                    <button
                                                        key={date}
                                                        type="button"
                                                        disabled={!hasLoad}
                                                        onClick={() => openCellDetail(date, mh)}
                                                        className={cn(
                                                            'flex items-center justify-center border-r border-slate-100 dark:border-slate-800 text-xs font-semibold transition-opacity',
                                                            weekend
                                                                ? 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-400 cursor-default'
                                                                : hasLoad
                                                                  ? cn(loadCellClasses(mh), 'cursor-pointer hover:opacity-80')
                                                                  : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 cursor-default',
                                                            isToday && 'ring-1 ring-inset ring-primary/40',
                                                        )}
                                                        style={{ width: LOAD_DAY_WIDTH }}
                                                        title={
                                                            weekend
                                                                ? `${date}: weekend (0 MH)`
                                                                : hasLoad
                                                                  ? `${date}: ${formatLoadMh(mh)} MH — klik untuk detail task`
                                                                  : `${date}: tidak ada beban`
                                                        }
                                                    >
                                                        {formatLoadMh(mh)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0 px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-3 rounded border bg-emerald-100 border-emerald-200" />
                                    0–5 MH
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-3 rounded border bg-amber-100 border-amber-200" />
                                    5–8 MH
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-3 rounded border bg-rose-100 border-rose-200" />
                                &gt;8 MH
                                </span>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            <Dialog open={!!cellDetail} onOpenChange={(open) => !open && setCellDetail(null)}>
                <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detail beban MH</DialogTitle>
                        <DialogDescription asChild>
                            <div className="text-left space-y-1">
                                {cellDetail && (
                                    <>
                                        <p>{formatLoadDateLong(cellDetail.date)}</p>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {selectedUser?.name} · Total{' '}
                                            <strong>{formatLoadMh(cellDetail.mh)} MH</strong>
                                        </p>
                                    </>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    {cellDetail && (
                        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2">
                            {cellDetail.items.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4 text-center">
                                    Tidak ada detail task untuk hari ini.
                                </p>
                            ) : (
                                cellDetail.items.map((item) => (
                                    <div
                                        key={`${item.task_id}-${item.project_id}`}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                    {item.title}
                                                </p>
                                                {item.feature_title && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {item.feature_title}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="shrink-0 text-xs">
                                                {formatLoadMh(item.mh_per_day)} MH
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <span>{item.project_name}</span>
                                            {item.is_subtask && (
                                                <Badge variant="outline" className="text-[10px] py-0">
                                                    Subtask
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-xs"
                                            onClick={() => {
                                                setCellDetail(null);
                                                navigate(`/board/${item.project_id}?task=${item.task_id}`);
                                            }}
                                        >
                                            <ExternalLink className="size-3.5 mr-1.5" />
                                            Buka di Project Board
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
