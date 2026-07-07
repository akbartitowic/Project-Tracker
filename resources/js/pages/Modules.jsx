import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../services/api';
import { LayoutGrid, Loader2, ArrowUp, ArrowDown, Pencil, Trash2, Plus, Check, X, ListTree } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const EMPTY_MENU_ITEM_DRAFT = {
    permission_slug: '', section: '', path: '', label: '', icon: '', variant: 'primary', sort_order: 0,
};

export default function Modules() {
    const [modules, setModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    const [menuItems, setMenuItems] = useState([]);
    const [isLoadingMenuItems, setIsLoadingMenuItems] = useState(true);
    const [editingMenuItemId, setEditingMenuItemId] = useState(null);
    const [menuItemDraft, setMenuItemDraft] = useState(EMPTY_MENU_ITEM_DRAFT);
    const [isCreatingMenuItem, setIsCreatingMenuItem] = useState(false);
    const [savingMenuItemId, setSavingMenuItemId] = useState(null);

    const loadModules = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI('/modules');
            setModules(res.data || []);
        } catch (err) {
            console.error('Failed to load modules', err);
            alert(`Gagal memuat modul: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadMenuItems = useCallback(async () => {
        setIsLoadingMenuItems(true);
        try {
            const res = await fetchAPI('/menu-items');
            setMenuItems(res.data || []);
        } catch (err) {
            console.error('Failed to load menu items', err);
            alert(`Gagal memuat menu items: ${err.message}`);
        } finally {
            setIsLoadingMenuItems(false);
        }
    }, []);

    useEffect(() => { loadModules(); loadMenuItems(); }, [loadModules, loadMenuItems]);

    const updateModule = async (id, payload) => {
        setSavingId(id);
        try {
            const res = await fetchAPI(`/modules/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...res.data } : m)));
        } catch (err) {
            alert(`Gagal menyimpan perubahan: ${err.message}`);
        } finally {
            setSavingId(null);
        }
    };

    const toggleActive = (module) => updateModule(module.id, { is_active: !module.is_active });

    const moveModule = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= modules.length) return;

        const current = modules[index];
        const target = modules[targetIndex];

        const reordered = [...modules];
        reordered[index] = { ...target, sort_order: current.sort_order };
        reordered[targetIndex] = { ...current, sort_order: target.sort_order };
        reordered.sort((a, b) => a.sort_order - b.sort_order);
        setModules(reordered);

        updateModule(current.id, { sort_order: target.sort_order });
        updateModule(target.id, { sort_order: current.sort_order });
    };

    const startEditMenuItem = (item) => {
        setIsCreatingMenuItem(false);
        setEditingMenuItemId(item.id);
        setMenuItemDraft({ ...item });
    };

    const cancelMenuItemEdit = () => {
        setEditingMenuItemId(null);
        setIsCreatingMenuItem(false);
        setMenuItemDraft(EMPTY_MENU_ITEM_DRAFT);
    };

    const saveMenuItemEdit = async () => {
        setSavingMenuItemId(editingMenuItemId);
        try {
            const res = await fetchAPI(`/menu-items/${editingMenuItemId}`, {
                method: 'PUT',
                body: JSON.stringify(menuItemDraft),
            });
            setMenuItems((prev) => prev.map((m) => (m.id === editingMenuItemId ? res.data : m)));
            cancelMenuItemEdit();
        } catch (err) {
            alert(`Gagal menyimpan menu item: ${err.message}`);
        } finally {
            setSavingMenuItemId(null);
        }
    };

    const startCreateMenuItem = () => {
        setEditingMenuItemId(null);
        setIsCreatingMenuItem(true);
        setMenuItemDraft(EMPTY_MENU_ITEM_DRAFT);
    };

    const createMenuItem = async () => {
        setSavingMenuItemId('new');
        try {
            const res = await fetchAPI('/menu-items', {
                method: 'POST',
                body: JSON.stringify(menuItemDraft),
            });
            setMenuItems((prev) => [...prev, res.data]);
            cancelMenuItemEdit();
        } catch (err) {
            alert(`Gagal membuat menu item: ${err.message}`);
        } finally {
            setSavingMenuItemId(null);
        }
    };

    const deleteMenuItem = async (item) => {
        if (!window.confirm(`Hapus menu item "${item.label}"?`)) return;
        setSavingMenuItemId(item.id);
        try {
            await fetchAPI(`/menu-items/${item.id}`, { method: 'DELETE' });
            setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
        } catch (err) {
            alert(`Gagal menghapus menu item: ${err.message}`);
        } finally {
            setSavingMenuItemId(null);
        }
    };

    const draftField = (key, type = 'text') => (
        <Input
            className="h-8 text-xs"
            type={type}
            value={menuItemDraft[key] ?? ''}
            onChange={(e) => setMenuItemDraft((prev) => ({
                ...prev,
                [key]: type === 'number' ? Number(e.target.value) : e.target.value,
            }))}
        />
    );

    return (
        <div className="flex h-[calc(100dvh-4.25rem)] min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-[#151b28]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <LayoutGrid className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                                Modules
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Kelola urutan menu &amp; visibilitasnya di sidebar. Nama modul mengikuti definisi di kode.
                            </p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">{modules.length} modul</Badge>
                </div>
            </div>

            <div className="board-column-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 className="size-6 animate-spin" />
                    </div>
                ) : modules.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">Belum ada modul.</p>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151b28]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24">Urutan</TableHead>
                                    <TableHead>Nama Modul</TableHead>
                                    <TableHead className="text-center">Jumlah Permission</TableHead>
                                    <TableHead className="text-center">Aktif</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modules.map((module, index) => (
                                    <TableRow key={module.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                                                    onClick={() => moveModule(index, -1)}
                                                    disabled={index === 0 || savingId !== null}
                                                    aria-label={`Naikkan urutan ${module.name}`}
                                                >
                                                    <ArrowUp className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                                                    onClick={() => moveModule(index, 1)}
                                                    disabled={index === modules.length - 1 || savingId !== null}
                                                    aria-label={`Turunkan urutan ${module.name}`}
                                                >
                                                    <ArrowDown className="size-3.5" />
                                                </button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900 dark:text-white">
                                            {module.name}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums text-slate-500">
                                            {module.permissions_count}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Switch
                                                    checked={module.is_active}
                                                    onCheckedChange={() => toggleActive(module)}
                                                    disabled={savingId === module.id || module.slug === 'modules_management'}
                                                    title={module.slug === 'modules_management' ? 'Modul ini tidak bisa dinonaktifkan' : undefined}
                                                />
                                                {savingId === module.id && (
                                                    <Loader2 className="size-3.5 animate-spin text-slate-400" />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ListTree className="size-4 text-primary" />
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Menu Items</h2>
                            <Badge variant="secondary" className="tabular-nums">{menuItems.length}</Badge>
                        </div>
                        <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={startCreateMenuItem}
                            disabled={isCreatingMenuItem}
                        >
                            <Plus className="size-3.5" />
                            Tambah Item
                        </Button>
                    </div>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                        Label, path, ikon, dan urutan tiap item menu sidebar. `permission_slug` harus cocok dengan permission yang sudah ada.
                    </p>

                    {isLoadingMenuItems ? (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <Loader2 className="size-5 animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151b28]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Section</TableHead>
                                        <TableHead>Label</TableHead>
                                        <TableHead>Path</TableHead>
                                        <TableHead>Permission Slug</TableHead>
                                        <TableHead>Icon</TableHead>
                                        <TableHead className="w-20">Urutan</TableHead>
                                        <TableHead className="w-24 text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isCreatingMenuItem && (
                                        <TableRow>
                                            <TableCell>{draftField('section')}</TableCell>
                                            <TableCell>{draftField('label')}</TableCell>
                                            <TableCell>{draftField('path')}</TableCell>
                                            <TableCell>{draftField('permission_slug')}</TableCell>
                                            <TableCell>{draftField('icon')}</TableCell>
                                            <TableCell>{draftField('sort_order', 'number')}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={createMenuItem} disabled={savingMenuItemId === 'new'}>
                                                        {savingMenuItemId === 'new' ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-emerald-600" />}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={cancelMenuItemEdit}>
                                                        <X className="size-3.5 text-slate-400" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {menuItems.length === 0 && !isCreatingMenuItem ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-6 text-center text-sm text-slate-500">
                                                Belum ada menu item.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        menuItems.map((item) => {
                                            const isEditing = editingMenuItemId === item.id;
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-xs text-slate-500">{isEditing ? draftField('section') : (item.section || '—')}</TableCell>
                                                    <TableCell className="font-medium text-slate-900 dark:text-white">{isEditing ? draftField('label') : item.label}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">{isEditing ? draftField('path') : item.path}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">{isEditing ? draftField('permission_slug') : item.permission_slug}</TableCell>
                                                    <TableCell className="text-xs text-slate-500">{isEditing ? draftField('icon') : item.icon}</TableCell>
                                                    <TableCell className="tabular-nums text-xs text-slate-500">{isEditing ? draftField('sort_order', 'number') : item.sort_order}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={saveMenuItemEdit} disabled={savingMenuItemId === item.id}>
                                                                        {savingMenuItemId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-emerald-600" />}
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={cancelMenuItemEdit}>
                                                                        <X className="size-3.5 text-slate-400" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => startEditMenuItem(item)}>
                                                                        <Pencil className="size-3.5 text-slate-500" />
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => deleteMenuItem(item)} disabled={savingMenuItemId === item.id}>
                                                                        {savingMenuItemId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-rose-500" />}
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
