<?php

namespace App\Http\Controllers;

use App\Models\ProjectMember;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\TaskAggregationService;
use App\Support\ProjectAccess;
use App\Support\TaskBillable;
use App\Support\UserAccess;
use App\Traits\LogActivity;

use App\Models\User;
use App\Models\ProjectRole;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;

class TaskController extends Controller
{
    use LogActivity;

    private const RUSH_HOUR_FACTOR = 1.3;

    private const CSV_COLUMN_ALIASES = [
        'title' => ['title'],
        'feature_title' => ['feature title', 'feature_title'],
        'description' => ['description'],
        'status' => ['status'],
        'priority' => ['priority'],
        'assignee_email' => ['assignee email', 'assignee_email'],
        'estimated_hours' => ['estimated hours', 'estimated_hours'],
        'project_role_quota' => ['project role quota', 'project_role_quota'],
        'role_name' => ['role name', 'role_name'],
        'category' => ['category'],
        'due_date' => ['due date', 'due_date'],
        'start_date' => ['start date', 'start_date'],
        'rush_hour' => ['rush hour', 'rush_hour'],
        'is_billable' => ['billable', 'is_billable', 'billable type'],
    ];

    /**
     * When a user is assigned to a task, ensure they are on the project member list.
     */
    private function ensureAssigneeIsProjectMember(int $projectId, ?int $assigneeId, ?int $preferredRoleId = null): void
    {
        if (!$assigneeId) {
            return;
        }

        $alreadyMember = DB::table('project_members')
            ->where('project_id', $projectId)
            ->where('user_id', $assigneeId)
            ->exists();

        if ($alreadyMember) {
            return;
        }

        $roleId = $preferredRoleId;
        if (!$roleId) {
            $roleId = DB::table('project_role_quotas')
                ->where('project_id', $projectId)
                ->orderBy('id')
                ->value('project_role_id');
        }
        if (!$roleId) {
            $roleId = DB::table('project_roles')->orderBy('id')->value('id');
        }
        if (!$roleId) {
            return;
        }

        ProjectMember::firstOrCreate([
            'project_id' => $projectId,
            'user_id' => $assigneeId,
            'project_role_id' => (int) $roleId,
        ]);
    }

    /**
     * DB column tasks.estimated_hours is NOT NULL; Waterfall UI sends null — coerce to 0.
     */
    private function validateTaskDateRange(array $validated): ?array
    {
        $start = $validated['start_date'] ?? null;
        $due = $validated['due_date'] ?? null;
        if ($start && $due && $start > $due) {
            return ['error' => 'Due date must be on or after start date.'];
        }

        return null;
    }

    private function normalizeBillableFlag(array &$validated): void
    {
        $validated['is_billable'] = filter_var($validated['is_billable'] ?? true, FILTER_VALIDATE_BOOLEAN);
        TaskBillable::applyNonBillable($validated);
    }

    private function normalizeEstimatedHoursForDb(array &$validated): void
    {
        if (!array_key_exists('estimated_hours', $validated)) {
            $validated['estimated_hours'] = 0;

            return;
        }
        $v = $validated['estimated_hours'];
        if ($v === null || $v === '') {
            $validated['estimated_hours'] = 0;
        } else {
            $validated['estimated_hours'] = (float) $v;
        }
    }

    private function applyRushHourToEstimatedHours(array &$data): void
    {
        $rush = (bool) ($data['rush_hour'] ?? false);
        $base = (float) ($data['estimated_hours'] ?? 0);
        if ($rush && $base > 0) {
            $data['estimated_hours'] = round($base * self::RUSH_HOUR_FACTOR, 3);
        }
    }

    private function csvRowLooksLikeHeader(array $row): bool
    {
        $first = strtolower(trim((string) ($row[0] ?? '')));

        return $first === 'title';
    }

    private function legacyCsvColumnMap(): array
    {
        return [
            'title' => 0,
            'feature_title' => 1,
            'description' => 2,
            'status' => 3,
            'priority' => 4,
            'assignee_email' => 5,
            'estimated_hours' => 6,
            'project_role_quota' => 7,
            'role_name' => 7,
            'category' => 8,
            'due_date' => 9,
            'start_date' => 10,
            'rush_hour' => 11,
            'is_billable' => 12,
        ];
    }

