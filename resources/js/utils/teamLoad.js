import { parseTaskDate } from './ganttTasks';

/** @param {number} mh */
export function loadLevel(mh) {
    const v = Number(mh) || 0;
    if (v <= 5) return 'low';
    if (v <= 8) return 'medium';
    return 'high';
}

/** @param {number} mh */
export function loadCellClasses(mh) {
    const level = loadLevel(mh);
    if (level === 'low') {
        return 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800';
    }
    if (level === 'medium') {
        return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800';
    }
    return 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800';
}

/** @param {number} mh */
export function loadPeakDotClass(mh) {
    const level = loadLevel(mh);
    if (level === 'low') return 'bg-emerald-500';
    if (level === 'medium') return 'bg-amber-500';
    return 'bg-rose-500';
}

export function formatLoadMh(mh) {
    const v = Number(mh) || 0;
    if (v === 0) return '0';
    return v % 1 === 0 ? String(v) : v.toFixed(1);
}

/** @param {string} dateStr */
export function isWeekendDate(dateStr) {
    const d = parseTaskDate(dateStr);
    if (!d) return false;
    const day = d.getDay();
    return day === 0 || day === 6;
}

/** @param {string} dateStr @param {string[]} excludedDates */
export function isExcludedLoadDate(dateStr, excludedDates) {
    return (excludedDates || []).includes(dateStr);
}

/** @param {string} dateStr @param {string[]} excludedDates */
export function isNonWorkingLoadDay(dateStr, excludedDates) {
    return isWeekendDate(dateStr) || isExcludedLoadDate(dateStr, excludedDates);
}

/** @param {string} dateStr @param {string[]} excludedDateStrings */
export function nonWorkingDayTitle(dateStr, excludedDateStrings) {
    if (isExcludedLoadDate(dateStr, excludedDateStrings)) return `${dateStr}: libur kustom (0 MH)`;
    if (isWeekendDate(dateStr)) return `${dateStr}: weekend (0 MH)`;
    return '';
}

export const LOAD_USER_COL_WIDTH = 140;
export const LOAD_ALL_ROW_HEIGHT = 36;

/** @param {string[]} weekdays */
export function buildLoadMonthBands(weekdays, dayWidth) {
    const months = [];
    for (let i = 0; i < weekdays.length; i++) {
        const d = parseTaskDate(weekdays[i]);
        if (!d) continue;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const last = months[months.length - 1];
        if (!last || last.key !== key) {
            months.push({
                key,
                label: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
                days: 1,
                width: dayWidth,
            });
        } else {
            last.days += 1;
            last.width = last.days * dayWidth;
        }
    }
    return months;
}

/** @param {string} dateStr */
export function formatWeekdayHeader(dateStr) {
    const d = parseTaskDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
}

/** @param {string} dateStr */
export function formatLoadDateLong(dateStr) {
    const d = parseTaskDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export const LOAD_DAY_WIDTH = 52;
export const LOAD_ROW_HEIGHT = 40;
