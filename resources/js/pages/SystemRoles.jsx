import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Shield, Lock, Save, Plus, Trash2, CheckCircle2, Circle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SystemRoles() {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [selectedRole, setSelectedRole] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rolesRes, permRes] = await Promise.all([
                fetchAPI('/roles'),
                fetchAPI('/permissions')
            ]);
            if (rolesRes.data) setRoles(rolesRes.data);
            if (permRes.data) setPermissions(permRes.data);
            
            // Auto Select first role if none selected
            if (!selectedRole && rolesRes.data?.length > 0) {
                setSelectedRole(rolesRes.data[0]);
            } else if (selectedRole) {
                // Update selected role data from fresh fetch
                const updated = rolesRes.data.find(r => r.id === selectedRole.id);
                if (updated) setSelectedRole(updated);
            }
        } catch (err) {
            console.error("Failed to load roles/permissions", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePermission = (id) => {
        if (!selectedRole) return;
        
        const currentPerms = selectedRole.permissions.map(p => p.id);
        let nextPerms;
        
        if (currentPerms.includes(id)) {
            nextPerms = currentPerms.filter(pId => pId !== id);
        } else {
            nextPerms = [...currentPerms, id];
        }

        setSelectedRole({
            ...selectedRole,
            permissions: nextPerms.map(pId => ({ id: pId })) // Temporary update for UI feedback
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setIsLoading(true);
        try {
            await fetchAPI(`/roles/${selectedRole.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: selectedRole.name,
                    permissions: selectedRole.permissions.map(p => p.id)
                })
            });
            await loadData();
            alert("Permissions updated successfully!");
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) return;
        try {
            await fetchAPI('/roles', {
                method: 'POST',
                body: JSON.stringify({ name: newRoleName })
            });
            setNewRoleName('');
            setIsCreating(false);
            await loadData();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const handleDeleteRole = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete the role "${name}"? This may affect users assigned to this role.`)) return;
        try {
            await fetchAPI(`/roles/${id}`, { method: 'DELETE' });
            if (selectedRole?.id === id) setSelectedRole(null);
            await loadData();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Lock className="size-8 text-primary" />
                        Access Control
                    </h1>
                    <p className="text-slate-500 font-medium">Manage system roles and their modular permissions.</p>
                </div>
                <Button onClick={() => setIsCreating(true)} className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="size-4" /> Create New Role
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Roles List */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider px-2">System Roles</h3>
                    {roles.map((role) => (
                        <Card 
                            key={role.id} 
                            className={`group cursor-pointer transition-all border-2 ${selectedRole?.id === role.id ? 'border-primary ring-2 ring-primary/10 shadow-lg' : 'border-transparent hover:border-slate-200'} shadow-sm relative overflow-hidden`}
                            onClick={() => setSelectedRole(role)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedRole?.id === role.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Shield className="size-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white leading-none mb-1">{role.name}</p>
                                        <p className="text-xs text-slate-500">{role.permissions?.length || 0} permissions active</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-8 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRole(role.id, role.name);
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {isCreating && (
                        <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
                            <CardContent className="p-4 space-y-3">
                                <Input 
                                    placeholder="Enter role name..." 
                                    value={newRoleName} 
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    className="bg-white border-primary/20"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" className="flex-1" onClick={handleCreateRole}>Create</Button>
                                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setIsCreating(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Permissions Grid */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedRole ? (
                        <>
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-10">
                                <div>
                                    <Badge variant="outline" className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary border-primary/20">Configuring Access for</Badge>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedRole.name}</h2>
                                </div>
                                <Button onClick={handleSavePermissions} disabled={isLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                    {isLoading ? <Save className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    Apply Changes
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.keys(permissions).map((module) => (
                                    <Card key={module} className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 py-3 border-b border-slate-100 dark:border-slate-800">
                                            <CardTitle className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">{module}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-2">
                                            {permissions[module].map((perm) => {
                                                const isActive = selectedRole.permissions.some(p => p.id === perm.id);
                                                return (
                                                    <div 
                                                        key={perm.id} 
                                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'} `}
                                                        onClick={() => handleTogglePermission(perm.id)}
                                                    >
                                                        <span className="text-sm font-bold">{perm.name}</span>
                                                        {isActive ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-slate-200" />}
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-100 rounded-3xl">
                            < Shield className="size-16 mb-4 opacity-10" />
                            <p className="font-medium italic">Select a role on the left to manage permissions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
