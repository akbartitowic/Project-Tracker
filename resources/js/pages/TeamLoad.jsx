import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { CalendarOff, Check, ExternalLink, LayoutGrid, Loader2, Plus, Search, Trash2, Users } from 'lucide-react';
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
    const [loading, setLoading]                 = useState(true);
    const [savingExcluded, setSavingExcluded]   = useState(false);
    const [payload, setPayload]                 = useState(null);
    const [searchQuery, setSearchQuery]         = useState('');
    const [viewMode, setViewMode]               = useState('all');   // 'all' | 'compare'
    const [compareIds, setCompareIds]           = useState([]);      // selected user ids in compare mode
    const [cellDetail, setCellDetail]           = useState(null);
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

    useEffect(() => { loadData(); }, [loadData]);

    const users              = payload?.users || [];
    const timelineDays       = payload?.timeline_days || payload?.weekdays || [];
    const excludedDates      = payload?.excluded_dates || [];
    const excludedDateStrings = useMemo(() => excludedDates.map((e) => e.date), [excludedDates]);
    const excludedLabelByDate = useMemo(() => {
        const map = {};
        for (const e of excludedDates) map[e.date] = e.label;
        return map;
    }, [excludedDates]);

    // Users visible in the chart
    const displayUsers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = users;
        if (q) list = list.filter((u) => u.name.toLowerCase().includes(q));
        if (viewMode === 'compare' && compareIds.length > 0) {
            list = list.filter((u) => compareIds.includes(u.id));
        }
        return list;
    }, [users, searchQuery, viewMode, compareIds]);

    // Sidebar list (always full list for selection, filtered by search)
    const sidebarUsers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users;
    }, [users, searchQuery]);

    const monthBands  = useMemo(() => buildLoadMonthBands(timelineDays, LOAD_DAY_WIDTH), [timelineDays]);
    const chartWidth  = timelineDays.length * LOAD_DAY_WIDTH;
    const rowHeight   = viewMode === 'all' ? LOAD_ALL_ROW_HEIGHT : LOAD_ROW_HEIGHT;
    const userColWidth = LOAD_USER_COL_WIDTH;

    const todayKey = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const openCellDetail = (user, date, mh) => {
        if (mh <= 0 || isNonWorkingLoadDay(date, excludedDateStrings)) return;
        setCellDetail({ user, date, mh, items: user.daily_details?.[date] || [] });
    };

    const scrollToToday = () => {
        const el = chartScrollRef.current;
        if (!el || !timelineDays.length) return;
        const idx = timelineDays.indexOf(todayKey);
        if (idx < 0) return;
        el.scrollLeft = Math.max(0, userColWidth + idx * LOAD_DAY_WIDTH - el.clientWidth / 2 + LOAD_DAY_WIDTH / 2);
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
                body: JSON.stringify({ date: newExcludedDate, label: newExcludedLabel.trim() || null }),
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

    const toggleCompareUser = (userId) => {
        setCompareIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const getDayCellClass = (date) => {
        if (isExcludedLoadDate(date, excludedDateStrings))
            return 'bg-violet-100/90 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300';
        if (isWeekendDate(date))
            return 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-400';
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

            {/* ── Header ── */}
            <div className="shrink-0 space-y-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Load</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Beban MH harian dari task ter-assign. MH dibagi ke hari kerja (Sen–Jum) minus tanggal libur kustom.
                    </p>
                    {payload?.range_start && (
                        <p className="text-xs text-slate-400 mt-1">
                            Periode: {payload.range_start} — {payload.range_end}
                        </p>
                    )}
                </div>

                {/* Excluded dates */}
                <Card className="border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        <CalendarOff className="size-3.5" />
                        Tanggal tidak dihitung MH
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Tanggal</label>
                            <Input type="date" value={newExcludedDate}
                                onChange={(e) => setNewExcludedDate(e.target.value)}
                                className="h-8 w-40 text-sm" />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="text-[10px] text-slate-500 block mb-1">Label (opsional)</label>
                            <Input value={newExcludedLabel}
                                onChange={(e) => setNewExcludedLabel(e.target.value)}
                                placeholder="Libur nasional, cuti bersama..."
                                className="h-8 text-sm" />
                        </div>
                        <Button size="sm" className="h-8" disabled={!newExcludedDate || savingExcluded}
                            onClick={handleAddExcludedDate}>
                            <Plus className="size-3.5 mr-1" /> Tambah
                        </Button>
                    </div>
                    {excludedDates.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {excludedDates.map((ex) => (
                                <Badge key={ex.id} variant="outline"
                                    className="gap-1 pr-1 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800">
                                    <span className="text-xs">{ex.date}{ex.label ? ` · ${ex.label}` : ''}</span>
                                    <button type="button" disabled={savingExcluded}
                                        className="rounded p-0.5 hover:bg-violet-200/60 dark:hover:bg-violet-800"
                                        onClick={() => handleRemoveExcludedDate(ex.id)}>
                                        <Trash2 className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">

                {/* Sidebar */}
                <Card className="w-56 shrink-0 flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 size-3.5 text-slate-400" />
                            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama..." className="h-8 pl-8 text-sm" />
                        </div>

                        {/* Mode buttons */}
                        <div className="flex gap-1">
                            <Button type="button" size="sm"
                                variant={viewMode === 'all' ? 'default' : 'outline'}
                                className="flex-1 h-7 text-xs"
                                onClick={() => setViewMode('all')}>
                                <LayoutGrid className="size-3 mr-1" />
                                Semua
                            </Button>
                            <Button type="button" size="sm"
                                variant={viewMode === 'compare' ? 'default' : 'outline'}
                                className="flex-1 h-7 text-xs gap-1"
                                onClick={() => setViewMode('compare')}>
                                <Users className="size-3" />
                                Compare
                                {compareIds.length > 0 && (
                                    <span className={cn(
                                        'ml-0.5 rounded-full text-[10px] font-bold px-1 min-w-[16px] text-center',
                                        viewMode === 'compare'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-primary/15 text-primary'
                                    )}>
                                        {compareIds.length}
                                    </span>
                                )}
                            </Button>
                        </div>

                        {viewMode === 'compare' && (
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-400">
                                    {compareIds.length === 0
                                        ? 'Pilih user untuk dibandingkan'
                                        : `${compareIds.length} user dipilih`}
                                </p>
                                {compareIds.length > 0 && (
                                    <button type="button" onClick={() => setCompareIds([])}
                                        className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">
                                        Reset
                                    </button>
                                )}
                            </div>
                        )}

                        {viewMode === 'all' && (
                            <p className="text-[10px] text-slate-400">
                                {displayUsers.length} user · Klik Compare untuk memilih
                            </p>
                        )}
                    </div>

                    {/* User list */}
                    <div className="flex-1 overflow-y-auto">
                        {sidebarUsers.map((user) => {
                            const isCompareSelected = compareIds.includes(user.id);
                            return (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => {
                                        if (viewMode === 'compare') {
                                            toggleCompareUser(user.id);
                                        } else {
                                            setViewMode('compare');
                                            setCompareIds([user.id]);
                                        }
                                    }}
                                    className={cn(
                                        'w-full text-left px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 transition-colors text-sm',
                                        viewMode === 'compare' && isCompareSelected
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                                    )}
                                >
                                    {/* Check indicator for compare mode */}
                                    <span className={cn(
                                        'size-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                        viewMode === 'compare' && isCompareSelected
                                            ? 'bg-primary border-primary'
                                            : 'border-slate-300 dark:border-slate-600'
                                    )}>
                                        {viewMode === 'compare' && isCompareSelected && (
                                            <Check className="size-2.5 text-white" />
                                        )}
                                        {viewMode === 'all' && (
                                            <span className={cn('size-1.5 rounded-full', loadPeakDotClass(user.peak_mh))} />
                                        )}
                                    </span>
                                    <span className="truncate flex-1">{user.name}</span>
                                    {viewMode === 'all' && (
                                        <span className="text-[10px] text-slate-400 shrink-0">
                                            {user.peak_mh > 0 ? `${formatLoadMh(user.peak_mh)}h` : ''}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Chart */}
                <Card className="flex-1 min-w-0 flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="shrink-0 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">
                            {viewMode === 'compare' && compareIds.length > 0
                                ? `Compare: ${displayUsers.map(u => u.name).join(', ')}`
                                : viewMode === 'compare'
                                    ? 'Pilih user di sidebar untuk membandingkan'
                                    : `Semua user (${displayUsers.length})`}
                            {' · '}Hijau ≤5 · Oranye 5–8 · Merah &gt;8 MH
                        </p>
                        {loading && <Loader2 className="size-4 animate-spin text-primary" />}
                    </div>

                    {/* Empty state */}
                    {displayUsers.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                            {viewMode === 'compare'
                                ? <>
                                    <Users className="size-8 opacity-30" />
                                    <p>Pilih satu atau lebih user di sidebar untuk membandingkan.</p>
                                  </>
                                : <p>Tidak ada user yang cocok dengan pencarian.</p>
                            }
                        </div>
                    ) : (
                        <div ref={chartScrollRef} className="flex-1 overflow-auto min-h-0">
                            <div style={{ minWidth: chartWidth + userColWidth }}>

                                {/* Sticky header */}
                                <div className="sticky top-0 z-20 bg-white dark:bg-[#151b28] border-b border-slate-200 dark:border-slate-800">
                                    {/* Month bands */}
                                    <div className="flex h-6 border-b border-slate-100 dark:border-slate-800" style={{ marginLeft: userColWidth }}>
                                        {monthBands.map((m) => (
                                            <div key={m.key}
                                                className="text-[10px] font-bold uppercase tracking-wide text-slate-500 px-1 flex items-center border-r border-slate-100 dark:border-slate-800"
                                                style={{ width: m.days * LOAD_DAY_WIDTH }}>
                                                {m.label}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Day headers */}
                                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                                        <div className="shrink-0 sticky left-0 z-30 bg-white dark:bg-[#151b28] border-r border-slate-200 dark:border-slate-800 px-2 flex items-center text-[10px] font-bold uppercase text-slate-500"
                                            style={{ width: userColWidth, height: rowHeight }}>
                                            User / MH
                                        </div>
                                        <div className="flex" style={{ height: rowHeight }}>
                                            {timelineDays.map((date) => (
                                                <div key={date}
                                                    title={excludedLabelByDate[date] || undefined}
                                                    className={cn(
                                                        'text-[10px] flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800 text-slate-500',
                                                        getDayCellClass(date),
                                                        date === todayKey && 'ring-1 ring-inset ring-primary/50 font-semibold text-primary',
                                                    )}
                                                    style={{ width: LOAD_DAY_WIDTH }}>
                                                    <span>{formatWeekdayHeader(date)}</span>
                                                    {isExcludedLoadDate(date, excludedDateStrings) && (
                                                        <span className="text-[8px] opacity-70">libur</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Rows */}
                                {displayUsers.map((user) => (
                                    <div key={user.id}
                                        className={cn(
                                            'flex border-b border-slate-100 dark:border-slate-800',
                                            viewMode === 'compare' && compareIds.includes(user.id) && 'bg-primary/5',
                                        )}>
                                        <div className="shrink-0 sticky left-0 z-10 bg-white dark:bg-[#151b28] border-r border-slate-200 dark:border-slate-800 px-2 flex items-center gap-1.5"
                                            style={{ width: userColWidth, height: rowHeight }}>
                                            <span className={cn('size-1.5 rounded-full shrink-0', loadPeakDotClass(user.peak_mh))} />
                                            <span className="text-xs font-medium truncate text-slate-800 dark:text-slate-200">
                                                {user.name}
                                            </span>
                                        </div>
                                        <div className="flex" style={{ height: rowHeight }}>
                                            {timelineDays.map((date) => {
                                                const mh       = user.daily_mh?.[date] ?? 0;
                                                const nonWorking = isNonWorkingLoadDay(date, excludedDateStrings);
                                                const hasLoad  = mh > 0 && !nonWorking;
                                                return (
                                                    <button key={date} type="button" disabled={!hasLoad}
                                                        onClick={() => openCellDetail(user, date, mh)}
                                                        className={cn(
                                                            'flex items-center justify-center border-r border-slate-100 dark:border-slate-800 text-[11px] font-semibold transition-opacity',
                                                            nonWorking
                                                                ? cn(getDayCellClass(date), 'cursor-default')
                                                                : hasLoad
                                                                    ? cn(loadCellClasses(mh), 'cursor-pointer hover:opacity-80')
                                                                    : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 cursor-default',
                                                            date === todayKey && 'ring-1 ring-inset ring-primary/40',
                                                        )}
                                                        style={{ width: LOAD_DAY_WIDTH }}
                                                        title={
                                                            nonWorking
                                                                ? nonWorkingDayTitle(date, excludedDateStrings) + (excludedLabelByDate[date] ? ` (${excludedLabelByDate[date]})` : '')
                                                                : `${user.name} · ${date}: ${formatLoadMh(mh)} MH`
                                                        }>
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

                    {/* Legend */}
                    <div className="shrink-0 px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="size-3 rounded border bg-emerald-100 border-emerald-200" />0–5 MH</span>
                        <span className="flex items-center gap-1.5"><span className="size-3 rounded border bg-amber-100 border-amber-200" />5–8 MH</span>
                        <span className="flex items-center gap-1.5"><span className="size-3 rounded border bg-rose-100 border-rose-200" />&gt;8 MH</span>
                        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-violet-200 dark:bg-violet-900" />Libur kustom</span>
                        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-slate-200 dark:bg-slate-700" />Weekend</span>
                    </div>
                </Card>
            </div>

            {/* Cell detail dialog */}
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
                                <p className="text-sm text-slate-500 py-4 text-center">Tidak ada detail task untuk hari ini.</p>
                            ) : (
                                cellDetail.items.map((item) => (
                                    <div key={`${item.task_id}-${item.project_id}`}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">{item.title}</p>
                                                {item.feature_title && (
                                                    <p className="text-xs text-slate-500 truncate">{item.feature_title}</p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="shrink-0 text-xs">
                                                {formatLoadMh(item.mh_per_day)} MH
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <span>{item.project_name}</span>
                                            {item.is_subtask && (
                                                <Badge variant="outline" className="text-[10px] py-0">Subtask</Badge>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full h-8 text-xs"
                                            onClick={() => { setCellDetail(null); navigate(`/board/${item.project_id}?task=${item.task_id}`); }}>
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
