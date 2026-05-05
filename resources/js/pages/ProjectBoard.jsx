import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Clock, Plus, MoreHorizontal, PiggyBank, Loader2, ArrowLeft, Briefcase, GripVertical, FileText, LayoutGrid, List, Trash2, Upload, Download, AlertCircle, UserPlus } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function DraggableTaskCard({ task, onClick, assigneeName, isFreelance }) {
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
                    {!isFreelance && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="size-3.5" />
                            {task.estimated_hours || 0} hrs
                        </div>
                    )}
                </div>
                {task.feature_title && (
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-[10px] font-bold text-primary uppercase tracking-wide">{task.feature_title}</div>
                        {task.category && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tighter">
                                {task.category}
                            </span>
                        )}
                    </div>
                )}
                <h4 className="text-slate-900 dark:text-slate-100 font-medium leading-snug">{task.title}</h4>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>{task.assignee_id ? (task.assignee_name || assigneeName || `Assignee ${task.assignee_id}`) : 'Unassigned'}</span>
                    </div>
                    {task.description && <FileText className="size-3.5 text-slate-400" />}
                </div>
            </Card>
        </div>
    );
}

function BoardColumn({ title, color, count, totalCount, children, onAddTask }) {
    const { isOver, setNodeRef } = useDroppable({ id: title });
    const perc = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col w-80 bg-slate-100 dark:bg-[#151b28]/50 rounded-xl border-2 transition-colors duration-200 h-full ${isOver ? 'border-primary/50 bg-primary/5 dark:bg-primary/5' : 'border-transparent dark:border-slate-800/50'}`}
        >
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${color}`}></span>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
                    <div className="flex items-center gap-1.5 ml-1">
                        <Badge variant="secondary" className="px-1.5 py-0 h-5 grid place-items-center">{count}</Badge>
                        <span className="text-[10px] font-black text-slate-400">{perc}%</span>
                    </div>
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
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [roleQuotas, setRoleQuotas] = useState([]);
    const [stats, setStats] = useState({
        total_manhours: null,
        allocated_hours: 0,
        actual_hours: 0,
        remaining: 0,
        perc: 0
    });
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [projectRolesMaster, setProjectRolesMaster] = useState([]);
    const [isAssignMembersModalOpen, setIsAssignMembersModalOpen] = useState(false);
    const [assigningProject, setAssigningProject] = useState(null);
    const [assignmentRows, setAssignmentRows] = useState([]);
    const [isSavingAssignment, setIsSavingAssignment] = useState(false);
    const [users, setUsers] = useState([]);
    const [projectMembers, setProjectMembers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [viewMode, setViewMode] = useState('kanban');
    const [listViewMode, setListViewMode] = useState('grid');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskFeatureTitle, setNewTaskFeatureTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskStatus, setNewTaskStatus] = useState('To Do');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskRoleFilter, setNewTaskRoleFilter] = useState('All');
    const [newTaskAssignee, setNewTaskAssignee] = useState('Unassigned');
    const [newTaskEstimate, setNewTaskEstimate] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);

    // Bulk Edit Tasks State
    const [isTaskBulkEditMode, setIsTaskBulkEditMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [isBulkEditTaskModalOpen, setIsBulkEditTaskModalOpen] = useState(false);
    const [bulkEditEstimate, setBulkEditEstimate] = useState('');
    const [bulkEditRoleFilter, setBulkEditRoleFilter] = useState('All');
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const isFreelance = ((user?.role?.name || user?.role || '').toString().trim().toLowerCase() === 'freelance');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    const loadProjects = async () => {
        try {
            const res = await fetchAPI('/projects');
            if (res.data) setProjects(res.data);
        } catch (error) {
            console.error("Failed to load projects", error);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const openAssignMembersModal = async (project) => {
        try {
            const [membersRes, optionsRes] = await Promise.all([
                fetchAPI(`/projects/${project.id}/members`),
                fetchAPI(`/projects/${project.id}/assignment-options`),
            ]);
            const mapped = (membersRes.data || []).map((m) => ({
                user_id: m.user_id?.toString() || '',
                project_role_id: m.project_role_id?.toString() || '',
            }));
            const optionData = optionsRes.data || {};
            setUsers(optionData.users || []);
            setProjectRolesMaster(optionData.project_roles || []);
            setAssigningProject(project);
            setAssignmentRows(mapped.length > 0 ? mapped : [{ user_id: '', project_role_id: '' }]);
            setIsAssignMembersModalOpen(true);
        } catch (error) {
            alert('Failed to load project members: ' + error.message);
        }
    };

    const addAssignmentRow = () => {
        setAssignmentRows((prev) => [...prev, { user_id: '', project_role_id: '' }]);
    };

    const removeAssignmentRow = (index) => {
        const row = assignmentRows[index];
        if (row && String(row.user_id) === String(user?.id)) {
            alert('Kamu tidak bisa menghapus dirimu sendiri dari project ini.');
            return;
        }
        setAssignmentRows((prev) => prev.filter((_, idx) => idx !== index));
    };

    const updateAssignmentRow = (index, field, value) => {
        setAssignmentRows((prev) => prev.map((row, idx) => idx === index ? { ...row, [field]: value } : row));
    };

    const saveProjectAssignments = async () => {
        if (!assigningProject) return;
        const validRows = assignmentRows.filter((row) => row.user_id && row.project_role_id);
        if (validRows.length === 0) {
            alert('Minimal 1 anggota project harus diisi.');
            return;
        }
        const currentUserAssignedBefore = projectMembers.some((member) => Number(member.user_id) === Number(user?.id));
        const currentUserAssignedAfter = validRows.some((row) => Number(row.user_id) === Number(user?.id));
        if (currentUserAssignedBefore && !currentUserAssignedAfter) {
            alert('Kamu tidak bisa menghapus dirimu sendiri dari project ini.');
            return;
        }

        setIsSavingAssignment(true);
        try {
            await fetchAPI(`/projects/${assigningProject.id}/members`, {
                method: 'PUT',
                body: JSON.stringify({
                    members: validRows.map((row) => ({
                        user_id: parseInt(row.user_id),
                        project_role_id: parseInt(row.project_role_id),
                    })),
                }),
            });
            setIsAssignMembersModalOpen(false);
            setAssigningProject(null);
            setAssignmentRows([]);
            if (selectedProject?.id && assigningProject?.id === selectedProject.id) {
                loadBoard(selectedProject.id);
            }
            alert('Project members updated successfully.');
        } catch (error) {
            alert('Failed to save project members: ' + error.message);
        } finally {
            setIsSavingAssignment(false);
        }
    };

    const loadBoard = async (projectId) => {
        try {
            // Load stats
            const balanceRes = await fetchAPI(`/projects/${projectId}/balance`);
            if (balanceRes.data) {
                const s = balanceRes.data;
                let perc = 0;
                if (s.total_manhours) {
                    perc = Math.round((s.allocated_hours / s.total_manhours) * 100);
                    if (perc > 100) perc = 100;
                }
                setStats({
                    total_manhours: s.total_manhours,
                    allocated_hours: s.total_manhours ? Math.round(s.allocated_hours * 10) / 10 : 0,
                    actual_hours: s.total_manhours ? Math.round(s.actual_hours * 10) / 10 : 0,
                    remaining: s.total_manhours ? Math.round(s.remaining * 10) / 10 : 0,
                    perc
                });
            }

            // Members & tasks require project_board.read only — load before optional /users
            const membersRes = await fetchAPI(`/projects/${projectId}/members`);
            if (membersRes.data) {
                setProjectMembers(membersRes.data);
            }

            const tasksRes = await fetchAPI(`/tasks?project_id=${projectId}`);
            if (tasksRes.data) {
                setTasks(tasksRes.data);
            }

            const quotasRes = await fetchAPI(`/projects/${projectId}/quotas`);
            if (quotasRes.data) {
                setRoleQuotas(quotasRes.data);
            }

            // Full user directory requires teams_users.read — non-admins may lack this; board must still work
            try {
                const usersRes = await fetchAPI('/users');
                if (usersRes?.data) {
                    setUsers(usersRes.data);
                }
            } catch (e) {
                console.warn('Project board: could not load /users (assignee pickers may be limited).', e);
                setUsers([]);
            }
        } catch (error) {
            console.error("Failed to load board data", error);
        }
    };

    useEffect(() => {
        if (projectId && projects.length > 0) {
            const project = projects.find(p => p.id.toString() === projectId.toString());
            if (project) {
                setSelectedProject(project);
                loadBoard(project.id);
            } else {
                // If projectId is invalid, go back to list
                navigate('/board');
            }
        } else if (!projectId) {
            setSelectedProject(null);
        }
    }, [projectId, projects, navigate]);

    const handleOpenModal = (status, taskToEdit = null) => {
        if (taskToEdit) {
            setEditingTaskId(taskToEdit.id);
            setNewTaskTitle(taskToEdit.title);
            setNewTaskFeatureTitle(taskToEdit.feature_title || '');
            setNewTaskDescription(taskToEdit.description || '');
            setNewTaskStatus(taskToEdit.status);
            setNewTaskPriority(taskToEdit.priority);

            // Set role filter based on the assignee's role in the project
            if (taskToEdit.assignee_id) {
                const memberInfo = projectMembers.find(m => m.user_id === taskToEdit.assignee_id);
                setNewTaskRoleFilter(memberInfo ? memberInfo.role_name : 'All');
            } else {
                setNewTaskRoleFilter('All');
            }

            setNewTaskAssignee(taskToEdit.assignee_id ? taskToEdit.assignee_id.toString() : 'Unassigned');
            setNewTaskEstimate(taskToEdit.estimated_hours || '');
            setNewTaskCategory(taskToEdit.category || '');
            setNewTaskRoleFilter(taskToEdit.project_role_id ? taskToEdit.project_role_id.toString() : 'All');
        } else {
            setEditingTaskId(null);
            setNewTaskStatus(status || 'To Do');
            setNewTaskTitle('');
            setNewTaskFeatureTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('Medium');
            
            // Default to 'All' if general quota is defined, else first role quota, else 'All' as fallback
            if (selectedProject?.total_manhours > 0) {
                setNewTaskRoleFilter('All');
            } else if (roleQuotas.length > 0) {
                setNewTaskRoleFilter(roleQuotas[0].project_role_id.toString());
            } else {
                setNewTaskRoleFilter('All');
            }
            
            setNewTaskAssignee('Unassigned');
            setNewTaskEstimate('');
            setNewTaskCategory('');
        }
        setIsModalOpen(true);
    };

    const categoryOptions = Array.from(
        new Set(
            roleQuotas
                .map((q) => q.role_name)
                .filter(Boolean)
        )
    );

    const categoryBasedRoleQuotas = roleQuotas.filter((quota) =>
        newTaskCategory ? quota.role_name === newTaskCategory : true
    );

    const formatHours = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return '0';
        return Number.isInteger(num) ? `${num}` : num.toFixed(1);
    };

    const mappedRoleQuotaHours = roleQuotas.reduce((sum, quota) => sum + (Number(quota.quota_hours) || 0), 0);
    const generalQuotaFromPresales = Math.max(0, (Number(selectedProject?.total_manhours) || 0) - mappedRoleQuotaHours);
    const generalAllocatedHours = tasks
        .filter((task) => !task.project_role_id)
        .reduce((sum, task) => sum + (Number(task.estimated_hours) || 0), 0);
    const generalQuotaRemaining = Math.max(0, generalQuotaFromPresales - generalAllocatedHours);

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const isWaterfall = selectedProject?.methodology === 'Waterfall';
            const payload = {
                title: newTaskTitle,
                feature_title: newTaskFeatureTitle,
                description: newTaskDescription,
                priority: newTaskPriority,
                status: newTaskStatus,
                assignee_id: newTaskAssignee !== 'Unassigned' ? parseInt(newTaskAssignee) : null,
                estimated_hours: isWaterfall ? null : (newTaskEstimate || 0),
                project_id: selectedProject.id,
                project_role_id: isWaterfall ? null : (newTaskRoleFilter !== 'All' ? parseInt(newTaskRoleFilter) : null),
                category: newTaskCategory || null
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

    const handleImportTasks = async (e) => {
        e.preventDefault();
        if (!importFile) return;

        setIsImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('project_id', selectedProject.id);

            // Use the correct token key 'auth_token' as defined in resources/js/services/api.js
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/tasks/import`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    // Browser sets correct boundary for FormData, do NOT set Content-Type
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Import failed');

            setImportResult(data);
            if (data.success > 0) {
                loadBoard(selectedProject.id);
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open(`${import.meta.env.VITE_API_URL || '/api'}/tasks/template`, '_blank');
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

    const toggleTaskSelection = (taskId) => {
        setSelectedTaskIds(prev => 
            prev.includes(taskId) 
                ? prev.filter(id => id !== taskId) 
                : [...prev, taskId]
        );
    };

    const toggleAllTasks = () => {
        if (selectedTaskIds.length === tasks.length) {
            setSelectedTaskIds([]);
        } else {
            setSelectedTaskIds(tasks.map(t => t.id));
        }
    };

    const handleBulkEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingBulk(true);
        try {
            const payload = {
                task_ids: selectedTaskIds,
            };
            if (bulkEditEstimate !== '') {
                payload.estimated_hours = parseFloat(bulkEditEstimate);
            }
            if (bulkEditRoleFilter !== 'All') {
                payload.project_role_id = parseInt(bulkEditRoleFilter);
            }

            if (Object.keys(payload).length > 1) {
                await fetchAPI('/tasks/bulk-edit', { method: 'PUT', body: JSON.stringify(payload) });
            }
            setIsBulkEditTaskModalOpen(false);
            setSelectedTaskIds([]);
            setIsTaskBulkEditMode(false);
            
            // clear form
            setBulkEditEstimate('');
            setBulkEditRoleFilter('All');
            
            loadBoard(selectedProject.id);
        } catch (error) {
            alert(error.message || 'Failed to bulk edit tasks.');
        } finally {
            setIsSubmittingBulk(false);
        }
    };

    const toggleProjectSelection = (projectId) => {
        setSelectedProjectIds(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleDeleteProject = async (projectIdToDelete) => {
        setIsDeleting(true);
        try {
            await fetchAPI('/projects', {
                method: 'DELETE',
                body: JSON.stringify({ ids: [projectIdToDelete] })
            });
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
            if (projectId && projectId.toString() === projectIdToDelete.toString()) {
                navigate('/board');
            }
            loadProjects();
        } catch (error) {
            alert(error.message || 'Failed to delete project.');
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleAllProjects = () => {
        if (selectedProjectIds.length === projects.length) {
            setSelectedProjectIds([]);
        } else {
            setSelectedProjectIds(projects.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await fetchAPI('/projects', {
                method: 'DELETE',
                body: JSON.stringify({ ids: selectedProjectIds })
            });
            setIsDeleteModalOpen(false);
            setSelectedProjectIds([]);
            setIsEditMode(false);
            loadProjects(); // Reload list
        } catch (error) {
            alert(error.message || 'Failed to delete projects.');
        } finally {
            setIsDeleting(false);
        }
    };

    const COLUMNS = [
        { title: 'To Do', color: 'bg-slate-400' },
        { title: 'In Progress', color: 'bg-primary' },
        { title: 'Review', color: 'bg-purple-500' },
        { title: 'Re-open', color: 'bg-rose-500' },
        { title: 'Done', color: 'bg-green-500' }
    ];

    const waterfallProgressCards = useMemo(() => {
        const total = tasks.length;
        const statuses = ['Done', 'In Progress', 'To Do', 'Review', 'Re-open'];
        return statuses.map((status) => {
            const count = tasks.filter((task) => task.status === status).length;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return { status, count, percentage };
        });
    }, [tasks]);

    const assignedProjectUsers = useMemo(() => {
        const seen = new Set();
        const uniqueUsers = [];
        for (const member of projectMembers) {
            if (!member?.user_id || seen.has(member.user_id)) continue;
            seen.add(member.user_id);
            uniqueUsers.push({
                user_id: member.user_id,
                user_name: member.user_name || 'User',
            });
        }
        return uniqueUsers;
    }, [projectMembers]);

    const assigneeNameById = useMemo(() => {
        const map = {};
        users.forEach((u) => {
            if (u?.id != null && u?.name) map[u.id] = u.name;
        });
        projectMembers.forEach((m) => {
            if (m?.user_id != null && m?.user_name && !map[m.user_id]) {
                map[m.user_id] = m.user_name;
            }
        });
        return map;
    }, [users, projectMembers]);

    /** When /users is forbidden (no teams_users.read), fall back to project members for assignee picker */
    const assigneeSelectOptions = useMemo(() => {
        if (users.length > 0) {
            return users.map((u) => ({
                id: u.id,
                label: `${u.name} (${u.role?.name || u.role || 'Member'})`,
            }));
        }
        const seen = new Set();
        const opts = [];
        for (const m of projectMembers) {
            if (!m?.user_id || seen.has(m.user_id)) continue;
            seen.add(m.user_id);
            opts.push({
                id: m.user_id,
                label: `${m.user_name || 'User'} (${m.role_name || 'Member'})`,
            });
        }
        return opts;
    }, [users, projectMembers]);

    if (!selectedProject) {
        return (
            <div className="flex-1 w-full overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8 dark:bg-background-dark">
                <div className="max-w-[1200px] mx-auto">
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Select Project Board</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Choose a project to view its kanban board and manage tasks.</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg mr-2">
                                <Button
                                    variant={listViewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`px-2 h-8 ${listViewMode === 'grid' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                    onClick={() => setListViewMode('grid')}
                                >
                                    <LayoutGrid className="size-4" />
                                </Button>
                                <Button
                                    variant={listViewMode === 'table' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`px-2 h-8 ${listViewMode === 'table' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                    onClick={() => setListViewMode('table')}
                                >
                                    <List className="size-4" />
                                </Button>
                            </div>
                            {isEditMode && projects.length > 0 && (
                                <Button
                                    variant="secondary"
                                    className="border border-slate-200 dark:border-slate-800"
                                    onClick={toggleAllProjects}
                                >
                                    {selectedProjectIds.length === projects.length ? "Deselect All" : "Select All"}
                                </Button>
                            )}
                            {isEditMode && selectedProjectIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    className="shadow-lg shadow-red-500/20"
                                    onClick={() => setIsDeleteModalOpen(true)}
                                >
                                    Delete Selected ({selectedProjectIds.length})
                                </Button>
                            )}
                            <Button
                                variant={isEditMode ? "default" : "outline"}
                                onClick={() => {
                                    setIsEditMode(!isEditMode);
                                    if (isEditMode) setSelectedProjectIds([]); // clear when exiting
                                }}
                            >
                                {isEditMode ? "Done Managing" : "Manage Projects"}
                            </Button>
                        </div>
                    </div>

                    {listViewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map(project => (
                                <Card
                                    key={project.id}
                                    className={`group cursor-pointer transition-all hover:-translate-y-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md relative
                                        ${isEditMode && selectedProjectIds.includes(project.id) ? 'border-red-500 shadow-md shadow-red-500/10' : 'hover:shadow-xl hover:border-primary/50'}
                                    `}
                                    onClick={() => {
                                        if (isEditMode) {
                                            toggleProjectSelection(project.id);
                                        } else {
                                            navigate(`/board/${project.id}`);
                                        }
                                    }}
                                >
                                    {isEditMode ? (
                                        <div className="absolute top-4 right-4 z-20 pointer-events-none">
                                            <Checkbox
                                                checked={selectedProjectIds.includes(project.id)}
                                                tabIndex={-1}
                                            />
                                        </div>
                                    ) : (
                                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-500 hover:text-blue-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openAssignMembersModal(project);
                                                }}
                                                title="Assign Project Members"
                                            >
                                                <UserPlus className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-500 hover:text-red-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProjectToDelete(project);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                                <Briefcase className="size-6" />
                                            </div>
                                            <Badge variant="outline" className={
                                                project.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' :
                                                    project.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30' :
                                                        'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30'
                                            }>
                                                {project.status}
                                            </Badge>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{project.name}</h3>
                                        <p className="text-sm font-medium text-slate-500 line-clamp-2">{project.methodology} • {project.budget_status}</p>

                                        {!isFreelance && project.methodology === 'Agile Scrum' && project.total_manhours ? (
                                            <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="size-4" />
                                                    <span>Remaining: {formatHours(project.remaining_manhours)} hrs</span>
                                                </div>
                                                <div className="text-xs font-semibold text-primary">
                                                    Usage: {Number(project.usage_percentage || 0).toFixed(1)}%
                                                </div>
                                            </div>
                                        ) : !isFreelance && project.total_manhours ? (
                                            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Clock className="size-4" />
                                                <span>{project.total_manhours} hrs total quota</span>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#151b28] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        {isEditMode && <th className="px-6 py-4 w-10"></th>}
                                        <th className="px-6 py-4 font-medium">Project Name</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Methodology</th>
                                        {!isFreelance && <th className="px-6 py-4 font-medium">Total Quota</th>}
                                        {!isEditMode && <th className="px-6 py-4 w-10 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {projects.map(project => (
                                        <tr
                                            key={project.id}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedProjectIds.includes(project.id) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    toggleProjectSelection(project.id);
                                                } else {
                                                    navigate(`/board/${project.id}`);
                                                }
                                            }}
                                        >
                                            {isEditMode && (
                                                <td className="px-6 py-4">
                                                    <Checkbox checked={selectedProjectIds.includes(project.id)} tabIndex={-1} />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                        <Briefcase className="size-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white">{project.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={
                                                    project.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' :
                                                        project.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30' :
                                                            'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30'
                                                }>
                                                    {project.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">
                                                {project.methodology}
                                            </td>
                                            {!isFreelance && (
                                                <td className="px-6 py-4">
                                                    {project.methodology === 'Agile Scrum' && project.total_manhours ? (
                                                        <div className="flex flex-col text-slate-600 dark:text-slate-400">
                                                            <span className="text-sm">Rem: {formatHours(project.remaining_manhours)} hrs</span>
                                                            <span className="text-[11px] font-semibold text-primary">
                                                                Usage: {Number(project.usage_percentage || 0).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    ) : project.total_manhours ? (
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                            <Clock className="size-4" />
                                                            <span>{project.total_manhours} hrs</span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            )}
                                            {!isEditMode && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-400 hover:text-blue-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openAssignMembersModal(project);
                                                            }}
                                                            title="Assign Project Members"
                                                        >
                                                            <UserPlus className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-400 hover:text-red-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProjectToDelete(project);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {projects.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            No projects found. Create one first!
                        </div>
                    )}
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
                        <Button variant="ghost" className="mb-2 -ml-3 text-slate-500" onClick={() => navigate('/board')}>
                            <ArrowLeft className="size-4 mr-2" />
                            Back to Projects
                        </Button>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProject.name}</h1>
                            <Badge variant="outline" className={
                                selectedProject.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30' :
                                    selectedProject.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30' :
                                        'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30'
                            }>
                                {selectedProject.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedProject.methodology} Board</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center -space-x-2 mr-1">
                            {assignedProjectUsers.slice(0, 2).map((member) => (
                                <div
                                    key={member.user_id}
                                    title={member.user_name}
                                    className="inline-flex items-center justify-center size-8 rounded-full ring-2 ring-white dark:ring-[#151b28] bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                                >
                                    {(member.user_name || 'U').charAt(0).toUpperCase()}
                                </div>
                            ))}
                            {assignedProjectUsers.length > 2 && (
                                <div className="flex items-center justify-center size-8 rounded-full ring-2 ring-white dark:ring-[#151b28] bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                                    +{assignedProjectUsers.length - 2}
                                </div>
                            )}
                            {assignedProjectUsers.length === 0 && (
                                <div className="inline-flex items-center justify-center size-8 rounded-full ring-2 ring-white dark:ring-[#151b28] bg-slate-100 dark:bg-slate-700 text-[10px] font-medium text-slate-500">
                                    0
                                </div>
                            )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 self-center mr-1">
                            {assignedProjectUsers.length} member{assignedProjectUsers.length === 1 ? '' : 's'}
                        </div>
                        <div className="flex gap-2 mr-2 border-r border-slate-200 dark:border-slate-800 pr-4">
                            <Button
                                variant="outline"
                                className="flex items-center gap-2"
                                onClick={() => openAssignMembersModal(selectedProject)}
                            >
                                <UserPlus className="size-4" />
                                <span>Assign Members</span>
                            </Button>
                            {!isFreelance && isTaskBulkEditMode && selectedTaskIds.length > 0 && (
                                <Button
                                    variant="default"
                                    className="shadow-lg shadow-primary/20"
                                    onClick={() => setIsBulkEditTaskModalOpen(true)}
                                >
                                    Edit Selected ({selectedTaskIds.length})
                                </Button>
                            )}
                            {!isFreelance && (
                                <Button
                                    variant={isTaskBulkEditMode ? "secondary" : "outline"}
                                    className={isTaskBulkEditMode ? "bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700" : ""}
                                    onClick={() => {
                                        if (!isTaskBulkEditMode && viewMode !== 'list') setViewMode('list');
                                        setIsTaskBulkEditMode(!isTaskBulkEditMode);
                                        if (isTaskBulkEditMode) setSelectedTaskIds([]);
                                    }}
                                >
                                    {isTaskBulkEditMode ? "Cancel" : "Manage Tasks"}
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg mr-2">
                            <Button
                                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                                size="sm"
                                className={`px-2 h-8 ${viewMode === 'kanban' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                onClick={() => setViewMode('kanban')}
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                className={`px-2 h-8 ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="size-4" />
                            </Button>
                        </div>
                        <Button variant="outline" className="flex items-center gap-2" onClick={() => {
                            setImportFile(null);
                            setImportResult(null);
                            setIsImportModalOpen(true);
                        }}>
                            <Upload className="size-4" />
                            <span>Import</span>
                        </Button>
                        <Button className="flex items-center gap-2 shadow-lg shadow-primary/20" onClick={() => handleOpenModal('To Do')}>
                            <Plus className="size-5" />
                            <span>Add Task</span>
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                {selectedProject?.methodology === 'Waterfall' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {waterfallProgressCards.map((item) => (
                            <Card key={item.status} className="bg-slate-50 dark:bg-[#1e2532] border-none shadow-none">
                                <CardContent className="p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.status}</p>
                                    <div className="mt-2 flex items-end justify-between">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.percentage}%</p>
                                        <p className="text-xs text-slate-500">{item.count} task</p>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3">
                                        <div
                                            className="h-1.5 rounded-full bg-primary transition-all"
                                            style={{ width: `${item.percentage}%` }}
                                        ></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : !isFreelance && (roleQuotas.length > 0 || generalQuotaFromPresales > 0 || generalAllocatedHours > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {roleQuotas.map(quota => {
                            const alloc = Number(quota.allocated_hours) || 0;
                            const qh = Number(quota.quota_hours) || 0;
                            const realP = qh > 0 ? Math.round((alloc / qh) * 100) : 0;
                            const p = Math.min(100, realP);
                            const isOver = alloc > qh;
                            return (
                                <Card key={quota.id} className="bg-slate-50 dark:bg-[#1e2532] border-none shadow-none">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{quota.role_name}</p>
                                            <span className={`text-xs font-bold ${realP > 80 ? 'text-rose-500' : 'text-primary'}`}>{realP}%</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                <span>{formatHours(alloc)} <span className="text-[10px] font-normal text-slate-400">/ {formatHours(qh)} hrs</span></span>
                                            </p>
                                            {isOver && (
                                                <div className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[10px] font-bold tracking-tight">
                                                    Minus {(alloc - qh).toFixed(1)}h
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                                            <div className={`h-1.5 rounded-full transition-all ${realP > 90 ? 'bg-rose-500' : realP > 70 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${p}%` }}></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                        {(generalQuotaFromPresales > 0 || generalAllocatedHours > 0) && (
                            <Card key="general-quota" className="bg-slate-50 dark:bg-[#1e2532] border-none shadow-none">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">General Quota</p>
                                        <span className={`text-xs font-bold ${(generalQuotaFromPresales > 0 && (generalAllocatedHours / generalQuotaFromPresales) * 100 > 80) ? 'text-rose-500' : 'text-primary'}`}>
                                            {generalQuotaFromPresales > 0 ? `${Math.round((generalAllocatedHours / generalQuotaFromPresales) * 100)}%` : '0%'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            <span>{formatHours(generalAllocatedHours)} <span className="text-[10px] font-normal text-slate-400">/ {formatHours(generalQuotaFromPresales)} hrs</span></span>
                                        </p>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                                        <div
                                            className={`h-1.5 rounded-full transition-all ${generalQuotaFromPresales > 0 && (generalAllocatedHours / generalQuotaFromPresales) * 100 > 90 ? 'bg-rose-500' : generalQuotaFromPresales > 0 && (generalAllocatedHours / generalQuotaFromPresales) * 100 > 70 ? 'bg-orange-500' : 'bg-primary'}`}
                                            style={{ width: `${generalQuotaFromPresales > 0 ? Math.min(100, (generalAllocatedHours / generalQuotaFromPresales) * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Board / List View */}
            {viewMode === 'kanban' ? (
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 absolute inset-x-0 bottom-0 top-[300px]">
                    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                        <div className="flex h-full gap-6 min-w-max pb-6">
                            {COLUMNS.map(col => (
                                <BoardColumn
                                    key={col.title}
                                    title={col.title}
                                    color={col.color}
                                    count={getTasksByStatus(col.title).length}
                                    totalCount={tasks.length}
                                    onAddTask={() => handleOpenModal('To Do')}
                                >
                                    {getTasksByStatus(col.title).map(task => (
                                        <DraggableTaskCard
                                            key={task.id}
                                            task={task}
                                            isFreelance={isFreelance}
                                            assigneeName={task.assignee_id ? assigneeNameById[task.assignee_id] : null}
                                            onClick={(t) => handleOpenModal(t.status, t)}
                                        />
                                    ))}
                                </BoardColumn>
                            ))}
                        </div>
                    </DndContext>
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-6 absolute inset-x-0 bottom-0 top-[300px]">
                    <div className="bg-white dark:bg-[#151b28] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    {isTaskBulkEditMode && <th className="px-6 py-4 w-10"><Checkbox checked={tasks.length > 0 && selectedTaskIds.length === tasks.length} onCheckedChange={toggleAllTasks} aria-label="Select all" /></th>}
                                    <th className="px-6 py-4 font-medium">Task</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Priority</th>
                                    <th className="px-6 py-4 font-medium">Assignee</th>
                                    <th className="px-6 py-4 font-medium text-center">Category</th>
                                    <th className="px-6 py-4 font-medium text-center">Role Quota</th>
                                    {!isFreelance && <th className="px-6 py-4 font-medium text-right">Est. Hours</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {tasks.map(task => (
                                    <tr key={task.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedTaskIds.includes(task.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`} onClick={(e) => {
                                        if (isTaskBulkEditMode) {
                                            toggleTaskSelection(task.id);
                                        } else {
                                            handleOpenModal(task.status, task);
                                        }
                                    }}>
                                        {isTaskBulkEditMode && (
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox checked={selectedTaskIds.includes(task.id)} onCheckedChange={() => toggleTaskSelection(task.id)} />
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{task.title}</span>
                                                {task.feature_title && <span className="text-[10px] text-primary mt-1 font-bold uppercase tracking-wide">{task.feature_title}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={
                                                task.status === 'Done' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                                                    task.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                                        task.status === 'Review' ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' :
                                                            task.status === 'Re-open' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' :
                                                                'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
                                            }>{task.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${task.priority === 'High' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                                                task.priority === 'Medium' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                                                    'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                                }`}>{task.priority}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                {task.assignee_id ? (
                                                    <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        {users.find(u => u.id === task.assignee_id)?.name?.charAt(0) || '?'}
                                                    </div>
                                                ) : (
                                                    <div className="size-6 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center"></div>
                                                )}
                                                <span className="text-sm font-medium">
                                                    {task.assignee_id ? task.assignee_name || users.find(u => u.id === task.assignee_id)?.name || `Assignee ${task.assignee_id}` : 'Unassigned'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {task.category ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                    {task.category}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                {task.project_role_id 
                                                    ? (roleQuotas.find(q => q.project_role_id === task.project_role_id)?.role_name || `Role ${task.project_role_id}`) 
                                                    : 'General'}
                                            </span>
                                        </td>
                                        {!isFreelance && (
                                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center justify-end gap-1.5 font-medium text-sm">
                                                    <Clock className="size-3.5" />
                                                    {task.estimated_hours || 0} hrs
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {tasks.length === 0 && (
                                    <tr>
                                        <td colSpan={isTaskBulkEditMode && !isFreelance ? "8" : (isFreelance ? "6" : "7")} className="px-6 py-8 text-center text-slate-500">No tasks found. Create one first!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editingTaskId ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <form className="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-1" onSubmit={handleSubmitTask}>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Feature Title <span className="text-rose-500">*</span></label>
                            <Input type="text" value={newTaskFeatureTitle} onChange={e => setNewTaskFeatureTitle(e.target.value)} placeholder="E.g., Authentication" required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description / Sub-task <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <Textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} placeholder="Enter detailed description..." className="min-h-[80px]" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Title <span className="text-rose-500">*</span></label>
                            <Input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required placeholder="E.g., Design Homepage" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                            <Select value={newTaskCategory} onValueChange={(val) => {
                                setNewTaskCategory(val);
                                const matchedQuota = roleQuotas.find((q) => q.role_name === val);
                                if (matchedQuota) {
                                    setNewTaskRoleFilter(matchedQuota.project_role_id.toString());
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((categoryName) => (
                                        <SelectItem key={categoryName} value={categoryName}>{categoryName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                    <SelectTrigger className="w-full">
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
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="To Do">To Do</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Review">Review</SelectItem>
                                        <SelectItem value="Re-open">Re-open</SelectItem>
                                        <SelectItem value="Done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedProject?.methodology !== 'Waterfall' && !isFreelance && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Role Quota</label>
                                    <Select value={newTaskRoleFilter} onValueChange={(val) => {
                                        setNewTaskRoleFilter(val);
                                        setNewTaskAssignee('Unassigned');
                                    }}>
                                        <SelectTrigger className="w-full min-w-0">
                                            <SelectValue
                                                placeholder={newTaskCategory ? "Select Role..." : "Select category first"}
                                                className="truncate"
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedProject?.total_manhours > 0 && (
                                                <SelectItem value="All">
                                                    {`General Quota (Rem: ${formatHours(generalQuotaRemaining)}h)`}
                                                </SelectItem>
                                            )}
                                            {categoryBasedRoleQuotas
                                                .filter(q => q.quota_hours > 0)
                                                .map(q => (
                                                    <SelectItem key={q.project_role_id} value={q.project_role_id.toString()}>
                                                        {q.role_name} (Rem: {q.quota_hours - (q.allocated_hours || 0)}h)
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignee</label>
                                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                                    <SelectTrigger className="w-full min-w-0">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                                        {assigneeSelectOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={opt.id.toString()}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedProject?.methodology !== 'Waterfall' && !isFreelance && (
                                <div className="flex flex-col gap-2 col-span-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Manhours</label>
                                    <Input type="number" value={newTaskEstimate} onChange={e => setNewTaskEstimate(e.target.value)} min="0" step="0.5" placeholder="0" />
                                </div>
                            )}
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

            {/* Assign Members Modal */}
            <Dialog open={isAssignMembersModalOpen} onOpenChange={setIsAssignMembersModalOpen}>
                <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>Assign Project Members</DialogTitle>
                        <DialogDescription>
                            {assigningProject ? `Set anggota project untuk "${assigningProject.name}".` : 'Set anggota project.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                        {assignmentRows.map((row, index) => (
                            <div key={`${index}-${row.user_id}-${row.project_role_id}`} className="grid grid-cols-12 gap-2 items-end border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                <div className="col-span-5">
                                    <label className="text-xs font-medium text-slate-500">User</label>
                                    <select
                                        className="mt-1 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md p-2 text-sm"
                                        value={row.user_id}
                                        onChange={(e) => updateAssignmentRow(index, 'user_id', e.target.value)}
                                    >
                                        <option value="">Select user</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-5">
                                    <label className="text-xs font-medium text-slate-500">Project Role</label>
                                    <select
                                        className="mt-1 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md p-2 text-sm"
                                        value={row.project_role_id}
                                        onChange={(e) => updateAssignmentRow(index, 'project_role_id', e.target.value)}
                                    >
                                        <option value="">Select role</option>
                                        {projectRolesMaster.map((role) => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-500"
                                        onClick={() => removeAssignmentRow(index)}
                                        disabled={assignmentRows.length === 1 || String(row.user_id) === String(user?.id)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addAssignmentRow}>
                            <Plus className="size-4 mr-2" />
                            Add Member Row
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAssignMembersModalOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={saveProjectAssignments} disabled={isSavingAssignment}>
                            {isSavingAssignment && <Loader2 className="size-4 mr-2 animate-spin" />}
                            Save Members
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirm Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
                setIsDeleteModalOpen(open);
                if (!open) {
                    setProjectToDelete(null);
                }
            }}>
                <DialogContent className="sm:max-w-[425px] z-[9999]" overlayClassName="z-[9998]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Project{selectedProjectIds.length > 0 ? 's' : ''}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {projectToDelete ? `"${projectToDelete.name}"` : `${selectedProjectIds.length} project(s)`}?
                            This action is permanent and will delete all associated tasks, manhours, and team assignments.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                if (projectToDelete) {
                                    handleDeleteProject(projectToDelete.id);
                                } else {
                                    handleBulkDelete();
                                }
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Confirm Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Edit Task Modal */}
            <Dialog open={!isFreelance && isBulkEditTaskModalOpen} onOpenChange={setIsBulkEditTaskModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Bulk Edit Manhours & Quota</DialogTitle>
                        <DialogDescription>
                            Applying changes to {selectedTaskIds.length} task(s). Leave fields blank to keep their current values.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="flex flex-col gap-4 py-4" onSubmit={handleBulkEditSubmit}>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Role Quota</label>
                            <Select value={bulkEditRoleFilter} onValueChange={setBulkEditRoleFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Keep current role quota" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Keep current role quota</SelectItem>
                                    {roleQuotas
                                        .filter(q => q.quota_hours > 0)
                                        .map(q => (
                                            <SelectItem key={q.project_role_id} value={q.project_role_id.toString()}>
                                                {q.role_name} (Rem: {q.quota_hours - (q.allocated_hours || 0)}h)
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Manhours <span className="text-slate-400 font-normal">(for each task)</span></label>
                            <Input type="number" value={bulkEditEstimate} onChange={e => setBulkEditEstimate(e.target.value)} min="0" step="0.5" placeholder="Leave blank to keep current" />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsBulkEditTaskModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingBulk}>
                                {isSubmittingBulk && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Import Tasks Modal */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Import Tasks</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file to import tasks to this project board.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {!importResult ? (
                        <form onSubmit={handleImportTasks} className="space-y-4 py-4">
                            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="p-3 rounded-full bg-primary/10 text-primary">
                                    <Upload className="size-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {importFile ? importFile.name : 'Choose a file or drag and drop'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">CSV file only (max 5MB)</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    id="csv-upload"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('csv-upload').click()}
                                >
                                    Select File
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Download className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-primary">Need a template?</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Download the standard CSV structure.</p>
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate} className="hover:bg-primary/10 text-primary">
                                    Download
                                </Button>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!importFile || isImporting}>
                                    {isImporting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Start Import
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <div className="py-4 space-y-4">
                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${importResult.errors.length === 0 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800' : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800'}`}>
                                {importResult.errors.length === 0 ? <Plus className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                                <div>
                                    <p className="font-bold">{importResult.message}</p>
                                    <p className="text-sm opacity-90">{importResult.success} tasks successfully created.</p>
                                </div>
                            </div>
                            
                            {importResult.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alerts / Errors ({importResult.errors.length})</p>
                                    <div className="max-h-[200px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 space-y-1">
                                        {importResult.errors.map((err, i) => (
                                            <p key={i} className="text-[11px] text-rose-500 font-medium font-mono">{err}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-4">
                                <Button type="button" className="w-full" onClick={() => setIsImportModalOpen(false)}>Close</Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
