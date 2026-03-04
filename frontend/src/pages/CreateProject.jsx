import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { ChevronRight, FileText, Component, Clock, Users, Database, Code, PencilRuler, Activity, Bug, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CreateProject() {
    const navigate = useNavigate();
    const [methodology, setMethodology] = useState('Waterfall');

    // Member selection states
    const [members, setMembers] = useState([]);

    // Per-role manhours for Agile Scrum
    const [selectedRoles, setSelectedRoles] = useState([]);

    // Master data states
    const [usersList, setUsersList] = useState([]);
    const [projectRolesList, setProjectRolesList] = useState([]);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [usersData, rolesData] = await Promise.all([
                    fetchAPI('/users'),
                    fetchAPI('/project-roles')
                ]);
                setUsersList(usersData.data || []);
                setProjectRolesList(rolesData.data || []);
            } catch (error) {
                console.error("Failed to load users or roles:", error);
            }
        };
        loadMasterData();
    }, []);

    const handleAddMember = () => {
        setMembers([...members, { user_id: '', project_role_id: '' }]);
    };

    const handleRemoveMember = (index) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handleMemberChange = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index][field] = value;
        setMembers(newMembers);
    };

    const handleAddRoleQuota = () => {
        setSelectedRoles([...selectedRoles, { id: Date.now(), project_role_id: '', hours: '' }]);
    };

    const handleRemoveRoleQuota = (index) => {
        setSelectedRoles(selectedRoles.filter((_, i) => i !== index));
    };

    const handleRoleQuotaChange = (index, field, value) => {
        const newRoles = [...selectedRoles];
        newRoles[index][field] = value === '' && field === 'hours' ? '' : field === 'hours' ? Number(value) : value;
        setSelectedRoles(newRoles);
    };

    const calculateTotalManhours = () => {
        return selectedRoles.reduce((sum, role) => sum + (Number(role.hours) || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const form = e.target;
        const name = form.projectName.value;
        const startDate = form['start-date'].value;
        const endDate = form['end-date'].value;

        let totalManhours = null;
        let hourlyRate = null;
        let totalCost = null;

        if (methodology === 'Agile Scrum') {
            totalManhours = calculateTotalManhours();
            hourlyRate = form['hourly-rate'].value;
        } else if (methodology === 'Waterfall') {
            totalCost = form['total-cost'].value;
        }

        try {
            // Filter out empty members before submitting
            const validMembers = members.filter(m => m.user_id && m.project_role_id);

            const response = await fetchAPI('/projects', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    status: 'Planning',
                    budget_status: 'On Budget',
                    completion: 0,
                    methodology,
                    members: validMembers,
                    start_date: startDate,
                    end_date: endDate,
                    total_manhours: totalManhours,
                    hourly_rate: hourlyRate,
                    total_cost: totalCost
                })
            });

            if (response.id) {
                alert('Project created successfully!');
                navigate('/');
            }
        } catch (error) {
            alert('Failed to create project: ' + error.message);
        }
    };

    return (
        <div className="max-w-[960px] mx-auto pb-10 p-8">
            {/* Header */}
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary text-sm mb-1">
                    <span>Projects</span>
                    <ChevronRight className="size-4" />
                    <span className="text-primary font-medium">New Project</span>
                </div>
                <h1 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">Create New Project</h1>
                <p className="text-slate-500 dark:text-text-secondary text-base">Initiate a new software development project workflow and resource allocation.</p>
            </div>

            {/* Form Container */}
            <form id="createProjectForm" className="flex flex-col gap-6" onSubmit={handleSubmit}>
                {/* Section 1: Basic Info */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="text-primary size-5" />
                            Project Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Name</span>
                            <Input type="text" id="projectName" name="projectName" required placeholder="e.g. Fintech Mobile App Redesign"
                                className="bg-slate-50 dark:bg-background-dark py-6" />
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</span>
                                <Input type="date" id="start-date" name="start-date" required
                                    className="bg-slate-50 dark:bg-background-dark py-6 [color-scheme:light] dark:[color-scheme:dark]" />
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Target End Date</span>
                                <Input type="date" id="end-date" name="end-date" required
                                    className="bg-slate-50 dark:bg-background-dark py-6 [color-scheme:light] dark:[color-scheme:dark]" />
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Methodology */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Component className="text-primary size-5" />
                            Methodology & Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Methodology</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="relative cursor-pointer group">
                                    <input type="radio" name="methodology" value="Waterfall"
                                        checked={methodology === 'Waterfall'}
                                        onChange={(e) => setMethodology(e.target.value)}
                                        className="peer sr-only" />
                                    <div className="p-4 rounded-lg border border-slate-300 dark:border-border-dark bg-slate-50 dark:bg-background-dark peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary transition-all flex items-start gap-3">
                                        <div className="text-primary mt-1 size-5 shrink-0 flex items-center justify-center">↓</div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">Waterfall (Fixed Scope)</p>
                                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">Sequential phases, distinct goals. Best for clearly defined requirements.</p>
                                        </div>
                                    </div>
                                </label>
                                <label className="relative cursor-pointer group">
                                    <input type="radio" name="methodology" value="Agile Scrum"
                                        checked={methodology === 'Agile Scrum'}
                                        onChange={(e) => setMethodology(e.target.value)}
                                        className="peer sr-only" />
                                    <div className="p-4 rounded-lg border border-slate-300 dark:border-border-dark bg-slate-50 dark:bg-background-dark peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary transition-all flex items-start gap-3">
                                        <Activity className="text-primary mt-1 size-5 shrink-0" />
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">Agile Scrum (Sprints)</p>
                                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">Iterative progress, flexible scope. Ideal for evolving products.</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Conditional Field for Costs */}
                        <div className="pt-4 border-t border-slate-200 dark:border-border-dark grid grid-cols-1 md:grid-cols-2 gap-6">
                            {methodology === 'Agile Scrum' && (
                                <>
                                    <div className="flex flex-col gap-4 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                Manhours Quota Per Role
                                            </span>
                                            <div className="text-sm text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
                                                Total: <span className="text-slate-900 dark:text-white font-bold">{calculateTotalManhours()} hrs</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {selectedRoles.map((roleObj, index) => (
                                                <div key={roleObj.id} className="flex gap-4 items-end p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                                    <label className="flex-1 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Project Role</span>
                                                        <select
                                                            value={roleObj.project_role_id}
                                                            onChange={(e) => handleRoleQuotaChange(index, 'project_role_id', e.target.value)}
                                                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white h-10"
                                                            required
                                                        >
                                                            <option value="">Select role...</option>
                                                            {projectRolesList.map(r => (
                                                                <option key={r.id} value={r.id}>{r.name}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="w-32 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Hours</span>
                                                        <div className="relative">
                                                            <Clock className="absolute left-3 top-3 text-slate-400 dark:text-text-secondary pointer-events-none size-3.5" />
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                min="0"
                                                                value={roleObj.hours}
                                                                onChange={(e) => handleRoleQuotaChange(index, 'hours', e.target.value)}
                                                                className="bg-white dark:bg-slate-900 pl-9 h-10"
                                                                required
                                                            />
                                                        </div>
                                                    </label>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRoleQuota(index)} className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0">
                                                        <Trash2 className="size-5" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" onClick={handleAddRoleQuota} className="w-full border-dashed py-5 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5">
                                                <Plus className="size-4 mr-2" />
                                                Add Role Quota
                                            </Button>
                                        </div>
                                    </div>

                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            Hourly Rate (IDR)
                                        </span>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-sm text-slate-400 dark:text-text-secondary font-medium">Rp</span>
                                            <Input type="number" id="hourly-rate" name="hourly-rate" placeholder="0" min="0" required
                                                className="bg-slate-50 dark:bg-background-dark pl-11 py-6" />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-text-secondary">Used to calculate total cost from logged manhours.</p>
                                    </label>
                                </>
                            )}

                            {methodology === 'Waterfall' && (
                                <label className="flex flex-col gap-2 md:col-span-2 max-w-md">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        Total Project Cost (IDR)
                                    </span>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-sm text-slate-400 dark:text-text-secondary font-medium">Rp</span>
                                        <Input type="number" id="total-cost" name="total-cost" placeholder="0" min="0" required
                                            className="bg-slate-50 dark:bg-background-dark pl-11 py-6" />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">Fixed rate agreed upon for the entire Waterfall project.</p>
                                </label>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Section 3: Team Composition */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="text-primary size-5" />
                            Team Composition
                        </CardTitle>
                        <CardDescription>Assign team members and their specific roles for this project.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {members.map((member, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-4 items-end p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <label className="flex-1 flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team Member</span>
                                    <select
                                        value={member.user_id}
                                        onChange={(e) => handleMemberChange(index, 'user_id', e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Select a user...</option>
                                        {usersList.map(user => (
                                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex-1 flex flex-col gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Role</span>
                                    <select
                                        value={member.project_role_id}
                                        onChange={(e) => handleMemberChange(index, 'project_role_id', e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Select a project role...</option>
                                        {projectRolesList.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMember(index)} className="mb-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0">
                                    <Trash2 className="size-5" />
                                </Button>
                            </div>
                        ))}

                        <Button type="button" variant="outline" onClick={handleAddMember} className="w-full mt-2 border-dashed border-2 py-6 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5">
                            <Plus className="size-4 mr-2" />
                            Add Team Member
                        </Button>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 mt-4">
                    <Button type="button" variant="outline" size="lg" onClick={() => navigate('/')}>
                        Cancel
                    </Button>
                    <Button type="submit" size="lg" className="shadow-lg shadow-primary/30 flex items-center gap-2 group">
                        <Plus className="size-5 group-hover:scale-110 transition-transform" />
                        Create Project
                    </Button>
                </div>
            </form>
        </div>
    );
}
