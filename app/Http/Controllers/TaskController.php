<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\LogActivity;

use App\Models\User;
use App\Models\ProjectRole;
use Illuminate\Support\Facades\Validator;

class TaskController extends Controller
{
    use LogActivity;

    private function isPrivilegedUser($user): bool
    {
        if (!$user) return false;
        $email = strtolower((string) ($user->email ?? ''));
        if ($email === 'tito@noohtify.com') return true;
        $roleName = strtolower((string) ($user->role->name ?? $user->role ?? ''));
        return $roleName === 'admin';
    }

    private function canAccessProject($user, int $projectId): bool
    {
        if ($this->isPrivilegedUser($user)) return true;
        return DB::table('project_members')
            ->where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->exists();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Task::query();

        if (!$this->isPrivilegedUser($user)) {
            $assignedProjectIds = DB::table('project_members')
                ->where('user_id', $user->id)
                ->pluck('project_id');
            $query->whereIn('project_id', $assignedProjectIds);
        }

        if ($request->has('project_id')) {
            $projectId = (int) $request->query('project_id');
            if (!$this->canAccessProject($user, $projectId)) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
            $query->where('project_id', $projectId);
        }
        return response()->json(['data' => $query->get()]);
    }

    public function downloadTemplate()
    {
        return response()->streamDownload(function () {
            $file = fopen('php://output', 'w');
            // Add BOM for Excel UTF-8 compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($file, ['Title', 'Feature Title', 'Description', 'Status', 'Priority', 'Assignee Email', 'Estimated Hours', 'Role Name', 'Category']);
            fputcsv($file, ['Example Task', 'Auth', 'User login implementation', 'To Do', 'High', 'dev@example.com', '4', 'Developer', 'Backend']);
            fclose($file);
        }, 'task_import_template.csv');
    }

