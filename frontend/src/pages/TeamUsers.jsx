import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { User, Shield, Code, Bug, Settings, UserPlus, Edit, Trash2, MessageSquare, X, Save, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function TeamUsers() {
    const [users, setUsers] = useState([]);
    const [projectRoles, setProjectRoles] = useState([]);

    // Create User Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Edit User Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        role: '',
        status: 'Active'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = async () => {
        try {
            const [usersData, rolesData] = await Promise.all([
                fetchAPI('/users'),
                fetchAPI('/project-roles')
            ]);

            if (usersData.data) {
                setUsers(usersData.data);
            }
            if (rolesData.data) {
                setProjectRoles(rolesData.data);
            }
        } catch (err) {
            console.error("Failed to fetch data", err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id.replace('user-', '')]: value }));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await fetchAPI('/users', {
                method: 'POST',
                body: JSON.stringify({ ...formData, status: 'Active' })
            });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone_number: '', role: '', status: 'Active' });
            loadData();
        } catch (err) {
            alert("Error adding user: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user) => {
        setEditingUserId(user.id);
        setFormData({
            name: user.name,
            email: user.email,
            phone_number: user.phone_number || '',
            role: user.role,
            status: user.status
        });
        setIsEditModalOpen(true);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await fetchAPI(`/users/${editingUserId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            setIsEditModalOpen(false);
            setEditingUserId(null);
            setFormData({ name: '', email: '', phone_number: '', role: '', status: 'Active' });
            loadData();
        } catch (err) {
            alert("Error updating user: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await fetchAPI(`/users/${id}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            alert("Error deleting user: " + err.message);
        }
    };

    const renderRoleBadge = (role) => {
        let RoleIcon = User;
        let roleClass = 'bg-slate-200/80 text-slate-700';
        if (role.includes('Manager')) { RoleIcon = Shield; roleClass = 'bg-purple-100/80 text-purple-700 hover:bg-purple-200/80'; }
        if (role.includes('Developer')) { RoleIcon = Code; roleClass = 'bg-blue-100/80 text-blue-700 hover:bg-blue-200/80'; }
        if (role.includes('QA')) { RoleIcon = Bug; roleClass = 'bg-amber-100/80 text-amber-700 hover:bg-amber-200/80'; }

        return (
            <Badge variant="secondary" className={`gap-1.5 px-3 py-1 text-xs font-bold border-opacity-50 ${roleClass}`}>
                <RoleIcon className="size-3.5" />
                {role}
            </Badge>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto w-full transition-colors duration-200 relative">
            <div className="flex flex-1 justify-center py-8 z-0">
                <div className="w-full max-w-[1200px] px-4 md:px-6 flex flex-col gap-8">
                    {/* Page Title & Actions */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">Team Directory</h1>
                            <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium">Manage administrators, developers, and quality assurance personnel.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="gap-2 h-10 px-5 shadow-sm bg-white/70 dark:bg-slate-800/70">
                                <Settings className="size-4" />
                                <span>Roles & Permissions</span>
                            </Button>
                            <Button className="gap-2 h-10 px-5 shadow-lg shadow-blue-500/25 bg-gradient-to-r from-primary to-blue-500 hover:from-blue-600 hover:to-primary transition-all transform hover:-translate-y-0.5" onClick={() => setIsModalOpen(true)}>
                                <UserPlus className="size-5" />
                                <span>Add New User</span>
                            </Button>
                        </div>
                    </div>

                    {/* User Table */}
                    <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-xl transition-colors duration-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                                        <th className="p-5 pl-6 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Employee Details</th>
                                        <th className="p-5 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">System Role</th>
                                        <th className="p-5 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">WhatsApp Number</th>
                                        <th className="p-5 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                        <th className="p-5 pr-6 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {users.map(user => (
                                        <tr key={user.id} className="group hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors duration-150">
                                            <td className="p-5 pl-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 border-2 border-white dark:border-slate-700 shadow-sm">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{user.name}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {renderRoleBadge(user.role)}
                                            </td>
                                            <td className="p-5">
                                                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                    {user.phone_number || <em className="text-slate-400 text-xs">Unset</em>}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <div className={`flex items-center gap-2 text-xs font-medium ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    <div className={`size-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div> {user.status}
                                                </div>
                                            </td>
                                            <td className="p-5 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => openEditModal(user)}>
                                                        <Edit className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteUser(user.id)}>
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
                                <UserPlus className="size-5" />
                            </span>
                            Create New User
                        </DialogTitle>
                    </DialogHeader>
                    <form className="flex flex-col gap-6 py-4" onSubmit={handleAddUser}>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                            <Input type="text" id="user-name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" required className="py-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                            <Input type="email" id="user-email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@executrack.io" required className="py-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                WhatsApp Number
                                <MessageSquare className="size-3.5 text-green-500" />
                            </label>
                            <Input type="tel" id="user-phone_number" value={formData.phone_number} onChange={handleInputChange} placeholder="+62 812 3456 7890" className="py-6 focus-visible:ring-green-500" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Temporary Password</label>
                            <Input type="password" placeholder="••••••••" required className="py-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">System Role</label>
                            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))} required>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectRoles.map(role => (
                                        <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="mt-4 border-t border-slate-200/50 dark:border-slate-700/50 pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-blue-500 hover:from-blue-600 hover:to-primary shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                                Save User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
                                <Edit className="size-5" />
                            </span>
                            Edit User Profile
                        </DialogTitle>
                    </DialogHeader>
                    <form className="flex flex-col gap-6 py-4" onSubmit={handleEditUser}>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                            <Input type="text" id="user-name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" required className="py-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                            <Input type="email" id="user-email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@executrack.io" required className="py-6" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                WhatsApp Number
                                <MessageSquare className="size-3.5 text-green-500" />
                            </label>
                            <Input type="tel" id="user-phone_number" value={formData.phone_number} onChange={handleInputChange} placeholder="+62 812 3456 7890" className="py-6 focus-visible:ring-green-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">System Role</label>
                                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))} required>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectRoles.map(role => (
                                            <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Account Status</label>
                                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))} required>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                        <SelectItem value="Suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="mt-4 border-t border-slate-200/50 dark:border-slate-700/50 pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-blue-500 hover:from-blue-600 hover:to-primary shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                                Update User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
