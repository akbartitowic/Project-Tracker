<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class StatController extends Controller
{
    private function isPrivilegedUser($user): bool
    {
        if (!$user) return false;
        $email = strtolower((string) ($user->email ?? ''));
        if ($email === 'tito@noohtify.com') return true;

        $roleText = strtolower((string) ($user->role ?? ''));
        if ($roleText === 'admin') return true;

        try {
            $roleModel = $user->role()->first();
            if ($roleModel && strtolower((string) $roleModel->name) === 'admin') {
                return true;
            }
        } catch (\Throwable $e) {
            // Ignore relation issues and continue fallback.
        }

        return false;
    }

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

    public function stats()
    {
        return response()->json(['data' => $this->getStatsData()]);
    }

    private function getStatsData()
    {
        $stats = DB::selectOne("
            SELECT 
                (SELECT COUNT(*) FROM projects) as totalProjects,
                (SELECT COUNT(*) FROM projects p
                    WHERE NOT (
                        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) > 0
                        AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'Done') = 0
                    )
                ) as activeProjects,
                (SELECT COUNT(*) FROM projects p
                    WHERE (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) > 0
                    AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'Done') = 0
                ) as doneProjects,
                (SELECT COUNT(*) FROM projects WHERE lower(coalesce(methodology, '')) LIKE '%waterfall%') as waterfallProjects,
                (SELECT COUNT(*) FROM projects WHERE lower(coalesce(methodology, '')) LIKE '%scrum%' OR lower(coalesce(methodology, '')) LIKE '%agile%') as scrumProjects,
                (SELECT COUNT(*) FROM tasks WHERE status != 'Done') as activeTasks,
                (SELECT SUM(hours) FROM manhours) as totalHours,
                (SELECT SUM(quotation_value) FROM projects) as totalRevenue,
                (SELECT SUM(amount) FROM project_allocations WHERE is_topup = 0) as totalAllocated,
                (SELECT SUM(amount) FROM financial_records WHERE type = 'OPEX') as opexTotal,
                (SELECT SUM(amount) FROM financial_records WHERE type = 'CAPEX') as capexTotal
        ");

        $totalRevenue = $stats->totalRevenue ?: 0;
        $totalAllocated = $stats->totalAllocated ?: 0;
        $opexTotal = $stats->opexTotal ?: 0;
        $capexTotal = $stats->capexTotal ?: 0;

        $totalMargin = $totalRevenue - $totalAllocated - $opexTotal - $capexTotal;
        $marginPercentage = $totalRevenue > 0 ? ($totalMargin / $totalRevenue) * 100 : 0;

        $taskStatusCounts = [
            'To Do' => 0,
            'In Progress' => 0,
            'Review' => 0,
            'Reopen' => 0,
            'Done' => 0,
        ];
        $statusRows = DB::table('tasks')
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->get();
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

    public function recentLogs()
    {
        return response()->json(['data' => $this->getRecentLogsData()]);
    }

    private function getRecentLogsData()
    {
        return DB::table('manhours as m')
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
            ->limit(10)
            ->get();
    }

    public function efficiency()
    {
        return response()->json(['data' => $this->getEfficiencyData()]);
    }

    private function getEfficiencyData()
    {
        $projects = DB::table('projects')
            ->select('id', 'name', 'methodology', 'total_manhours as estimated_hours')
            ->get();

        $taskSums = DB::table('tasks')
            ->select('project_id', DB::raw('SUM(estimated_hours) as allocated'))
            ->groupBy('project_id')
            ->pluck('allocated', 'project_id');

        $manhourSums = DB::table('manhours')
            ->select('project_id', DB::raw('SUM(hours) as actual'))
            ->groupBy('project_id')
            ->pluck('actual', 'project_id');

        return $projects->map(function($p) use ($taskSums, $manhourSums) {
            $p->allocated_hours = $taskSums[$p->id] ?? 0;
            $p->actual_hours = $manhourSums[$p->id] ?? 0;
            $p->burn_percentage = $p->estimated_hours > 0 ? ($p->allocated_hours * 100.0 / $p->estimated_hours) : 0;
            return $p;
        })->sortByDesc('burn_percentage')->values();
    }

    public function revenueTrend()
    {
        return response()->json(['data' => $this->getRevenueTrendData()]);
    }

    public function companyProjects()
    {
        return response()->json(['data' => $this->getCompanyProjectsData()]);
    }

    private function getCompanyProjectsData(): array
    {
        $pairs = DB::table('presales as pr')
            ->join('companies as c', 'c.id', '=', 'pr.company_id')
            ->whereNotNull('pr.converted_project_id')
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

    private function getRevenueTrendData()
    {
        $projects = DB::table('projects')
            ->select('id', 'created_at', 'quotation_value')
            ->orderBy('created_at', 'asc')
            ->get();

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

        $firstMonth = $monthList->first();
        $financialRows = DB::table('financial_records')
            ->select('date', 'amount')
            ->when($firstMonth, function ($q) use ($firstMonth) {
                $q->whereDate('date', '>=', $firstMonth . '-01');
            })
            ->get();

        $financialByMonth = [];
        foreach ($financialRows as $row) {
            $month = Carbon::parse($row->date)->format('Y-m');
            if (!$monthList->contains($month)) {
                continue;
            }
            $financialByMonth[$month] = ($financialByMonth[$month] ?? 0) + (float) ($row->amount ?? 0);
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
        if ($user && !$this->isPrivilegedUser($user)) {
            return response()->json([
                'mode' => 'member',
                'userStats' => $this->getMemberDashboardData($user),
            ]);
        }

        // Fail-safe: if one section errors, keep dashboard stats available.
        try {
            $stats = $this->getStatsData();
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
            $efficiency = $this->getEfficiencyData();
        } catch (\Throwable $e) {
            $efficiency = [];
        }

        try {
            $recentLogs = $this->getRecentLogsData();
        } catch (\Throwable $e) {
            $recentLogs = [];
        }

        try {
            $revenueTrend = $this->getRevenueTrendData();
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
}
