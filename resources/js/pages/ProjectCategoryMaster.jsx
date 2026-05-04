import { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import { FolderTree, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectCategoryMaster() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/project-categories');
      setCategories(res.data || []);
    } catch (error) {
      alert('Gagal memuat category company: ' + error.message);
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
        await fetchAPI(`/project-categories/${editing}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
      } else {
        await fetchAPI('/project-categories', {
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
    if (!window.confirm('Hapus category company ini?')) return;
    try {
      await fetchAPI(`/project-categories/${id}`, { method: 'DELETE' });
      load();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Category Company</h1>
        <p className="text-slate-500 mt-1">Master data category company untuk Presales.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Edit Category Company' : 'Tambah Category Company'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan category company"
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
          <CardTitle>Data Category Company</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="text-slate-500">Belum ada category company.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((item) => (
                <div key={item.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FolderTree className="size-4 text-primary" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(item.id);
                        setName(item.name);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                      <Trash2 className="size-4 text-red-500" />
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
