import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';
import { Clock, Plus, MoreHorizontal, PiggyBank, Loader2, ArrowLeft, Briefcase, GripVertical, FileText } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function DraggableTaskCard({ task, onClick }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
        position: 'relative'
    } : undefined;

    const prioColors = {
        High: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400',
        Medium: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
        Low: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
    };
    const pClass = prioColors[task.priority] || prioColors.Low;

    return (
        <div ref={setNodeRef} style={style} className="relative group touch-none" {...attributes} {...listeners}>
            <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={(e) => {
                onClick(task);
            }}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`${pClass} text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider`}>{task.priority}</span>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Clock className="size-3.5" />
                        {task.estimated_hours || 0} hrs
                    </div>
                </div>
                {task.feature_title && (
                    <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wide">{task.feature_title}</div>
                )}
                <h4 className="text-slate-900 dark:text-slate-100 font-medium leading-snug">{task.title}</h4>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>{task.assignee_id ? `Assignee ${task.assignee_id}` : 'Unassigned'}</span>
                    </div>
                    {task.description && <FileText className="size-3.5 text-slate-400" />}
                </div>
            </Card>
        </div>
    );
}

function BoardColumn({ title, color, count, children, onAddTask }) {
    const { isOver, setNodeRef } = useDroppable({ id: title });

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col w-80 bg-slate-100 dark:bg-[#151b28]/50 rounded-xl border-2 transition-colors duration-200 h-full ${isOver ? 'border-primary/50 bg-primary/5 dark:bg-primary/5' : 'border-transparent dark:border-slate-800/50'}`}
        >
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${color}`}></span>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
                    <Badge variant="secondary" className="px-1.5 py-0 h-5 grid place-items-center">{count}</Badge>
                </div>
                {title === 'To Do' && (
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <MoreHorizontal className="size-5" />
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar relative min-h-[150px]">
                {children}
            </div>
            {title === 'To Do' && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-800/50">
                    <Button variant="outline" className="w-full border-dashed" onClick={onAddTask}>
                        <Plus className="size-4 mr-2" />
                        Add Task
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function ProjectBoard() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);

    const [stats, setStats] = useState({
        total_manhours: null,
        used_hours: 0,
        remaining: 0,
        perc: 0
    });
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskFeatureTitle, setNewTaskFeatureTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskStatus, setNewTaskStatus] = useState('To Do');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('Unassigned');
    const [newTaskEstimate, setNewTaskEstimate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await fetchAPI('/projects');
                if (res.data) setProjects(res.data);
            } catch (error) {
                console.error("Failed to load projects", error);
            }
        };
        loadProjects();
    }, []);

    const loadBoard = async (projectId) => {
        try {
            // Load stats
            const balanceRes = await fetchAPI(`/projects/${projectId}/balance`);
            if (balanceRes.data) {
                const s = balanceRes.data;
                let perc = 0;
                if (s.total_manhours) {
                    perc = Math.round((s.used_hours / s.total_manhours) * 100);
                    if (perc > 100) perc = 100;
                }
                setStats({
                    total_manhours: s.total_manhours,
                    used_hours: s.total_manhours ? Math.round(s.used_hours * 10) / 10 : 0,
                    remaining: s.total_manhours ? Math.round(s.remaining * 10) / 10 : 0,
                    perc
                });
            }

            // Load users
            const usersRes = await fetchAPI('/users');
            if (usersRes.data) {
                setUsers(usersRes.data);
            }

            // Load tasks
            const tasksRes = await fetchAPI(`/tasks?project_id=${projectId}`);
            if (tasksRes.data) {
                setTasks(tasksRes.data);
            }
        } catch (error) {
            console.error("Failed to load board data", error);
        }
    };

    useEffect(() => {
        if (selectedProject) {
            loadBoard(selectedProject.id);
        }
    }, [selectedProject]);

    const handleOpenModal = (status, taskToEdit = null) => {
        if (taskToEdit) {
            setEditingTaskId(taskToEdit.id);
            setNewTaskTitle(taskToEdit.title);
            setNewTaskFeatureTitle(taskToEdit.feature_title || '');
            setNewTaskDescription(taskToEdit.description || '');
            setNewTaskStatus(taskToEdit.status);
            setNewTaskPriority(taskToEdit.priority);
            setNewTaskAssignee(taskToEdit.assignee_id ? taskToEdit.assignee_id.toString() : 'Unassigned');
            setNewTaskEstimate(taskToEdit.estimated_hours || '');
        } else {
            setEditingTaskId(null);
            setNewTaskStatus(status || 'To Do');
            setNewTaskTitle('');
            setNewTaskFeatureTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('Medium');
            setNewTaskAssignee('Unassigned');
            setNewTaskEstimate('');
        }
        setIsModalOpen(true);
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                title: newTaskTitle,
                feature_title: newTaskFeatureTitle,
                description: newTaskDescription,
                priority: newTaskPriority,
                status: newTaskStatus,
                assignee_id: newTaskAssignee !== 'Unassigned' ? parseInt(newTaskAssignee) : null,
                estimated_hours: newTaskEstimate || 0,
                project_id: selectedProject.id
            };

            if (editingTaskId) {
                await fetchAPI(`/tasks/${editingTaskId}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await fetchAPI('/tasks', { method: 'POST', body: JSON.stringify(payload) });
            }
            setIsModalOpen(false);
            loadBoard(selectedProject.id);
        } catch (error) {
            alert(error.message || 'Failed to save task.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return; // Dropped outside a valid column

        const taskId = active.id;
        const newStatus = over.id;
        const task = tasks.find(t => t.id === taskId);

        if (task && task.status !== newStatus) {
            // Optimistic update
            const oldTasks = [...tasks];
            setTasks(prev => prev.map(t => t.id.toString() === taskId.toString() ? { ...t, status: newStatus } : t));

            try {
                await fetchAPI(`/tasks/${taskId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                loadBoard(selectedProject.id);
            } catch (error) {
                // Revert on failure
                setTasks(oldTasks);
                console.error("Failed to move task", error);
            }
        }
    };

    const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

    const COLUMNS = [
        { title: 'To Do', color: 'bg-slate-400' },
        { title: 'In Progress', color: 'bg-primary' },
        { title: 'Review', color: 'bg-purple-500' },
        { title: 'Done', color: 'bg-green-500' }
    ];

    if (!selectedProject) {
        return (
            <div className="flex-1 p-8 overflow-y-auto w-full bg-slate-50/50 dark:bg-background-dark">
                <div className="max-w-[1200px] mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Select Project Board</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Choose a project to view its kanban board and manage tasks.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <Card
                                key={project.id}
                                className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all hover:-translate-y-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md"
                                onClick={() => setSelectedProject(project)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                            <Briefcase className="size-6" />
                                        </div>
                                        <Badge variant="outline" className={project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' : ''}>
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{project.name}</h3>
                                    <p className="text-sm font-medium text-slate-500 line-clamp-2">{project.methodology} • {project.budget_status}</p>

                                    {project.total_manhours && (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Clock className="size-4" />
                                            <span>{project.total_manhours} hrs total quota</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {projects.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                No projects found. Create one first!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-light dark:bg-background-dark transition-colors duration-200 h-full relative">
            {/* Project Header & Stats */}
            <div className="flex flex-col gap-6 p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b28] shrink-0 transition-colors duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Button variant="ghost" className="mb-2 -ml-3 text-slate-500" onClick={() => setSelectedProject(null)}>
                            <ArrowLeft className="size-4 mr-2" />
                            Back to Projects
                        </Button>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProject.name}</h1>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{selectedProject.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedProject.methodology} Board</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex -space-x-2 mr-2">
                            <img alt="Team" className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-[#151b28]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5lHb2DboAaVdgRtJd20oMrJscs6GCT1uZttJn1ItKJE8ehEl_Oafic-6M-AUzdo86vUGpS0hv48UGE_fIG9nn8JLtHvzLCn1p3DxW5I5PiFGEETG4qGvIF3Fkbi3zWoPZQ7Vm5Sen0i4sVZEgzQFVYanLOfbFq1gJmDCx_v4Nwhhq-iQUrLfxTAcJi-irJ5XC8eAZ9eJ37aRMpF1KmJP2BOJrEHw3twbVFfHDnREWHfg2hGfEzVQTEnQw7T2X_-CWTXr3T5mDdP4" />
                            <img alt="Team" className="inline-block size-8 rounded-full ring-2 ring-white dark:ring-[#151b28]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnIVACbY-hDuitabzPI8f9eZSblXygwRR07nlgL8cIbLCz7EvpoyElOQlFiJNiL1U4LfJH3-PRuS0jHnzEV6ebliHYm8RG0xa3j-tJfSBq6lB1OfTWvvFTeNDINmtE4UZHG4usnf2JF68shEhRatwq4WKKAkPflpESLgIm4PPlz1Gh2nAIdGxqLpZbow7-cpY2n0JvtoWacHdNnWff6KMqm2n3MP3PFC_JBi3KLQaVb5dN0CxIECl2kx7wnKijcig3awv5hrILVUA" />
                            <div className="flex items-center justify-center size-8 rounded-full ring-2 ring-white dark:ring-[#151b28] bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                                +4
                            </div>
                        </div>
                        <Button className="flex items-center gap-2 shadow-lg shadow-primary/20" onClick={() => handleOpenModal('To Do')}>
                            <Plus className="size-5" />
                            <span>Add Task</span>
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats.total_manhours && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-slate-50 dark:bg-[#1e2532]">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Manhours Quota</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                        <span>{stats.total_manhours}</span> <span className="text-sm font-normal text-slate-400">hrs</span>
                                    </p>
                                </div>
                                <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Clock className="size-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 dark:bg-[#1e2532]">
                            <CardContent className="p-4 flex flex-col justify-center gap-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Allocated Manhours</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                            <span>{stats.used_hours}</span> <span className="text-sm font-normal text-slate-400">/ <span>{stats.total_manhours}</span> hrs</span>
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-primary">{stats.perc}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-border-dark rounded-full h-2">
                                    <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${stats.perc}%` }}></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 dark:bg-[#1e2532]">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Remaining Balance</p>
                                    <p className="text-2xl font-bold mt-1">
                                        <span className={stats.remaining < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"}>{stats.remaining}</span>
                                        <span className="text-sm font-normal text-slate-400">hrs</span>
                                    </p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className={`size-10 rounded-lg flex items-center justify-center ${stats.remaining < 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-green-500/10 text-green-500'}`}>
                                        <PiggyBank className="size-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 absolute inset-x-0 bottom-0 top-[300px]">
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                    <div className="flex h-full gap-6 min-w-max pb-6">
                        {COLUMNS.map(col => (
                            <BoardColumn
                                key={col.title}
                                title={col.title}
                                color={col.color}
                                count={getTasksByStatus(col.title).length}
                                onAddTask={() => handleOpenModal('To Do')}
                            >
                                {getTasksByStatus(col.title).map(task => (
                                    <DraggableTaskCard key={task.id} task={task} onClick={(t) => handleOpenModal(t.status, t)} />
                                ))}
                            </BoardColumn>
                        ))}
                    </div>
                </DndContext>
            </div>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingTaskId ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <form className="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-1" onSubmit={handleSubmitTask}>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Feature Title <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <Input type="text" value={newTaskFeatureTitle} onChange={e => setNewTaskFeatureTitle(e.target.value)} placeholder="E.g., Authentication" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description / Sub-task</label>
                            <Textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} placeholder="Enter detailed description..." className="min-h-[80px]" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Title</label>
                            <Input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required placeholder="E.g., Design Homepage" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="To Do">To Do</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Review">Review</SelectItem>
                                        <SelectItem value="Done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignee</label>
                                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Manhours</label>
                                <Input type="number" value={newTaskEstimate} onChange={e => setNewTaskEstimate(e.target.value)} min="0" step="0.5" placeholder="0" />
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                {editingTaskId ? 'Save Changes' : 'Create Task'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
