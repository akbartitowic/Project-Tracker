<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatController extends Controller
{
    public function stats()
    {
        return response()->json(['data' => $this->getStatsData()]);
    }

    private function getStatsData()
    {
        $stats = DB::selectOne("
            SELECT 
                (SELECT COUNT(*) FROM projects) as totalProjects,
                (SELECT COUNT(*) FROM tasks WHERE status != 'Done') as activeTasks,
                (SELECT SUM(hours) FROM manhours) as totalHours,
                (SELECT SUM(quotation_value) FROM projects) as totalRevenue,
                (SELECT SUM(amount) FROM project_allocations) as totalAllocated,
                (SELECT SUM(amount) FROM financial_records WHERE type = 'OPEX') as opexTotal,
                (SELECT SUM(amount) FROM financial_records WHERE type = 'CAPEX') as capexTotal
        ");

        $totalRevenue = $stats->totalRevenue ?: 0;
        $totalAllocated = $stats->totalAllocated ?: 0;
        $opexTotal = $stats->opexTotal ?: 0;
        $capexTotal = $stats->capexTotal ?: 0;

        $totalMargin = $totalRevenue - $totalAllocated - $opexTotal - $capexTotal;
        $marginPercentage = $totalRevenue > 0 ? ($totalMargin / $totalRevenue) * 100 : 0;

        return [
            'totalProjects' => $stats->totalProjects,
            'activeTasks' => $stats->activeTasks,
            'totalHours' => $stats->totalHours ?: 0,
            'totalRevenue' => $totalRevenue,
            'totalAllocated' => $totalAllocated,
            'totalMargin' => $totalMargin,
            'marginPercentage' => $marginPercentage
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
            ->select('id', 'name', 'total_manhours as estimated_hours')
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

    private function getRevenueTrendData()
    {
        $months = DB::table('projects')
            ->selectRaw("strftime('%Y-%m', created_at) as month")
            ->selectRaw('SUM(quotation_value) as billed')
            ->groupByRaw("strftime('%Y-%m', created_at)")
            ->orderByRaw("strftime('%Y-%m', created_at) ASC")
            ->limit(6)
            ->get();

        if ($months->isEmpty()) return [];

        $monthList = $months->pluck('month')->toArray();

        // Batch get all project allocations for these months
        $projectAllocations = DB::table('project_allocations')
            ->join('projects', 'project_allocations.project_id', '=', 'projects.id')
            ->whereIn(DB::raw("strftime('%Y-%m', projects.created_at)"), $monthList)
            ->selectRaw("strftime('%Y-%m', projects.created_at) as month, SUM(amount) as cost")
            ->groupBy('month')
            ->pluck('cost', 'month');

        // Batch get all financial records for these months
        $financialRecords = DB::table('financial_records')
            ->whereIn(DB::raw("strftime('%Y-%m', date)"), $monthList)
            ->selectRaw("strftime('%Y-%m', date) as month, SUM(amount) as cost")
            ->groupBy('month')
            ->pluck('cost', 'month');

        return $months->map(function($m) use ($projectAllocations, $financialRecords) {
            $pCost = $projectAllocations[$m->month] ?? 0;
            $fCost = $financialRecords[$m->month] ?? 0;
            $m->cost = $pCost + $fCost;
            return $m;
        });
    }

    public function dashboardOverview()
    {
        return response()->json([
            'stats' => $this->getStatsData(),
            'efficiency' => $this->getEfficiencyData(),
            'recentLogs' => $this->getRecentLogsData(),
            'revenueTrend' => $this->getRevenueTrendData()
        ]);
    }
}
