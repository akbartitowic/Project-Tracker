import React, { useState } from 'react';
import { fetchAPI } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, Pencil, CalendarRange, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TaskNotesSection from './TaskNotesSection';
import AssigneeSearchSelect from './AssigneeSearchSelect';
import { toDateInputValue, formatTaskDateRange, validateTaskDateRange } from '../../utils/taskDates';
import { parseOptionalManhoursInput, subtasksTotalHours } from '../../utils/taskBillable.jsx';

export { subtasksTotalHours };

const RUSH_HOUR_FACTOR = 1.3;

const SUBTASK_STATUSES = ['To Do', 'In Progress', 'Review', 'Re-open', 'Done'];

function normalizeSubtaskStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 're-open' || value === 'reopen') return 'Re-open';
    if (value === 'in progress') return 'In Progress';
    if (value === 'to do' || value === 'todo') return 'To Do';
    if (value === 'review') return 'Review';
    if (value === 'done') return 'Done';
    return SUBTASK_STATUSES.includes(status) ? status : 'To Do';
}

function statusSelectValue(status) {
    return normalizeSubtaskStatus(status);
}

function statusTriggerClass(status) {
    const s = normalizeSubtaskStatus(status);
    const map = {
        'To Do': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
        'In Progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
        Review: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
        'Re-open': 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
        Done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    };
    return map[s] || map['To Do'];
}

function baseInputFromStoredHours(storedHours, rushHour) {
    const h = Number(storedHours);
    if (!Number.isFinite(h) || h < 0) return '';
    if (rushHour && h > 0) {
        return String(Math.round((h / RUSH_HOUR_FACTOR) * 1000) / 1000);
    }
    return h === 0 ? '0' : String(storedHours);
}

function effectiveHoursFromBaseInput(baseStr, rushHour) {
    const b = parseFloat(baseStr);
    if (!Number.isFinite(b) || b < 0) return 0;
    return rushHour ? Math.round(b * RUSH_HOUR_FACTOR * 1000) / 1000 : b;
}

const emptyForm = () => ({
    startDate: '',
    dueDate: '',
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Unassigned',
    estimate: '',
    rushHour: false,
    billable: true,
    category: '',
    roleFilter: 'All',
});

function subtaskBillableHours(st) {
    if (st?.is_billable === false) return 0;
    return Number(st.estimated_hours) || 0;
}

