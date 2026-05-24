<?php

namespace App\Http\Controllers;

use App\Models\ProjectAllocation;
use App\Models\Project;
use App\Support\ManhourBucketCalculator;
use App\Models\Manhour;
use App\Models\ProjectRoleQuota;
use App\Models\Task;
use App\Support\ProjectAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectAllocationController extends Controller
{
    private const CHANGE_REQUEST_CATEGORY = 'Change Request';

    private function isChangeRequestRow($row): bool
    {
        if (!empty($row->is_change_request)) {
            return true;
        }

        return !empty($row->is_topup)
            && str_starts_with((string) ($row->description ?? ''), '[CHANGE REQUEST]');
    }

    private function resolveChangeRequestCategoryId(): int
    {
        $existing = DB::table('finance_categories')
            ->where('name', self::CHANGE_REQUEST_CATEGORY)
            ->value('id');

        if ($existing) {
            return (int) $existing;
        }

        return (int) DB::table('finance_categories')->insertGetId([
            'name' => self::CHANGE_REQUEST_CATEGORY,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function allocationUserOptions(int $projectId): array
    {
        $fromMembers = DB::table('project_members as pm')
            ->join('users as u', 'pm.user_id', '=', 'u.id')
            ->where('pm.project_id', $projectId)
            ->select('u.id as user_id', 'u.name as user_name')
            ->distinct()
            ->orderBy('u.name')
            ->get();

        if ($fromMembers->isNotEmpty()) {
            return $fromMembers->values()->all();
        }

        return DB::table('users')
            ->select('id as user_id', 'name as user_name')
            ->orderBy('name')
            ->get()
            ->values()
            ->all();
    }

    private function mapChangeRequestRow($row): array
    {
        $description = (string) ($row->description ?? '');
        $legacyNotes = str_starts_with($description, '[CHANGE REQUEST] ')
            ? substr($description, strlen('[CHANGE REQUEST] '))
            : $description;

        return [
            'id' => $row->id,
            'cr_date' => $row->cr_date,
            'cr_feature' => $row->cr_feature ?: $legacyNotes ?: '-',
            'amount' => (float) ($row->amount ?? 0),
            'created_at' => $row->created_at,
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();

        $query = DB::table('project_allocations as pa')
            ->join('finance_categories as fc', 'pa.category_id', '=', 'fc.id')
            ->join('projects as p', 'pa.project_id', '=', 'p.id')
            ->leftJoin('users as u', 'u.id', '=', 'pa.user_id')
            ->select('pa.*', 'fc.name as category_name', 'p.name as project_name', 'p.quotation_value', 'u.name as user_name');

        ProjectAccess::applyProjectScope($query, 'pa.project_id', $user);

        if ($request->has('project_id')) {
            $projectId = (int) $request->query('project_id');
            ProjectAccess::assertCanAccessProjectFinance($user, $projectId);
            $query->where('pa.project_id', $projectId);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'category_id' => 'required|exists:finance_categories,id',
            'user_id' => 'nullable|exists:users,id',
            'amount' => 'required|numeric',
            'description' => 'nullable|string',
        ]);

        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $validated['project_id']);

        if (empty($validated['user_id'])) {
            $validated['user_id'] = null;
        }

        $allocation = ProjectAllocation::create($validated);
        return response()->json(['id' => $allocation->id]);
    }

    public function update(Request $request, string $id)
    {
        $allocation = ProjectAllocation::find($id);
        if (!$allocation) {
            return response()->json(['error' => 'Allocation not found'], 404);
        }

        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $allocation->project_id);

        if ($allocation->is_topup) {
            return response()->json(['error' => 'Hanya pengeluaran biasa yang dapat diedit.'], 422);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:finance_categories,id',
            'user_id' => 'nullable|exists:users,id',
            'amount' => 'required|numeric',
            'description' => 'nullable|string',
        ]);

        $validated['user_id'] = !empty($validated['user_id']) ? (int) $validated['user_id'] : null;

        $allocation->update($validated);

        return response()->json([
            'message' => 'Allocation updated',
            'data' => $allocation->fresh(),
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $allocation = ProjectAllocation::find($id);
        if (!$allocation) {
            return response()->json(['error' => 'Allocation not found'], 404);
        }

        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $allocation->project_id);

        $deleted = $allocation->delete();

        return response()->json(['deleted' => $deleted ? 1 : 0]);
    }

    public function realize(Request $request, string $id)
    {
        $allocation = ProjectAllocation::find($id);
        if (!$allocation) {
            return response()->json(['error' => 'Allocation not found'], 404);
        }

        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $allocation->project_id);

        if ($allocation->is_topup) {
            return response()->json(['error' => 'Realization hanya berlaku untuk data pengeluaran.'], 422);
        }

        $validated = $request->validate([
            'realized_amount' => 'required|numeric|min:0',
        ]);

        $allocation->realized_amount = $validated['realized_amount'];
        $allocation->realized_at = now();
        $allocation->save();

        return response()->json([
            'message' => 'Realization saved',
            'data' => $allocation,
        ]);
    }

    public function markPaid(Request $request, string $id)
    {
        $allocation = ProjectAllocation::find($id);
        if (!$allocation) {
            return response()->json(['error' => 'Allocation not found'], 404);
        }

        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $allocation->project_id);

        if ($allocation->is_topup) {
            return response()->json(['error' => 'Paid hanya berlaku untuk data pengeluaran.'], 422);
        }

        $validated = $request->validate([
            'payment_amount' => 'nullable|numeric|min:0.01',
            'reset' => 'sometimes|boolean',
        ]);

        $targetAmount = (float) ($allocation->realized_amount ?? $allocation->amount ?? 0);
        $legacyPaid = $allocation->paid_at ? $targetAmount : 0.0;
        $currentPaid = (float) ($allocation->paid_amount ?? 0);
        $currentPaid = max($currentPaid, $legacyPaid);

        if (!empty($validated['reset'])) {
            $newPaid = 0.0;
        } else {
            $paymentAmount = (float) ($validated['payment_amount'] ?? 0);
            if ($paymentAmount <= 0) {
                return response()->json(['error' => 'payment_amount wajib diisi jika bukan reset.'], 422);
            }
            $newPaid = $currentPaid + $paymentAmount;
        }

        if ($targetAmount > 0) {
            $newPaid = min($newPaid, $targetAmount);
        } else {
            $newPaid = 0.0;
        }

        $allocation->paid_amount = $newPaid;
        $allocation->paid_at = ($targetAmount > 0 && $newPaid >= $targetAmount) ? now() : null;
        $allocation->save();

        return response()->json([
            'message' => !empty($validated['reset']) ? 'Paid amount reset' : 'Payment recorded',
            'data' => $allocation->fresh(),
            'payment' => [
                'target_amount' => $targetAmount,
                'paid_amount' => (float) $allocation->paid_amount,
                'remaining_amount' => max(0, $targetAmount - (float) $allocation->paid_amount),
                'is_fully_paid' => $allocation->paid_at !== null,
            ],
        ]);
    }

    public function topUp(Request $request, $id)
    {
        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $id);

        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);
        if ($project->methodology === 'Waterfall') {
            return response()->json(['error' => 'Top up quota tidak tersedia untuk project Waterfall.'], 422);
        }

        $validated = $request->validate([
            'additional_quotation' => 'required|numeric|min:0',
            'additional_hours' => 'required|numeric|min:0',
            'description' => 'required|string',
            'category_id' => 'required|exists:finance_categories,id',
            'project_role_id' => 'required|exists:project_roles,id'
        ]);

        DB::beginTransaction();
        try {
            // 1. Update project total quotation and manhours
            $project->quotation_value += $validated['additional_quotation'];
            $project->total_manhours += $validated['additional_hours'];
            $project->save();

            // 2. Update or create role-specific quota
            $roleQuota = ProjectRoleQuota::firstOrNew([
                'project_id' => $id,
                'project_role_id' => $validated['project_role_id']
            ]);
            $roleQuota->quota_hours = ($roleQuota->quota_hours ?? 0) + $validated['additional_hours'];
            $roleQuota->save();

            // 3. Create allocation entry with is_topup flag
            ProjectAllocation::create([
                'project_id' => $id,
                'category_id' => $validated['category_id'],
                'project_role_id' => $validated['project_role_id'],
                'amount' => $validated['additional_quotation'],
                'description' => '[TOP UP] ' . $validated['description'],
                'is_topup' => true,
                'topup_hours' => $validated['additional_hours']
            ]);

            DB::commit();
            return response()->json(['message' => 'Top up successful']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function changeRequest(Request $request, $id)
    {
        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $id);

        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }
        if (!str_contains(strtolower((string) ($project->methodology ?? '')), 'waterfall')) {
            return response()->json(['error' => 'Change Request hanya tersedia untuk project Waterfall.'], 422);
        }

        $validated = $request->validate([
            'cr_date' => 'required|date',
            'cr_feature' => 'required|string|max:255',
            'additional_quotation' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $project->quotation_value += $validated['additional_quotation'];
            $project->save();

            ProjectAllocation::create([
                'project_id' => $id,
                'category_id' => $this->resolveChangeRequestCategoryId(),
                'amount' => $validated['additional_quotation'],
                'description' => '[CHANGE REQUEST] ' . $validated['cr_feature'],
                'is_topup' => true,
                'is_change_request' => true,
                'topup_hours' => null,
                'cr_date' => $validated['cr_date'],
                'cr_feature' => $validated['cr_feature'],
            ]);

            DB::commit();
            return response()->json(['message' => 'Change request recorded']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function financeSummary(Request $request, $id)
    {
        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $id);

        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);

        $allocations = DB::table('project_allocations as pa')
            ->join('finance_categories as fc', 'pa.category_id', '=', 'fc.id')
            ->leftJoin('users as u', 'u.id', '=', 'pa.user_id')
            ->select('pa.*', 'fc.name as category_name', 'u.name as user_name')
            ->where('pa.project_id', $id)
            ->orderByDesc('pa.created_at')
            ->get();

        $expenseAllocations = $allocations->where('is_topup', false);
        $totalAllocated = $expenseAllocations->sum(function ($row) {
            return (float) ($row->realized_amount ?? $row->amount ?? 0);
        });
        $plannedAllocated = $expenseAllocations->sum(function ($row) {
            return (float) ($row->amount ?? 0);
        });
        $topupHoursTotal = $allocations->where('is_topup', true)->sum(function ($row) {
            return (float)($row->topup_hours ?? 0);
        });
        $changeRequestAllocations = $allocations->filter(fn ($row) => $this->isChangeRequestRow($row));
        $changeRequestCount = $changeRequestAllocations->count();
        $changeRequestTotalValue = $changeRequestAllocations->sum(function ($row) {
            return (float) ($row->amount ?? 0);
        });
        $changeRequests = $changeRequestAllocations
            ->sortByDesc(fn ($row) => $row->cr_date ?? $row->created_at)
            ->map(fn ($row) => $this->mapChangeRequestRow($row))
            ->values();

        $expenseByUser = $expenseAllocations
            ->groupBy(fn ($row) => $row->user_id ? (string) $row->user_id : '__none__')
            ->map(function ($rows, $userKey) {
                $first = $rows->first();
                $planned = $rows->sum(fn ($row) => (float) ($row->amount ?? 0));
                $realized = $rows->sum(fn ($row) => (float) ($row->realized_amount ?? $row->amount ?? 0));

                return [
                    'user_id' => $userKey === '__none__' ? null : (int) $userKey,
                    'user_name' => $first->user_name ?? 'Tanpa user',
                    'line_count' => $rows->count(),
                    'planned_total' => $planned,
                    'realized_total' => $realized,
                ];
            })
            ->sortByDesc('realized_total')
            ->values();

        $quotationValue = $project->quotation_value ?? 0;

        $allocatedHours = (float) DB::table('tasks')->where('project_id', $id)->sum('estimated_hours');
        $actualHours = Manhour::where('project_id', $id)->sum('hours');
        $totalManhours = (float) ($project->total_manhours ?? 0);

        $topupRows = DB::table('project_allocations')
            ->select('id', 'project_id', 'topup_hours', 'description', 'created_at')
            ->where('project_id', $id)
            ->where('is_topup', true)
            ->whereNotNull('topup_hours')
            ->where('topup_hours', '>', 0)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $fifo = ManhourBucketCalculator::build($totalManhours, $topupRows, $allocatedHours);
        $fifoRemaining = ManhourBucketCalculator::sumRemainingHours($fifo['buckets']);

        return response()->json([
            'data' => [
                'project_name' => $project->name,
                'methodology' => $project->methodology,
                'quotation_value' => $quotationValue,
                'total_allocated' => $totalAllocated,
                'planned_allocated' => $plannedAllocated,
                'remaining_margin' => $quotationValue - $totalAllocated,
                'total_manhours' => $totalManhours,
                'allocated_hours' => $allocatedHours,
                'actual_hours' => $actualHours,
                'remaining_hours' => $fifoRemaining,
                'fifo_remaining_hours' => $fifoRemaining,
                'manhour_buckets' => $fifo['buckets'],
                'mh_overflow_hours' => $fifo['overflow_hours'],
                'topup_hours_total' => $topupHoursTotal,
                'has_topup_manhours' => $topupHoursTotal > 0,
                'change_request_count' => $changeRequestCount,
                'change_request_total_value' => $changeRequestTotalValue,
                'change_requests' => $changeRequests,
                'expense_by_user' => $expenseByUser,
                'allocation_user_options' => $this->allocationUserOptions((int) $id),
                'allocations' => $allocations,
            ],
        ]);
    }

    public function transferQuota(Request $request, $id)
    {
        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $id);

        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }
        if (str_contains(strtolower((string) ($project->methodology ?? '')), 'waterfall')) {
            return response()->json(['error' => 'Switch MH tidak tersedia untuk project Waterfall.'], 422);
        }

        $validated = $request->validate([
            'hours' => 'required|numeric|min:0.01',
            'from_type' => 'required|in:general,role',
            'from_project_role_id' => 'nullable|integer|exists:project_roles,id|required_if:from_type,role',
            'to_type' => 'required|in:general,role',
            'to_project_role_id' => 'nullable|integer|exists:project_roles,id|required_if:to_type,role',
        ]);

        $hours = round((float) $validated['hours'], 2);
        $fromType = $validated['from_type'];
        $toType = $validated['to_type'];
        $fromRoleId = $validated['from_project_role_id'] ?? null;
        $toRoleId = $validated['to_project_role_id'] ?? null;

        if ($fromType === $toType && (int) ($fromRoleId ?? 0) === (int) ($toRoleId ?? 0)) {
            return response()->json(['error' => 'Sumber dan tujuan tidak boleh sama.'], 422);
        }

        DB::beginTransaction();
        try {
            $available = $this->availableTransferHours($project, $fromType, $fromRoleId);
            if ($hours > $available + 0.0001) {
                DB::rollBack();
                return response()->json([
                    'error' => 'Jam yang dipindahkan melebihi sisa quota yang tersedia (' . round($available, 2) . ' jam).',
                ], 422);
            }

            if ($fromType === 'role') {
                $fromQuota = ProjectRoleQuota::where('project_id', $id)
                    ->where('project_role_id', $fromRoleId)
                    ->lockForUpdate()
                    ->first();

                if (!$fromQuota || !$fromQuota->is_active) {
                    DB::rollBack();
                    return response()->json(['error' => 'Quota kategori sumber tidak ditemukan atau tidak aktif.'], 422);
                }

                $fromQuota->quota_hours = max(0, round((float) $fromQuota->quota_hours - $hours, 2));
                $fromQuota->save();
            }

            if ($toType === 'role') {
                $toQuota = ProjectRoleQuota::firstOrNew([
                    'project_id' => $id,
                    'project_role_id' => $toRoleId,
                ]);
                $toQuota->quota_hours = round((float) ($toQuota->quota_hours ?? 0) + $hours, 2);
                $toQuota->is_active = true;
                $toQuota->save();
            }

            DB::commit();

            return response()->json(['message' => 'Quota MH berhasil dipindahkan.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function deactivateRoleQuota(Request $request, $id, $quotaId)
    {
        ProjectAccess::assertCanAccessProjectFinance($request->user(), (int) $id);

        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }
        if (str_contains(strtolower((string) ($project->methodology ?? '')), 'waterfall')) {
            return response()->json(['error' => 'Nonaktifkan kategori tidak tersedia untuk project Waterfall.'], 422);
        }

        $quota = ProjectRoleQuota::where('project_id', $id)->where('id', $quotaId)->first();
        if (!$quota) {
            return response()->json(['error' => 'Quota kategori tidak ditemukan.'], 404);
        }
        if (!$quota->is_active) {
            return response()->json(['error' => 'Kategori sudah nonaktif.'], 422);
        }

        if ((float) $quota->quota_hours > 0.0001) {
            return response()->json(['error' => 'Kategori hanya bisa dinonaktifkan jika quota MH bernilai 0.'], 422);
        }

        $taskCount = Task::where('project_id', $id)
            ->where('project_role_id', $quota->project_role_id)
            ->count();

        if ($taskCount > 0) {
            return response()->json([
                'error' => 'Kategori tidak bisa dinonaktifkan karena masih ada task yang menggunakan kategori ini.',
            ], 422);
        }

        $quota->is_active = false;
        $quota->save();

        return response()->json(['message' => 'Kategori berhasil dinonaktifkan.']);
    }

    private function availableTransferHours(Project $project, string $fromType, ?int $fromRoleId): float
    {
        if ($fromType === 'general') {
            $meta = $this->buildQuotaMeta((int) $project->id, $project);

            return max(0, (float) ($meta['general_quota']['remaining_hours'] ?? 0));
        }

        $quota = ProjectRoleQuota::where('project_id', $project->id)
            ->where('project_role_id', $fromRoleId)
            ->where('is_active', true)
            ->first();

        if (!$quota) {
            return 0;
        }

        $allocated = (float) DB::table('tasks')
            ->where('project_id', $project->id)
            ->where('project_role_id', $fromRoleId)
            ->sum('estimated_hours');

        return max(0, (float) $quota->quota_hours - $allocated);
    }

    private function buildQuotaMeta(int $projectId, Project $project): array
    {
        $quotas = DB::table('project_role_quotas as pq')
            ->where('pq.project_id', $projectId)
            ->where('pq.is_active', true)
            ->get();

        $roleQuotaSum = (float) $quotas->sum('quota_hours');
        $totalManhours = (float) ($project->total_manhours ?? 0);
        $generalCurrent = max(0, $totalManhours - $roleQuotaSum);
        $generalAllocated = (float) DB::table('tasks')
            ->where('project_id', $projectId)
            ->whereNull('project_role_id')
            ->sum('estimated_hours');

        return [
            'general_quota' => [
                'current_quota_hours' => $generalCurrent,
                'allocated_hours' => $generalAllocated,
                'remaining_hours' => $generalCurrent - $generalAllocated,
            ],
        ];
    }
}
