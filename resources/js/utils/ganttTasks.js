import { toDateInputValue } from './taskDates';

const DAY_MS = 86400000;

export function parseTaskDate(value) {
    const v = toDateInputValue(value);
    if (!v) return null;
    const d = new Date(`${v}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
    const d = startOfDay(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function daysBetween(start, end) {
    return Math.round((startOfDay(end) - startOfDay(start)) / DAY_MS);
}

export function hasBothScheduleDates(task) {
    return !!(parseTaskDate(task?.start_date) && parseTaskDate(task?.due_date));
}

/** Group structure: parent task with expanded subtasks array. */
export function buildGanttRows(tasks) {
    const rows = [];
    for (const task of tasks || []) {
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        const scheduledSubtasks = subtasks.filter((st) => hasBothScheduleDates(st));

        // Always include parent if it has dates OR has any scheduled subtasks
        if (hasBothScheduleDates(task) || scheduledSubtasks.length > 0) {
            rows.push({
                id: task.id,
                task,
                isSubtask: false,
                parentTitle: null,
                parentFeature: null,
                subtasks: scheduledSubtasks.map((st) => ({
                    id: st.id,
                    task: st,
                    isSubtask: true,
                    parentTitle: task.title,
                    parentFeature: task.feature_title,
                })),
            });
        }
    }
    return rows;
}

export function buildGanttTimeline(rows) {
    if (!rows.length) return null;

    let min = null;
    let max = null;
    for (const row of rows) {
        const s = parseTaskDate(row.task.start_date);
        const e = parseTaskDate(row.task.due_date);
        if (!s || !e) continue;
        if (!min || s < min) min = s;
        if (!max || e > max) max = e;
    }
    if (!min || !max) return null;

    const rangeStart = addDays(min, -7);
    const rangeEnd = addDays(max, 14);
    const totalDays = daysBetween(rangeStart, rangeEnd) + 1;

    const months = [];
    let cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        const last = months[months.length - 1];
        if (!last || last.key !== key) {
            months.push({
                key,
                label: cursor.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
                startOffset: daysBetween(rangeStart, cursor),
                days: 0,
            });
        }
        months[months.length - 1].days += 1;
        cursor = addDays(cursor, 1);
    }

    const days = [];
    cursor = new Date(rangeStart);
    for (let i = 0; i < totalDays; i++) {
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        days.push({
            index: i,
            date: new Date(cursor),
            label: cursor.getDate(),
            isWeekend,
            isToday: daysBetween(cursor, new Date()) === 0,
        });
        cursor = addDays(cursor, 1);
    }

    const todayOffset = daysBetween(rangeStart, new Date());
    const todayInRange = todayOffset >= 0 && todayOffset < totalDays;

    return { rangeStart, rangeEnd, totalDays, months, days, todayOffset, todayInRange };
}

export function barMetrics(row, timeline, dayWidth) {
    const start = parseTaskDate(row.task.start_date);
    const end = parseTaskDate(row.task.due_date);
    if (!start || !end || !timeline) return null;

    const startOffset = daysBetween(timeline.rangeStart, start);
    const durationDays = Math.max(1, daysBetween(start, end) + 1);

    return {
        left: startOffset * dayWidth,
        width: durationDays * dayWidth - 2,
        durationDays,
        startLabel: start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        endLabel: end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    };
}

export const GANTT_DAY_WIDTH = 28;
export const GANTT_ROW_HEIGHT = 44;
export const GANTT_LABEL_WIDTH = 280;

export function statusBarClass(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'done') return 'bg-emerald-500/90 border-emerald-600';
    if (value === 'in progress') return 'bg-primary/90 border-primary';
    if (value === 'review') return 'bg-violet-500/90 border-violet-600';
    if (value === 're-open' || value === 'reopen') return 'bg-rose-500/90 border-rose-600';
    return 'bg-slate-400/90 border-slate-500';
}
