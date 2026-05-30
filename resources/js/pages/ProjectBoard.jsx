import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAPI, getApiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isFreelanceUser } from '../utils/permissions';
import { Clock, Plus, PiggyBank, Loader2, ArrowLeft, Briefcase, FileText, LayoutGrid, List, Trash2, Upload, Download, AlertCircle, UserPlus, CheckCircle2, RotateCcw, Activity, CalendarRange, BarChart3, GanttChart, BookOpen, Search, ArrowUpDown, Star } from 'lucide-react';
import { toDateInputValue, formatTaskDateRange, validateTaskDateRange } from '../utils/taskDates';
import { hasPermission } from '../utils/permissions';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import SubtaskSection, { subtasksTotalHours } from '../components/board/SubtaskSection';
import AssigneeSearchSelect from '../components/board/AssigneeSearchSelect';
import TaskNotesSection from '../components/board/TaskNotesSection';
import ProjectNotesPanel from '../components/board/ProjectNotesPanel';
import {
    billableHoursForTask,
    loadHoursForTask,
    parseOptionalManhoursInput,
    TaskBillingBadges,
    taskIsEffectivelyNonBillable,
} from '../utils/taskBillable.jsx';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const RUSH_HOUR_FACTOR = 1.3;

function ProjectCompanyIcon({ logoUrl, projectName, size = 'lg' }) {
    const imgClass = size === 'lg' ? 'size-12 rounded-xl' : 'size-8 rounded-lg';
    const iconWrapClass = size === 'lg' ? 'p-3 rounded-xl' : 'p-2 rounded-lg';
    const iconClass = size === 'lg' ? 'size-6' : 'size-4';

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={projectName ? `${projectName} company logo` : 'Company logo'}
                className={`${imgClass} object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0`}
            />
        );
    }

    return (
        <div className={`${iconWrapClass} bg-primary/10 text-primary shrink-0`}>
            <Briefcase className={iconClass} />
        </div>
    );
}

/** Stored MH = base input * factor when rush hour; reverse for edit form. */
function baseInputFromStoredHours(storedHours, rushHour) {
    const h = Number(storedHours);
    if (!Number.isFinite(h) || h < 0) return '';
    if (rushHour && h > 0) {
        const base = h / RUSH_HOUR_FACTOR;
        return String(Math.round(base * 1000) / 1000);
    }
    return h === 0 ? '0' : String(storedHours);
}

function effectiveHoursFromBaseInput(baseStr, rushHour) {
    const b = parseFloat(baseStr);
    if (!Number.isFinite(b) || b < 0) return 0;
    return rushHour ? Math.round(b * RUSH_HOUR_FACTOR * 1000) / 1000 : b;
}

