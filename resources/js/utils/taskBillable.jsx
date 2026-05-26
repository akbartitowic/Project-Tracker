import { subtasksTotalHours } from '../components/board/SubtaskSection';

const BILLING_BADGE_CLASS = {
    billable:
        'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    'non-billable':
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30',
};

/** Parent with subtasks: billing follows subtasks, not the parent row flag. */
export function taskHasSubtasks(task) {
    return Array.isArray(task?.subtasks) && task.subtasks.length > 0;
}

export function taskHasBillableSubtasks(task) {
    if (!taskHasSubtasks(task)) return false;
    return task.subtasks.some((st) => st.is_billable !== false);
}

export function taskHasNonBillableSubtasks(task) {
    if (!taskHasSubtasks(task)) return false;
    return task.subtasks.some((st) => st.is_billable === false);
}

/** Whether UI should show "Non-billable" as the only billing state (all subtasks non-billable or leaf non-billable). */
export function taskIsEffectivelyNonBillable(task) {
    if (taskHasSubtasks(task)) {
        return !taskHasBillableSubtasks(task);
    }
    return task?.is_billable === false;
}

/** Labels to show on task cards: Billable, Non-billable, or both when mixed subtasks. */
export function getTaskBillingLabels(task) {
    if (taskHasSubtasks(task)) {
        const labels = [];
        if (taskHasBillableSubtasks(task)) {
            labels.push({ type: 'billable', label: 'Billable' });
        }
        if (taskHasNonBillableSubtasks(task)) {
            labels.push({ type: 'non-billable', label: 'Non-billable' });
        }
        return labels;
    }
    if (task?.is_billable === false) {
        return [{ type: 'non-billable', label: 'Non-billable' }];
    }
    return [{ type: 'billable', label: 'Billable' }];
}

export function taskBillingIsMixed(task) {
    const labels = getTaskBillingLabels(task);
    return labels.length > 1;
}

export function TaskBillingBadges({ task, className = '' }) {
    const labels = getTaskBillingLabels(task);
    if (labels.length === 0) return null;

    return (
        <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
            {labels.map(({ type, label }) => (
                <span
                    key={type}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter border ${BILLING_BADGE_CLASS[type]}`}
                >
                    {label}
                </span>
            ))}
        </span>
    );
}

/** Parse MH input; empty string → null (optional field). */
export function parseOptionalManhoursInput(value) {
    const raw = String(value ?? '').trim();
    if (raw === '') return null;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
}

/** Hours stored on task for Team Load (billable or non-billable). */
export function loadHoursForTask(task) {
    return Number(task?.estimated_hours) || 0;
}

export function billableHoursForTask(task) {
    if (taskHasSubtasks(task)) {
        return subtasksTotalHours(task.subtasks);
    }
    if (task?.is_billable === false) return 0;
    return Number(task?.estimated_hours) || 0;
}