    public function import(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'file' => 'required|file|mimes:csv,txt'
        ]);

        if (!$this->canAccessProject($user, (int) $request->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $project = Project::find($request->project_id);
        if (!$project) {
            return response()->json(['error' => 'Project not found.'], 404);
        }
        $file = $request->file('file');
        $path = $file->getRealPath();
        $handle = fopen($path, 'r');

        $header = fgetcsv($handle);
        $rowIndex = 0;
        $successCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle)) !== false) {
                $rowIndex++;
                if (count($row) < 1 || empty($row[0])) continue; // Skip empty rows

                $data = [
                    'title' => $row[0] ?? '',
                    'feature_title' => $row[1] ?? null,
                    'description' => $row[2] ?? null,
                    'status' => $row[3] ?: 'To Do',
                    'priority' => $row[4] ?: 'Medium',
                    'assignee_email' => $row[5] ?? null,
                    'estimated_hours' => $row[6] ?: 0,
                    'role_name' => $row[7] ?? null,
                    'category' => $row[8] ?? null,
                    'project_id' => $project->id,
                ];

                // Validate task data
                $validator = Validator::make($data, [
                    'title' => 'required|string',
                    'project_id' => 'required|exists:projects,id',
                    'estimated_hours' => 'nullable|numeric',
                ]);

                if ($validator->fails()) {
                    $errors[] = "Row $rowIndex: " . implode(', ', $validator->errors()->all());
                    continue;
                }

                // Resolve Assignee
                if (!empty($data['assignee_email'])) {
                    $user = User::where('email', $data['assignee_email'])->first();
                    if ($user) {
                        $data['assignee_id'] = $user->id;
                    }
                }

                // Resolve Role
                if (!empty($data['role_name'])) {
                    $role = ProjectRole::where('name', $data['role_name'])->first();
                    if ($role) {
                        $data['project_role_id'] = $role->id;
                    }
                }

                // Check Quotas (copied from store method logic)
                $est = (float)$data['estimated_hours'];
                if ($project->methodology === 'Agile Scrum') {
                    if (!empty($data['project_role_id'])) {
                        $quotaRow = DB::table('project_role_quotas')
                            ->where('project_id', $project->id)
                            ->where('project_role_id', $data['project_role_id'])
                            ->first();

                        if ($quotaRow) {
                            $currentUsed = DB::table('tasks')
                                ->where('project_id', $project->id)
                                ->where('project_role_id', $data['project_role_id'])
                                ->sum('estimated_hours');

                            if (($currentUsed + $est) > $quotaRow->quota_hours) {
                                $errors[] = "Row $rowIndex: WARNING - Role quota exceeded for '{$data['role_name']}'. Task was still imported.";
                            }
                        }
                    } else {
                    $mappedRoleQuota = DB::table('project_role_quotas')
                        ->where('project_id', $project->id)
                        ->sum('quota_hours');

                    $generalQuota = max(0, (float)($project->total_manhours ?? 0) - (float)$mappedRoleQuota);

                    $currentGeneralUsed = DB::table('tasks')
                            ->where('project_id', $project->id)
                        ->whereNull('project_role_id')
                            ->sum('estimated_hours');

                    if ($project->total_manhours !== null && ($currentGeneralUsed + $est) > $generalQuota) {
                            $errors[] = "Row $rowIndex: WARNING - Project quota exceeded. Task was still imported.";
                        }
                    }
                }

                // Remove temp fields
                unset($data['assignee_email'], $data['role_name']);

                Task::create($data);
                $successCount++;
            }
            DB::commit();

            if ($successCount > 0) {
                $this->log('Project', 'Imported Tasks', "Imported $successCount tasks to project ID: {$project->id}");
            }

            return response()->json([
                'success' => $successCount,
                'errors' => $errors,
                'message' => "Successfully imported $successCount tasks." . (count($errors) > 0 ? " Check alerts below." : "")
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        } finally {
            fclose($handle);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string',
            'feature_title' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'project_id' => 'required|exists:projects,id',
            'assignee_id' => 'nullable|exists:users,id',
            'estimated_hours' => 'nullable|numeric',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'category' => 'nullable|string'
        ]);

        if (!$this->canAccessProject($user, (int) $validated['project_id'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

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
                $mappedRoleQuota = DB::table('project_role_quotas')
                    ->where('project_id', $project->id)
                    ->sum('quota_hours');

                $generalQuota = max(0, (float)($project->total_manhours ?? 0) - (float)$mappedRoleQuota);

                $currentGeneralUsed = DB::table('tasks')
                    ->where('project_id', $project->id)
                    ->whereNull('project_role_id')
                    ->sum('estimated_hours');

                if ($project->total_manhours !== null && ($currentGeneralUsed + $est) > $generalQuota) {
                    return response()->json([
                        'error' => "General quota exceeded. Remaining: " . ($generalQuota - $currentGeneralUsed) . " hours.",
                        'remaining' => $generalQuota - $currentGeneralUsed
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
        $user = $request->user();
        $validated = $request->validate([
            'status' => 'required|string'
        ]);
        $task = Task::findOrFail($id);
        if (!$this->canAccessProject($user, (int) $task->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $oldStatus = $task->status;
        $changes = $task->update($validated) ? 1 : 0;
        
        $this->log('Project', 'Updated Task Status', "Changed task '{$task->title}' from {$oldStatus} to {$validated['status']}");
        
        return response()->json(['changes' => $changes]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $task = Task::findOrFail($id);
        if (!$this->canAccessProject($user, (int) $task->project_id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $validated = $request->validate([
            'title' => 'required|string',
            'feature_title' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'assignee_id' => 'nullable|exists:users,id',
            'estimated_hours' => 'nullable|numeric',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'category' => 'nullable|string'
        ]);
        
        $changes = $task->update($validated) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }

    public function bulkEditManhours(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'task_ids' => 'required|array',
            'task_ids.*' => 'exists:tasks,id',
            'estimated_hours' => 'nullable|numeric',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'category' => 'nullable|string'
        ]);

        if (empty($validated['task_ids'])) {
            return response()->json(['error' => 'No tasks selected.'], 400);
        }

        if (!$this->isPrivilegedUser($user)) {
            $unauthorizedExists = Task::whereIn('id', $validated['task_ids'])
                ->whereNotIn('project_id', function ($q) use ($user) {
                    $q->select('project_id')
                        ->from('project_members')
                        ->where('user_id', $user->id);
                })
                ->exists();

            if ($unauthorizedExists) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

        $updateData = [];
        if (array_key_exists('estimated_hours', $validated)) {
            $updateData['estimated_hours'] = $validated['estimated_hours'];
        }
        if (array_key_exists('project_role_id', $validated)) {
            $updateData['project_role_id'] = $validated['project_role_id'];
        }
        if (array_key_exists('category', $validated)) {
            $updateData['category'] = $validated['category'];
        }

        if (empty($updateData)) {
            return response()->json(['message' => 'No changes provided.', 'changes' => 0]);
        }

        $changes = Task::whereIn('id', $validated['task_ids'])->update($updateData);

        $this->log('Project', 'Bulk Edit Tasks', "Bulk edited $changes tasks.");

        return response()->json(['message' => "Successfully updated $changes tasks.", 'changes' => $changes]);
    }
}
