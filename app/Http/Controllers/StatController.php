<?php

namespace App\Http\Controllers;

use App\Support\ProjectAccess;
use App\Support\UserAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class StatController extends Controller
{
    private function normalizeTaskStatus(?string $status): string
    {
        $value = trim((string) $status);
        return match (strtolower($value)) {
            're-open', 'reopen' => 'Reopen',
            'in progress' => 'In Progress',
            'to do', 'todo' => 'To Do',
            'review' => 'Review',
            'done' => 'Done',
            default => $value !== '' ? $value : 'To Do',
        };
    }

    private function getMemberDashboardData($user): array
    {
        $assignedProjectIds = DB::table('project_members')
            ->where('user_id', $user->id)
            ->pluck('project_id')
            ->unique()
            ->values();

        $statusCounts = [
            'To Do' => 0,
            'In Progress' => 0,
            'Review' => 0,
            'Reopen' => 0,
            'Done' => 0,
        ];

        if ($assignedProjectIds->isNotEmpty()) {
            $tasks = DB::table('tasks')
                ->select('status')
                ->whereIn('project_id', $assignedProjectIds)
                ->get();

            foreach ($tasks as $task) {
                $normalized = $this->normalizeTaskStatus($task->status ?? null);
                if (!array_key_exists($normalized, $statusCounts)) {
                    $statusCounts[$normalized] = 0;
                }
                $statusCounts[$normalized]++;
            }
        }

        $activeTasks = collect($statusCounts)
            ->reject(fn ($count, $status) => $status === 'Done')
            ->sum();

        return [
            'totalProjectsHandled' => $assignedProjectIds->count(),
            'activeTasks' => $activeTasks,
            'taskStatusCounts' => $statusCounts,
        ];
    }

    public function stats(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getStatsData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $projectIds  null = all projects; [] = none
     */
    private function getStatsData(?array $projectIds = null): array
    {
        if ($projectIds !== null && $projectIds === []) {
            return $this->emptyStatsPayload();
        }

        $projectFilter = $this->sqlProjectIdFilter($projectIds, 'projects');
        $projectFilterAlias = $this->sqlProjectIdFilter($projectIds, 'p');
        $taskFilter = $this->sqlProjectIdFilter($projectIds, 'tasks', 'project_id');
        $manhourFilter = $this->sqlProjectIdFilter($projectIds, 'manhours', 'project_id');
        $allocationFilter = $this->sqlProjectIdFilter($projectIds, 'project_allocations', 'project_id');

        $stats = DB::selectOne("
            SELECT 
                (SELECT COUNT(*) FROM projects WHERE 1=1{$projectFilter}) as totalProjects,
                (SELECT COUNT(*) FROM projects p
                    WHERE 1=1{$projectFilterAlias}
                    AND NOT (
                        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) > 0
                        AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'Done') = 0
                    )
                ) as activeProjects,
                (SELECT COUNT(*) FROM projects p
                    WHERE 1=1{$projectFilterAlias}
                    AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) > 0
                    AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'Done') = 0
                ) as doneProjects,
                (SELECT COUNT(*) FROM projects WHERE lower(coalesce(methodology, '')) LIKE '%waterfall%'{$projectFilter}) as waterfallProjects,
                (SELECT COUNT(*) FROM projects WHERE lower(coalesce(methodology, '')) LIKE '%scrum%' OR lower(coalesce(methodology, '')) LIKE '%agile%'{$projectFilter}) as scrumProjects,
                (SELECT COUNT(*) FROM tasks WHERE status != 'Done'{$taskFilter}) as activeTasks,
                (SELECT COALESCE(SUM(hours), 0) FROM manhours WHERE 1=1{$manhourFilter}) as totalHours,
                (SELECT COALESCE(SUM(quotation_value), 0) FROM projects WHERE 1=1{$projectFilter}) as totalRevenue,
                (SELECT COALESCE(SUM(amount), 0) FROM project_allocations WHERE is_topup = 0{$allocationFilter}) as totalAllocated,
                (SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE type = 'OPEX') as opexTotal,
                (SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE type = 'CAPEX') as capexTotal
        ");

        $totalRevenue = $stats->totalRevenue ?: 0;
        $totalAllocated = $stats->totalAllocated ?: 0;
        $includeCompanyFinancials = $projectIds === null;
        $opexTotal = $includeCompanyFinancials ? ($stats->opexTotal ?: 0) : 0;
        $capexTotal = $includeCompanyFinancials ? ($stats->capexTotal ?: 0) : 0;

        $totalMargin = $totalRevenue - $totalAllocated - $opexTotal - $capexTotal;
        $marginPercentage = $totalRevenue > 0 ? ($totalMargin / $totalRevenue) * 100 : 0;

        $taskStatusCounts = [
            'To Do' => 0,
            'In Progress' => 0,
            'Review' => 0,
            'Reopen' => 0,
            'Done' => 0,
        ];
        $statusQuery = DB::table('tasks')
            ->select('status', DB::raw('COUNT(*) as total'));
        if ($projectIds !== null) {
            $statusQuery->whereIn('project_id', $projectIds);
        }
        $statusRows = $statusQuery->groupBy('status')->get();
        foreach ($statusRows as $row) {
            $normalized = $this->normalizeTaskStatus($row->status ?? null);
            if (!array_key_exists($normalized, $taskStatusCounts)) {
                $taskStatusCounts[$normalized] = 0;
            }
            $taskStatusCounts[$normalized] += (int) ($row->total ?? 0);
        }

        return [
            'totalProjects' => $stats->totalProjects,
            'activeProjects' => $stats->activeProjects ?: 0,
            'doneProjects' => $stats->doneProjects ?: 0,
            'scrumProjects' => $stats->scrumProjects ?: 0,
            'waterfallProjects' => $stats->waterfallProjects ?: 0,
            'activeTasks' => $stats->activeTasks,
            'totalHours' => $stats->totalHours ?: 0,
            'totalRevenue' => $totalRevenue,
            'totalAllocated' => $totalAllocated,
            'totalMargin' => $totalMargin,
            'marginPercentage' => $marginPercentage,
            'taskStatusCounts' => $taskStatusCounts,
        ];
    }

    public function recentLogs(Request $request)
    {
        $user = $request->user();
        if (!UserAccess::canViewManhours($user)) {
            return response()->json(['data' => []]);
        }

        $projectIds = ProjectAccess::metricsProjectIds($user);

        return response()->json(['data' => $this->getRecentLogsData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $projectIds
     */
    private function getRecentLogsData(?array $projectIds = null)
    {
        if ($projectIds !== null && $projectIds === []) {
            return collect();
        }

        $query = DB::table('manhours as m')
            ->join('users as u', 'm.user_id', '=', 'u.id')
            ->join('projects as p', 'm.project_id', '=', 'p.id')
            ->leftJoin('project_roles as pr', 'm.project_role_id', '=', 'pr.id')
            ->select(
                'm.id', 
                'm.hours', 
                'm.description', 
                'm.date',
                'u.name as user_name',
                'p.name as project_name',
                'pr.name as role_name'
            )
            ->orderBy('m.created_at', 'desc')
            ->limit(10);

        if ($projectIds !== null) {
            $query->whereIn('m.project_id', $projectIds);
        }

        return $query->get();
    }

    public function efficiency(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getEfficiencyData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $projectIds
     */
    private function getEfficiencyData(?array $projectIds = null)
    {
        if ($projectIds !== null && $projectIds === []) {
            return collect();
        }

        $projectsQuery = DB::table('projects')
            ->select('id', 'name', 'methodology', 'total_manhours as estimated_hours');

        if ($projectIds !== null) {
            $projectsQuery->whereIn('id', $projectIds);
        }

        $projects = $projectsQuery->get();

        $taskSumsQuery = DB::table('tasks')
            ->select('project_id', DB::raw('SUM(estimated_hours) as allocated'));
        if ($projectIds !== null) {
            $taskSumsQuery->whereIn('project_id', $projectIds);
        }
        $taskSums = $taskSumsQuery->groupBy('project_id')->pluck('allocated', 'project_id');

        $manhourSumsQuery = DB::table('manhours')
            ->select('project_id', DB::raw('SUM(hours) as actual'));
        if ($projectIds !== null) {
            $manhourSumsQuery->whereIn('project_id', $projectIds);
        }
        $manhourSums = $manhourSumsQuery->groupBy('project_id')->pluck('actual', 'project_id');

        return $projects->map(function($p) use ($taskSums, $manhourSums) {
            $p->allocated_hours = $taskSums[$p->id] ?? 0;
            $p->actual_hours = $manhourSums[$p->id] ?? 0;
            $p->burn_percentage = $p->estimated_hours > 0 ? ($p->allocated_hours * 100.0 / $p->estimated_hours) : 0;
            return $p;
        })->sortByDesc('burn_percentage')->values();
    }

    public function revenueTrend(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getRevenueTrendData($projectIds)]);
    }

    public function companyProjects(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getCompanyProjectsData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $scopedProjectIds
     */
    private function getCompanyProjectsData(?array $scopedProjectIds = null): array
    {
        if ($scopedProjectIds !== null && $scopedProjectIds === []) {
            return [];
        }

        $pairsQuery = DB::table('presales as pr')
            ->join('companies as c', 'c.id', '=', 'pr.company_id')
            ->whereNotNull('pr.converted_project_id');

        if ($scopedProjectIds !== null) {
            $pairsQuery->whereIn('pr.converted_project_id', $scopedProjectIds);
        }

        $pairs = $pairsQuery
            ->select(
                'c.id as company_id',
                'c.name as company_name',
                'c.logo_path',
                'pr.converted_project_id as project_id'
            )
            ->distinct()
            ->get();

        if ($pairs->isEmpty()) {
            return [];
        }

        $projectIds = $pairs->pluck('project_id')->unique()->map(fn ($id) => (int) $id)->values();

        $doneProjectIds = DB::table('projects as p')
            ->whereIn('p.id', $projectIds)
            ->whereRaw('(SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) > 0')
            ->whereRaw("(SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'Done') = 0")
            ->pluck('p.id')
            ->flip()
            ->all();

        $byCompany = [];
        foreach ($pairs as $row) {
            $companyId = (int) $row->company_id;
            $projectId = (int) $row->project_id;

            if (!isset($byCompany[$companyId])) {
                $byCompany[$companyId] = [
                    'company_id' => $companyId,
                    'company_name' => $row->company_name,
                    'logo_path' => $row->logo_path,
                    'project_ids' => [],
                ];
            }
            $byCompany[$companyId]['project_ids'][$projectId] = true;
        }

        $result = [];
        foreach ($byCompany as $company) {
            $projectIds = array_keys($company['project_ids']);
            $total = count($projectIds);
            $done = 0;
            foreach ($projectIds as $projectId) {
                if (array_key_exists($projectId, $doneProjectIds)) {
                    $done++;
                }
            }
            $active = $total - $done;

            $result[] = [
                'company_id' => $company['company_id'],
                'company_name' => $company['company_name'],
                'logo_url' => $company['logo_path']
                    ? Storage::disk('public')->url($company['logo_path'])
                    : null,
                'total_projects' => $total,
                'active_projects' => $active,
                'done_projects' => $done,
                'status' => $active === 0 ? 'All done' : 'Active',
            ];
        }

        usort($result, fn ($a, $b) => $b['total_projects'] <=> $a['total_projects']
            ?: strcasecmp($a['company_name'], $b['company_name']));

        return $result;
    }

    /**
     * @param  null|array<int>  $scopedProjectIds
     */
    private function getRevenueTrendData(?array $scopedProjectIds = null)
    {
        if ($scopedProjectIds !== null && $scopedProjectIds === []) {
            return [];
        }

        $projectsQuery = DB::table('projects')
            ->select('id', 'created_at', 'quotation_value')
            ->orderBy('created_at', 'asc');

        if ($scopedProjectIds !== null) {
            $projectsQuery->whereIn('id', $scopedProjectIds);
        }

        $projects = $projectsQuery->get();

        if ($projects->isEmpty()) {
            return [];
        }

        $projectRows = $projects->map(function ($p) {
            return [
                'id' => (int) $p->id,
                'month' => Carbon::parse($p->created_at)->format('Y-m'),
                'billed' => (float) ($p->quotation_value ?? 0),
            ];
        });

        $monthList = $projectRows
            ->pluck('month')
            ->unique()
            ->sort()
            ->values()
            ->take(-6)
            ->values();

        $projectIds = $projectRows
            ->whereIn('month', $monthList)
            ->pluck('id')
            ->unique()
            ->values();

        $allocByProject = DB::table('project_allocations')
            ->select('project_id', DB::raw('SUM(amount) as cost'))
            ->whereIn('project_id', $projectIds)
            ->groupBy('project_id')
            ->pluck('cost', 'project_id');

        $financialByMonth = [];
        if ($scopedProjectIds === null) {
            $firstMonth = $monthList->first();
            $financialRows = DB::table('financial_records')
                ->select('date', 'amount')
                ->when($firstMonth, function ($q) use ($firstMonth) {
                    $q->whereDate('date', '>=', $firstMonth . '-01');
                })
                ->get();

            foreach ($financialRows as $row) {
                $month = Carbon::parse($row->date)->format('Y-m');
                if (!$monthList->contains($month)) {
                    continue;
                }
                $financialByMonth[$month] = ($financialByMonth[$month] ?? 0) + (float) ($row->amount ?? 0);
            }
        }

        return $monthList->map(function ($month) use ($projectRows, $allocByProject, $financialByMonth) {
            $monthProjects = $projectRows->where('month', $month);
            $billed = (float) $monthProjects->sum('billed');

            $projectCost = 0.0;
            foreach ($monthProjects as $project) {
                $projectCost += (float) ($allocByProject[$project['id']] ?? 0);
            }

            return (object) [
                'month' => $month,
                'billed' => $billed,
                'cost' => $projectCost + (float) ($financialByMonth[$month] ?? 0),
            ];
        });
    }

    public function dashboardOverview(Request $request)
    {
        $user = $request->user();
        $projectIds = ProjectAccess::metricsProjectIds($user);

        if ($user && !ProjectAccess::canViewGlobalFinanceMetrics($user) && !UserAccess::isPrivileged($user)) {
            return response()->json([
                'mode' => 'member',
                'userStats' => $this->getMemberDashboardData($user),
            ]);
        }

        // Fail-safe: if one section errors, keep dashboard stats available.
        try {
            $stats = $this->getStatsData($projectIds);
        } catch (\Throwable $e) {
            $stats = [
                'totalProjects' => 0,
                'activeProjects' => 0,
                'doneProjects' => 0,
                'scrumProjects' => 0,
                'waterfallProjects' => 0,
                'activeTasks' => 0,
                'totalHours' => 0,
                'totalRevenue' => 0,
                'totalAllocated' => 0,
                'totalMargin' => 0,
                'marginPercentage' => 0,
            ];
        }

        try {
            $efficiency = $this->getEfficiencyData($projectIds);
        } catch (\Throwable $e) {
            $efficiency = [];
        }

        try {
            $recentLogs = UserAccess::canViewManhours($user)
                ? $this->getRecentLogsData($projectIds)
                : [];
        } catch (\Throwable $e) {
            $recentLogs = [];
        }

        try {
            $revenueTrend = $this->getRevenueTrendData($projectIds);
        } catch (\Throwable $e) {
            $revenueTrend = [];
        }

        return response()->json([
            'stats' => $stats,
            'efficiency' => $efficiency,
            'recentLogs' => $recentLogs,
            'revenueTrend' => $revenueTrend
        ]);
    }

    /**
     * @param  null|array<int>  $projectIds
     */
    private function sqlProjectIdFilter(?array $projectIds, string $table, string $column = 'id'): string
    {
        if ($projectIds === null) {
            return '';
        }

        if ($projectIds === []) {
            return ' AND 1=0';
        }

        $ids = implode(',', array_map('intval', $projectIds));
        $qualified = $table === 'p' ? "p.{$column}" : "{$table}.{$column}";

        return " AND {$qualified} IN ({$ids})";
    }

    private function emptyStatsPayload(): array
    {
        return [
            'totalProjects' => 0,
            'activeProjects' => 0,
            'doneProjects' => 0,
            'scrumProjects' => 0,
            'waterfallProjects' => 0,
            'activeTasks' => 0,
            'totalHours' => 0,
            'totalRevenue' => 0,
            'totalAllocated' => 0,
            'totalMargin' => 0,
            'marginPercentage' => 0,
            'taskStatusCounts' => [
                'To Do' => 0,
                'In Progress' => 0,
                'Review' => 0,
                'Reopen' => 0,
                'Done' => 0,
            ],
        ];
    }
}
