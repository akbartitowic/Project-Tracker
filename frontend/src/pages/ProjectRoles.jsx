import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Shield, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProjectRoles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form States
    const [newRoleName, setNewRoleName] = useState('');
    const [editRole, setEditRole] = useState(null);

    const loadRoles = async () => {
        try {
            const data = await fetchAPI('/project-roles');
            setRoles(data.data || []);
        } catch (error) {
            console.error('Failed to load project roles:', error);
            alert('Failed to load project roles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        try {
            await fetchAPI('/project-roles', {
                method: 'POST',
                body: JSON.stringify({ name: newRoleName })
            });
            setIsAddModalOpen(false);
            setNewRoleName('');
            loadRoles();
        } catch (error) {
            alert('Failed to create project role: ' + error.message);
        }
    };

    const handleEditRole = async (e) => {
        e.preventDefault();
        if (!editRole.name.trim()) return;

        try {
            await fetchAPI(`/project-roles/${editRole.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editRole.name })
            });
            setIsEditModalOpen(false);
            setEditRole(null);
            loadRoles();
        } catch (error) {
            alert('Failed to update project role: ' + error.message);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete the role "${name}"?`)) return;

        try {
            await fetchAPI(`/project-roles/${id}`, { method: 'DELETE' });
            loadRoles();
        } catch (error) {
            alert('Failed to delete project role: ' + error.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Project Roles Master Data</h1>
                    <p className="text-slate-500 dark:text-text-secondary">Manage the dynamic list of roles available when creating project teams.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                    <Plus className="size-4" />
                    Add Project Role
                </Button>
            </div>

            {/* List */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm">Role Name</th>
                                <th className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400 text-sm w-32 pb-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="2" className="py-8 text-center text-slate-500 focus:outline-none">Loading roles...</td>
                                </tr>
                            ) : roles.length === 0 ? (
                                <tr>
                                    <td colSpan="2" className="py-8 text-center text-slate-500 focus:outline-none">No project roles found.</td>
                                </tr>
                            ) : (
                                roles.map(role => (
                                    <tr key={role.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                    <Shield className="size-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-white">{role.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditRole(role); setIsEditModalOpen(true); }}
                                                    className="size-8 text-slate-400 hover:text-primary hover:bg-primary/10">
                                                    <Edit2 className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id, role.name)}
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

            {/* Add Role Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">Add Project Role</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="size-8 text-slate-400 hover:text-slate-600">
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleCreateRole}>
                            <CardContent className="pt-6 pb-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Role Name</span>
                                    <Input
                                        type="text"
                                        placeholder="e.g. Lead Designer"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        required
                                        autoFocus
                                        className="bg-slate-50 dark:bg-slate-900"
                                    />
                                </label>
                            </CardContent>
                            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
                                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="min-w-24">Create Role</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Edit Role Modal */}
            {isEditModalOpen && editRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">Edit Project Role</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)} className="size-8 text-slate-400 hover:text-slate-600">
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleEditRole}>
                            <CardContent className="pt-6 pb-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Role Name</span>
                                    <Input
                                        type="text"
                                        value={editRole.name}
                                        onChange={(e) => setEditRole({ ...editRole, name: e.target.value })}
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
