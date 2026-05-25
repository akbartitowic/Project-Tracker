import { billableHoursForTask, getTaskBillingLabels } from './taskBillable.jsx';

export const BOARD_STATUSES = ['To Do', 'In Progress', 'Review', 'Re-open', 'Done'];

export function normalizeBoardTaskStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 're-open' || value === 'reopen') return 'Re-open';
    if (value === 'in progress') return 'In Progress';
    if (value === 'to do' || value === 'todo') return 'To Do';
    if (value === 'review') return 'Review';
    if (value === 'done') return 'Done';
    return String(status || '').trim() || 'To Do';
}

export function formatBoardHours(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return Number.isInteger(num) ? `${num}` : num.toFixed(1);
}

export function computeTaskStatusCounts(tasks) {
    const counts = Object.fromEntries(BOARD_STATUSES.map((s) => [s, 0]));
    for (const task of tasks || []) {
        const status = normalizeBoardTaskStatus(task.status);
        if (counts[status] != null) counts[status] += 1;
    }
    return counts;
}

export function deriveDisplayProjectStatus(project, tasks) {
    if (!project) return 'Planning';
    if (project.status === 'Done') return 'Done';
    if ((tasks || []).length > 0) {
        const hasOutsideTodo = tasks.some((t) => normalizeBoardTaskStatus(t.status) !== 'To Do');
        return hasOutsideTodo ? 'In Progress' : 'Planning';
    }
    return project.status || 'Planning';
}

export function computeWaterfallProgress(tasks) {
    const total = (tasks || []).length;
    const statuses = ['Done', 'In Progress', 'To Do', 'Review', 'Re-open'];
    return statuses.map((status) => {
        const count = tasks.filter((t) => normalizeBoardTaskStatus(t.status) === status).length;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return { status, count, percentage };
    });
}

function mapSubtaskRow(parent, st) {
    return {
        kind: 'subtask',
        id: st.id,
        parentId: parent.id,
        parentTitle: parent.title,
        parentFeatureTitle: parent.feature_title,
        title: st.title,
        status: normalizeBoardTaskStatus(st.status),
        hours: st.is_billable === false ? 0 : Number(st.estimated_hours) || 0,
        billing: st.is_billable === false ? 'non-billable' : 'billable',
    };
}

function mapLeafTaskRow(task) {
    return {
        kind: 'task',
        id: task.id,
        title: task.title,
        featureTitle: task.feature_title,
        status: normalizeBoardTaskStatus(task.status),
        hours: task.is_billable === false ? 0 : Number(task.estimated_hours) || 0,
        billing: task.is_billable === false ? 'non-billable' : 'billable',
        children: [],
    };
}

/** Grouped rows for expandable billing detail on project dashboard. */
export function buildBillingBreakdown(tasks) {
    const billable = [];
    const nonBillable = [];
    const mixed = [];

    for (const task of tasks || []) {
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        if (subtasks.length > 0) {
            const billableSubs = subtasks
                .filter((st) => st.is_billable !== false)
                .map((st) => mapSubtaskRow(task, st));
            const nonBillableSubs = subtasks
                .filter((st) => st.is_billable === false)
                .map((st) => mapSubtaskRow(task, st));

            if (billableSubs.length > 0 && nonBillableSubs.length > 0) {
                mixed.push({
                    kind: 'task',
                    id: task.id,
                    title: task.title,
                    featureTitle: task.feature_title,
                    status: normalizeBoardTaskStatus(task.status),
                    hours: billableSubs.reduce((s, r) => s + r.hours, 0),
                    billing: 'mixed',
                    children: [...billableSubs, ...nonBillableSubs],
                    billableSubtasks: billableSubs,
                    nonBillableSubtasks: nonBillableSubs,
                });
            } else if (billableSubs.length > 0) {
                billable.push({
                    kind: 'task',
                    id: task.id,
                    title: task.title,
                    featureTitle: task.feature_title,
                    status: normalizeBoardTaskStatus(task.status),
                    hours: billableSubs.reduce((s, r) => s + r.hours, 0),
                    billing: 'billable',
                    children: billableSubs,
                });
            } else {
                nonBillable.push({
                    kind: 'task',
                    id: task.id,
                    title: task.title,
                    featureTitle: task.feature_title,
                    status: normalizeBoardTaskStatus(task.status),
                    hours: 0,
                    billing: 'non-billable',
                    children: nonBillableSubs,
                });
            }
            continue;
        }

        const row = mapLeafTaskRow(task);
        if (row.billing === 'non-billable') {
            nonBillable.push(row);
        } else {
            billable.push(row);
        }
    }

    return { billable, nonBillable, mixed };
}

