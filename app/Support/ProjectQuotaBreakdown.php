<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

/**
 * Per-role + whole-project MH quota vs. consumed breakdown (FIFO buckets via
 * ManhourBucketCalculator). Hours only — no monetary fields. Extracted from
 * ProjectController::quotas() so the internal quotas endpoint and the
 * client-facing Client Monitoring endpoints stay numerically identical
 * instead of re-deriving the same math twice.
 */
class ProjectQuotaBreakdown
{
    /**
     * @return array{data: \Illuminate\Support\Collection, meta: array<string, mixed>}
     */
    public static function compute(Project $project): array
    {
        $id = $project->id;

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

        return [
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
        ];
    }
}
