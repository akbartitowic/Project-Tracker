import { useEffect, useState } from 'react';
import { fetchAPI } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Users, X, Scale } from 'lucide-react';
import AssigneeSearchSelect from './AssigneeSearchSelect';
import { cn } from '@/lib/utils';

const UNASSIGNED = 'Unassigned';

export default function TaskAssigneesSection({
    taskId,
    assignees = [],
    assigneeSelectOptions = [],
    hasSubtasks = false,
    onChanged,
    canManage = false,
}) {
    const [pendingAdd, setPendingAdd] = useState(UNASSIGNED);
    const [savingUserId, setSavingUserId] = useState(null);
    const [error, setError] = useState('');
    const [localMh, setLocalMh] = useState({});

    useEffect(() => {
        const next = {};
        assignees.forEach((a) => {
            next[a.id] = a.mh != null ? String(a.mh) : '0';
        });
        setLocalMh(next);
    }, [assignees]);

    const showMhSplit = assignees.length >= 2 && !hasSubtasks;
    const totalMh = assignees.reduce((sum, a) => sum + (Number(a.mh) || 0), 0);
    const activeIdsOf = (list) => list.filter((a) => a.is_active).map((a) => a.id);

    const sync = async (nextAssignees, activeIds, mhByAssignee, splitEvenly) => {
        setError('');
        try {
            const body = {
                assignee_ids: nextAssignees.map((a) => a.id),
                active_ids: activeIds,
            };
            if (mhByAssignee) body.mh_by_assignee = mhByAssignee;
            if (splitEvenly) body.split_evenly = true;
            const res = await fetchAPI(`/tasks/${taskId}/assignees`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            await onChanged?.(res);
        } catch (err) {
            setError(err.message || 'Failed to update assignees.');
        }
    };

    const handleAdd = async () => {
        if (pendingAdd === UNASSIGNED) return;
        const userId = parseInt(pendingAdd, 10);
        if (assignees.some((a) => a.id === userId)) {
            setPendingAdd(UNASSIGNED);
            return;
        }
        const option = assigneeSelectOptions.find((o) => String(o.id) === String(userId));
        const next = [...assignees, { id: userId, name: option?.label?.split(' (')[0] || 'User', is_active: true }];
        setSavingUserId(userId);
        setPendingAdd(UNASSIGNED);
        await sync(next, [...activeIdsOf(assignees), userId]);
        setSavingUserId(null);
    };

    const handleRemove = async (userId) => {
        const next = assignees.filter((a) => a.id !== userId);
        setSavingUserId(userId);
        await sync(next, activeIdsOf(next));
        setSavingUserId(null);
    };

    const handleToggleActive = async (userId, checked) => {
        const nextActiveIds = checked
            ? [...activeIdsOf(assignees), userId]
            : activeIdsOf(assignees).filter((id) => id !== userId);
        setSavingUserId(userId);
        await sync(assignees, nextActiveIds);
        setSavingUserId(null);
    };

    const commitMhSplit = async () => {
        const mhByAssignee = {};
        assignees.forEach((a) => {
            const parsed = parseFloat(localMh[a.id]);
            mhByAssignee[a.id] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        });
        setSavingUserId('mh-split');
        await sync(assignees, activeIdsOf(assignees), mhByAssignee);
        setSavingUserId(null);
    };

    const handleSplitEvenly = async () => {
        setSavingUserId('mh-split');
        await sync(assignees, activeIdsOf(assignees), null, true);
        setSavingUserId(null);
    };

    if (!taskId) {
        return (
            <p className="text-xs text-slate-500 italic">Save the task first to manage assignees.</p>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="size-3.5" />
                Assignees
            </p>

            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

            {assignees.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No assignees yet.</p>
            ) : (
                <ul className="space-y-1.5">
                    {assignees.map((a) => (
                        <li
                            key={a.id}
                            className={cn(
                                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                                a.is_active
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/30',
                            )}
                        >
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {(a.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
                            {showMhSplit && (
                                canManage ? (
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        className="h-7 w-16 shrink-0 text-xs"
                                        value={localMh[a.id] ?? ''}
                                        onChange={(e) => setLocalMh((m) => ({ ...m, [a.id]: e.target.value }))}
                                        onFocus={(e) => e.target.select()}
                                        onBlur={commitMhSplit}
                                    />
                                ) : (
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                        {a.mh ?? 0}h
                                    </span>
                                )
                            )}
                            <div className="flex shrink-0 items-center gap-1.5">
                                {savingUserId === a.id ? (
                                    <Loader2 className="size-3.5 animate-spin text-slate-400" />
                                ) : (
                                    <>
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                            {a.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <Switch
                                            checked={a.is_active}
                                            onCheckedChange={(checked) => handleToggleActive(a.id, checked)}
                                            disabled={!canManage}
                                        />
                                    </>
                                )}
                            </div>
                            {canManage && savingUserId !== a.id && (
                                <button
                                    type="button"
                                    title="Remove assignee"
                                    className="flex size-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                                    onClick={() => handleRemove(a.id)}
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {showMhSplit && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Total MH from the split above: <span className="font-semibold tabular-nums">{totalMh}h</span> — automatically becomes this task's Estimated Manhours.
                    </p>
                    {canManage && assignees.length >= 2 && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={handleSplitEvenly}
                            disabled={savingUserId === 'mh-split'}
                        >
                            {savingUserId === 'mh-split'
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <Scale className="size-3.5" />}
                            Split Evenly
                        </Button>
                    )}
                </div>
            )}
            {assignees.length >= 2 && hasSubtasks && (
                <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    This task's MH is calculated automatically from its subtasks, so it can't be split manually per assignee here.
                </p>
            )}

            {canManage && (
                <div className="flex items-center gap-2">
                    <AssigneeSearchSelect
                        value={pendingAdd}
                        onChange={setPendingAdd}
                        options={assigneeSelectOptions.filter((o) => !assignees.some((a) => a.id === o.id))}
                        placeholder="Type at least 2 characters to add an assignee..."
                        showUnassignedOption={false}
                        className="flex-1"
                    />
                    <Button type="button" size="sm" variant="outline" disabled={pendingAdd === UNASSIGNED} onClick={handleAdd}>
                        Add
                    </Button>
                </div>
            )}
            <p className="text-[11px] text-slate-400">
                Turn on the <span className="font-semibold">Active</span> toggle for assignees currently working on this task — more than one can be active at once. Deactivated assignees stay attached to the task (e.g. Dev is already Done, QA gets activated, Dev can be turned off while staying on record).
            </p>
        </div>
    );
}