export default function SubtaskSection({
    parentTaskId,
    subtasks = [],
    onChanged,
    selectedProject,
    isFreelance,
    categoryOptions = [],
    roleQuotas = [],
    assigneeSelectOptions = [],
    formatHours,
    currentUserId,
    canDeleteAnyNotes = false,
    cardPrefix = null,
    parentProjectSequence = null,
}) {
    const [editingId, setEditingId] = useState(null);
    const [notesTarget, setNotesTarget] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    const isWaterfall = selectedProject?.methodology === 'Waterfall';
    const isScrum = !isWaterfall && selectedProject?.methodology !== 'Waterfall';

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm());
    };

    const openAdd = () => {
        resetForm();
        setEditingId('new');
    };

    const openEdit = (st) => {
        setEditingId(st.id);
        setForm({
            title: st.title || '',
            description: st.description || '',
            priority: st.priority || 'Medium',
            status: st.status || 'To Do',
            assignee: st.assignee_id ? String(st.assignee_id) : 'Unassigned',
            estimate: baseInputFromStoredHours(st.estimated_hours, !!st.rush_hour),
            rushHour: !!st.rush_hour,
            billable: st.is_billable !== false,
            category: st.category || '',
            roleFilter: st.project_role_id ? String(st.project_role_id) : 'All',
            startDate: toDateInputValue(st.start_date),
            dueDate: toDateInputValue(st.due_date),
        });
    };

    const buildPayload = () => {
        const isBillable = form.billable !== false;
        let storedHours = 0;
        if (isBillable) {
            if (isWaterfall) {
                const b = parseFloat(form.estimate);
                storedHours = Number.isFinite(b) ? Math.max(0, b) : 0;
            } else {
                storedHours = effectiveHoursFromBaseInput(form.estimate, form.rushHour);
            }
        } else {
            storedHours = parseOptionalManhoursInput(form.estimate) ?? 0;
        }

        const description = (form.description ?? '').trim();

        return {
            title: form.title,
            feature_title: form.title,
            description: description || null,
            priority: form.priority,
            status: form.status,
            is_billable: isBillable,
            assignee_id: form.assignee !== 'Unassigned' ? parseInt(form.assignee, 10) : null,
            estimated_hours: storedHours,
            rush_hour: isWaterfall || isFreelance || !isBillable ? false : form.rushHour,
            project_id: selectedProject.id,
            parent_task_id: parentTaskId,
            project_role_id: isWaterfall ? null : (form.roleFilter !== 'All' ? parseInt(form.roleFilter, 10) : null),
            category: form.category || null,
            start_date: form.startDate || null,
            due_date: form.dueDate || null,
        };
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            alert('Subtask title is required.');
            return;
        }
        const dateErr = validateTaskDateRange(form.startDate, form.dueDate);
        if (dateErr) {
            alert(dateErr);
            return;
        }
        setSaving(true);
        try {
            const payload = buildPayload();
            if (editingId === 'new') {
                await fetchAPI('/tasks', { method: 'POST', body: JSON.stringify(payload) });
            } else {
                await fetchAPI(`/tasks/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
            }
            resetForm();
            await onChanged();
        } catch (e) {
            alert(e.message || 'Failed to save subtask.');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (subtaskId, newStatus) => {
        const normalized = normalizeSubtaskStatus(newStatus);
        setUpdatingStatusId(subtaskId);
        try {
            await fetchAPI(`/tasks/${subtaskId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: normalized }),
            });
            await onChanged();
        } catch (e) {
            alert(e.message || 'Failed to update status.');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this subtask?')) return;
        setSaving(true);
        try {
            await fetchAPI(`/tasks/${id}`, { method: 'DELETE' });
            if (editingId === id) resetForm();
            await onChanged();
        } catch (e) {
            alert(e.message || 'Failed to delete subtask.');
        } finally {
            setSaving(false);
        }
    };

    const categoryBasedRoleQuotas = roleQuotas.filter((q) =>
        form.category ? q.role_name === form.category : true
    );

    const totalH = subtasksTotalHours(subtasks);

    return (
        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Subtasks ({subtasks.length})
                </p>
                {!isFreelance && subtasks.length > 0 && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                        Total MH: {formatHours(totalH)} hrs
                    </span>
                )}
            </div>

            {subtasks.length > 0 && (
                <ul className="space-y-2">
                    {subtasks.map((st) => {
                        const statusLabel = normalizeSubtaskStatus(st.status);
                        const statusBusy = updatingStatusId === st.id;

                        return (
                            <React.Fragment key={st.id}>
                                <li
                                    className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2.5"
                                >
                                    <div className="min-w-0 flex-1">
                                        {cardPrefix && parentProjectSequence != null && st.task_sequence != null && (
                                            <span className="inline-block mb-1 font-mono text-[10px] font-semibold text-primary dark:text-primary/80 tracking-wide bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded">
                                                {cardPrefix}-{parentProjectSequence}-{st.task_sequence}
                                            </span>
                                        )}
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{st.title}</p>
                                        {st.description?.trim() && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 whitespace-pre-wrap">
                                                {st.description.trim()}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${statusTriggerClass(statusLabel)}`}
                                            >
                                                {statusLabel}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                                {st.priority || 'Medium'}
                                            </span>
                                            {st.is_billable === false && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                                                    Non-billable
                                                </span>
                                            )}
                                            {!isFreelance && (st.is_billable !== false || Number(st.estimated_hours) > 0) && (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                                                    {formatHours(st.estimated_hours || 0)} hrs
                                                    {st.is_billable === false && Number(st.estimated_hours) > 0 && (
                                                        <span className="text-slate-400"> load</span>
                                                    )}
                                                </span>
                                            )}
                                            {formatTaskDateRange(st.start_date, st.due_date) && (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 w-full sm:w-auto">
                                                    <CalendarRange className="size-3 shrink-0" />
                                                    {formatTaskDateRange(st.start_date, st.due_date)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                                        {!isFreelance ? (
                                            <Select
                                                value={statusSelectValue(st.status)}
                                                onValueChange={(val) => handleStatusChange(st.id, val)}
                                                disabled={statusBusy || saving}
                                            >
                                                <SelectTrigger
                                                    className={`h-8 w-[132px] text-xs font-semibold shadow-none ${statusTriggerClass(statusLabel)}`}
                                                    aria-label={`Change status for ${st.title}`}
                                                >
                                                    {statusBusy ? (
                                                        <Loader2 className="size-3.5 animate-spin" />
                                                    ) : (
                                                        <SelectValue />
                                                    )}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SUBTASK_STATUSES.map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span
                                                className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${statusTriggerClass(statusLabel)}`}
                                            >
                                                {statusLabel}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            onClick={() => setNotesTarget({ id: st.id, title: st.title })}
                                            aria-label="Notes subtask"
                                        >
                                            <MessageSquare className="size-4" />
                                        </button>
                                        {!isFreelance && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                    onClick={() => openEdit(st)}
                                                    aria-label="Edit subtask"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    onClick={() => handleDelete(st.id)}
                                                    aria-label="Delete subtask"
                                                    disabled={saving}
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </li>
                                {!isFreelance && editingId === st.id && (
                                    <li className="list-none rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 space-y-3">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Edit subtask
                                        </p>
                                        <Input
                                            placeholder="Subtask title *"
                                            value={form.title}
                                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                        />
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
                                            <Textarea
                                                placeholder="Deskripsi subtask (opsional)..."
                                                value={form.description}
                                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                                className="min-h-[72px] resize-y text-sm"
                                            />
                                        </div>
                                        <div className={`grid grid-cols-1 gap-3 ${categoryOptions.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                                            {categoryOptions.length > 0 && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-600">Category</label>
                                                    <Select
                                                        value={form.category || undefined}
                                                        onValueChange={(val) => {
                                                            const matched = roleQuotas.find((q) => q.role_name === val);
                                                            setForm((f) => ({
                                                                ...f,
                                                                category: val,
                                                                roleFilter: matched ? String(matched.project_role_id) : f.roleFilter,
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                                                        <SelectContent>
                                                            {categoryOptions.map((c) => (
                                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-600">Billing type</label>
                                                <Select
                                                    value={form.billable ? 'billable' : 'non-billable'}
                                                    onValueChange={(val) => {
                                                        const billable = val === 'billable';
                                                        setForm((f) => ({
                                                            ...f,
                                                            billable,
                                                            estimate: billable ? f.estimate : '',
                                                            rushHour: billable ? f.rushHour : false,
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="billable">Billable</SelectItem>
                                                        <SelectItem value="non-billable">Non-billable</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 space-y-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                                                <CalendarRange className="size-3" /> Timeline
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-600">Start date</label>
                                                    <Input
                                                        type="date"
                                                        value={form.startDate}
                                                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-600">Due date</label>
                                                    <Input
                                                        type="date"
                                                        value={form.dueDate}
                                                        min={form.startDate || undefined}
                                                        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-600">Priority</label>
                                                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Low">Low</SelectItem>
                                                        <SelectItem value="Medium">Medium</SelectItem>
                                                        <SelectItem value="High">High</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-600">Status</label>
                                                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="To Do">To Do</SelectItem>
                                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                                        <SelectItem value="Review">Review</SelectItem>
                                                        <SelectItem value="Re-open">Re-open</SelectItem>
                                                        <SelectItem value="Done">Done</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1 sm:col-span-2">
                                                <label className="text-xs font-medium text-slate-600">Assignee</label>
                                                <AssigneeSearchSelect
                                                    value={form.assignee}
                                                    onChange={(v) => setForm((f) => ({ ...f, assignee: v }))}
                                                    options={assigneeSelectOptions}
                                                    placeholder="Ketik min. 2 karakter..."
                                                />
                                            </div>
                                        </div>
                                        <div className={`grid grid-cols-1 gap-2 ${form.billable && isScrum ? 'sm:grid-cols-[1fr_auto] items-end' : ''}`}>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-600">
                                                    Estimated MH
                                                    {!form.billable && (
                                                        <span className="font-normal text-slate-400"> (opsional, Team Load)</span>
                                                    )}
                                                    {form.billable && isWaterfall && (
                                                        <span className="font-normal text-slate-400"> (Team Load)</span>
                                                    )}
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={form.estimate}
                                                    placeholder={form.billable ? '0' : 'Opsional'}
                                                    onChange={(e) => setForm((f) => ({ ...f, estimate: e.target.value }))}
                                                />
                                            </div>
                                            {form.billable && isScrum && (
                                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-2">
                                                    <Checkbox
                                                        checked={form.rushHour}
                                                        onCheckedChange={(c) => setForm((f) => ({ ...f, rushHour: c === true }))}
                                                    />
                                                    <span className="text-xs text-slate-600">Rush hour</span>
                                                </div>
                                            )}
                                        </div>
                                        {!isWaterfall && form.billable && categoryBasedRoleQuotas.length > 0 && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-slate-600">Role quota</label>
                                                <Select value={form.roleFilter} onValueChange={(v) => setForm((f) => ({ ...f, roleFilter: v }))}>
                                                    <SelectTrigger className="h-9"><SelectValue placeholder="General" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="All">General quota</SelectItem>
                                                        {categoryBasedRoleQuotas
                                                            .filter((q) => q.quota_hours > 0)
                                                            .map((q) => (
                                                                <SelectItem key={q.project_role_id} value={String(q.project_role_id)}>
                                                                    {q.role_name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <div className="flex gap-2 justify-end">
                                            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                                                Cancel
                                            </Button>
                                            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                                                {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
                                                Save subtask
                                            </Button>
                                        </div>
                                    </li>
                                )}
                            </React.Fragment>
                        );
                    })}
                </ul>
            )}

            {!isFreelance && editingId === 'new' && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        New subtask
                    </p>
                    <Input
                        placeholder="Subtask title *"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
                        <Textarea
                            placeholder="Deskripsi subtask (opsional)..."
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="min-h-[72px] resize-y text-sm"
                        />
                    </div>
                    <div className={`grid grid-cols-1 gap-3 ${categoryOptions.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                        {categoryOptions.length > 0 && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Category</label>
                                <Select
                                    value={form.category || undefined}
                                    onValueChange={(val) => {
                                        const matched = roleQuotas.find((q) => q.role_name === val);
                                        setForm((f) => ({
                                            ...f,
                                            category: val,
                                            roleFilter: matched ? String(matched.project_role_id) : f.roleFilter,
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Billing type</label>
                            <Select
                                value={form.billable ? 'billable' : 'non-billable'}
                                onValueChange={(val) => {
                                    const billable = val === 'billable';
                                    setForm((f) => ({
                                        ...f,
                                        billable,
                                        estimate: billable ? f.estimate : '',
                                        rushHour: billable ? f.rushHour : false,
                                    }));
                                }}
                            >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="billable">Billable</SelectItem>
                                    <SelectItem value="non-billable">Non-billable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                            <CalendarRange className="size-3" /> Timeline
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Start date</label>
                                <Input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Due date</label>
                                <Input
                                    type="date"
                                    value={form.dueDate}
                                    min={form.startDate || undefined}
                                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Priority</label>
                            <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Status</label>
                            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="To Do">To Do</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Review">Review</SelectItem>
                                    <SelectItem value="Re-open">Re-open</SelectItem>
                                    <SelectItem value="Done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-medium text-slate-600">Assignee</label>
                            <AssigneeSearchSelect
                                value={form.assignee}
                                onChange={(v) => setForm((f) => ({ ...f, assignee: v }))}
                                options={assigneeSelectOptions}
                                placeholder="Ketik min. 2 karakter..."
                            />
                        </div>
                    </div>
                    <div className={`grid grid-cols-1 gap-2 ${form.billable && isScrum ? 'sm:grid-cols-[1fr_auto] items-end' : ''}`}>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                                Estimated MH
                                {!form.billable && (
                                    <span className="font-normal text-slate-400"> (opsional, Team Load)</span>
                                )}
                                {form.billable && isWaterfall && (
                                    <span className="font-normal text-slate-400"> (Team Load)</span>
                                )}
                            </label>
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={form.estimate}
                                placeholder={form.billable ? '0' : 'Opsional'}
                                onChange={(e) => setForm((f) => ({ ...f, estimate: e.target.value }))}
                            />
                        </div>
                        {form.billable && isScrum && (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-2">
                                <Checkbox
                                    checked={form.rushHour}
                                    onCheckedChange={(c) => setForm((f) => ({ ...f, rushHour: c === true }))}
                                />
                                <span className="text-xs text-slate-600">Rush hour</span>
                            </div>
                        )}
                    </div>
                    {!isWaterfall && form.billable && categoryBasedRoleQuotas.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Role quota</label>
                            <Select value={form.roleFilter} onValueChange={(v) => setForm((f) => ({ ...f, roleFilter: v }))}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="General" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">General quota</SelectItem>
                                    {categoryBasedRoleQuotas
                                        .filter((q) => q.quota_hours > 0)
                                        .map((q) => (
                                            <SelectItem key={q.project_role_id} value={String(q.project_role_id)}>
                                                {q.role_name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                            Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
                            Add subtask
                        </Button>
                    </div>
                </div>
            )}

            {!isFreelance && !editingId && (
                <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={openAdd}>
                    <Plus className="size-4" />
                    Add subtask
                </Button>
            )}

            <Dialog open={!!notesTarget} onOpenChange={(open) => !open && setNotesTarget(null)}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-base pr-6">
                            Catatan subtask
                            {notesTarget?.title && (
                                <span className="block text-sm font-normal text-slate-500 mt-1 truncate">
                                    {notesTarget.title}
                                </span>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {notesTarget && (
                        <TaskNotesSection
                            taskId={notesTarget.id}
                            taskLabel={notesTarget.title}
                            currentUserId={currentUserId}
                            canDeleteAny={canDeleteAnyNotes}
                            compact
                        />
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