    private function buildCsvColumnMap(array $header): array
    {
        $normalized = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $map = [];

        foreach (self::CSV_COLUMN_ALIASES as $field => $aliases) {
            foreach ($aliases as $alias) {
                $idx = array_search($alias, $normalized, true);
                if ($idx !== false) {
                    $map[$field] = $idx;
                    break;
                }
            }
        }

        $legacy = $this->legacyCsvColumnMap();
        foreach ($legacy as $field => $index) {
            if (!array_key_exists($field, $map)) {
                $map[$field] = $index;
            }
        }

        return $map;
    }

    private function parseCsvBool(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }
        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function parseCsvDate(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function extractTaskFromCsvRow(array $row, array $columnMap, int $projectId): array
    {
        $get = function (string $key) use ($row, $columnMap) {
            if (!array_key_exists($key, $columnMap) || $columnMap[$key] === null) {
                return null;
            }
            $index = $columnMap[$key];

            return $row[$index] ?? null;
        };

        return [
            'title' => trim((string) ($get('title') ?? '')),
            'feature_title' => trim((string) ($get('feature_title') ?? '')) ?: null,
            'description' => trim((string) ($get('description') ?? '')) ?: null,
            'status' => trim((string) ($get('status') ?? '')) ?: 'To Do',
            'priority' => trim((string) ($get('priority') ?? '')) ?: 'Medium',
            'assignee_email' => trim((string) ($get('assignee_email') ?? '')) ?: null,
            'estimated_hours' => $get('estimated_hours') !== null && $get('estimated_hours') !== ''
                ? (float) $get('estimated_hours')
                : 0,
            'project_role_quota' => trim((string) ($get('project_role_quota') ?? '')) ?: null,
            'role_name' => trim((string) ($get('role_name') ?? '')) ?: null,
            'category' => trim((string) ($get('category') ?? '')) ?: null,
            'due_date' => $this->parseCsvDate($get('due_date')),
            'start_date' => $this->parseCsvDate($get('start_date')),
            'rush_hour' => $this->parseCsvBool($get('rush_hour')),
            'is_billable' => $this->parseCsvBillable($get('is_billable')),
            'project_id' => $projectId,
        ];
    }

    private function parseCsvBillable(mixed $value): bool
    {
        if ($value === null || trim((string) $value) === '') {
            return true;
        }
        $normalized = strtolower(trim((string) $value));

        return !in_array($normalized, ['0', 'false', 'no', 'n', 'non-billable', 'non billable', 'nonbillable'], true);
    }

    /**
     * Resolve project_role_id from CSV the same way as the board form:
     * Project Role Quota (or Role Name) first, then Category; match this project's role quotas.
     */
    private function resolveImportRoleAndCategory(Project $project, ?string $projectRoleQuota, ?string $roleName, ?string $category): array
    {
        $quotaInput = trim((string) ($projectRoleQuota ?? ''));
        $roleNameInput = trim((string) ($roleName ?? ''));
        $categoryInput = trim((string) ($category ?? ''));

        $primaryLabel = $quotaInput !== ''
            ? $quotaInput
            : ($roleNameInput !== '' ? $roleNameInput : $categoryInput);

        if ($primaryLabel !== '' && in_array(strtolower($primaryLabel), ['all', 'general', 'general quota'], true)) {
            return [
                'project_role_id' => null,
                'category' => $categoryInput !== '' ? $categoryInput : null,
                'resolved_role_name' => null,
                'requested_label' => $primaryLabel,
                'missing_project_quota' => false,
            ];
        }

        if ($primaryLabel === '') {
            return [
                'project_role_id' => null,
                'category' => $categoryInput !== '' ? $categoryInput : null,
                'resolved_role_name' => null,
                'requested_label' => null,
                'missing_project_quota' => false,
            ];
        }

        $quotaRow = DB::table('project_role_quotas as pq')
            ->join('project_roles as pr', 'pr.id', '=', 'pq.project_role_id')
            ->where('pq.project_id', $project->id)
            ->whereRaw('LOWER(pr.name) = ?', [strtolower($primaryLabel)])
            ->select('pq.project_role_id', 'pr.name as role_name')
            ->first();

        if ($quotaRow) {
            return [
                'project_role_id' => (int) $quotaRow->project_role_id,
                'category' => $categoryInput !== '' ? $categoryInput : $quotaRow->role_name,
                'resolved_role_name' => $quotaRow->role_name,
                'requested_label' => $primaryLabel,
                'missing_project_quota' => false,
            ];
        }

        $globalRole = ProjectRole::whereRaw('LOWER(name) = ?', [strtolower($primaryLabel)])->first();
        if ($globalRole) {
            $hasProjectQuota = DB::table('project_role_quotas')
                ->where('project_id', $project->id)
                ->where('project_role_id', $globalRole->id)
                ->exists();

            return [
                'project_role_id' => (int) $globalRole->id,
                'category' => $categoryInput !== '' ? $categoryInput : $globalRole->name,
                'resolved_role_name' => $globalRole->name,
                'requested_label' => $primaryLabel,
                'missing_project_quota' => !$hasProjectQuota,
            ];
        }

        return [
            'project_role_id' => null,
            'category' => $categoryInput !== '' ? $categoryInput : $primaryLabel,
            'resolved_role_name' => null,
            'requested_label' => $primaryLabel,
            'missing_project_quota' => false,
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Task::query()
            ->leftJoin('users', 'users.id', '=', 'tasks.assignee_id')
            ->select('tasks.*')
            ->selectRaw('users.name as assignee_name');

        ProjectAccess::applyMemberProjectScope($query, 'tasks.project_id', $user);

        if ($request->has('project_id')) {
            $projectId = (int) $request->query('project_id');
            if (!ProjectAccess::canAccessProject($user, $projectId)) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
            $query->where('tasks.project_id', $projectId)
                ->whereNull('tasks.parent_task_id');
        } else {
            $query->whereNull('tasks.parent_task_id');
        }

        $tasks = $query->get();

        if ($request->has('project_id')) {
            $taskIds = $tasks->pluck('id');
            if ($taskIds->isNotEmpty()) {
                $subtasks = Task::query()
                    ->leftJoin('users', 'users.id', '=', 'tasks.assignee_id')
                    ->select('tasks.*')
                    ->selectRaw('users.name as assignee_name')
                    ->whereIn('parent_task_id', $taskIds)
                    ->orderBy('sort_order')
                    ->orderBy('tasks.id')
                    ->get()
                    ->groupBy('parent_task_id');

                $tasks->each(function ($task) use ($subtasks, $user) {
                    $task->subtasks = $subtasks->get($task->id, collect())->values();
                    if (UserAccess::isFreelance($user)) {
                        $task->subtasks->each(fn ($st) => UserAccess::stripTaskManhourFields($st));
                    }
                });
            } else {
                $tasks->each(fn ($task) => $task->subtasks = collect());
            }
        }

        if (UserAccess::isFreelance($user)) {
            $tasks->each(fn ($task) => UserAccess::stripTaskManhourFields($task));
        }

        return response()->json(['data' => $tasks]);
    }

    public function downloadTemplate()
    {
        return response()->streamDownload(function () {
            $file = fopen('php://output', 'w');
            // Add BOM for Excel UTF-8 compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($file, [
                'Title',
                'Feature Title',
                'Description',
                'Status',
                'Priority',
                'Assignee Email',
                'Estimated Hours',
                'Project Role Quota',
                'Category',
                'Due Date',
                'Start Date',
                'Rush Hour',
                'Billable',
            ]);
            fputcsv($file, [
                'Example Task',
                'Auth',
                'User login implementation',
                'To Do',
                'High',
                'dev@example.com',
                '4',
                'Developer',
                'Developer',
                '2026-06-30',
                '2026-06-01',
                'Yes',
                'Yes',
            ]);
            fclose($file);
        }, 'task_import_template.csv');
    }

