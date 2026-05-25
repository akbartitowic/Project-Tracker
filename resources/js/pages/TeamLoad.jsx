import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { CalendarOff, ExternalLink, LayoutGrid, Loader2, Plus, Search, Trash2, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    LOAD_ALL_ROW_HEIGHT,
    LOAD_DAY_WIDTH,
    LOAD_ROW_HEIGHT,
    LOAD_USER_COL_WIDTH,
    buildLoadMonthBands,
    formatLoadDateLong,
    formatLoadMh,
    formatWeekdayHeader,
    isExcludedLoadDate,
    isNonWorkingLoadDay,
    isWeekendDate,
    loadCellClasses,
    loadPeakDotClass,
    nonWorkingDayTitle,
} from '../utils/teamLoad';

export default function TeamLoad() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [savingExcluded, setSavingExcluded] = useState(false);
    const [payload, setPayload] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('all');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [cellDetail, setCellDetail] = useState(null);
    const [newExcludedDate, setNewExcludedDate] = useState('');
    const [newExcludedLabel, setNewExcludedLabel] = useState('');
    const chartScrollRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchAPI('/team-load');
            setPayload(res);
        } catch (err) {
            console.error('Failed to load team load', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const users = payload?.users || [];
    const timelineDays = payload?.timeline_days || payload?.weekdays || [];
    const excludedDates = payload?.excluded_dates || [];
    const excludedDateStrings = useMemo(
        () => excludedDates.map((e) => e.date),
        [excludedDates],
    );
    const excludedLabelByDate = useMemo(() => {
        const map = {};
        for (const e of excludedDates) {
            map[e.date] = e.label;
        }
        return map;
    }, [excludedDates]);

    const filteredUsers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = users;
        if (q) {
            list = list.filter((u) => u.name.toLowerCase().includes(q));
        }
        if (viewMode === 'single' && selectedUserId) {
            list = list.filter((u) => u.id === selectedUserId);
        }
        return list;
    }, [users, searchQuery, viewMode, selectedUserId]);

    const displayUsers = filteredUsers.length ? filteredUsers : [];

    const monthBands = useMemo(
        () => buildLoadMonthBands(timelineDays, LOAD_DAY_WIDTH),
        [timelineDays],
    );

    const chartWidth = timelineDays.length * LOAD_DAY_WIDTH;
    const rowHeight = viewMode === 'all' ? LOAD_ALL_ROW_HEIGHT : LOAD_ROW_HEIGHT;
    const userColWidth = LOAD_USER_COL_WIDTH;

    const todayKey = useMemo(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    const openCellDetail = (user, date, mh) => {
        if (mh <= 0 || isNonWorkingLoadDay(date, excludedDateStrings)) return;
        const items = user.daily_details?.[date] || [];
        setCellDetail({ user, date, mh, items });
    };

    const scrollToToday = () => {
        const el = chartScrollRef.current;
        if (!el || !timelineDays.length) return;
        const idx = timelineDays.indexOf(todayKey);
        if (idx < 0) return;
        const target =
            userColWidth + idx * LOAD_DAY_WIDTH - el.clientWidth / 2 + LOAD_DAY_WIDTH / 2;
        el.scrollLeft = Math.max(0, target);
    };

    useLayoutEffect(() => {
        if (loading || !displayUsers.length || !timelineDays.length) return;
        scrollToToday();
        const frame = requestAnimationFrame(() => scrollToToday());
        return () => cancelAnimationFrame(frame);
    }, [loading, displayUsers.length, timelineDays.length, todayKey, viewMode]);

    const handleAddExcludedDate = async () => {
        if (!newExcludedDate) return;
        setSavingExcluded(true);
        try {
            const res = await fetchAPI('/team-load/excluded-dates', {
                method: 'POST',
                body: JSON.stringify({
                    date: newExcludedDate,
                    label: newExcludedLabel.trim() || null,
                }),
            });
            setPayload(res.data || res);
            setNewExcludedDate('');
            setNewExcludedLabel('');
        } catch (err) {
            alert(err.message || 'Gagal menambah tanggal libur.');
        } finally {
            setSavingExcluded(false);
        }
    };

    const handleRemoveExcludedDate = async (id) => {
        setSavingExcluded(true);
        try {
            const res = await fetchAPI(`/team-load/excluded-dates/${id}`, { method: 'DELETE' });
            setPayload(res.data || res);
        } catch (err) {
            alert(err.message || 'Gagal menghapus tanggal libur.');
        } finally {
            setSavingExcluded(false);
        }
    };

    const getDayCellClass = (date) => {
        if (isExcludedLoadDate(date, excludedDateStrings)) {
            return 'bg-violet-100/90 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300';
        }
        if (isWeekendDate(date)) {
            return 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-400';
        }
        return '';
    };

    if (loading && !payload) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[320px]">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-6 gap-4">
            <div className="shrink-0 space-y-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Load</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Beban MH harian dari task ter-assign. MH dibagi ke hari kerja (Sen–Jum) minus
                        tanggal libur kustom. Weekend & libur = 0 MH.
                    </p>
                    {payload?.range_start && (
                        <p className="text-xs text-slate-400 mt-1">
                            Periode: {payload.range_start} — {payload.range_end}
                        </p>
                    )}
                </div>

                <Card className="border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        <CalendarOff className="size-3.5" />
                        Tanggal tidak dihitung MH
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Tanggal</label>
                            <Input
                                type="date"
                                value={newExcludedDate}
                                onChange={(e) => setNewExcludedDate(e.target.value)}
                                className="h-8 w-40 text-sm"
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="text-[10px] text-slate-500 block mb-1">Label (opsional)</label>
                            <Input
                                value={newExcludedLabel}
                                onChange={(e) => setNewExcludedLabel(e.target.value)}
                                placeholder="Libur nasional, cuti bersama..."
                                className="h-8 text-sm"
                            />
                        </div>
                        <Button
                            size="sm"
                            className="h-8"
                            disabled={!newExcludedDate || savingExcluded}
                            onClick={handleAddExcludedDate}
                        >
                            <Plus className="size-3.5 mr-1" />
                            Tambah
                        </Button>
                    </div>
                    {excludedDates.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {excludedDates.map((ex) => (
                                <Badge
                                    key={ex.id}
                                    variant="outline"
                                    className="gap-1 pr-1 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800"
                                >
                                    <span className="text-xs">
                                        {ex.date}
                                        {ex.label ? ` · ${ex.label}` : ''}
                                    </span>
                                    <button
                                        type="button"
                                        className="rounded p-0.5 hover:bg-violet-200/60 dark:hover:bg-violet-800"
                                        disabled={savingExcluded}
                                        onClick={() => handleRemoveExcludedDate(ex.id)}
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                <Card className="w-56 shrink-0 flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 size-3.5 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama..."
                                className="h-8 pl-8 text-sm"
                            />
                        </div>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'all' ? 'default' : 'outline'}
                                className="flex-1 h-7 text-xs"
                                onClick={() => {
                                    setViewMode('all');
                                    setSelectedUserId(null);
                                }}
                            >
                                <LayoutGrid className="size-3 mr-1" />
                                Semua
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'single' ? 'default' : 'outline'}
                                className="flex-1 h-7 text-xs"
                                onClick={() => {
                                    setViewMode('single');
                                    if (!selectedUserId && users[0]) {
                                        setSelectedUserId(users[0].id);
                                    }
                                }}
                            >
                                <User className="size-3 mr-1" />
                                Satu
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Mode semua: {displayUsers.length} baris · Klik nama untuk fokus satu user
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {users
                            .filter((u) => {
                                const q = searchQuery.trim().toLowerCase();
                                return !q || u.name.toLowerCase().includes(q);
                            })
                            .map((user) => {
                                const active = viewMode === 'single' && user.id === selectedUserId;
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedUserId(user.id);
                                            setViewMode('single');
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 transition-colors text-sm',
                                            active
                                                ? 'bg-primary/10 text-primary'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'size-2 rounded-full shrink-0',
                                                loadPeakDotClass(user.peak_mh),
                                            )}
                                        />
                                        <span className="truncate flex-1">{user.name}</span>
                                    </button>
                                );
                            })}
                    </div>
                </Card>

                <Card className="flex-1 min-w-0 flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="shrink-0 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">
                            {viewMode === 'all'
                                ? `Tampilan semua user (${displayUsers.length})`
                                : displayUsers[0]?.name || '—'}
                            {' · '}Hijau ≤5 · Oranye 5–8 · Merah &gt;8 MH
                        </p>
                        {loading && <Loader2 className="size-4 animate-spin text-primary" />}
                    </div>

                    {displayUsers.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                            Tidak ada user yang cocok dengan pencarian.
                        </div>
                    ) : (
                        <div ref={chartScrollRef} className="flex-1 overflow-auto min-h-0">
                            <div style={{ minWidth: chartWidth + userColWidth }}>
                                <div className="sticky top-0 z-20 bg-white dark:bg-[#151b28] border-b border-slate-200 dark:border-slate-800">
                                    <div
                                        className="flex h-6 border-b border-slate-100 dark:border-slate-800"
                                        style={{ marginLeft: userColWidth }}
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
                                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                                        <div
                                            className="shrink-0 sticky left-0 z-30 bg-white dark:bg-[#151b28] border-r border-slate-200 dark:border-slate-800 px-2 flex items-center text-[10px] font-bold uppercase text-slate-500"
                                            style={{ width: userColWidth, height: rowHeight }}
                                        >
                                            User / MH
                                        </div>
                                        <div className="flex" style={{ height: rowHeight }}>
                                            {timelineDays.map((date) => {
                                                const isToday = date === todayKey;
                                                return (
                                                    <div
                                                        key={date}
                                                        title={
                                                            excludedLabelByDate[date]
                                                                ? excludedLabelByDate[date]
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            'text-[10px] flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800 text-slate-500',
                                                            getDayCellClass(date),
                                                            isToday &&
                                                                'ring-1 ring-inset ring-primary/50 font-semibold text-primary',
                                                        )}
                                                        style={{ width: LOAD_DAY_WIDTH }}
                                                    >
                                                        <span>{formatWeekdayHeader(date)}</span>
                                                        {isExcludedLoadDate(
                                                            date,
                                                            excludedDateStrings,
                                                        ) && (
                                                            <span className="text-[8px] opacity-70">
                                                                libur
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {displayUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={cn(
                                            'flex border-b border-slate-100 dark:border-slate-800',
                                            viewMode === 'single' &&
                                                user.id === selectedUserId &&
                                                'bg-primary/5',
                                        )}
                                    >
                                        <div
                                            className="shrink-0 sticky left-0 z-10 bg-white dark:bg-[#151b28] border-r border-slate-200 dark:border-slate-800 px-2 flex items-center gap-1.5"
                                            style={{ width: userColWidth, height: rowHeight }}
                                        >
                                            <span
                                                className={cn(
                                                    'size-1.5 rounded-full shrink-0',
                                                    loadPeakDotClass(user.peak_mh),
                                                )}
                                            />
                                            <span className="text-xs font-medium truncate text-slate-800 dark:text-slate-200">
                                                {user.name}
                                            </span>
                                        </div>
                                        <div className="flex" style={{ height: rowHeight }}>
                                            {timelineDays.map((date) => {
                                                const mh = user.daily_mh?.[date] ?? 0;
                                                const isToday = date === todayKey;
                                                const nonWorking = isNonWorkingLoadDay(
                                                    date,
                                                    excludedDateStrings,
                                                );
                                                const hasLoad = mh > 0 && !nonWorking;
                                                return (
                                                    <button
                                                        key={date}
                                                        type="button"
                                                        disabled={!hasLoad}
                                                        onClick={() =>
                                                            openCellDetail(user, date, mh)
                                                        }
                                                        className={cn(
                                                            'flex items-center justify-center border-r border-slate-100 dark:border-slate-800 text-[11px] font-semibold transition-opacity',
                                                            nonWorking
                                                                ? cn(
                                                                      getDayCellClass(date),
                                                                      'cursor-default',
                                                                  )
                                                                : hasLoad
                                                                  ? cn(
                                                                        loadCellClasses(mh),
                                                                        'cursor-pointer hover:opacity-80',
                                                                    )
                                                                  : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 cursor-default',
                                                            isToday &&
                                                                'ring-1 ring-inset ring-primary/40',
                                                        )}
                                                        style={{ width: LOAD_DAY_WIDTH }}
                                                        title={
                                                            nonWorking
                                                                ? nonWorkingDayTitle(
                                                                      date,
                                                                      excludedDateStrings,
                                                                  ) +
                                                                  (excludedLabelByDate[date]
                                                                      ? ` (${excludedLabelByDate[date]})`
                                                                      : '')
                                                                : hasLoad
                                                                  ? `${user.name} · ${date}: ${formatLoadMh(mh)} MH`
                                                                  : `${user.name} · ${date}: 0 MH`
                                                        }
                                                    >
                                                        {formatLoadMh(mh)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="shrink-0 px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 text-[10px] text-slate-500">
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
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded bg-violet-200 dark:bg-violet-900" />
                            Libur kustom
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded bg-slate-200 dark:bg-slate-700" />
                            Weekend
                        </span>
                    </div>
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
                                            {cellDetail.user?.name} · Total{' '}
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
                                                navigate(
                                                    `/board/${item.project_id}?task=${item.task_id}`,
                                                );
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
