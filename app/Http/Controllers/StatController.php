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
            ->select('p.id', 'p.name', 'p.total_manhours as estimated_hours')
            ->selectRaw('(SELECT CAST(COALESCE(SUM(estimated_hours), 0) AS FLOAT) FROM tasks WHERE project_id = p.id) as allocated_hours')
            ->selectRaw('(SELECT CAST(COALESCE(SUM(hours), 0) AS FLOAT) FROM manhours WHERE project_id = p.id) as actual_hours')
            ->get();

        foreach ($efficiency as $e) {
            $e->burn_percentage = $e->estimated_hours > 0 ? ($e->allocated_hours * 100.0 / $e->estimated_hours) : 0;
        }

        $efficiency = collect($efficiency)->sortByDesc('burn_percentage')->values();

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
