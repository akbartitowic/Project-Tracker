import { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SalesCategoryProjectMaster() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/sales-category-projects');
      setRows(res.data || []);
    } catch (error) {
      alert('Gagal memuat category project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editing) {
        await fetchAPI(`/sales-category-projects/${editing}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
      } else {
        await fetchAPI('/sales-category-projects', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      }
      setName('');
      setEditing(null);
      load();
    } catch (error) {
      alert(error.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Hapus category project ini?')) return;
    try {
      await fetchAPI(`/sales-category-projects/${id}`, { method: 'DELETE' });
      load();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Category Project</h1>
        <p className="text-slate-500 mt-1">Master kategori project untuk Sales (pitch).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Edit Category Project' : 'Tambah Category Project'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama category project"
            />
            <Button type="submit">
              <Plus className="size-4 mr-2" />
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Category Project</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-slate-500">Belum ada data.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="size-4 shrink-0 text-slate-400" />
                    <span className="font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(item.id);
                        setName(item.name);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => remove(item.id)}>
                      <Trash2 className="size-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
