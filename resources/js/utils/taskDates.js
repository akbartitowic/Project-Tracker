/** @param {string|Date|null|undefined} value */
export function toDateInputValue(value) {
    if (!value) return '';
    const s = String(value);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/** @param {string|null|undefined} value */
export function formatTaskDateShort(value) {
    if (!value) return null;
    const d = new Date(`${toDateInputValue(value)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** @param {string|null|undefined} start @param {string|null|undefined} due */
export function formatTaskDateRange(start, due) {
    const startLabel = formatTaskDateShort(start);
    const dueLabel = formatTaskDateShort(due);
    if (startLabel && dueLabel) return `${startLabel} → ${dueLabel}`;
    if (startLabel) return `Start ${startLabel}`;
    if (dueLabel) return `Due ${dueLabel}`;
    return null;
}

/** @param {string} start @param {string} due */
export function validateTaskDateRange(start, due) {
    if (!start || !due) return null;
    if (start > due) return 'Due date must be on or after start date.';
    return null;
}
