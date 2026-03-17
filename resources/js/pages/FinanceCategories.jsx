import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FinanceCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form States
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editCategory, setEditCategory] = useState(null);

    const loadCategories = async () => {
        try {
            const data = await fetchAPI('/finance-categories');
            setCategories(data.data || []);
        } catch (error) {
            console.error('Failed to load finance categories:', error);
            alert('Failed to load finance categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            await fetchAPI('/finance-categories', {
                method: 'POST',
                body: JSON.stringify({ name: newCategoryName })
            });
            setIsAddModalOpen(false);
            setNewCategoryName('');
            loadCategories();
        } catch (error) {
            alert('Failed to create category: ' + error.message);
        }
    };

    const handleEditCategory = async (e) => {
        e.preventDefault();
        if (!editCategory.name.trim()) return;

        try {
            await fetchAPI(`/finance-categories/${editCategory.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editCategory.name })
            });
            setIsEditModalOpen(false);
            setEditCategory(null);
            loadCategories();
        } catch (error) {
            alert('Failed to update category: ' + error.message);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) return;

        try {
            await fetchAPI(`/finance-categories/${id}`, { method: 'DELETE' });
            loadCategories();
        } catch (error) {
            alert('Failed to delete category: ' + error.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Finance Categories Master Data</h1>
                    <p className="text-slate-500 dark:text-text-secondary">Manage dynamic categories for project cost allocation (e.g. Freelance, Commission).</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                    <Plus className="size-4" />
                    Add Category
                </Button>
            </div>

            {/* List */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Category Name</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm w-32 pb-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="2" className="py-8 text-center text-slate-500">Loading categories...</td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan="2" className="py-8 text-center text-slate-500">No finance categories found.</td>
                                </tr>
                            ) : (
                                categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                    <Tag className="size-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-white">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditCategory(cat); setIsEditModalOpen(true); }}
                                                    className="size-8 text-slate-400 hover:text-primary hover:bg-primary/10">
                                                    <Edit2 className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id, cat.name)}
                                                    className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add Category Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">Add Finance Category</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="size-8 text-slate-400 hover:text-slate-600">
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleCreateCategory}>
                            <CardContent className="pt-6 pb-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Category Name</span>
                                    <Input
                                        type="text"
                                        placeholder="e.g. Freelance"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        required
                                        autoFocus
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </label>
                            </CardContent>
                            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
                                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="min-w-24">Create Category</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Edit Category Modal */}
            {isEditModalOpen && editCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">Edit Category</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)} className="size-8 text-slate-400 hover:text-slate-600">
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleEditCategory}>
                            <CardContent className="pt-6 pb-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Category Name</span>
                                    <Input
                                        type="text"
                                        value={editCategory.name}
                                        onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                                        required
                                        autoFocus
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </label>
                            </CardContent>
                            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="min-w-24 flex items-center gap-2">
                                    <Check className="size-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