    public function import(Request $request)
    {
        $authUser = $request->user();
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'file' => 'required|file|mimes:csv,txt'
        ]);

        if (!ProjectAccess::canAccessProject($authUser, (int) $request->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $project = Project::find($request->project_id);
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }
        $isWaterfall = stripos((string) ($project->methodology ?? ''), 'waterfall') !== false;
        $isFreelance = UserAccess::isFreelance($authUser);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $handle = fopen($path, 'r');

        $firstRow = fgetcsv($handle);
        if ($firstRow === false) {
            fclose($handle);

            return response()->json(['error' => 'CSV file is empty.'], 400);
        }

        $pendingFirstRow = null;
        if ($this->csvRowLooksLikeHeader($firstRow)) {
            $columnMap = $this->buildCsvColumnMap($firstRow);
        } else {
            $columnMap = $this->legacyCsvColumnMap();
            $pendingFirstRow = $firstRow;
        }

        $rowIndex = 0;
        $successCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            $processRow = function (array $row) use (
                &$rowIndex,
                &$successCount,
                &$errors,
                $columnMap,
                $project,
                $isWaterfall,
                $isFreelance
            ) {
                $rowIndex++;
                if (count($row) < 1 || trim((string) ($row[0] ?? '')) === '') {
                    return;
                }

                $data = $this->extractTaskFromCsvRow($row, $columnMap, (int) $project->id);

                $validator = Validator::make($data, [
                    'title' => 'required|string',
                    'project_id' => 'required|exists:projects,id',
                    'estimated_hours' => 'nullable|numeric',
                    'due_date' => 'nullable|date',
                ]);

                if ($validator->fails()) {
                    $errors[] = "Row $rowIndex: " . implode(', ', $validator->errors()->all());

                    return;
                }

                if ($isFreelance) {
                    $data['estimated_hours'] = 0;
                    $data['rush_hour'] = false;
                    $data['project_role_id'] = null;
                } elseif ($isWaterfall) {
                    $data['rush_hour'] = false;
                    $this->applyRushHourToEstimatedHours($data);
                } else {
                    if (!($data['is_billable'] ?? true)) {
                        $data['estimated_hours'] = 0;
                        $data['rush_hour'] = false;
                    } else {
                        $this->applyRushHourToEstimatedHours($data);
                    }
                }

                $this->normalizeEstimatedHoursForDb($data);
                TaskBillable::applyNonBillable($data);

                if (!empty($data['assignee_email'])) {
                    $assignee = User::where('email', $data['assignee_email'])->first();
                    if ($assignee) {
                        $data['assignee_id'] = $assignee->id;
                    }
                }

                $resolvedRoleName = null;
                if (!$isFreelance && !$isWaterfall) {
                    $roleResolved = $this->resolveImportRoleAndCategory(
                        $project,
                        $data['project_role_quota'] ?? null,
                        $data['role_name'] ?? null,
                        $data['category'] ?? null
                    );
                    $data['project_role_id'] = $roleResolved['project_role_id'];
                    $data['category'] = $roleResolved['category'];
                    $resolvedRoleName = $roleResolved['resolved_role_name'];

                    if (!empty($roleResolved['requested_label']) && $data['project_role_id'] === null) {
                        $errors[] = "Row $rowIndex: WARNING - Project role quota '{$roleResolved['requested_label']}' not found on this project. Task uses general quota.";
                    } elseif (!empty($roleResolved['missing_project_quota'])) {
                        $errors[] = "Row $rowIndex: WARNING - Role '{$roleResolved['requested_label']}' has no quota defined on this project.";
                    }
                } elseif (!$isFreelance) {
                    $data['project_role_id'] = null;
                }

                $est = (float) $data['estimated_hours'];
                if ($project->methodology === 'Agile Scrum' && ($data['is_billable'] ?? true)) {
                    if (!empty($data['project_role_id'])) {
                        $quotaRow = DB::table('project_role_quotas')
                            ->where('project_id', $project->id)
                            ->where('project_role_id', $data['project_role_id'])
                            ->first();

                        if ($quotaRow) {
                            $currentUsed = DB::table('tasks')
                                ->where('project_id', $project->id)
                                ->where('project_role_id', $data['project_role_id'])
                                ->where('is_billable', true)
                                ->sum('estimated_hours');

                            if (($currentUsed + $est) > $quotaRow->quota_hours) {
                                $label = $resolvedRoleName ?? 'role';
                                $errors[] = "Row $rowIndex: WARNING - Role quota exceeded for '{$label}'. Task was still imported.";
                            }
                        }
                    } else {
                    $mappedRoleQuota = DB::table('project_role_quotas')
                        ->where('project_id', $project->id)
                        ->sum('quota_hours');

                    $generalQuota = max(0, (float)($project->total_manhours ?? 0) - (float)$mappedRoleQuota);

                    $currentGeneralUsed = DB::table('tasks')
                            ->where('project_id', $project->id)
                        ->whereNull('project_role_id')
                            ->where('is_billable', true)
                            ->sum('estimated_hours');

                    if ($project->total_manhours !== null && ($currentGeneralUsed + $est) > $generalQuota) {
                            $errors[] = "Row $rowIndex: WARNING - Project quota exceeded. Task was still imported.";
                        }
                    }
                }

                unset($data['assignee_email'], $data['role_name'], $data['project_role_quota']);

                $task = Task::create($data);
                $this->ensureAssigneeIsProjectMember(
                    (int) $project->id,
                    $task->assignee_id ? (int) $task->assignee_id : null,
                    $task->project_role_id ? (int) $task->project_role_id : null
                );
                $successCount++;
            };

            if ($pendingFirstRow !== null) {
                $processRow($pendingFirstRow);
            }
            while (($row = fgetcsv($handle)) !== false) {
                $processRow($row);
            }

            DB::commit();

            if ($successCount > 0) {
                $this->log('Project', 'Imported Tasks', "Imported $successCount tasks to project ID: {$project->id}");
            }

            return response()->json([
                'success' => $successCount,
                'errors' => $errors,
                'message' => "Successfully imported $successCount tasks." . (count($errors) > 0 ? " Check alerts below." : "")
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        } finally {
            fclose($handle);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string',
            'feature_title' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'project_id' => 'required|exists:projects,id',
            'assignee_id' => 'nullable|exists:users,id',
            'estimated_hours' => 'nullable|numeric',
            'rush_hour' => 'nullable|boolean',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'category' => 'nullable|string',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'is_billable' => 'nullable|boolean',
            'parent_task_id' => 'nullable|integer|exists:tasks,id',
        ]);

        $parentTaskId = isset($validated['parent_task_id']) ? (int) $validated['parent_task_id'] : null;
        TaskAggregationService::assertValidParent($parentTaskId, (int) $validated['project_id']);

        if ($dateErr = $this->validateTaskDateRange($validated)) {
            return response()->json($dateErr, 422);
        }

        $this->normalizeBillableFlag($validated);
        $validated['rush_hour'] = (bool) ($validated['rush_hour'] ?? false);
        if (!UserAccess::isFreelance($user)) {
            $this->applyRushHourToEstimatedHours($validated);
        }
        $this->normalizeEstimatedHoursForDb($validated);
        $validated['due_date'] = $validated['due_date'] ?? null;
        $validated['start_date'] = $validated['start_date'] ?? null;

        if ($parentTaskId) {
            $validated['sort_order'] = (int) Task::where('parent_task_id', $parentTaskId)->max('sort_order') + 1;
        }

        if (UserAccess::isFreelance($user)) {
            $validated['estimated_hours'] = 0;
            $validated['rush_hour'] = false;
            $validated['project_role_id'] = null;
        }

        if (!ProjectAccess::canAccessProject($user, (int) $validated['project_id'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $task = Task::create($validated);
        $this->ensureAssigneeIsProjectMember(
            (int) $task->project_id,
            $task->assignee_id ? (int) $task->assignee_id : null,
            $task->project_role_id ? (int) $task->project_role_id : null
        );

        if ($task->parent_task_id) {
            TaskAggregationService::syncParentEstimatedHours((int) $task->parent_task_id);
        }

        $label = $task->parent_task_id ? 'subtask' : 'task';
        $this->log('Project', 'Created Task', "Added {$label} '{$task->title}' to project ID: {$task->project_id}");

        return response()->json(['id' => $task->id, 'parent_task_id' => $task->parent_task_id]);
    }

    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        $validated = $request->validate([
            'status' => 'required|string'
        ]);
        $task = Task::findOrFail($id);
        if (!ProjectAccess::canAccessProject($user, (int) $task->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $oldStatus = $task->status;
        $changes = $task->update($validated) ? 1 : 0;
        
        $this->log('Project', 'Updated Task Status', "Changed task '{$task->title}' from {$oldStatus} to {$validated['status']}");
        
        return response()->json(['changes' => $changes]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $task = Task::findOrFail($id);
        if (!ProjectAccess::canAccessProject($user, (int) $task->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $validated = $request->validate([
            'title' => 'required|string',
            'feature_title' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'assignee_id' => 'nullable|exists:users,id',
            'estimated_hours' => 'nullable|numeric',
            'rush_hour' => 'nullable|boolean',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'category' => 'nullable|string',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'is_billable' => 'nullable|boolean',
        ]);

        if ($dateErr = $this->validateTaskDateRange($validated)) {
            return response()->json($dateErr, 422);
        }

        $this->normalizeBillableFlag($validated);
        $validated['rush_hour'] = (bool) ($validated['rush_hour'] ?? false);
        if ($validated['rush_hour'] && !UserAccess::isFreelance($user)) {
            $this->applyRushHourToEstimatedHours($validated);
        }
        $this->normalizeEstimatedHoursForDb($validated);
        $validated['due_date'] = $validated['due_date'] ?? null;
        $validated['start_date'] = $validated['start_date'] ?? null;

        if (UserAccess::isFreelance($user)) {
            $validated['estimated_hours'] = 0;
            $validated['rush_hour'] = false;
            $validated['project_role_id'] = null;
        } elseif (!$task->parent_task_id) {
            TaskAggregationService::stripParentFieldsWhenHasSubtasks($validated, $task);
        }

        $changes = $task->update($validated) ? 1 : 0;
        if ($changes && !empty($validated['assignee_id'])) {
            $this->ensureAssigneeIsProjectMember(
                (int) $task->project_id,
                (int) $validated['assignee_id'],
                !empty($validated['project_role_id']) ? (int) $validated['project_role_id'] : null
            );
        }

        if ($task->parent_task_id) {
            TaskAggregationService::syncParentEstimatedHours((int) $task->parent_task_id);
        } elseif ($changes) {
            TaskAggregationService::syncParentEstimatedHours((int) $task->id);
        }

        return response()->json(['changes' => $changes]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $task = Task::findOrFail($id);
        if (!ProjectAccess::canAccessProject($user, (int) $task->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $parentId = $task->parent_task_id ? (int) $task->parent_task_id : null;
        $task->delete();

        if ($parentId) {
            TaskAggregationService::syncParentEstimatedHours($parentId);
        }

        $this->log('Project', 'Deleted Task', "Deleted task ID: {$id}");

        return response()->json(['message' => 'Task deleted']);
    }

    public function bulkEditManhours(Request $request)
    {
        $user = $request->user();
        if (UserAccess::isFreelance($user)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'task_ids' => 'required|array',
            'task_ids.*' => 'exists:tasks,id',
            'estimated_hours' => 'nullable|numeric',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'category' => 'nullable|string'
        ]);

        if (empty($validated['task_ids'])) {
            return response()->json(['error' => 'No tasks selected.'], 400);
        }

        if (!ProjectAccess::isPrivileged($user)) {
            $memberIds = ProjectAccess::memberProjectIds($user) ?? [];
            $unauthorizedExists = Task::whereIn('id', $validated['task_ids'])
                ->whereNotIn('project_id', $memberIds)
                ->exists();

            if ($unauthorizedExists) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

        $updateData = [];
        if (array_key_exists('estimated_hours', $validated)) {
            $eh = $validated['estimated_hours'];
            $updateData['estimated_hours'] = ($eh === null || $eh === '') ? 0 : (float) $eh;
        }
        if (array_key_exists('project_role_id', $validated)) {
            $updateData['project_role_id'] = $validated['project_role_id'];
        }
        if (array_key_exists('category', $validated)) {
            $updateData['category'] = $validated['category'];
        }

        if (empty($updateData)) {
            return response()->json(['message' => 'No changes provided.', 'changes' => 0]);
        }

        $changes = Task::whereIn('id', $validated['task_ids'])->update($updateData);

        $this->log('Project', 'Bulk Edit Tasks', "Bulk edited $changes tasks.");

        return response()->json(['message' => "Successfully updated $changes tasks.", 'changes' => $changes]);
    }
}
