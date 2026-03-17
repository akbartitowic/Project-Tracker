<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatController extends Controller
{
    public function stats()
    {
        $totalProjects = DB::table('projects')->count();
        $activeTasks = DB::table('tasks')->where('status', '!=', 'Done')->count();
        $totalHours = DB::table('manhours')->sum('hours');
        $totalRevenue = DB::table('projects')->sum('quotation_value');
        $totalAllocated = DB::table('project_allocations')->sum('amount');
        
        $totalMargin = $totalRevenue - $totalAllocated;
        $marginPercentage = $totalRevenue > 0 ? ($totalMargin / $totalRevenue) * 100 : 0;

        return response()->json([
            'data' => [
                'totalProjects' => $totalProjects,
                'activeTasks' => $activeTasks,
                'totalHours' => $totalHours,
                'totalRevenue' => $totalRevenue,
                'totalAllocated' => $totalAllocated,
                'totalMargin' => $totalMargin,
                'marginPercentage' => $marginPercentage
            ]
        ]);
    }

    public function recentLogs()
    {
        $logs = DB::table('manhours as m')
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

        return response()->json(['data' => $logs]);
    }

    public function efficiency()
    {
        $efficiency = DB::table('projects as p')
            ->leftJoin('manhours as m', 'p.id', '=', 'm.project_id')
            ->select('p.id', 'p.name', 'p.total_manhours as estimated_hours')
            ->selectRaw('CAST(COALESCE(SUM(m.hours), 0) AS FLOAT) as actual_hours')
            ->selectRaw('CASE WHEN p.total_manhours > 0 THEN (COALESCE(SUM(m.hours), 0) * 100.0 / p.total_manhours) ELSE 0 END as burn_percentage')
            ->groupBy('p.id', 'p.name', 'p.total_manhours')
            ->orderBy('burn_percentage', 'desc')
            ->get();

        return response()->json(['data' => $efficiency]);
    }

    public function revenueTrend()
    {
        $months = DB::table('projects')
            ->selectRaw("to_char(created_at, 'YYYY-MM') as month")
            ->selectRaw('SUM(quotation_value) as billed')
            ->groupByRaw("to_char(created_at, 'YYYY-MM')")
            ->orderByRaw("to_char(created_at, 'YYYY-MM') ASC")
            ->limit(6)
            ->get();

        foreach ($months as $m) {
            $m->cost = DB::table('project_allocations')
                ->join('projects', 'project_allocations.project_id', '=', 'projects.id')
                ->whereRaw("to_char(projects.created_at, 'YYYY-MM') = ?", [$m->month])
                ->sum('amount');
        }

        return response()->json(['data' => $months]);
    }
}