function DraggableTaskCard({ task, onClick, assigneeName, isFreelance, formatHours }) {
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

    const assigneeLabel = task.assignee_id
        ? (task.assignee_name || assigneeName || `Assignee ${task.assignee_id}`)
        : 'Unassigned';
    const leafLoadH = loadHoursForTask(task);
    const hoursLabel = task.subtasks?.length > 0
        ? `${formatHours(subtasksTotalHours(task.subtasks))}h`
        : leafLoadH > 0 || !taskIsEffectivelyNonBillable(task)
          ? `${formatHours(leafLoadH)}h`
          : null;

    return (
        <div ref={setNodeRef} style={style} className="relative group touch-none" {...attributes} {...listeners}>
            <Card
                className="cursor-pointer border-slate-200/90 p-3 shadow-sm transition-colors hover:border-primary/40 dark:border-slate-700/80"
                onClick={() => onClick(task)}
            >
                <div className="mb-2 flex flex-wrap items-center gap-1">
                    <span className={`${pClass} rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide`}>
                        {task.priority}
                    </span>
                    {!isFreelance && <TaskBillingBadges task={task} />}
                    {task.rush_hour && (
                        <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                            Rush
                        </span>
                    )}
                    {task.subtasks?.length > 0 && (
                        <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                            {task.subtasks.length} sub
                        </span>
                    )}
                    {!isFreelance && hoursLabel && (
                        <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                            <Clock className="size-3 shrink-0" />
                            {hoursLabel}
                        </span>
                    )}
                </div>

                {(task.feature_title || task.category) && (
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                        {task.feature_title && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-primary">{task.feature_title}</span>
                        )}
                        {task.category && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {task.category}
                            </span>
                        )}
                    </div>
                )}

                <h4 className="text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">{task.title}</h4>

                {formatTaskDateRange(task.start_date, task.due_date) && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <CalendarRange className="size-3 shrink-0" />
                        {formatTaskDateRange(task.start_date, task.due_date)}
                    </p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400" title={assigneeLabel}>
                        {assigneeLabel}
                    </span>
                    {task.description && <FileText className="size-3.5 shrink-0 text-slate-400" aria-label="Has description" />}
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
            className={cn(
                'flex h-full max-h-full w-[min(18rem,88vw)] shrink-0 snap-start flex-col rounded-xl border bg-slate-50/90 transition-colors duration-200 dark:bg-[#151b28]/60 sm:w-72',
                isOver
                    ? 'border-primary/40 bg-primary/5 shadow-sm dark:bg-primary/5'
                    : 'border-slate-200/80 dark:border-slate-800/60',
            )}
        >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800/50">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('size-2 shrink-0 rounded-full', color)} />
                    <h3 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
                    <Badge variant="secondary" className="h-5 shrink-0 px-1.5 py-0 tabular-nums">{count}</Badge>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{perc}%</span>
                </div>
            </div>
            <div className="board-column-scroll relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
                {children}
                {count === 0 && (
                    <p className="pointer-events-none py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        Drop tasks here
                    </p>
                )}
            </div>
            {title === 'To Do' && (
                <div className="shrink-0 border-t border-slate-200/80 p-2 dark:border-slate-800/50">
                    <Button variant="outline" size="sm" className="h-8 w-full border-dashed text-xs" onClick={onAddTask}>
                        <Plus className="mr-1.5 size-3.5" />
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
    const [searchParams, setSearchParams] = useSearchParams();
    const taskParam = searchParams.get('task');
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
    const [projectListTab, setProjectListTab] = useState('active');
    const [projectListSearch, setProjectListSearch] = useState('');
    const [projectSortBy, setProjectSortBy] = useState('newest');
    const [pinnedProjectIds, setPinnedProjectIds] = useState(() => {
        try {
            const raw = localStorage.getItem('projectBoardPinnedIds');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
        } catch {
            return [];
        }
    });

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
    const [newTaskRushHour, setNewTaskRushHour] = useState(false);
    const [newTaskCategory, setNewTaskCategory] = useState('');
    const [newTaskStartDate, setNewTaskStartDate] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskBillable, setNewTaskBillable] = useState(true);
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
    const [isUpdatingProjectStatus, setIsUpdatingProjectStatus] = useState(false);
    const [isProjectNotesOpen, setIsProjectNotesOpen] = useState(false);
    const isFreelance = isFreelanceUser(user);
    const canUpdateBoard = hasPermission(user, 'project_board.update');

    useEffect(() => {
        localStorage.setItem('projectBoardPinnedIds', JSON.stringify(pinnedProjectIds));
    }, [pinnedProjectIds]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    const loadProjects = async () => {
        try {
            const res = await fetchAPI('/projects');
            if (res.data) setProjects(res.data);
            return res.data || [];
        } catch (error) {
            console.error("Failed to load projects", error);
            return [];
        }
    };

    const applyProjectStatusUpdate = async (project, { status, reopen = false }) => {
        if (!project?.id) return;
        setIsUpdatingProjectStatus(true);
        try {
            const body = reopen ? { reopen: true } : { status };
            await fetchAPI(`/projects/${project.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            const refreshed = await loadProjects();
            const updated = refreshed.find((p) => p.id.toString() === project.id.toString());
            if (updated && selectedProject?.id?.toString() === project.id.toString()) {
                setSelectedProject(updated);
            }
        } catch (error) {
            alert('Failed to update project status: ' + error.message);
        } finally {
            setIsUpdatingProjectStatus(false);
        }
    };

    const handleCloseProject = async (project) => {
        if (!project) return;
        let hint = '';
        if (selectedProject?.id?.toString() === project.id.toString() && tasks.length > 0) {
            const openTasks = tasks.filter((t) => t.status !== 'Done').length;
            if (openTasks > 0) {
                hint = `\n\nPerhatian: masih ada ${openTasks} task yang belum Done.`;
            }
        }
        if (!window.confirm(`Tandai project "${project.name}" sebagai Done/Closed? Status ini hanya diubah manual.${hint}`)) {
            return;
        }
        await applyProjectStatusUpdate(project, { status: 'Done' });
    };

    const handleReopenProject = async (project) => {
        if (!project) return;
        if (!window.confirm(`Buka kembali project "${project.name}"? Status Done akan dihapus.`)) {
            return;
        }
        await applyProjectStatusUpdate(project, { reopen: true });
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
    const isProjectPinned = useCallback((projectId) => (
        pinnedProjectIds.includes(String(projectId))
    ), [pinnedProjectIds]);
    const togglePinnedProject = useCallback((projectId) => {
        const key = String(projectId);
        setPinnedProjectIds((prev) => (
            prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
        ));
    }, []);

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
            if (!isFreelance) {
                try {
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
                            perc,
                        });
                    }
                } catch (balanceErr) {
                    console.warn('Project board: could not load balance.', balanceErr);
                }
            } else {
                setStats({
                    total_manhours: null,
                    allocated_hours: 0,
                    actual_hours: 0,
                    remaining: null,
                    perc: 0,
                });
                setRoleQuotas([]);
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

            if (!isFreelance) {
                try {
                    const quotasRes = await fetchAPI(`/projects/${projectId}/quotas`);
                    if (quotasRes.data) {
                        setRoleQuotas((quotasRes.data || []).filter((q) => q.is_active !== false));
                    }
                } catch (quotasErr) {
                    console.warn('Project board: could not load quotas.', quotasErr);
                }
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

    const applyTaskFormState = useCallback((status, taskToEdit = null) => {
        if (taskToEdit) {
            setEditingTaskId(taskToEdit.id);
            setNewTaskTitle(taskToEdit.title);
            setNewTaskFeatureTitle(taskToEdit.feature_title || '');
            setNewTaskDescription(taskToEdit.description || '');
            setNewTaskStatus(taskToEdit.status);
            setNewTaskPriority(taskToEdit.priority);

            if (taskToEdit.assignee_id) {
                const memberInfo = projectMembers.find(m => m.user_id === taskToEdit.assignee_id);
                setNewTaskRoleFilter(memberInfo ? memberInfo.role_name : 'All');
            } else {
                setNewTaskRoleFilter('All');
            }

            setNewTaskAssignee(taskToEdit.assignee_id ? taskToEdit.assignee_id.toString() : 'Unassigned');
            setNewTaskRushHour(!!taskToEdit.rush_hour);
            setNewTaskEstimate(baseInputFromStoredHours(taskToEdit.estimated_hours, !!taskToEdit.rush_hour));
            setNewTaskCategory(taskToEdit.category || '');
            setNewTaskRoleFilter(taskToEdit.project_role_id ? taskToEdit.project_role_id.toString() : 'All');
            setNewTaskStartDate(toDateInputValue(taskToEdit.start_date));
            setNewTaskDueDate(toDateInputValue(taskToEdit.due_date));
            setNewTaskBillable(taskToEdit.is_billable !== false);
        } else {
            setEditingTaskId(null);
            setNewTaskStatus(status || 'To Do');
            setNewTaskTitle('');
            setNewTaskFeatureTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('Medium');

            if (selectedProject?.total_manhours > 0) {
                setNewTaskRoleFilter('All');
            } else if (roleQuotas.length > 0) {
                setNewTaskRoleFilter(roleQuotas[0].project_role_id.toString());
            } else {
                setNewTaskRoleFilter('All');
            }

            setNewTaskAssignee('Unassigned');
            setNewTaskEstimate('');
            setNewTaskRushHour(false);
            setNewTaskCategory('');
            setNewTaskStartDate('');
            setNewTaskDueDate('');
            setNewTaskBillable(true);
        }
    }, [projectMembers, roleQuotas, selectedProject]);

    const closeTaskModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingTaskId(null);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('task');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const handleOpenModal = (status, taskToEdit = null) => {
        applyTaskFormState(status, taskToEdit);
        setIsModalOpen(true);
        if (!projectId) return;
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (taskToEdit?.id) {
                next.set('task', String(taskToEdit.id));
            } else {
                next.set('task', 'new');
            }
            return next;
        }, { replace: false });
    };

    useEffect(() => {
        if (!projectId || !selectedProject) return;
        if (!taskParam) {
            if (isModalOpen) {
                setIsModalOpen(false);
                setEditingTaskId(null);
            }
            return;
        }
        if (taskParam === 'new') {
            if (isModalOpen && !editingTaskId) return;
            applyTaskFormState('To Do', null);
            setIsModalOpen(true);
            return;
        }
        const task = tasks.find((t) => String(t.id) === taskParam);
        if (task) {
            if (isModalOpen && editingTaskId != null && String(editingTaskId) === taskParam) return;
            applyTaskFormState(task.status, task);
            setIsModalOpen(true);
            return;
        }
        if (tasks.length > 0) {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('task');
                return next;
            }, { replace: true });
        }
    }, [taskParam, projectId, selectedProject, tasks, applyTaskFormState, isModalOpen, editingTaskId, setSearchParams]);

    useEffect(() => {
        if (!projectId && taskParam) {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('task');
                return next;
            }, { replace: true });
        }
    }, [projectId, taskParam, setSearchParams]);

    const visibleRoleQuotas = useMemo(
        () => roleQuotas.filter((quota) => Number(quota.quota_hours || 0) > 0),
        [roleQuotas]
    );

    const categoryOptions = useMemo(
        () => Array.from(new Set(visibleRoleQuotas.map((q) => q.role_name).filter(Boolean))),
        [visibleRoleQuotas]
    );

    const categoryBasedRoleQuotas = visibleRoleQuotas.filter((quota) =>
        newTaskCategory ? quota.role_name === newTaskCategory : true
    );

    const editingTask = useMemo(
        () => (editingTaskId ? tasks.find((t) => Number(t.id) === Number(editingTaskId)) : null),
        [editingTaskId, tasks],
    );
    const editingSubtasks = editingTask?.subtasks ?? [];
    const hasSubtasks = editingSubtasks.length > 0;

    const formatHours = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return '0';
        return Number.isInteger(num) ? `${num}` : num.toFixed(1);
    };

    const normalizeBoardTaskStatus = (status) => {
        const value = String(status || '').trim().toLowerCase();
        if (value === 're-open' || value === 'reopen') return 'Reopen';
        if (value === 'in progress') return 'In Progress';
        if (value === 'to do' || value === 'todo') return 'To Do';
        if (value === 'review') return 'Review';
        if (value === 'done') return 'Done';
        return String(status || '').trim() || 'To Do';
    };

    const deriveProjectStatusFromTasks = (taskList) => {
        const hasOutsideTodo = taskList.some((t) => normalizeBoardTaskStatus(t.status) !== 'To Do');
        return hasOutsideTodo ? 'In Progress' : 'Planning';
    };

    const syncSelectedProjectFromList = async (projectId) => {
        const refreshed = await loadProjects();
        const updated = refreshed.find((p) => p.id.toString() === projectId.toString());
        if (updated) {
            setSelectedProject(updated);
        }
        return updated;
    };

    const mappedRoleQuotaHours = roleQuotas.reduce((sum, quota) => sum + (Number(quota.quota_hours) || 0), 0);
    const generalQuotaFromPresales = Math.max(0, (Number(selectedProject?.total_manhours) || 0) - mappedRoleQuotaHours);
    const generalAllocatedHours = tasks.reduce((sum, task) => {
        if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
            return sum + task.subtasks
                .filter((st) => !st.project_role_id && st.is_billable !== false)
                .reduce((s, st) => s + (Number(st.estimated_hours) || 0), 0);
        }
        if (!task.project_role_id && task.is_billable !== false) {
            return sum + (Number(task.estimated_hours) || 0);
        }
        return sum;
    }, 0);
    const generalQuotaRemaining = Math.max(0, generalQuotaFromPresales - generalAllocatedHours);
    const showGeneralQuotaCard = generalQuotaFromPresales > 0;
    const hasQuotaSummary = visibleRoleQuotas.length > 0 || showGeneralQuotaCard;
    const headerTotalManhours = stats.total_manhours ?? selectedProject?.total_manhours;
    const headerUsedManhours = useMemo(() => {
        const fromTasks = tasks.reduce((sum, task) => {
            if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
                return sum + task.subtasks.reduce((s, st) => {
                    if (st.is_billable === false) return s;
                    if (normalizeBoardTaskStatus(st.status) === 'To Do') return s;
                    return s + (Number(st.estimated_hours) || 0);
                }, 0);
            }
            if (task.is_billable === false) return sum;
            if (normalizeBoardTaskStatus(task.status) === 'To Do') return sum;
            return sum + (Number(task.estimated_hours) || 0);
        }, 0);
        if (tasks.length > 0) return fromTasks;
        return Number(stats.allocated_hours) || 0;
    }, [tasks, stats.allocated_hours]);
    const headerUsagePercent = useMemo(() => {
        const total = Number(headerTotalManhours) || 0;
        if (total <= 0) return 0;
        return Math.min(100, Math.round((headerUsedManhours / total) * 1000) / 10);
    }, [headerUsedManhours, headerTotalManhours]);
    const headerRemainingManhours = useMemo(() => {
        const total = Number(headerTotalManhours) || 0;
        return Math.max(0, total - headerUsedManhours);
    }, [headerTotalManhours, headerUsedManhours]);

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        const dateErr = validateTaskDateRange(newTaskStartDate, newTaskDueDate);
        if (dateErr) {
            alert(dateErr);
            return;
        }
        setIsSubmitting(true);
        try {
            const isWaterfall = selectedProject?.methodology === 'Waterfall';
            const isBillable = newTaskBillable !== false;
            let storedHours = 0;
            if (!hasSubtasks) {
                if (isBillable) {
                    if (isWaterfall) {
                        const b = parseFloat(newTaskEstimate);
                        storedHours = Number.isFinite(b) ? Math.max(0, b) : 0;
                    } else {
                        storedHours = effectiveHoursFromBaseInput(newTaskEstimate, newTaskRushHour);
                    }
                } else {
                    storedHours = parseOptionalManhoursInput(newTaskEstimate) ?? 0;
                }
            }
            const payload = {
                title: newTaskTitle,
                feature_title: newTaskFeatureTitle,
                description: newTaskDescription,
                priority: newTaskPriority,
                status: newTaskStatus,
                assignee_id: newTaskAssignee !== 'Unassigned' ? parseInt(newTaskAssignee) : null,
                estimated_hours: storedHours,
                rush_hour: isWaterfall || isFreelance || !isBillable ? false : newTaskRushHour,
                project_id: selectedProject.id,
                project_role_id: isWaterfall ? null : (newTaskRoleFilter !== 'All' ? parseInt(newTaskRoleFilter) : null),
                category: newTaskCategory || null,
                start_date: newTaskStartDate || null,
                due_date: newTaskDueDate || null,
            };
            if (!hasSubtasks) {
                payload.is_billable = isBillable;
            }

            if (editingTaskId) {
                await fetchAPI(`/tasks/${editingTaskId}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await fetchAPI('/tasks', { method: 'POST', body: JSON.stringify(payload) });
            }
            closeTaskModal();
            await loadBoard(selectedProject.id);
            await syncSelectedProjectFromList(selectedProject.id);
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

    const handleDownloadTemplate = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert('Please log in to download the template.');
            return;
        }

        try {
            const response = await fetch(`${getApiUrl()}/tasks/template`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/csv',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to download template');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'task-import-template.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            alert(error.message || 'Failed to download template');
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
                await loadBoard(selectedProject.id);
                await syncSelectedProjectFromList(selectedProject.id);
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

    const toggleAllProjects = (visibleProjects) => {
        if (selectedProjectIds.length === visibleProjects.length) {
            setSelectedProjectIds([]);
        } else {
            setSelectedProjectIds(visibleProjects.map(p => p.id));
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
    const assignmentUserOptions = useMemo(() => {
        if (users.length > 0) {
            return users.map((u) => ({
                id: String(u.id),
                label: u.email ? `${u.name} (${u.email})` : u.name,
            }));
        }
        return assigneeSelectOptions.map((o) => ({
            id: String(o.id),
            label: o.label,
        }));
    }, [users, assigneeSelectOptions]);

    const activeProjects = useMemo(
        () => projects.filter((p) => p.status !== 'Done'),
        [projects]
    );
    const doneProjects = useMemo(
        () => projects.filter((p) => p.status === 'Done'),
        [projects]
    );
    const displayedProjects = projectListTab === 'done' ? doneProjects : activeProjects;

    const filteredDisplayedProjects = useMemo(() => {
        const q = projectListSearch.trim().toLowerCase();
        if (!q) return displayedProjects;
        return displayedProjects.filter(
            (p) =>
                (p.name || '').toLowerCase().includes(q)
                || (p.methodology || '').toLowerCase().includes(q)
                || (p.status || '').toLowerCase().includes(q)
                || (p.budget_status || '').toLowerCase().includes(q),
        );
    }, [displayedProjects, projectListSearch]);
    const sortedDisplayedProjects = useMemo(() => {
        const items = [...filteredDisplayedProjects];
        const createdAtTime = (project) => {
            const t = new Date(project?.created_at || '').getTime();
            return Number.isFinite(t) ? t : 0;
        };
        const numericId = (project) => Number(project?.id) || 0;
        const textName = (project) => String(project?.name || '').toLowerCase();
        const totalMh = (project) => Number(project?.total_manhours) || 0;
        const usage = (project) => Number(project?.usage_percentage) || 0;

        items.sort((a, b) => {
            const aPinned = pinnedProjectIds.includes(String(a?.id));
            const bPinned = pinnedProjectIds.includes(String(b?.id));
            if (aPinned !== bPinned) return aPinned ? -1 : 1;
            if (projectSortBy === 'oldest') {
                const dateDiff = createdAtTime(a) - createdAtTime(b);
                return dateDiff !== 0 ? dateDiff : numericId(a) - numericId(b);
            }
            if (projectSortBy === 'name_asc') return textName(a).localeCompare(textName(b));
            if (projectSortBy === 'name_desc') return textName(b).localeCompare(textName(a));
            if (projectSortBy === 'quota_desc') return totalMh(b) - totalMh(a);
            if (projectSortBy === 'usage_desc') return usage(b) - usage(a);
            const dateDiff = createdAtTime(b) - createdAtTime(a);
            return dateDiff !== 0 ? dateDiff : numericId(b) - numericId(a);
        });
        return items;
    }, [filteredDisplayedProjects, pinnedProjectIds, projectSortBy]);

    const displayProjectStatus = useMemo(() => {
        if (!selectedProject) return 'Planning';
        if (selectedProject.status === 'Done') return 'Done';
        if (tasks.length > 0) return deriveProjectStatusFromTasks(tasks);
        return selectedProject.status || 'Planning';
    }, [selectedProject, tasks]);

    const projectStatusBadgeClass = (status) =>
        cn(
            status === 'Done' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
            status === 'In Progress' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
            status !== 'Done' && status !== 'In Progress' && 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300',
        );

    if (!selectedProject) {
        return (
            <div className="min-h-full overflow-y-auto bg-slate-50/80 dark:bg-background-dark">
                <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Project Board</h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Pilih project untuk membuka kanban dan mengelola task.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn('h-8 px-2.5', listViewMode === 'grid' && 'bg-slate-100 dark:bg-slate-800')}
                                    onClick={() => setListViewMode('grid')}
                                    title="Grid"
                                >
                                    <LayoutGrid className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn('h-8 px-2.5', listViewMode === 'table' && 'bg-slate-100 dark:bg-slate-800')}
                                    onClick={() => setListViewMode('table')}
                                    title="Table"
                                >
                                    <List className="size-4" />
                                </Button>
                            </div>
                            {isEditMode && sortedDisplayedProjects.length > 0 && (
                                <Button variant="outline" size="sm" onClick={() => toggleAllProjects(sortedDisplayedProjects)}>
                                    {selectedProjectIds.length === sortedDisplayedProjects.length ? 'Batal semua' : 'Pilih semua'}
                                </Button>
                            )}
                            {isEditMode && selectedProjectIds.length > 0 && (
                                <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
                                    Hapus ({selectedProjectIds.length})
                                </Button>
                            )}
                            <Button
                                variant={isEditMode ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setIsEditMode(!isEditMode);
                                    if (isEditMode) setSelectedProjectIds([]);
                                }}
                            >
                                {isEditMode ? 'Selesai' : 'Kelola'}
                            </Button>
                        </div>
                    </header>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn('h-8 gap-1.5 px-3', projectListTab === 'active' && 'bg-primary text-white hover:bg-primary hover:text-white')}
                                onClick={() => {
                                    setProjectListTab('active');
                                    setSelectedProjectIds([]);
                                }}
                            >
                                Aktif
                                <span className="text-xs opacity-80">({activeProjects.length})</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn('h-8 gap-1.5 px-3', projectListTab === 'done' && 'bg-primary text-white hover:bg-primary hover:text-white')}
                                onClick={() => {
                                    setProjectListTab('done');
                                    setSelectedProjectIds([]);
                                }}
                            >
                                Done
                                <span className="text-xs opacity-80">({doneProjects.length})</span>
                            </Button>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-56">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={projectListSearch}
                                    onChange={(e) => setProjectListSearch(e.target.value)}
                                    placeholder="Cari project..."
                                    className="h-9 pl-8 bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div className="w-full sm:w-52">
                                <Select value={projectSortBy} onValueChange={setProjectSortBy}>
                                    <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
                                        <ArrowUpDown className="mr-2 size-3.5 text-slate-500" />
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Terbaru</SelectItem>
                                        <SelectItem value="oldest">Terlama</SelectItem>
                                        <SelectItem value="name_asc">Nama A-Z</SelectItem>
                                        <SelectItem value="name_desc">Nama Z-A</SelectItem>
                                        <SelectItem value="quota_desc">Kuota MH terbesar</SelectItem>
                                        <SelectItem value="usage_desc">Usage tertinggi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {sortedDisplayedProjects.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500 dark:border-slate-700">
                            {displayedProjects.length === 0
                                ? projectListTab === 'done'
                                    ? 'Belum ada project Done.'
                                    : 'Belum ada project aktif.'
                                : 'Tidak ada hasil pencarian.'}
                        </div>
                    ) : listViewMode === 'grid' ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {sortedDisplayedProjects.map((project) => (
                                <Card
                                    key={project.id}
                                    className={cn(
                                        'group relative cursor-pointer border-slate-200/90 bg-white shadow-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-[#151b28]',
                                        isEditMode && selectedProjectIds.includes(project.id) && 'border-rose-400 ring-1 ring-rose-200',
                                    )}
                                    onClick={(e) => {
                                        if (e.target.closest('[data-card-action="true"]')) return;
                                        if (isEditMode) {
                                            toggleProjectSelection(project.id);
                                        } else {
                                            navigate(`/board/${project.id}`);
                                        }
                                    }}
                                >
                                    {isEditMode ? (
                                        <div className="absolute right-3 top-3 z-10 pointer-events-none">
                                            <Checkbox
                                                checked={selectedProjectIds.includes(project.id)}
                                                tabIndex={-1}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            data-card-action="true"
                                            className="absolute right-2 top-2 z-10 flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                                        >
                                            {canUpdateBoard && project.status !== 'Done' && (
                                                <Button
                                                    data-card-action="true"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-500 hover:text-emerald-600"
                                                    disabled={isUpdatingProjectStatus}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCloseProject(project);
                                                    }}
                                                    title="Mark project as Done"
                                                >
                                                    <CheckCircle2 className="size-4" />
                                                </Button>
                                            )}
                                            {canUpdateBoard && project.status === 'Done' && (
                                                <Button
                                                    data-card-action="true"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-500 hover:text-blue-600"
                                                    disabled={isUpdatingProjectStatus}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReopenProject(project);
                                                    }}
                                                    title="Reopen project"
                                                >
                                                    <RotateCcw className="size-4" />
                                                </Button>
                                            )}
                                            <Button
                                                data-card-action="true"
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'text-slate-500',
                                                    isProjectPinned(project.id) ? 'text-amber-500 hover:text-amber-600' : 'hover:text-amber-500',
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePinnedProject(project.id);
                                                }}
                                                title={isProjectPinned(project.id) ? 'Unpin project' : 'Pin project'}
                                            >
                                                <Star className={cn('size-4', isProjectPinned(project.id) && 'fill-current')} />
                                            </Button>
                                            <Button
                                                data-card-action="true"
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
                                                data-card-action="true"
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
                                    <CardContent className="p-4">
                                        <div className="flex gap-3">
                                            <ProjectCompanyIcon logoUrl={project.company_logo_url} projectName={project.name} size="lg" />
                                            <div className="min-w-0 flex-1 pr-8">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                                                        {isProjectPinned(project.id) && <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-500" />}
                                                        {project.name}
                                                    </h3>
                                                    <Badge variant="outline" className={cn('shrink-0 text-[10px]', projectStatusBadgeClass(project.status))}>
                                                        {project.status}
                                                    </Badge>
                                                </div>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {project.methodology} · {project.budget_status || '—'}
                                                </p>
                                                {!isFreelance && project.total_manhours > 0 && (
                                                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                                        <Clock className="size-3 shrink-0" />
                                                        {project.methodology === 'Agile Scrum'
                                                            ? `${formatHours(project.remaining_manhours)}h sisa · ${Number(project.usage_percentage || 0).toFixed(0)}%`
                                                            : `${formatHours(project.total_manhours)}h kuota`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151b28]">
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
                                    {sortedDisplayedProjects.map((project) => (
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
                                                    <ProjectCompanyIcon logoUrl={project.company_logo_url} projectName={project.name} size="sm" />
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {isProjectPinned(project.id) && <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-500" />}
                                                        {project.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={projectStatusBadgeClass(project.status)}>
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
                                                        {canUpdateBoard && project.status !== 'Done' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-400 hover:text-emerald-600"
                                                                disabled={isUpdatingProjectStatus}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCloseProject(project);
                                                                }}
                                                                title="Mark project as Done"
                                                            >
                                                                <CheckCircle2 className="size-4" />
                                                            </Button>
                                                        )}
                                                        {canUpdateBoard && project.status === 'Done' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-400 hover:text-blue-600"
                                                                disabled={isUpdatingProjectStatus}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReopenProject(project);
                                                                }}
                                                                title="Reopen project"
                                                            >
                                                                <RotateCcw className="size-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                'text-slate-400',
                                                                isProjectPinned(project.id) ? 'text-amber-500 hover:text-amber-600' : 'hover:text-amber-500',
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                togglePinnedProject(project.id);
                                                            }}
                                                            title={isProjectPinned(project.id) ? 'Unpin project' : 'Pin project'}
                                                        >
                                                            <Star className={cn('size-4', isProjectPinned(project.id) && 'fill-current')} />
                                                        </Button>
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

                    {/* Assign Members Modal (available from project list) */}
                    <Dialog open={isAssignMembersModalOpen} onOpenChange={setIsAssignMembersModalOpen}>
                        <DialogContent className="sm:max-w-[640px]">
                            <DialogHeader>
                                <DialogTitle>Assign Project Members</DialogTitle>
                                <DialogDescription>
                                    {assigningProject ? `Set anggota project untuk "${assigningProject.name}".` : 'Set anggota project.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
                                {assignmentRows.map((row, index) => (
                                    <div key={`${index}-${row.user_id}-${row.project_role_id}`} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                                        <div className="col-span-5">
                                            <label className="text-xs font-medium text-slate-500">User</label>
                                            <AssigneeSearchSelect
                                                value={row.user_id || 'Unassigned'}
                                                onChange={(next) => updateAssignmentRow(index, 'user_id', next === 'Unassigned' ? '' : String(next))}
                                                options={assignmentUserOptions}
                                                placeholder="Cari user (min. 2 karakter)..."
                                                className="mt-1"
                                                inputClassName="bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <label className="text-xs font-medium text-slate-500">Project Role</label>
                                            <select
                                                className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                                    <Plus className="mr-2 size-4" />
                                    Add Member Row
                                </Button>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAssignMembersModalOpen(false)}>Cancel</Button>
                                <Button type="button" onClick={saveProjectAssignments} disabled={isSavingAssignment}>
                                    {isSavingAssignment && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Save Members
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        );
    }

    const renderQuotaMiniCard = (key, roleName, alloc, qh, realP) => {
        const p = Math.min(100, realP);
        const isOver = alloc > qh;
        return (
            <div
                key={key}
                className="w-[148px] shrink-0 snap-start rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/40"
            >
                <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500" title={roleName}>
                        {roleName}
                    </p>
                    <span className={cn('shrink-0 text-[10px] font-bold', realP > 80 ? 'text-rose-500' : 'text-primary')}>
                        {realP}%
                    </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatHours(alloc)}
                    <span className="text-[10px] font-normal text-slate-400"> / {formatHours(qh)}h</span>
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all',
                            realP > 90 ? 'bg-rose-500' : realP > 70 ? 'bg-orange-500' : 'bg-primary',
                        )}
                        style={{ width: `${p}%` }}
                    />
                </div>
                {isOver && (
                    <p className="mt-0.5 text-[9px] font-bold text-rose-500">+{(alloc - qh).toFixed(1)}h</p>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100dvh-4.25rem)] min-h-0 flex-col overflow-hidden bg-background-light dark:bg-background-dark transition-colors duration-200">
            {/* Project Header & Stats */}
            <div className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151b28]">
                <div className="flex flex-col gap-3 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Button variant="ghost" size="sm" className="-ml-2 h-8 text-slate-500" onClick={() => navigate('/board')}>
                                    <ArrowLeft className="mr-1 size-4" />
                                    Back
                                </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{selectedProject.name}</h1>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        displayProjectStatus === 'Done' && 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30',
                                        displayProjectStatus === 'In Progress' && 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30',
                                        displayProjectStatus !== 'Done' && displayProjectStatus !== 'In Progress' && 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30',
                                    )}
                                >
                                    {displayProjectStatus}
                                </Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{selectedProject.methodology} Board</p>
                        </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800/50">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-8 px-2.5', viewMode === 'kanban' && 'bg-white shadow-sm dark:bg-slate-700')}
                                onClick={() => setViewMode('kanban')}
                                title="Kanban view"
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-8 px-2.5', viewMode === 'list' && 'bg-white shadow-sm dark:bg-slate-700')}
                                onClick={() => setViewMode('list')}
                                title="List view"
                            >
                                <List className="size-4" />
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                                setImportFile(null);
                                setImportResult(null);
                                setIsImportModalOpen(true);
                            }}
                        >
                            <Upload className="size-4" />
                            <span className="hidden sm:inline">Import</span>
                        </Button>
                        <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20" onClick={() => handleOpenModal('To Do')}>
                            <Plus className="size-4" />
                            Add Task
                        </Button>
                    </div>
                </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={() => openAssignMembersModal(selectedProject)}
                        className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                    >
                        <div className="flex items-center -space-x-2">
                            {assignedProjectUsers.slice(0, 3).map((member) => (
                                <div
                                    key={member.user_id}
                                    title={member.user_name}
                                    className="inline-flex size-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700 ring-2 ring-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:ring-slate-800"
                                >
                                    {(member.user_name || 'U').charAt(0).toUpperCase()}
                                </div>
                            ))}
                            {assignedProjectUsers.length === 0 && (
                                <div className="inline-flex size-7 items-center justify-center rounded-full bg-white text-[10px] font-medium text-slate-400 ring-2 ring-slate-50 dark:bg-slate-600 dark:ring-slate-800">
                                    —
                                </div>
                            )}
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                            {assignedProjectUsers.length} member{assignedProjectUsers.length === 1 ? '' : 's'}
                        </span>
                        <UserPlus className="size-3.5 text-slate-400" />
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-slate-600 dark:text-slate-300"
                                onClick={() => navigate(`/board/${selectedProject.id}/dashboard`)}
                            >
                                <BarChart3 className="size-4 shrink-0" />
                                <span className="hidden md:inline">Dashboard</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-slate-600 dark:text-slate-300"
                                onClick={() => navigate(`/board/${selectedProject.id}/gantt`)}
                            >
                                <GanttChart className="size-4 shrink-0" />
                                <span className="hidden md:inline">Gantt</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-slate-600 dark:text-slate-300"
                                onClick={() => setIsProjectNotesOpen(true)}
                            >
                                <BookOpen className="size-4 shrink-0" />
                                <span className="hidden md:inline">Notes</span>
                            </Button>
                        </div>

                        {!isFreelance && (
                            <Button
                                variant={isTaskBulkEditMode ? 'secondary' : 'outline'}
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                    if (!isTaskBulkEditMode && viewMode !== 'list') setViewMode('list');
                                    setIsTaskBulkEditMode(!isTaskBulkEditMode);
                                    if (isTaskBulkEditMode) setSelectedTaskIds([]);
                                }}
                            >
                                {isTaskBulkEditMode ? 'Cancel' : 'Manage Tasks'}
                            </Button>
                        )}
                        {!isFreelance && isTaskBulkEditMode && selectedTaskIds.length > 0 && (
                            <Button
                                size="sm"
                                className="h-8 shadow-md shadow-primary/20"
                                onClick={() => setIsBulkEditTaskModalOpen(true)}
                            >
                                Edit ({selectedTaskIds.length})
                            </Button>
                        )}
                        {canUpdateBoard && selectedProject?.status !== 'Done' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                disabled={isUpdatingProjectStatus}
                                onClick={() => handleCloseProject(selectedProject)}
                            >
                                {isUpdatingProjectStatus ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="size-4" />
                                )}
                                Mark Done
                            </Button>
                        )}
                        {canUpdateBoard && selectedProject?.status === 'Done' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                disabled={isUpdatingProjectStatus}
                                onClick={() => handleReopenProject(selectedProject)}
                            >
                                {isUpdatingProjectStatus ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="size-4" />
                                )}
                                Reopen
                            </Button>
                        )}
                    </div>
                    </div>

                    {/* Metrics */}
                    {selectedProject?.methodology === 'Waterfall' ? (
                        <div className="board-metrics-scroll -mx-1 border-t border-slate-100 px-1 pt-3 dark:border-slate-800">
                            <div className="flex w-max min-w-full snap-x snap-proximity gap-2 pb-1">
                                {waterfallProgressCards.map((item) => (
                                    <div
                                        key={item.status}
                                        className="w-[148px] shrink-0 snap-start rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/40"
                                    >
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.status}</p>
                                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{item.percentage}%</p>
                                        <p className="text-[10px] text-slate-500">{item.count} task</p>
                                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                            {!isFreelance && headerTotalManhours != null && Number(headerTotalManhours) > 0 && (
                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-800/30">
                                    <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                                        <div>
                                            <p className="tabular-nums text-base font-bold text-slate-900 dark:text-white">
                                                {formatHours(headerUsedManhours)} <span className="text-xs font-medium text-slate-500">hrs</span>
                                            </p>
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Terpakai</p>
                                        </div>
                                        <div className="px-1 text-center">
                                            <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                                <Clock className="size-3 shrink-0" />
                                                Total
                                            </p>
                                            <p className="tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                {formatHours(headerTotalManhours)} hrs
                                            </p>
                                            <p className="tabular-nums text-[10px] text-slate-500">{headerUsagePercent}%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                'tabular-nums text-base font-bold',
                                                headerRemainingManhours <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white',
                                            )}>
                                                {formatHours(headerRemainingManhours)} <span className="text-xs font-medium text-slate-500">hrs</span>
                                            </p>
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Sisa</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${headerUsagePercent}%` }} />
                                    </div>
                                </div>
                            )}
                            {!isFreelance && hasQuotaSummary && (
                                <div className="board-metrics-scroll -mx-1 px-1">
                                    <div className="flex w-max min-w-full snap-x snap-proximity gap-2 pb-1">
                                        {visibleRoleQuotas.map((quota) => {
                                            const alloc = Number(quota.allocated_hours) || 0;
                                            const qh = Number(quota.quota_hours) || 0;
                                            const realP = qh > 0 ? Math.round((alloc / qh) * 100) : 0;
                                            return renderQuotaMiniCard(quota.id, quota.role_name, alloc, qh, realP);
                                        })}
                                        {showGeneralQuotaCard && renderQuotaMiniCard(
                                            'general-quota',
                                            'General',
                                            generalAllocatedHours,
                                            generalQuotaFromPresales,
                                            Math.round((generalAllocatedHours / generalQuotaFromPresales) * 100),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Board / List View */}
            {viewMode === 'kanban' ? (
                <div className="board-scroll-x relative flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-slate-100/50 p-3 sm:p-4 dark:bg-[#0d1118]/50">
                    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                        <div className="flex h-full min-w-min gap-3 sm:gap-4">
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
                                            formatHours={formatHours}
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
                <div className="board-column-scroll flex-1 min-h-0 overflow-auto p-3 sm:p-4">
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
                                    {!isFreelance && <th className="px-6 py-4 font-medium text-center">Role Quota</th>}
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
                                        {!isFreelance && (
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                    {task.project_role_id
                                                        ? (roleQuotas.find(q => q.project_role_id === task.project_role_id)?.role_name || `Role ${task.project_role_id}`)
                                                        : 'General'}
                                                </span>
                                            </td>
                                        )}
                                        {!isFreelance && (
                                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center justify-end gap-1.5 font-medium text-sm flex-wrap">
                                                    <TaskBillingBadges task={task} />
                                                    {task.rush_hour && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                                                            Rush hour
                                                        </span>
                                                    )}
                                                    <Clock className="size-3.5 shrink-0" />
                                                    <span>
                                                        {task.subtasks?.length > 0
                                                            ? `${formatHours(subtasksTotalHours(task.subtasks))} hrs`
                                                            : taskIsEffectivelyNonBillable(task)
                                                              ? '—'
                                                              : `${task.estimated_hours || 0} hrs`}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {tasks.length === 0 && (
                                    <tr>
                                        <td colSpan={isTaskBulkEditMode && !isFreelance ? "8" : (isFreelance ? "5" : "7")} className="px-6 py-8 text-center text-slate-500">No tasks found. Create one first!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            <Dialog
                open={isModalOpen}
                onOpenChange={(open) => {
                    if (!open) closeTaskModal();
                    else setIsModalOpen(true);
                }}
            >
                <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <DialogTitle>{editingTaskId ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                        {selectedProject && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {selectedProject.name} · {selectedProject.methodology || 'Project'}
                            </p>
                        )}
                    </DialogHeader>
                    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                    <form
                        id="task-edit-form"
                        className="flex flex-col px-6 py-5 gap-5"
                        onSubmit={handleSubmitTask}
                    >
                        <section className="space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Task Details</p>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Feature Title <span className="text-rose-500">*</span></label>
                                <Input type="text" value={newTaskFeatureTitle} onChange={e => setNewTaskFeatureTitle(e.target.value)} placeholder="E.g., Authentication" required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Title <span className="text-rose-500">*</span></label>
                                <Input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required placeholder="E.g., Design Homepage" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Description / Sub-task <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <Textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} placeholder="Enter detailed description..." className="min-h-[72px] resize-y" />
                            </div>
                            {(categoryOptions.length > 0 || (!isFreelance && !hasSubtasks)) && (
                                <div className={`grid grid-cols-1 gap-3 ${categoryOptions.length > 0 && !isFreelance && !hasSubtasks ? 'sm:grid-cols-2' : ''}`}>
                                    {categoryOptions.length > 0 && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                                            <Select value={newTaskCategory || undefined} onValueChange={(val) => {
                                                setNewTaskCategory(val);
                                                const matchedQuota = roleQuotas.find((q) => q.role_name === val);
                                                if (matchedQuota) {
                                                    setNewTaskRoleFilter(matchedQuota.project_role_id.toString());
                                                }
                                            }}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categoryOptions.map((categoryName) => (
                                                        <SelectItem key={categoryName} value={categoryName}>{categoryName}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {!isFreelance && !hasSubtasks && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Billing type</label>
                                            <Select
                                                value={newTaskBillable ? 'billable' : 'non-billable'}
                                                onValueChange={(val) => {
                                                    const billable = val === 'billable';
                                                    setNewTaskBillable(billable);
                                                    if (!billable) {
                                                        setNewTaskRushHour(false);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Billing type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="billable">Billable</SelectItem>
                                                    <SelectItem value="non-billable">Non-billable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            )}
                            {hasSubtasks && !isFreelance && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-3 py-2">
                                    Parent manhours are summed from subtasks ({formatHours(subtasksTotalHours(editingSubtasks))} hrs). Edit hours on each subtask below.
                                </p>
                            )}
                        </section>

                        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status & Schedule</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                    <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Status" />
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
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-3 space-y-3">
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <CalendarRange className="size-3.5" />
                                    Timeline
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Start date <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <Input
                                            type="date"
                                            value={newTaskStartDate}
                                            onChange={(e) => setNewTaskStartDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Due date <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <Input
                                            type="date"
                                            value={newTaskDueDate}
                                            min={newTaskStartDate || undefined}
                                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                                {formatTaskDateRange(newTaskStartDate, newTaskDueDate) && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {formatTaskDateRange(newTaskStartDate, newTaskDueDate)}
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assignment</p>
                            <div className={`grid grid-cols-1 gap-3 ${selectedProject?.methodology !== 'Waterfall' && !isFreelance ? 'sm:grid-cols-2' : ''}`}>
                                {selectedProject?.methodology !== 'Waterfall' && !isFreelance && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Role Quota</label>
                                        <Select value={newTaskRoleFilter} onValueChange={(val) => {
                                            setNewTaskRoleFilter(val);
                                            setNewTaskAssignee('Unassigned');
                                        }}>
                                            <SelectTrigger className="w-full min-w-0">
                                                <SelectValue
                                                    placeholder={newTaskCategory ? 'Select role...' : 'Select category first'}
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
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignee</label>
                                    <AssigneeSearchSelect
                                        value={newTaskAssignee}
                                        onChange={setNewTaskAssignee}
                                        options={assigneeSelectOptions}
                                        placeholder="Ketik min. 2 karakter..."
                                    />
                                </div>
                            </div>
                        </section>

                        {!isFreelance && !hasSubtasks && (
                            <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {selectedProject?.methodology === 'Waterfall' ? 'Manhours (MH)' : 'Manhour Estimate'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {newTaskBillable
                                        ? selectedProject?.methodology === 'Waterfall'
                                            ? 'Digunakan untuk Team Load (perlu assignee + start & due date) dan kuota billable.'
                                            : 'Memotong kuota billable. Rush hour ×1.3 hanya untuk task billable.'
                                        : 'Opsional — tidak memotong kuota project, tetapi dipakai untuk perhitungan Team Load (assignee + tanggal).'}
                                </p>
                                <div className={`grid grid-cols-1 gap-3 ${newTaskBillable && selectedProject?.methodology !== 'Waterfall' ? 'sm:grid-cols-[1fr_auto] sm:items-end' : ''}`}>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Estimated Manhours
                                            {!newTaskBillable && (
                                                <span className="text-slate-400 font-normal"> (opsional)</span>
                                            )}
                                        </label>
                                        <Input
                                            type="number"
                                            value={newTaskEstimate}
                                            onChange={e => setNewTaskEstimate(e.target.value)}
                                            min="0"
                                            step="0.5"
                                            placeholder={newTaskBillable ? '0' : 'Kosongkan jika tidak dipakai'}
                                        />
                                    </div>
                                    {newTaskBillable && selectedProject?.methodology !== 'Waterfall' && (
                                        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2.5 sm:mb-0.5 sm:min-w-[200px]">
                                            <Checkbox
                                                id="task-rush-hour"
                                                checked={newTaskRushHour}
                                                onCheckedChange={(c) => setNewTaskRushHour(c === true)}
                                            />
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <label htmlFor="task-rush-hour" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                                    Rush hour
                                                </label>
                                                {newTaskRushHour && (
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                                        Quota uses input × 1.3
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </form>

                    {editingTaskId && selectedProject && (
                        <div className="px-6 pb-5 border-t border-slate-200 dark:border-slate-800">
                            <SubtaskSection
                                parentTaskId={editingTaskId}
                                subtasks={editingSubtasks}
                                onChanged={async () => {
                                    await loadBoard(selectedProject.id);
                                    await syncSelectedProjectFromList(selectedProject.id);
                                }}
                                selectedProject={selectedProject}
                                isFreelance={isFreelance}
                                categoryOptions={categoryOptions}
                                roleQuotas={roleQuotas}
                                assigneeSelectOptions={assigneeSelectOptions}
                                formatHours={formatHours}
                                currentUserId={user?.id}
                                canDeleteAnyNotes={canUpdateBoard}
                            />
                        </div>
                    )}

                    {editingTaskId ? (
                        <div className="px-6 pb-5">
                            <TaskNotesSection
                                taskId={editingTaskId}
                                taskLabel={newTaskTitle || editingTask?.title}
                                currentUserId={user?.id}
                                canDeleteAny={canUpdateBoard}
                            />
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 px-6 pb-5">
                            Save the task first, then edit it again to add subtasks and notes.
                        </p>
                    )}
                    </div>

                    <DialogFooter className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 bg-slate-50/80 dark:bg-slate-900/40">
                        <Button type="button" variant="outline" onClick={closeTaskModal}>Cancel</Button>
                        <Button type="submit" form="task-edit-form" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            {editingTaskId ? 'Save Changes' : 'Create Task'}
                        </Button>
                    </DialogFooter>
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
                                    <AssigneeSearchSelect
                                        value={row.user_id || 'Unassigned'}
                                        onChange={(next) => updateAssignmentRow(index, 'user_id', next === 'Unassigned' ? '' : String(next))}
                                        options={assignmentUserOptions}
                                        placeholder="Cari user (min. 2 karakter)..."
                                        className="mt-1"
                                        inputClassName="bg-white dark:bg-slate-900"
                                    />
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
                            Upload a CSV file to import tasks. Columns: Title, Feature Title, Description, Status, Priority,
                            Assignee Email, Estimated Hours (base input), Project Role Quota (role name on this project, or General),
                            Category (optional; used if quota column empty), Due Date (YYYY-MM-DD), Rush Hour (Yes/No).
                            Rush hour multiplies estimated hours by 1.3 before saving.
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

            <Dialog open={isProjectNotesOpen} onOpenChange={setIsProjectNotesOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="size-5 text-primary" />
                            Project Notes
                        </DialogTitle>
                        <DialogDescription>
                            Note, link development, dan dokumen penting untuk project ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                        <ProjectNotesPanel
                            projectId={selectedProject?.id}
                            projectName={selectedProject?.name}
                            currentUserId={user?.id}
                            canDeleteAny={canUpdateBoard}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
