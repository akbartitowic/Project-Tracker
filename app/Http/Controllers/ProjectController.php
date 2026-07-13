<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Support\ManhourBucketCalculator;
use App\Support\TaskBillable;
use App\Models\ProjectFavorite;
use App\Models\ProjectMember;
use App\Models\ProjectRoleQuota;
use App\Models\ProjectRole;
use App\Models\Task;
use App\Models\Manhour;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Support\ProjectAccess;
use App\Support\PublicStorageUrl;
use App\Support\UserAccess;
use App\Traits\LogActivity;

class ProjectController extends Controller
{
    use LogActivity;

    private function deriveProjectStatusFromTasks(int $projectId, ?string $storedStatus): string
    {
        if ($storedStatus === 'Done') {
            return 'Done';
        }

        $hasTasksOutsideTodo = DB::table('tasks')
            ->where('project_id', $projectId)
            ->whereRaw("TRIM(COALESCE(status, 'To Do')) NOT IN ('To Do', 'todo')")
            ->exists();

        return $hasTasksOutsideTodo ? 'In Progress' : 'Planning';
    }

    public function index()
    {
        $user = request()->user();

        $query = Project::select('projects.*')
            ->selectRaw("
                CASE
                    WHEN projects.status = 'Done' THEN 'Done'
                    WHEN (
                        SELECT COUNT(*) FROM tasks t
                        WHERE t.project_id = projects.id
                          AND TRIM(COALESCE(t.status, 'To Do')) NOT IN ('To Do', 'todo')
                    ) > 0 THEN 'In Progress'
                    ELSE 'Planning'
                END as status
            ")
            ->selectRaw('(SELECT ' . TaskBillable::sumBillableEstimatedHours('t') . ' FROM tasks t WHERE t.project_id = projects.id) as allocated_hours')
            ->selectRaw('
                CASE
                    WHEN projects.total_manhours IS NOT NULL AND projects.total_manhours > 0
                        THEN ROUND(((SELECT ' . TaskBillable::sumBillableEstimatedHours('t') . ' FROM tasks t WHERE t.project_id = projects.id) * 100.0) / projects.total_manhours, 2)
                    ELSE NULL
                END as usage_percentage
            ')
            ->selectRaw('
                CASE
                    WHEN projects.total_manhours IS NOT NULL
                        THEN projects.total_manhours - (SELECT ' . TaskBillable::sumBillableEstimatedHours('t') . ' FROM tasks t WHERE t.project_id = projects.id)
                    ELSE NULL
                END as remaining_manhours
            ')
            ->selectRaw("(SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id) as total_tasks")
            ->selectRaw("(SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id AND t.status = 'Reopen') as reopen_tasks")
            ->selectRaw("(SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id AND t.status = 'Done') as done_tasks")
            ->selectRaw("
                CASE
                    WHEN (SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id) > 0
                        THEN ROUND(((SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id AND t.status = 'Done') * 100.0) / (SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id), 2)
                    ELSE 0
                END as waterfall_progress_percentage
            ")
            ->selectRaw("(
                SELECT companies.logo_path
                FROM presales
                INNER JOIN companies ON companies.id = presales.company_id
                WHERE presales.converted_project_id = projects.id
                  AND companies.logo_path IS NOT NULL
                ORDER BY presales.id DESC
                LIMIT 1
            ) as company_logo_path")
            ->selectRaw('EXISTS(
                SELECT 1 FROM project_favorites pf
                WHERE pf.project_id = projects.id AND pf.user_id = ?
            ) as is_favorite', [$user->id]);

        if (!ProjectAccess::isPrivileged($user)) {
            $query->whereExists(function ($sub) use ($user) {
                $sub->select(DB::raw(1))
                    ->from('project_members as pm')
                    ->whereColumn('pm.project_id', 'projects.id')
                    ->where('pm.user_id', $user->id);
            });
        }

        $projects = $query->get();

        $stripManhours = UserAccess::isFreelance($user);

        // Cast jobs back to array (or rely on Model casting)
        $projects->each(function ($p) use ($stripManhours) {
            $p->jobs = is_string($p->jobs) ? json_decode($p->jobs) : $p->jobs;
            $p->company_logo_url = PublicStorageUrl::for($p->company_logo_path);
            unset($p->company_logo_path);
            $p->is_favorite = (bool) $p->is_favorite;
            if ($stripManhours) {
                UserAccess::stripProjectManhourFields($p);
            }
        });

        return response()->json(['data' => $projects]);
    }

    public function favorite(Request $request, $id)
    {
        $user = $request->user();
        ProjectAccess::assertCanAccessProject($user, (int) $id);

        ProjectFavorite::firstOrCreate([
            'user_id' => $user->id,
            'project_id' => $id,
        ]);

        return response()->json(['message' => 'Project favorited']);
    }

    public function unfavorite(Request $request, $id)
    {
        $user = $request->user();
        ProjectAccess::assertCanAccessProject($user, (int) $id);

        ProjectFavorite::where('user_id', $user->id)
            ->where('project_id', $id)
            ->delete();

        return response()->json(['message' => 'Project unfavorited']);
    }

    public function destroy(Request $request)
    {
        $ids = $request->input('ids');
        if (!$ids || !is_array($ids) || empty($ids)) {
            return response()->json(['error' => 'Please provide an array of project IDs to delete.'], 400);
        }

        $user = $request->user();
        foreach ($ids as $projectId) {
            ProjectAccess::assertCanAccessProject($user, (int) $projectId);
        }

        $projects = Project::whereIn('id', $ids)->get();
        foreach ($projects as $project) {
            $this->log('Project', 'Deleted Project', "Removed project: {$project->name}");
        }

        $deletedCount = Project::whereIn('id', $ids)->delete();
        return response()->json(['message' => 'Projects deleted successfully', 'deletedProjects' => $deletedCount]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'status' => 'required|string',
            'budget_status' => 'required|string',
            'completion' => 'required|integer',
            'methodology' => 'nullable|string',
            'jobs' => 'nullable|array',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'total_manhours' => 'nullable|integer',
            'hourly_rate' => 'nullable|numeric',
            'total_cost' => 'nullable|numeric',
            'quotation_value' => 'nullable|numeric',
            'members' => 'required|array|min:1',
            'members.*.user_id' => 'required|exists:users,id',
            'members.*.project_role_id' => 'required|exists:project_roles,id',
            'role_quotas' => 'nullable|array'
        ]);

        $members = $validated['members'] ?? [];
        $roleQuotas = $validated['role_quotas'] ?? [];
        unset($validated['members'], $validated['role_quotas']);

        $actor = $request->user();
        if (!ProjectAccess::isPrivileged($actor)) {
            $includesActor = collect($members)->contains(
                fn ($member) => (int) ($member['user_id'] ?? 0) === (int) $actor->id
            );
            if (!$includesActor) {
                return response()->json([
                    'error' => 'You must include yourself in the project members list.',
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            $project = Project::create($validated);

            if (!empty($members)) {
                foreach ($members as $member) {
                    if (isset($member['user_id']) && isset($member['project_role_id'])) {
                        ProjectMember::create([
                            'project_id' => $project->id,
                            'user_id' => $member['user_id'],
                            'project_role_id' => $member['project_role_id']
                        ]);
                    }
                }
            }

            if (!empty($roleQuotas)) {
                foreach ($roleQuotas as $quota) {
                    if (isset($quota['project_role_id']) && isset($quota['quota_hours'])) {
                        ProjectRoleQuota::create([
                            'project_id' => $project->id,
                            'project_role_id' => $quota['project_role_id'],
                            'quota_hours' => $quota['quota_hours']
                        ]);
                    }
                }
            }

            DB::commit();
            
            // Log after commit to ensure project_id is stable, though here it's already created
            $this->log('Project', 'Created Project', "Started new project: {$project->name}");
            
            return response()->json([
                'status' => 'success',
                'message' => 'Project created successfully',
                'id' => $project->id
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Project creation failed: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create project: ' . $e->getMessage()
            ], 500);
        }
    }

    public function quotas($id)
    {
        $user = request()->user();
        if (UserAccess::isFreelance($user)) {
            return response()->json(['data' => [], 'meta' => null]);
        }

        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }
        ProjectAccess::assertCanAccessProject($user, (int) $id);

        $quotas = DB::table('project_role_quotas as pq')
            ->join('project_roles as pr', 'pq.project_role_id', '=', 'pr.id')
            ->select('pq.*', 'pr.name as role_name')
            ->selectRaw('(SELECT CAST(' . TaskBillable::sumBillableEstimatedHours('tasks') . ' AS FLOAT) FROM tasks WHERE project_id = pq.project_id AND project_role_id = pq.project_role_id) as allocated_hours')
            ->selectRaw("(SELECT CAST(COALESCE(SUM(hours), 0) AS FLOAT) FROM manhours WHERE project_id = pq.project_id AND project_role_id = pq.project_role_id) as actual_hours")
            ->selectRaw("(SELECT COUNT(*) FROM tasks WHERE project_id = pq.project_id AND project_role_id = pq.project_role_id) as task_count")
            ->where('pq.project_id', $id)
            ->orderByDesc('pq.is_active')
            ->orderBy('pr.name')
            ->get();

        $topupRowsQuery = DB::table('project_allocations')
            ->select('id', 'project_id', 'project_role_id', 'topup_hours', 'description', 'created_at')
            ->where('project_id', $id)
            ->where('is_topup', true)
            ->whereNotNull('topup_hours')
            ->where('topup_hours', '>', 0)
            ->orderBy('created_at')
            ->orderBy('id');

        $allTopupRows = $topupRowsQuery->get();
        $topupRowsByRole = $allTopupRows->groupBy('project_role_id');

        $topupByRole = $allTopupRows
            ->groupBy('project_role_id')
            ->map(fn ($rows) => (float) $rows->sum('topup_hours'));

        $topupHoursTotal = (float) $allTopupRows->sum('topup_hours');

        $quotasWithSplit = $quotas->map(function ($quota) use ($topupByRole, $topupRowsByRole) {
            $topupHours = (float) ($topupByRole[$quota->project_role_id] ?? 0);
            $currentQuotaHours = (float) ($quota->quota_hours ?? 0);
            $baseQuotaHours = max(0, $currentQuotaHours - $topupHours);
            $allocatedHours = (float) ($quota->allocated_hours ?? 0);
            $roleTopups = $topupRowsByRole->get($quota->project_role_id, collect());

            $fifo = ManhourBucketCalculator::build($currentQuotaHours, $roleTopups, $allocatedHours);

            return (object) array_merge((array) $quota, [
                'base_quota_hours' => $baseQuotaHours,
                'topup_hours' => $topupHours,
                'manhour_buckets' => $fifo['buckets'],
                'fifo_remaining_hours' => ManhourBucketCalculator::sumRemainingHours($fifo['buckets']),
                'fifo_consumed_hours' => ManhourBucketCalculator::sumConsumedHours($fifo['buckets']),
            ]);
        });

        $activeQuotas = $quotasWithSplit->filter(fn ($q) => (bool) ($q->is_active ?? true));
        $baseRoleQuotaTotal = (float) $activeQuotas->sum('base_quota_hours');
        $topupRoleQuotaTotal = (float) $activeQuotas->sum('topup_hours');

        $totalManhours = (float) ($project->total_manhours ?? 0);
        $baseTotalManhours = max(0, $totalManhours - $topupHoursTotal);

        $generalBaseQuota = max(0, $baseTotalManhours - $baseRoleQuotaTotal);
        $generalTopupQuota = max(0, $topupHoursTotal - $topupRoleQuotaTotal);
        $generalCurrentQuota = $generalBaseQuota + $generalTopupQuota;

        $generalAllocatedHours = (float) Task::query()
            ->where('project_id', $id)
            ->whereNull('project_role_id')
            ->where('is_billable', true)
            ->quotaEligible()
            ->sum('estimated_hours');

        $generalActualHours = (float) DB::table('manhours')
            ->where('project_id', $id)
            ->whereNull('project_role_id')
            ->sum('hours');

        $generalFifo = ManhourBucketCalculator::build(
            $generalCurrentQuota,
            collect(),
            $generalAllocatedHours,
        );

        $totalAllocatedHours = (float) Task::query()
            ->where('project_id', $id)
            ->where('is_billable', true)
            ->quotaEligible()
            ->sum('estimated_hours');

        $projectFifo = ManhourBucketCalculator::build(
            $totalManhours,
            $allTopupRows,
            $totalAllocatedHours,
        );

        return response()->json([
            'data' => $quotasWithSplit,
            'meta' => [
                'general_quota' => [
                    'base_quota_hours' => $generalBaseQuota,
                    'topup_quota_hours' => $generalTopupQuota,
                    'current_quota_hours' => $generalCurrentQuota,
                    'allocated_hours' => $generalAllocatedHours,
                    'actual_hours' => $generalActualHours,
                    'remaining_hours' => ManhourBucketCalculator::sumRemainingHours($generalFifo['buckets']),
                    'manhour_buckets' => $generalFifo['buckets'],
                ],
                'totals' => [
                    'base_total_manhours' => $baseTotalManhours,
                    'topup_total_manhours' => $topupHoursTotal,
                    'current_total_manhours' => $totalManhours,
                ],
                'manhour_buckets' => $projectFifo['buckets'],
                'fifo_remaining_hours' => ManhourBucketCalculator::sumRemainingHours($projectFifo['buckets']),
                'mh_overflow_hours' => $projectFifo['overflow_hours'],
            ],
        ]);
    }

    public function balance($id)
    {
        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);
        $user = request()->user();
        if (UserAccess::isFreelance($user)) {
            return response()->json([
                'data' => [
                    'methodology' => $project->methodology,
                ],
            ]);
        }
        ProjectAccess::assertCanAccessProject($user, (int) $id);

        $allocatedHours = (float) Task::query()
            ->where('project_id', $id)
            ->where('is_billable', true)
            ->quotaEligible()
            ->sum('estimated_hours');
        $actualHours = Manhour::where('project_id', $id)->sum('hours');

        $topupRows = DB::table('project_allocations')
            ->select('id', 'project_id', 'topup_hours', 'description', 'created_at')
            ->where('project_id', $id)
            ->where('is_topup', true)
            ->whereNotNull('topup_hours')
            ->where('topup_hours', '>', 0)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $totalManhours = (float) ($project->total_manhours ?? 0);
        $fifo = ManhourBucketCalculator::build($totalManhours, $topupRows, $allocatedHours);
        $remaining = $totalManhours > 0
            ? ManhourBucketCalculator::sumRemainingHours($fifo['buckets'])
            : null;

        return response()->json([
            'data' => [
                'total_manhours' => $project->total_manhours,
                'methodology' => $project->methodology,
                'allocated_hours' => $allocatedHours,
                'manhour_buckets' => $fifo['buckets'],
                'fifo_remaining_hours' => $remaining,
                'mh_overflow_hours' => $fifo['overflow_hours'],
                'actual_hours' => $actualHours,
                'remaining' => $remaining
            ]
        ]);
    }

    public function members($id)
    {
        $user = request()->user();
        ProjectAccess::assertCanAccessProject($user, (int) $id);

        $members = DB::table('project_members as pm')
            ->join('users as u', 'pm.user_id', '=', 'u.id')
            ->join('project_roles as pr', 'pm.project_role_id', '=', 'pr.id')
            ->select('pm.id', 'pm.project_id', 'pm.user_id', 'pm.project_role_id', 'u.name as user_name', 'pr.name as role_name')
            ->where('pm.project_id', $id)
            ->get();

        return response()->json(['data' => $members]);
    }

    public function assignmentOptions($id)
    {
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        $user = request()->user();
        ProjectAccess::assertCanAccessProject($user, (int) $id);

        $usersQuery = User::query()
            ->select('id', 'name', 'email')
            ->orderBy('name', 'asc');

        if (!ProjectAccess::isPrivileged($user)) {
            $memberUserIds = DB::table('project_members')
                ->where('project_id', $id)
                ->pluck('user_id');
            $usersQuery->whereIn('id', $memberUserIds);
        }

        $users = $usersQuery->get();

        $roles = ProjectRole::query()
            ->select('id', 'name')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'data' => [
                'users' => $users,
                'project_roles' => $roles,
            ],
        ]);
    }

    public function syncMembers(Request $request, $id)
    {
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        ProjectAccess::assertCanAccessProject($request->user(), (int) $id);

        $validated = $request->validate([
            'members' => 'required|array|min:1',
            'members.*.user_id' => 'required|exists:users,id',
            'members.*.project_role_id' => 'required|exists:project_roles,id',
        ]);

        $members = collect($validated['members'])
            ->map(fn ($m) => [
                'user_id' => (int) $m['user_id'],
                'project_role_id' => (int) $m['project_role_id'],
            ])
            ->unique(fn ($m) => $m['user_id'] . '-' . $m['project_role_id'])
            ->values();

        $currentUser = $request->user();
        $currentUserWasMember = DB::table('project_members')
            ->where('project_id', $project->id)
            ->where('user_id', $currentUser->id)
            ->exists();
        $currentUserStillMember = $members->contains(fn ($m) => (int) $m['user_id'] === (int) $currentUser->id);
        if ($currentUserWasMember && !$currentUserStillMember) {
            return response()->json(['error' => 'You cannot remove yourself from this project.'], 422);
        }

        DB::beginTransaction();
        try {
            ProjectMember::where('project_id', $project->id)->delete();
            foreach ($members as $member) {
                ProjectMember::create([
                    'project_id' => $project->id,
                    'user_id' => $member['user_id'],
                    'project_role_id' => $member['project_role_id'],
                ]);
            }
            DB::commit();

            $this->log('Project', 'Updated Project Members', "Updated members for project: {$project->name}");
            return response()->json(['status' => 'success']);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        ProjectAccess::assertCanAccessProject($request->user(), (int) $id);

        $validated = $request->validate([
            'status' => 'required_without:reopen|nullable|string|in:Done,Planning,In Progress',
            'reopen' => 'sometimes|boolean',
        ]);

        if (!empty($validated['reopen'])) {
            $newStatus = $this->deriveProjectStatusFromTasks((int) $project->id, null);
        } else {
            $newStatus = $validated['status'] ?? null;
            if ($newStatus === null) {
                return response()->json(['error' => 'status is required'], 422);
            }
        }

        $oldStatus = $project->status;
        $updates = ['status' => $newStatus];

        if ($newStatus === 'Done') {
            if (!$project->end_date) {
                $updates['end_date'] = now()->toDateString();
            }
            $updates['completion'] = 100;
        } elseif ($oldStatus === 'Done') {
            $updates['end_date'] = null;
            $totalTasks = (int) DB::table('tasks')->where('project_id', $project->id)->count();
            $doneTasks = (int) DB::table('tasks')
                ->where('project_id', $project->id)
                ->where('status', 'Done')
                ->count();
            $updates['completion'] = $totalTasks > 0
                ? (int) round(($doneTasks * 100) / $totalTasks)
                : 0;
        }

        $project->update($updates);

        $label = $newStatus === 'Done' ? 'closed' : 'reopened';
        $this->log(
            'Project',
            'Updated Project Status',
            "Manually {$label} project '{$project->name}' ({$oldStatus} → {$newStatus})"
        );

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $project->id,
                'status' => $project->status,
                'end_date' => $project->end_date,
                'completion' => $project->completion,
            ],
        ]);
    }
}
