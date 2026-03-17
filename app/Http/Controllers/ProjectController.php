<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectRoleQuota;
use App\Models\Task;
use App\Models\Manhour;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    public function index()
    {
        $projects = Project::select('projects.*')
            ->selectRaw("
                CASE
                    WHEN (SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id AND t.status IN ('In Progress', 'Review', 'Reopen')) > 0 THEN 'In Progress'
                    WHEN (SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id) > 0 AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = projects.id AND t.status != 'Done') = 0 THEN 'Done'
                    ELSE 'Planning'
                END as status
            ")->get();
            
        // Cast jobs back to array (or rely on Model casting)
        $projects->each(function($p) {
            $p->jobs = is_string($p->jobs) ? json_decode($p->jobs) : $p->jobs;
        });

        return response()->json(['data' => $projects]);
    }

    public function destroy(Request $request)
    {
        $ids = $request->input('ids');
        if (!$ids || !is_array($ids) || empty($ids)) {
            return response()->json(['error' => 'Please provide an array of project IDs to delete.'], 400);
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
            'members' => 'nullable|array',
            'role_quotas' => 'nullable|array'
        ]);

        $members = $validated['members'] ?? [];
        $roleQuotas = $validated['role_quotas'] ?? [];
        unset($validated['members'], $validated['role_quotas']);

        DB::beginTransaction();
        try {
            $project = Project::create($validated);

            foreach ($members as $member) {
                ProjectMember::create([
                    'project_id' => $project->id,
                    'user_id' => $member['user_id'],
                    'project_role_id' => $member['project_role_id']
                ]);
            }

            foreach ($roleQuotas as $quota) {
                ProjectRoleQuota::create([
                    'project_id' => $project->id,
                    'project_role_id' => $quota['project_role_id'],
                    'quota_hours' => $quota['quota_hours']
                ]);
            }

            DB::commit();
            return response()->json(['id' => $project->id]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function quotas($id)
    {
        $quotas = DB::table('project_role_quotas as pq')
            ->join('project_roles as pr', 'pq.project_role_id', '=', 'pr.id')
            ->select('pq.*', 'pr.name as role_name')
            ->selectRaw("(SELECT CAST(COALESCE(SUM(hours), 0) AS FLOAT) FROM manhours WHERE project_id = pq.project_id AND project_role_id = pq.project_role_id) as actual_used_hours")
            ->where('pq.project_id', $id)
            ->get();

        return response()->json(['data' => $quotas]);
    }

    public function balance($id)
    {
        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);

        $usedHours = Manhour::where('project_id', $id)->sum('hours');
        
        $remaining = null;
        if ($project->total_manhours !== null) {
            $remaining = $project->total_manhours - $usedHours;
        }

        return response()->json([
            'data' => [
                'total_manhours' => $project->total_manhours,
                'methodology' => $project->methodology,
                'used_hours' => $usedHours,
                'remaining' => $remaining
            ]
        ]);
    }

    public function members($id)
    {
        $members = DB::table('project_members as pm')
            ->join('users as u', 'pm.user_id', '=', 'u.id')
            ->join('project_roles as pr', 'pm.project_role_id', '=', 'pr.id')
            ->select('pm.id', 'pm.project_id', 'pm.user_id', 'pm.project_role_id', 'u.name as user_name', 'pr.name as role_name')
            ->where('pm.project_id', $id)
            ->get();

        return response()->json(['data' => $members]);
    }
}
