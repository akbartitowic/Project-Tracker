import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { ChevronRight, FileText, Component, Clock, Users, Database, Code, PencilRuler, Activity, Bug, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CreateProject() {
    const navigate = useNavigate();
    const [methodology, setMethodology] = useState('Waterfall');
    const [jobs, setJobs] = useState(['Frontend Dev', 'Backend Dev']);

    const handleJobChange = (e) => {
        const value = e.target.value;
        setJobs(prev =>
            prev.includes(value)
                ? prev.filter(j => j !== value)
                : [...prev, value]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const form = e.target;
        const name = form.projectName.value;
        const startDate = form['start-date'].value;
        const endDate = form['end-date'].value;
        const totalManhours = methodology === 'Agile Scrum' ? form['manhours-quota'].value : null;

        try {
            const response = await fetchAPI('/projects', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    status: 'Planning',
                    budget_status: 'On Budget',
                    completion: 0,
                    methodology,
                    jobs,
                    start_date: startDate,
                    end_date: endDate,
                    total_manhours: totalManhours
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

                        {/* Conditional Field for Manhours */}
                        {methodology === 'Agile Scrum' && (
                            <div className="pt-4 border-t border-slate-200 dark:border-border-dark">
                                <label className="flex flex-col gap-2 max-w-md">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        Initial Manhours Quota (For Scrum)
                                    </span>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3.5 text-slate-400 dark:text-text-secondary pointer-events-none size-4" />
                                        <Input type="number" id="manhours-quota" name="manhours-quota" placeholder="0" min="0" required
                                            className="bg-slate-50 dark:bg-background-dark pl-9 py-6" />
                                        <span className="absolute right-4 top-3.5 text-sm text-slate-400 dark:text-text-secondary font-medium">hrs</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">Total estimated hours allocated for the initial phase or first sprint.</p>
                                </label>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section 3: Team Composition */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="text-primary size-5" />
                            Team Composition
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Required Roles</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {['UI/UX Designer', 'Frontend Dev', 'Backend Dev', 'System Analyst', 'QA Engineer'].map(role => (
                                <label key={role} className="cursor-pointer group">
                                    <input type="checkbox" className="peer sr-only" value={role} checked={jobs.includes(role)} onChange={handleJobChange} />
                                    <div className="h-full flex flex-col items-center justify-center p-4 rounded-lg border border-slate-300 dark:border-border-dark bg-slate-50 dark:bg-background-dark text-center peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:border-primary/50 text-slate-600 dark:text-slate-400">
                                        <div className="mb-2 group-hover:scale-110 transition-transform">
                                            {role === 'UI/UX Designer' ? <PencilRuler className="size-6" /> :
                                                role === 'Frontend Dev' ? <Code className="size-6" /> :
                                                    role === 'Backend Dev' ? <Database className="size-6" /> :
                                                        role === 'System Analyst' ? <Activity className="size-6" /> : <Bug className="size-6" />}
                                        </div>
                                        <span className="text-sm font-medium">{role}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
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
