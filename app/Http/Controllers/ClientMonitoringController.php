<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Support\ManhourBucketCalculator;
use App\Support\ProjectAccess;
use App\Support\ProjectQuotaBreakdown;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Read-only, hours-only view of MH quota vs. usage for client (external)
 * accounts — company-level rollup + per-project drill-down. No monetary
 * fields and no task-level detail are ever exposed here; see the plan at
 * .claude/plans/structured-spinning-gosling.md for the scope decisions.
 */
class ClientMonitoringController extends Controller
{
    /**
     * Resolve which company's data the requester may see, or null if none.
     * Client accounts are force-scoped to their own company_id regardless of
     * any query param; privileged internal users may pass ?company_id= to
     * preview any company.
     */
    private function resolveCompanyId(Request $request): ?int
    {
        $user = $request->user();

        if (ProjectAccess::isClientUser($user)) {
            return $user->company_id ? (int) $user->company_id : null;
        }

        if (ProjectAccess::isPrivileged($user) && $request->filled('company_id')) {
            return (int) $request->query('company_id');
        }

        return null;
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            abort(403, 'This account is not linked to a company.');
        }

        $company = DB::table('companies')->where('id', $companyId)->first(['id', 'name']);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $projectIds = ProjectAccess::isClientUser($user)
            ? ProjectAccess::clientVisibleProjectIds($user)
            : Project::where('company_id', $companyId)->pluck('id')->all();

        $projects = Project::whereIn('id', $projectIds)
            ->orderBy('name')
            ->get(['id', 'name', 'status', 'methodology', 'completion', 'total_manhours']);

        $projectRollups = $projects->map(function (Project $project) {
            $breakdown = ProjectQuotaBreakdown::compute($project);
            $buckets = $breakdown['meta']['manhour_buckets'];
            $quotaHours = (float) $breakdown['meta']['totals']['current_total_manhours'];
            $consumedHours = ManhourBucketCalculator::sumConsumedHours($buckets);
            $remainingHours = ManhourBucketCalculator::sumRemainingHours($buckets);

            return [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'methodology' => $project->methodology,
                'completion' => $project->completion,
                'quota_hours' => round($quotaHours, 2),
                'consumed_hours' => $consumedHours,
                'remaining_hours' => $remainingHours,
                'consumed_pct' => $quotaHours > 0 ? round(($consumedHours / $quotaHours) * 100, 1) : 0.0,
            ];
        })->values();

        $totals = [
            'quota_hours' => round((float) $projectRollups->sum('quota_hours'), 2),
            'consumed_hours' => round((float) $projectRollups->sum('consumed_hours'), 2),
            'remaining_hours' => round((float) $projectRollups->sum('remaining_hours'), 2),
        ];
        $totals['consumed_pct'] = $totals['quota_hours'] > 0
            ? round(($totals['consumed_hours'] / $totals['quota_hours']) * 100, 1)
            : 0.0;

        return response()->json([
            'data' => [
                'company' => $company,
                'totals' => $totals,
                'projects' => $projectRollups,
            ],
        ]);
    }

    public function project(Request $request, $id)
    {
        $user = $request->user();
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        if (ProjectAccess::isClientUser($user)) {
            if (!in_array((int) $id, ProjectAccess::clientVisibleProjectIds($user), true)) {
                abort(403, 'Forbidden');
            }
        } elseif (ProjectAccess::isPrivileged($user)) {
            $companyId = $this->resolveCompanyId($request);
            if (!$companyId || (int) $project->company_id !== $companyId) {
                abort(403, 'Forbidden');
            }
        } else {
            abort(403, 'Forbidden');
        }

        $breakdown = ProjectQuotaBreakdown::compute($project);

        $changeRequests = DB::table('project_allocations')
            ->where('project_id', $project->id)
            ->where('is_change_request', true)
            ->orderByDesc('cr_date')
            ->get(['id', 'cr_feature', 'cr_date', 'description', 'created_at']);

        return response()->json([
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'status' => $project->status,
                    'methodology' => $project->methodology,
                    'completion' => $project->completion,
                    'start_date' => $project->start_date,
                    'end_date' => $project->end_date,
                ],
                'roles' => $breakdown['data'],
                'meta' => $breakdown['meta'],
                'change_requests' => $changeRequests,
            ],
        ]);
    }
}
