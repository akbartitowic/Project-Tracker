<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\LogActivity;

class TaskController extends Controller
{
    use LogActivity;
    public function index(Request $request)
    {
        $query = Task::query();
        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }
        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'feature_title' => 'nullable|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'project_id' => 'required|exists:projects,id',
            'assignee_id' => 'nullable|exists:users,id',
            'estimated_hours' => 'nullable|numeric',
            'project_role_id' => 'nullable|exists:project_roles,id'
        ]);

        $est = (float)($validated['estimated_hours'] ?? 0);
        $project = Project::find($validated['project_id']);

        if ($project && $project->methodology === 'Agile Scrum') {
            if (!empty($validated['project_role_id'])) {
                $quotaRow = DB::table('project_role_quotas')
                    ->where('project_id', $project->id)
                    ->where('project_role_id', $validated['project_role_id'])
                    ->first();

                if (!$quotaRow) {
                    return response()->json(['error' => 'No quota defined for this role in this project.'], 400);
                }

                $currentUsed = DB::table('tasks')
                    ->where('project_id', $project->id)
                    ->where('project_role_id', $validated['project_role_id'])
                    ->sum('estimated_hours');

                if (($currentUsed + $est) > $quotaRow->quota_hours) {
                    return response()->json([
                        'error' => "Role quota exceeded. Remaining for this role: " . ($quotaRow->quota_hours - $currentUsed) . " hours.",
                        'remaining' => $quotaRow->quota_hours - $currentUsed
                    ], 400);
                }
            } else {
                $currentUsed = DB::table('tasks')
                    ->where('project_id', $project->id)
                    ->sum('estimated_hours');

                if ($project->total_manhours !== null && ($currentUsed + $est) > $project->total_manhours) {
                    return response()->json([
                        'error' => "Project quota exceeded. Remaining: " . ($project->total_manhours - $currentUsed) . " hours.",
                        'remaining' => $project->total_manhours - $currentUsed
                    ], 400);
                }
            }
        }

        $task = Task::create($validated);
        $this->log('Project', 'Created Task', "Added task '{$task->title}' to project ID: {$task->project_id}");
        return response()->json(['id' => $task->id]);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string'
        ]);
        $task = Task::findOrFail($id);
        $oldStatus = $task->status;
        $changes = $task->update($validated) ? 1 : 0;
        
        $this->log('Project', 'Updated Task Status', "Changed task '{$task->title}' from {$oldStatus} to {$validated['status']}");
        
        return response()->json(['changes' => $changes]);
    }

    public function update(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $validated = $request->validate([
            'title' => 'required|string',
            'feature_title' => 'nullable|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'assignee_id' => 'nullable|exists:users,id',
            'estimated_hours' => 'nullable|numeric',
            'project_role_id' => 'nullable|exists:project_roles,id'
        ]);
        
        $changes = $task->update($validated) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }
}