export function computeBillingSummary(tasks) {
    let billableTaskCount = 0;
    let nonBillableTaskCount = 0;
    let mixedParentCount = 0;
    let billableHours = 0;

    for (const task of tasks || []) {
        const labels = getTaskBillingLabels(task);
        billableHours += billableHoursForTask(task);
        if (labels.length > 1) {
            mixedParentCount += 1;
        } else if (labels[0]?.type === 'non-billable') {
            nonBillableTaskCount += 1;
        } else if (labels[0]?.type === 'billable') {
            billableTaskCount += 1;
        }
    }

    const subtaskRows = (tasks || []).flatMap((t) =>
        Array.isArray(t.subtasks) ? t.subtasks : [],
    );
    const billableSubtasks = subtaskRows.filter((st) => st.is_billable !== false).length;
    const nonBillableSubtasks = subtaskRows.filter((st) => st.is_billable === false).length;

    return {
        billableTaskCount,
        nonBillableTaskCount,
        mixedParentCount,
        billableHours,
        billableSubtasks,
        nonBillableSubtasks,
        totalRootTasks: (tasks || []).length,
        totalSubtasks: subtaskRows.length,
    };
}

/** Per assignee: task counts and billable allocated hours (Scrum quota consumption). */
export function computeMemberWorkload(tasks) {
    const byUser = new Map();

    const ensure = (userId) => {
        const id = Number(userId);
        if (!Number.isFinite(id)) return null;
        if (!byUser.has(id)) {
            byUser.set(id, {
                userId: id,
                taskCount: 0,
                rootTaskCount: 0,
                subtaskCount: 0,
                allocatedHours: 0,
            });
        }
        return byUser.get(id);
    };

    const addAssignment = (assigneeId, hours, isSubtask) => {
        const row = ensure(assigneeId);
        if (!row) return;
        row.taskCount += 1;
        if (isSubtask) row.subtaskCount += 1;
        else row.rootTaskCount += 1;
        row.allocatedHours += Math.max(0, Number(hours) || 0);
    };

    for (const task of tasks || []) {
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        if (subtasks.length > 0) {
            for (const st of subtasks) {
                const h = st.is_billable === false ? 0 : Number(st.estimated_hours) || 0;
                addAssignment(st.assignee_id, h, true);
            }
            continue;
        }
        const h = task.is_billable === false ? 0 : Number(task.estimated_hours) || 0;
        addAssignment(task.assignee_id, h, false);
    }

    return byUser;
}

export function buildMemberTeamRows(members, tasks) {
    const workload = computeMemberWorkload(tasks);
    const seen = new Set();
    const rows = [];

    for (const m of members || []) {
        if (!m?.user_id || seen.has(m.user_id)) continue;
        seen.add(m.user_id);
        const w = workload.get(Number(m.user_id));
        rows.push({
            user_id: m.user_id,
            user_name: m.user_name,
            role_name: m.role_name,
            taskCount: w?.taskCount ?? 0,
            rootTaskCount: w?.rootTaskCount ?? 0,
            subtaskCount: w?.subtaskCount ?? 0,
            allocatedHours: w?.allocatedHours ?? 0,
        });
    }

    rows.sort((a, b) => b.allocatedHours - a.allocatedHours || b.taskCount - a.taskCount);
    return rows;
}

export function computeGeneralQuotaFromTasks(tasks, totalManhours, roleQuotas) {
    const mappedRoleQuotaHours = (roleQuotas || []).reduce(
        (sum, quota) => sum + (Number(quota.quota_hours) || 0),
        0,
    );
    const generalQuotaFromPresales = Math.max(0, (Number(totalManhours) || 0) - mappedRoleQuotaHours);
    const generalAllocatedHours = (tasks || []).reduce((sum, task) => {
        if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
            return (
                sum +
                task.subtasks
                    .filter((st) => !st.project_role_id && st.is_billable !== false)
                    .reduce((s, st) => s + (Number(st.estimated_hours) || 0), 0)
            );
        }
        if (!task.project_role_id && task.is_billable !== false) {
            return sum + (Number(task.estimated_hours) || 0);
        }
        return sum;
    }, 0);
    return {
        generalQuotaFromPresales,
        generalAllocatedHours,
        generalRemaining: Math.max(0, generalQuotaFromPresales - generalAllocatedHours),
    };
}
