import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AssigneeSearchSelect from '../components/board/AssigneeSearchSelect';
import {
    ArrowLeft, Plus, ClipboardCheck, Users, Copy, Trash2, Pencil, X, CalendarDays,
} from 'lucide-react';

const UNASSIGNED = 'Unassigned';
const ISSUE_LEVELS = ['Low', 'Medium', 'High'];
const ISSUE_BADGE = {
    Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-transparent',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-transparent',
    High: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-transparent',
};

function formatDate(value) {
    if (!value) return '—';
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function addDays(iso, days) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Inline multi-user picker: search-to-add + removable chips. Used for both board members and item assignees. */
function MultiUserPicker({ userOptions, value, onChange, disabled }) {
    const selected = useMemo(() => userOptions.filter((u) => value.includes(u.id)), [userOptions, value]);

    const handleAdd = (next) => {
        if (next === UNASSIGNED) return;
        const id = parseInt(next, 10);
        if (!value.includes(id)) onChange([...value, id]);
    };

    const handleRemove = (id) => onChange(value.filter((v) => v !== id));

    return (
        <div className="space-y-2">
            <AssigneeSearchSelect
                value={UNASSIGNED}
                onChange={handleAdd}
                options={userOptions.map((u) => ({ id: u.id, label: `${u.name}${u.email ? ` (${u.email})` : ''}` }))}
                placeholder="Search name to add..."
                showUnassignedOption={false}
                className={disabled ? 'pointer-events-none opacity-50' : ''}
            />
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((u) => (
                        <span
                            key={u.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                            {u.name}
                            {!disabled && (
                                <button type="button" onClick={() => handleRemove(u.id)} className="hover:text-rose-500">
                                    <X className="size-3" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* Board list                                                              */
/* ---------------------------------------------------------------------- */

function BoardListView({ userOptions, onOpenBoard }) {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', member_ids: [] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchAPI('/weekly-report/boards');
            setBoards(res.data || []);
        } catch (err) {
            setError(err.message || 'Failed to load boards.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetchAPI('/weekly-report/boards', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            setCreateOpen(false);
            setForm({ name: '', description: '', member_ids: [] });
            await load();
            onOpenBoard(res.data.id);
        } catch (err) {
            setError(err.message || 'Failed to create board.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardCheck className="size-6 text-primary" /> Weekly Report
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Boards you're a member of. Only board members can see or be assigned within a board.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus className="size-4" /> New Board
                </Button>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            {loading ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading...</p>
            ) : boards.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-sm text-slate-500">
                        No boards yet. Create one to start a weekly checklist (e.g. "Weekly Report Project" or "Weekly Report Management").
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {boards.map((b) => (
                        <button
                            key={b.id}
                            onClick={() => onOpenBoard(b.id)}
                            className="text-left rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                            <p className="font-semibold">{b.name}</p>
                            {b.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description}</p>}
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {b.members.length}</span>
                                <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {b.periods_count} week{b.periods_count === 1 ? '' : 's'}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Weekly Report Board</DialogTitle>
                        <DialogDescription>A named checklist stream (e.g. "Weekly Report Project"). You'll be added as a member automatically.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Board name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1.5">Members</p>
                            <MultiUserPicker
                                userOptions={userOptions}
                                value={form.member_ids}
                                onChange={(ids) => setForm((f) => ({ ...f, member_ids: ids }))}
                            />
                        </div>
                        {error && <p className="text-xs text-rose-500">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>{saving ? 'Creating...' : 'Create Board'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* Board detail (periods)                                                  */
/* ---------------------------------------------------------------------- */

function BoardDetailView({ boardId, userOptions, onOpenPeriod, onBack }) {
    const [board, setBoard] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [range, setRange] = useState({ week_start: todayISO(), week_end: addDays(todayISO(), 6) });
    const [memberIds, setMemberIds] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [boardRes, periodsRes] = await Promise.all([
                fetchAPI(`/weekly-report/boards/${boardId}`),
                fetchAPI(`/weekly-report/boards/${boardId}/periods`),
            ]);
            setBoard(boardRes.data);
            setMemberIds(boardRes.data.members.map((m) => m.id));
            setPeriods(periodsRes.data || []);
        } catch (err) {
            setError(err.message || 'Failed to load board.');
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => { load(); }, [load]);

    const handleCreatePeriod = async () => {
        setSaving(true);
        try {
            await fetchAPI(`/weekly-report/boards/${boardId}/periods`, {
                method: 'POST',
                body: JSON.stringify(range),
            });
            setCreateOpen(false);
            await load();
        } catch (err) {
            setError(err.message || 'Failed to create period.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveMembers = async () => {
        setSaving(true);
        try {
            await fetchAPI(`/weekly-report/boards/${boardId}`, {
                method: 'PUT',
                body: JSON.stringify({ member_ids: memberIds }),
            });
            setMembersOpen(false);
            await load();
        } catch (err) {
            setError(err.message || 'Failed to update members.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBoard = async () => {
        if (!window.confirm(`Delete board "${board.name}"? All its weeks and items will be deleted too.`)) return;
        try {
            await fetchAPI(`/weekly-report/boards/${boardId}`, { method: 'DELETE' });
            onBack();
        } catch (err) {
            alert(err.message || 'Failed to delete board.');
        }
    };

    if (loading) return <p className="text-sm text-slate-500 py-8 text-center">Loading...</p>;
    if (error) return <p className="text-sm text-rose-500 py-8 text-center">{error}</p>;
    if (!board) return null;

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
                <ArrowLeft className="size-4" /> Back to boards
            </Button>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{board.name}</h1>
                    {board.description && <p className="text-sm text-slate-500 mt-1">{board.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">{board.members.length} member{board.members.length === 1 ? '' : 's'}: {board.members.map((m) => m.name).join(', ')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)} className="gap-1.5">
                        <Users className="size-4" /> Members
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteBoard} className="text-rose-500 hover:text-rose-600">
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Weeks</h2>
                <Button size="sm" onClick={() => { setRange({ week_start: todayISO(), week_end: addDays(todayISO(), 6) }); setCreateOpen(true); }} className="gap-1.5">
                    <Plus className="size-4" /> New Week
                </Button>
            </div>

            {periods.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-slate-500">No weeks yet. Create the first one.</CardContent></Card>
            ) : (
                <div className="space-y-2">
                    {periods.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => onOpenPeriod(p.id)}
                            className="w-full text-left flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                            <div>
                                <p className="font-medium">{formatDate(p.week_start)} – {formatDate(p.week_end)}</p>
                                {p.duplicated_from_id && <p className="text-xs text-slate-500 mt-0.5">Duplicated from a previous week</p>}
                            </div>
                            <Badge variant="outline">{p.done_count}/{p.items_count} done</Badge>
                        </button>
                    ))}
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Week</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Week start</p>
                            <Input type="date" value={range.week_start} onChange={(e) => setRange((r) => ({ ...r, week_start: e.target.value }))} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Week end</p>
                            <Input type="date" value={range.week_end} onChange={(e) => setRange((r) => ({ ...r, week_end: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePeriod} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Board Members</DialogTitle>
                        <DialogDescription>Only members can see this board or be assigned to its items.</DialogDescription>
                    </DialogHeader>
                    <MultiUserPicker userOptions={userOptions} value={memberIds} onChange={setMemberIds} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMembersOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveMembers} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* Period detail (checklist items)                                         */
/* ---------------------------------------------------------------------- */

const EMPTY_ITEM_FORM = { description: '', next_action: '', issue_level: 'Medium', project_id: '', due_date: '', assignee_ids: [] };

function toItemPayload(form) {
    return {
        description: form.description,
        next_action: form.next_action?.trim() ? form.next_action : null,
        issue_level: form.issue_level,
        project_id: form.project_id ? parseInt(form.project_id, 10) : null,
        due_date: form.due_date || null,
        assignee_ids: form.assignee_ids,
    };
}

/** Edit an existing item — still a dialog, since it's an occasional action, not the fast-entry path. */
function EditItemDialog({ item, onOpenChange, userOptions, projectOptions, onSubmit, saving }) {
    const [form, setForm] = useState(EMPTY_ITEM_FORM);

    useEffect(() => {
        if (item) {
            setForm({
                description: item.description,
                next_action: item.next_action || '',
                issue_level: item.issue_level,
                project_id: item.project?.id ? String(item.project.id) : '',
                due_date: item.due_date || '',
                assignee_ids: item.assignees.map((a) => a.id),
            });
        }
    }, [item]);

    const handleSubmit = () => {
        if (!form.description.trim()) return;
        onSubmit(toItemPayload(form));
    };

    return (
        <Dialog open={!!item} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                        <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Next action</p>
                        <Textarea placeholder="What needs to happen next..." value={form.next_action} onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))} rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Issue level</p>
                            <Select value={form.issue_level} onValueChange={(v) => setForm((f) => ({ ...f, issue_level: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ISSUE_LEVELS.map((lvl) => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Due date</p>
                            <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Project (optional)</p>
                        <Select value={form.project_id || '__none'} onValueChange={(v) => setForm((f) => ({ ...f, project_id: v === '__none' ? '' : v }))}>
                            <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">No project</SelectItem>
                                {projectOptions.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Assign to</p>
                        <MultiUserPicker userOptions={userOptions} value={form.assignee_ids} onChange={(ids) => setForm((f) => ({ ...f, assignee_ids: ids }))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving || !form.description.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Spreadsheet-style entry row pinned to the bottom of the table — add several items back-to-back without leaving the table. */
function NewItemRow({ userOptions, projectOptions, onSave }) {
    const [form, setForm] = useState(EMPTY_ITEM_FORM);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.description.trim() || saving) return;
        setSaving(true);
        try {
            await onSave(toItemPayload(form));
            setForm(EMPTY_ITEM_FORM);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <tr className="bg-primary/5">
            <td className="py-3 px-6 align-top"></td>
            <td className="py-3 px-6 align-top">
                <Select value={form.project_id || '__none'} onValueChange={(v) => setForm((f) => ({ ...f, project_id: v === '__none' ? '' : v }))}>
                    <SelectTrigger className="h-9 w-36"><SelectValue placeholder="No project" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none">No project</SelectItem>
                        {projectOptions.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </td>
            <td className="py-3 px-6 align-top min-w-[200px]">
                <Textarea
                    autoFocus
                    rows={1}
                    placeholder="New item description..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="min-h-9 resize-none"
                />
            </td>
            <td className="py-3 px-6 align-top min-w-[200px]">
                <Textarea
                    rows={1}
                    placeholder="Next action..."
                    value={form.next_action}
                    onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="min-h-9 resize-none"
                />
            </td>
            <td className="py-3 px-6 align-top">
                <Select value={form.issue_level} onValueChange={(v) => setForm((f) => ({ ...f, issue_level: v }))}>
                    <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {ISSUE_LEVELS.map((lvl) => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}
                    </SelectContent>
                </Select>
            </td>
            <td className="py-3 px-6 align-top min-w-[200px]">
                <MultiUserPicker userOptions={userOptions} value={form.assignee_ids} onChange={(ids) => setForm((f) => ({ ...f, assignee_ids: ids }))} />
            </td>
            <td className="py-3 px-6 align-top">
                <Input type="date" className="h-9 w-36" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </td>
            <td className="py-3 px-6 align-top text-xs text-slate-400 whitespace-nowrap">You</td>
            <td className="py-3 px-6 align-top text-right whitespace-nowrap">
                <Button size="sm" onClick={handleSave} disabled={saving || !form.description.trim()}>{saving ? 'Adding...' : 'Add'}</Button>
            </td>
        </tr>
    );
}

function DuplicateDialog({ open, onOpenChange, period, onSubmit, saving }) {
    const [range, setRange] = useState({ week_start: '', week_end: '', carry_done: false });

    useEffect(() => {
        if (open && period) {
            const start = addDays(period.week_end, 1);
            setRange({ week_start: start, week_end: addDays(start, 6), carry_done: false });
        }
    }, [open, period]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Duplicate to Next Week</DialogTitle>
                    <DialogDescription>Unfinished items always carry over. Choose whether finished items come too.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Week start</p>
                            <Input type="date" value={range.week_start} onChange={(e) => setRange((r) => ({ ...r, week_start: e.target.value }))} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Week end</p>
                            <Input type="date" value={range.week_end} onChange={(e) => setRange((r) => ({ ...r, week_end: e.target.value }))} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={range.carry_done} onCheckedChange={(v) => setRange((r) => ({ ...r, carry_done: v === true }))} />
                        Also carry over items already marked Done
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onSubmit(range)} disabled={saving}>{saving ? 'Duplicating...' : 'Duplicate'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PeriodDetailView({ boardId, periodId, userOptions, onBack, navigate }) {
    const [period, setPeriod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [projectOptions, setProjectOptions] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [addingRow, setAddingRow] = useState(false);
    const [duplicateOpen, setDuplicateOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchAPI(`/weekly-report/periods/${periodId}`);
            setPeriod(res.data);
        } catch (err) {
            setError(err.message || 'Failed to load week.');
        } finally {
            setLoading(false);
        }
    }, [periodId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetchAPI('/weekly-report/projects').then((res) => setProjectOptions(res.data || [])).catch(() => {});
    }, []);

    const handleToggleDone = async (item) => {
        setPeriod((p) => ({ ...p, items: p.items.map((i) => i.id === item.id ? { ...i, is_done: !i.is_done } : i) }));
        try {
            await fetchAPI(`/weekly-report/items/${item.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ is_done: !item.is_done }),
            });
        } catch (err) {
            alert(err.message || 'Failed to update status.');
            load();
        }
    };

    const handleAddItem = async (payload) => {
        try {
            await fetchAPI(`/weekly-report/periods/${periodId}/items`, { method: 'POST', body: JSON.stringify(payload) });
            await load();
        } catch (err) {
            alert(err.message || 'Failed to add item.');
        }
    };

    const handleUpdateItem = async (payload) => {
        setSaving(true);
        try {
            await fetchAPI(`/weekly-report/items/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            setEditingItem(null);
            await load();
        } catch (err) {
            alert(err.message || 'Failed to save item.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (item) => {
        if (!window.confirm('Delete this checklist item?')) return;
        try {
            await fetchAPI(`/weekly-report/items/${item.id}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            alert(err.message || 'Failed to delete item.');
        }
    };

    const handleDuplicate = async (range) => {
        setSaving(true);
        try {
            const res = await fetchAPI(`/weekly-report/periods/${periodId}/duplicate`, { method: 'POST', body: JSON.stringify(range) });
            setDuplicateOpen(false);
            navigate(`/weekly-report/${boardId}/${res.data.id}`);
        } catch (err) {
            alert(err.message || 'Failed to duplicate week.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-sm text-slate-500 py-8 text-center">Loading...</p>;
    if (error) return <p className="text-sm text-rose-500 py-8 text-center">{error}</p>;
    if (!period) return null;

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
                <ArrowLeft className="size-4" /> Back to weeks
            </Button>

            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold">{formatDate(period.week_start)} – {formatDate(period.week_end)}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)} className="gap-1.5">
                        <Copy className="size-4" /> Duplicate to Next Week
                    </Button>
                    <Button size="sm" variant={addingRow ? 'outline' : 'default'} onClick={() => setAddingRow((v) => !v)} className="gap-1.5">
                        <Plus className="size-4" /> {addingRow ? 'Done Adding' : 'Add Item'}
                    </Button>
                </div>
            </div>

            {period.items.length === 0 && !addingRow ? (
                <Card><CardContent className="py-10 text-center text-sm text-slate-500">No items yet. Click "Add Item" to add one directly in the table.</CardContent></Card>
            ) : (
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-4 px-6 w-8"></th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Project</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Description</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Next Action</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Level</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Assignee</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Due</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Reporter</th>
                                    <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {period.items.map((item) => (
                                    <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group ${item.is_done ? 'opacity-60' : ''}`}>
                                        <td className="py-4 px-6">
                                            <Checkbox checked={item.is_done} onCheckedChange={() => handleToggleDone(item)} />
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{item.project?.name || '—'}</td>
                                        <td className={`py-4 px-6 max-w-xs text-slate-900 dark:text-white ${item.is_done ? 'line-through' : ''}`}>{item.description}</td>
                                        <td className="py-4 px-6 max-w-xs text-slate-500 dark:text-slate-400">{item.next_action || '—'}</td>
                                        <td className="py-4 px-6">
                                            <Badge className={`font-medium ${ISSUE_BADGE[item.issue_level] || ''}`}>{item.issue_level}</Badge>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{item.assignees.map((a) => a.name).join(', ') || '—'}</td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(item.due_date)}</td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{item.reporter?.name || '—'}</td>
                                        <td className="py-4 px-6 text-right whitespace-nowrap">
                                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingItem(item)}>
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="size-7 text-rose-500 hover:text-rose-600" onClick={() => handleDeleteItem(item)}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {addingRow && (
                                    <NewItemRow userOptions={userOptions} projectOptions={projectOptions} onSave={handleAddItem} />
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <EditItemDialog
                item={editingItem}
                onOpenChange={(v) => !v && setEditingItem(null)}
                userOptions={userOptions}
                projectOptions={projectOptions}
                onSubmit={handleUpdateItem}
                saving={saving}
            />
            <DuplicateDialog
                open={duplicateOpen}
                onOpenChange={setDuplicateOpen}
                period={period}
                onSubmit={handleDuplicate}
                saving={saving}
            />
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* Root                                                                     */
/* ---------------------------------------------------------------------- */

export default function WeeklyReport() {
    const { boardId, periodId } = useParams();
    const navigate = useNavigate();
    const [userOptions, setUserOptions] = useState([]);

    useEffect(() => {
        fetchAPI('/weekly-report/users').then((res) => setUserOptions(res.data || [])).catch(() => {});
    }, []);

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16">
            {!boardId && (
                <BoardListView userOptions={userOptions} onOpenBoard={(id) => navigate(`/weekly-report/${id}`)} />
            )}
            {boardId && !periodId && (
                <BoardDetailView
                    boardId={boardId}
                    userOptions={userOptions}
                    onOpenPeriod={(id) => navigate(`/weekly-report/${boardId}/${id}`)}
                    onBack={() => navigate('/weekly-report')}
                />
            )}
            {boardId && periodId && (
                <PeriodDetailView
                    boardId={boardId}
                    periodId={periodId}
                    userOptions={userOptions}
                    onBack={() => navigate(`/weekly-report/${boardId}`)}
                    navigate={navigate}
                />
            )}
        </div>
    );
}
