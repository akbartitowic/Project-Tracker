import { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Layers, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SalesCategoryProjectMaster() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'sales_category_project.create');
  const canUpdate = hasPermission(user, 'sales_category_project.update');
  const canDelete = hasPermission(user, 'sales_category_project.delete');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/sales-category-projects');
      setRows(res.data || []);
    } catch (error) {
      alert('Failed to load categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => setName('');

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    resetForm();
  };

  const openCreateModal = () => {
    if (!canCreate) {
      alert('You do not have permission to add categories.');
      return;
    }
    setEditingItem(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!canUpdate) {
      alert('You do not have permission to edit categories.');
      return;
    }
    setEditingItem(item);
    setName(item.name);
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (editingItem && !canUpdate) {
      alert('You do not have permission to edit categories.');
      return;
    }
    if (!editingItem && !canCreate) {
      alert('You do not have permission to add categories.');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await fetchAPI(`/sales-category-projects/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: trimmed }),
        });
      } else {
        await fetchAPI('/sales-category-projects', {
          method: 'POST',
          body: JSON.stringify({ name: trimmed }),
        });
      }
      closeModal();
      await load();
    } catch (error) {
      alert(error.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!canDelete) {
      alert('You do not have permission to delete categories.');
      return;
    }
    if (!window.confirm('Delete this category?')) return;
    try {
      await fetchAPI(`/sales-category-projects/${id}`, { method: 'DELETE' });
      if (editingItem?.id === id) closeModal();
      load();
    } catch (error) {
      alert(error.message || 'Failed to delete category.');
    }
  };

  const isEdit = Boolean(editingItem);

  return (
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Category Project</h1>
          <p className="text-slate-500 mt-1 text-sm">Project category master data for Sales.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Add category
          </Button>
        )}
      </div>

      {!canUpdate && !canCreate && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          You have read-only access. Editing requires the <strong>Update Sales Category Project</strong> permission in Access Control.
        </p>
      )}

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-slate-500 text-sm">No categories yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 font-medium text-right w-28">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                          <Layers className="size-4 text-primary shrink-0" />
                          {item.name}
                        </div>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {canUpdate && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(item)}
                                title="Edit"
                              >
                                <Pencil className="size-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(item.id)}
                                title="Delete"
                              >
                                <Trash2 className="size-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update the category project name.' : 'Enter a name for the new category project.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                required
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isEdit ? 'Save changes' : 'Add category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
