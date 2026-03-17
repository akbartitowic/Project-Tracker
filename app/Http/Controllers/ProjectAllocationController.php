<?php

namespace App\Http\Controllers;

use App\Models\ProjectAllocation;
use App\Models\Project;
use App\Models\Manhour;
use App\Models\ProjectRoleQuota;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectAllocationController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('project_allocations as pa')
            ->join('finance_categories as fc', 'pa.category_id', '=', 'fc.id')
            ->join('projects as p', 'pa.project_id', '=', 'p.id')
            ->select('pa.*', 'fc.name as category_name', 'p.name as project_name', 'p.quotation_value');

        if ($request->has('project_id')) {
            $query->where('pa.project_id', $request->query('project_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'category_id' => 'required|exists:finance_categories,id',
            'amount' => 'required|numeric',
            'description' => 'nullable|string'
        ]);

        $allocation = ProjectAllocation::create($validated);
        return response()->json(['id' => $allocation->id]);
    }

    public function destroy(string $id)
    {
        $deleted = ProjectAllocation::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }

    public function topUp(Request $request, $id)
    {
        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);

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
                'amount' => $validated['additional_quotation'],
                'description' => '[TOP UP] ' . $validated['description'],
                'is_topup' => true
            ]);

            DB::commit();
            return response()->json(['message' => 'Top up successful']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function financeSummary($id)
    {
        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);

        $allocations = DB::table('project_allocations as pa')
            ->join('finance_categories as fc', 'pa.category_id', '=', 'fc.id')
            ->select('pa.*', 'fc.name as category_name')
            ->where('pa.project_id', $id)
            ->get();

        $totalAllocated = $allocations->where('is_topup', false)->sum('amount');
        $quotationValue = $project->quotation_value ?? 0;

        $allocatedHours = DB::table('tasks')->where('project_id', $id)->sum('estimated_hours');
        $actualHours = Manhour::where('project_id', $id)->sum('hours');
        $totalManhours = $project->total_manhours ?? 0;

        return response()->json([
            'data' => [
                'project_name' => $project->name,
                'quotation_value' => $quotationValue,
                'total_allocated' => $totalAllocated,
                'remaining_margin' => $quotationValue - $totalAllocated,
                'total_manhours' => $totalManhours,
                'allocated_hours' => $allocatedHours,
                'actual_hours' => $actualHours,
                'remaining_hours' => $totalManhours - $allocatedHours,
                'allocations' => $allocations
            ]
        ]);
    }
}
