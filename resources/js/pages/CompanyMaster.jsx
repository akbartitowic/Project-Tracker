import { useEffect, useState, useRef } from 'react';
import { fetchAPI, getApiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Building2, Plus, Pencil, Trash2, Loader2, ImagePlus } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

async function saveCompanyForm({ editingId, name, logoFile, removeLogo }) {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('name', name);
  if (logoFile) {
    formData.append('logo', logoFile);
  }
  if (editingId && removeLogo) {
    formData.append('remove_logo', '1');
  }

  const isEdit = Boolean(editingId);
  const url = isEdit ? `${getApiUrl()}/companies/${editingId}` : `${getApiUrl()}/companies`;
  if (isEdit) {
    formData.append('_method', 'PUT');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = data.message;
    if (message && typeof message === 'object') {
      message = Object.values(message).flat().join(' ');
    }
    if (!message && data.errors) {
      message = Object.values(data.errors).flat().join(' ');
    }
    throw new Error(message || `Save failed (${response.status})`);
  }
  return data;
}

function CompanyLogo({ url, name, className = 'size-10' }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name} logo` : 'Company logo'}
        className={`${className} rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white`}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400`}
    >
      <Building2 className="size-5" />
    </div>
  );
}

export default function CompanyMaster() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'list_company.create');
  const canUpdate = hasPermission(user, 'list_company.update');
  const canDelete = hasPermission(user, 'list_company.delete');

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/companies');
      setCompanies(res.data || []);
    } catch (error) {
      alert('Failed to load companies: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const resetForm = () => {
    setName('');
    setLogoFile(null);
    setRemoveLogo(false);
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    resetForm();
  };

  const openCreateModal = () => {
    if (!canCreate) {
      alert('You do not have permission to add companies.');
      return;
    }
    setEditingItem(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!canUpdate) {
      alert('You do not have permission to edit companies.');
      return;
    }
    setEditingItem(item);
    setName(item.name);
    setLogoFile(null);
    setRemoveLogo(false);
    setLogoPreview(item.logo_url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setModalOpen(true);
  };

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be 2 MB or smaller.');
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (editingItem && !canUpdate) {
      alert('You do not have permission to edit companies.');
      return;
    }
    if (!editingItem && !canCreate) {
      alert('You do not have permission to add companies.');
      return;
    }

    setSaving(true);
    try {
      await saveCompanyForm({
        editingId: editingItem?.id,
        name: trimmed,
        logoFile,
        removeLogo: editingItem && removeLogo,
      });
      closeModal();
      await load();
    } catch (error) {
      alert(error.message || 'Failed to save company.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!canDelete) {
      alert('You do not have permission to delete companies.');
      return;
    }
    if (!window.confirm('Delete this company?')) return;
    try {
      await fetchAPI(`/companies/${id}`, { method: 'DELETE' });
      if (editingItem?.id === id) closeModal();
      load();
    } catch (error) {
      alert(error.message || 'Failed to delete company.');
    }
  };

  const isEdit = Boolean(editingItem);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">List Company</h1>
          <p className="text-slate-500 mt-1 text-sm">Company master data for Presales.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Add company
          </Button>
        )}
      </div>

      {!canUpdate && !canCreate && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          You have read-only access. Editing requires the <strong>Update List Company</strong> permission in Access Control.
        </p>
      )}

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : companies.length === 0 ? (
            <p className="text-slate-500 text-sm">No companies yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium w-16">Logo</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 font-medium text-right w-28">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {companies.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <CompanyLogo url={item.logo_url} name={item.name} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
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
            <DialogTitle>{isEdit ? 'Edit company' : 'Add company'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update company name and logo.' : 'Enter company name and optional logo.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <CompanyLogo url={removeLogo ? null : logoPreview} name={name} className="size-20" />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  {logoPreview && !removeLogo ? 'Change logo' : 'Upload logo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onLogoChange}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center">PNG, JPG, or WEBP · max 2 MB</p>
              {isEdit && (editingItem?.logo_url || logoPreview) && !logoFile && (
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <Checkbox
                    checked={removeLogo}
                    onCheckedChange={(c) => {
                      setRemoveLogo(c === true);
                      if (c === true) setLogoFile(null);
                    }}
                  />
                  Remove current logo
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
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
                {isEdit ? 'Save changes' : 'Add company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
