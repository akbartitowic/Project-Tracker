import { useState, useEffect } from 'react';
import { fetchAPI, getApiUrl } from '../services/api';
import { Megaphone, Plus, Edit2, Trash2, X, Check, Info, CheckCircle2, AlertTriangle, AlertOctagon, Paperclip, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const TYPE_META = {
    info: { label: 'Info', Icon: Info, badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
    success: { label: 'Success', Icon: CheckCircle2, badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    warning: { label: 'Warning', Icon: AlertTriangle, badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
    danger: { label: 'Danger', Icon: AlertOctagon, badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
};

const EMPTY_FORM = { title: '', message: '', type: 'info', is_active: true, expires_at: '', sort_order: 0 };
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

async function uploadAttachmentFile(id, file) {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('attachment', file);
    const response = await fetch(`${getApiUrl()}/announcements/${id}/attachment`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Failed to upload attachment');
    }
    return data.data;
}

function toDatetimeLocalValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(a) {
    if (!a.is_active) return { label: 'Inactive', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    if (a.expires_at && new Date(a.expires_at) <= new Date()) {
        return { label: 'Expired', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500' };
    }
    return { label: 'Live', className: 'bg-primary/10 text-primary' };
}

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [pendingFile, setPendingFile] = useState(null);
    const [attachmentBusy, setAttachmentBusy] = useState(false);

    const load = async () => {
        try {
            const res = await fetchAPI('/announcements');
            setAnnouncements(res.data || []);
        } catch (err) {
            alert(err.message || 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setIsAddOpen(true);
    };

    const openEdit = (a) => {
        setEditing(a);
        setForm({
            title: a.title,
            message: a.message,
            type: a.type,
            is_active: a.is_active,
            expires_at: toDatetimeLocalValue(a.expires_at),
            sort_order: a.sort_order ?? 0,
        });
    };

    const buildPayload = () => ({
        title: form.title,
        message: form.message,
        type: form.type,
        is_active: form.is_active,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        sort_order: Number(form.sort_order) || 0,
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetchAPI('/announcements', { method: 'POST', body: JSON.stringify(buildPayload()) });
            if (pendingFile) {
                await uploadAttachmentFile(res.data.id, pendingFile);
            }
            setIsAddOpen(false);
            setPendingFile(null);
            load();
        } catch (err) {
            alert(err.message || 'Failed to create announcement');
        }
    };

    const validateAttachmentFile = (file) => {
        if (file.size > ATTACHMENT_MAX_BYTES) {
            alert('File size must not exceed 10 MB.');
            return false;
        }
        return true;
    };

    const onCreateFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !validateAttachmentFile(file)) return;
        setPendingFile(file);
    };

    const onEditFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !validateAttachmentFile(file) || !editing) return;
        setAttachmentBusy(true);
        try {
            const data = await uploadAttachmentFile(editing.id, file);
            setEditing(data);
            setAnnouncements((prev) => prev.map((x) => (x.id === data.id ? data : x)));
        } catch (err) {
            alert(err.message || 'Failed to upload attachment');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleRemoveAttachment = async () => {
        if (!editing) return;
        setAttachmentBusy(true);
        try {
            const res = await fetchAPI(`/announcements/${editing.id}/attachment`, { method: 'DELETE' });
            setEditing(res.data);
            setAnnouncements((prev) => prev.map((x) => (x.id === res.data.id ? res.data : x)));
        } catch (err) {
            alert(err.message || 'Failed to remove attachment');
        } finally {
            setAttachmentBusy(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await fetchAPI(`/announcements/${editing.id}`, { method: 'PUT', body: JSON.stringify(buildPayload()) });
            setEditing(null);
            load();
        } catch (err) {
            alert(err.message || 'Failed to update announcement');
        }
    };

    const handleToggleActive = async (a, checked) => {
        setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: checked } : x)));
        try {
            await fetchAPI(`/announcements/${a.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: a.title, message: a.message, type: a.type,
                    is_active: checked, expires_at: a.expires_at, sort_order: a.sort_order ?? 0,
                }),
            });
        } catch (err) {
            setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: a.is_active } : x)));
            alert(err.message || 'Failed to update announcement');
        }
    };

    const handleDelete = async (a) => {
        if (!window.confirm(`Delete announcement "${a.title}"? This cannot be undone.`)) return;
        try {
            await fetchAPI(`/announcements/${a.id}`, { method: 'DELETE' });
            load();
        } catch (err) {
            alert(err.message || 'Failed to delete announcement');
        }
    };

    const modalOpen = isAddOpen || Boolean(editing);
    const closeModal = () => { setIsAddOpen(false); setEditing(null); setPendingFile(null); };
    const submitHandler = editing ? handleUpdate : handleCreate;

    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 pb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                        <Megaphone className="size-7 text-primary" />
                        Announcements
                    </h1>
                    <p className="text-slate-500 dark:text-text-secondary">Broadcast information to everyone on the login page.</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                    <Plus className="size-4" />
                    New Announcement
                </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Announcement</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Type</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Status</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Expires</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Live</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr><td colSpan="6" className="py-8 text-center text-slate-500">Loading announcements...</td></tr>
                            ) : announcements.length === 0 ? (
                                <tr><td colSpan="6" className="py-8 text-center text-slate-500">No announcements yet.</td></tr>
                            ) : announcements.map((a) => {
                                const meta = TYPE_META[a.type] || TYPE_META.info;
                                const status = statusOf(a);
                                return (
                                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="py-4 px-6 max-w-sm">
                                            <p className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                                {a.title}
                                                {a.attachment_name && (
                                                    <Paperclip className="size-3.5 text-slate-400 shrink-0" />
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{a.message}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <Badge className={`gap-1.5 font-medium ${meta.badgeClass}`}>
                                                <meta.Icon className="size-3.5" />
                                                {meta.label}
                                            </Badge>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">
                                            {a.expires_at ? new Date(a.expires_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <Switch checked={a.is_active} onCheckedChange={(checked) => handleToggleActive(a, checked === true)} />
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(a)}
                                                    className="size-8 text-slate-400 hover:text-primary hover:bg-primary/10">
                                                    <Edit2 className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(a)}
                                                    className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <Card className="w-full max-w-lg shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">{editing ? 'Edit Announcement' : 'New Announcement'}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={closeModal} className="size-8 text-slate-400 hover:text-slate-600">
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <form onSubmit={submitHandler}>
                            <CardContent className="pt-6 pb-6 space-y-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</span>
                                    <Input
                                        placeholder="e.g. Scheduled maintenance tonight"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                        autoFocus
                                        maxLength={255}
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </label>

                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</span>
                                    <Textarea
                                        placeholder="What do you want visitors to see on the login page?"
                                        value={form.message}
                                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                                        required
                                        rows={4}
                                        maxLength={2000}
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</span>
                                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                            <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TYPE_META).map(([value, meta]) => (
                                                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </label>

                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Expires (optional)</span>
                                        <Input
                                            type="datetime-local"
                                            value={form.expires_at}
                                            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                                            className="bg-slate-50 dark:bg-slate-900"
                                        />
                                    </label>
                                </div>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(checked) => setForm({ ...form, is_active: checked === true })}
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Active</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Shown on the login page immediately while active.</p>
                                    </div>
                                </label>

                                <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700 space-y-2">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Paperclip className="size-4" />
                                        Attachment (optional)
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        PDF, Office docs, image, or ZIP — max 10 MB. Shown as a download link on the login page.
                                    </p>

                                    {editing ? (
                                        editing.attachment_name ? (
                                            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                                                <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex items-center gap-2 min-w-0">
                                                    <Paperclip className="size-3.5 shrink-0" />
                                                    <span className="truncate">{editing.attachment_name}</span>
                                                </span>
                                                <Button
                                                    type="button" variant="ghost" size="icon" onClick={handleRemoveAttachment} disabled={attachmentBusy}
                                                    className="size-8 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    {attachmentBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                                </Button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
                                                {attachmentBusy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                                                {attachmentBusy ? 'Uploading…' : 'Choose file'}
                                                <input type="file" className="hidden" disabled={attachmentBusy} onChange={onEditFileChange} />
                                            </label>
                                        )
                                    ) : pendingFile ? (
                                        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex items-center gap-2 min-w-0">
                                                <Paperclip className="size-3.5 shrink-0" />
                                                <span className="truncate">{pendingFile.name}</span>
                                            </span>
                                            <Button
                                                type="button" variant="ghost" size="icon" onClick={() => setPendingFile(null)}
                                                className="size-8 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <X className="size-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
                                            <Paperclip className="size-4" />
                                            Choose file
                                            <input type="file" className="hidden" onChange={onCreateFileChange} />
                                        </label>
                                    )}
                                </div>
                            </CardContent>
                            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
                                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                                <Button type="submit" className="min-w-24 flex items-center gap-2">
                                    <Check className="size-4" />
                                    {editing ? 'Save Changes' : 'Publish'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
