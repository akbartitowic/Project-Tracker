<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class TaskAggregationService
{
    /** Task counts toward Scrum quota (subtask or leaf parent without children). */
    public static function countsTowardQuota(Task $task): bool
    {
        if ($task->parent_task_id) {
            return true;
        }

        return !Task::where('parent_task_id', $task->id)->exists();
    }

    public static function syncParentEstimatedHours(int $parentId): void
    {
        $parent = Task::find($parentId);
        if (!$parent || $parent->parent_task_id) {
            return;
        }

        $childCount = Task::where('parent_task_id', $parentId)->count();
        if ($childCount === 0) {
            return;
        }

        $sum = (float) Task::query()
            ->where('parent_task_id', $parentId)
            ->where('is_billable', true)
            ->sum('estimated_hours');

        $hasBillableChild = Task::query()
            ->where('parent_task_id', $parentId)
            ->where('is_billable', true)
            ->exists();

        $parent->update([
            'estimated_hours' => $sum,
            'rush_hour' => false,
            'is_billable' => $hasBillableChild,
        ]);
    }

    public static function assertValidParent(?int $parentTaskId, int $projectId): void
    {
        if (!$parentTaskId) {
            return;
        }

        $parent = Task::find($parentTaskId);
        if (!$parent || (int) $parent->project_id !== $projectId) {
            abort(422, 'Invalid parent task for this project.');
        }
        if ($parent->parent_task_id) {
            abort(422, 'Subtasks can only be added to a top-level task.');
        }
    }

    public static function stripParentFieldsWhenHasSubtasks(array &$validated, Task $task): void
    {
        if (!Task::where('parent_task_id', $task->id)->exists()) {
            return;
        }

        $validated['estimated_hours'] = (float) Task::query()
            ->where('parent_task_id', $task->id)
            ->where('is_billable', true)
            ->sum('estimated_hours');
        $validated['rush_hour'] = false;
        $validated['is_billable'] = Task::query()
            ->where('parent_task_id', $task->id)
            ->where('is_billable', true)
            ->exists();
    }

    public static function validateScrumQuota(Task $task, float $additionalHours, ?int $excludeTaskId = null): ?array
    {
        if (!$task->is_billable || $additionalHours <= 0) {
            return null;
        }

        $project = Project::find($task->project_id);
        if (!$project || $project->methodology !== 'Agile Scrum') {
            return null;
        }

        $roleId = $task->project_role_id;

        if ($roleId) {
            $quotaRow = DB::table('project_role_quotas')
                ->where('project_id', $project->id)
                ->where('project_role_id', $roleId)
                ->first();

            if (!$quotaRow) {
                return ['error' => 'No quota defined for this role in this project.'];
            }

            $query = Task::query()
                ->where('project_id', $project->id)
                ->where('project_role_id', $roleId)
                ->where('is_billable', true)
                ->where(function ($q) {
                    $q->whereNotNull('parent_task_id')
                        ->orWhereDoesntHave('subtasks');
                });

            if ($excludeTaskId) {
                $query->where('id', '!=', $excludeTaskId);
            }

            $currentUsed = (float) $query->sum('estimated_hours');

            if (($currentUsed + $additionalHours) > $quotaRow->quota_hours) {
                return [
                    'error' => 'Role quota exceeded. Remaining for this role: ' . ($quotaRow->quota_hours - $currentUsed) . ' hours.',
                    'remaining' => $quotaRow->quota_hours - $currentUsed,
                ];
            }

            return null;
        }

        $mappedRoleQuota = (float) DB::table('project_role_quotas')
            ->where('project_id', $project->id)
            ->sum('quota_hours');

        $generalQuota = max(0, (float) ($project->total_manhours ?? 0) - $mappedRoleQuota);

        $query = Task::query()
            ->where('project_id', $project->id)
            ->whereNull('project_role_id')
            ->where('is_billable', true)
            ->where(function ($q) {
                $q->whereNotNull('parent_task_id')
                    ->orWhereDoesntHave('subtasks');
            });

        if ($excludeTaskId) {
            $query->where('id', '!=', $excludeTaskId);
        }

        $currentGeneralUsed = (float) $query->sum('estimated_hours');

        if ($project->total_manhours !== null && ($currentGeneralUsed + $additionalHours) > $generalQuota) {
            return [
                'error' => 'General quota exceeded. Remaining: ' . ($generalQuota - $currentGeneralUsed) . ' hours.',
                'remaining' => $generalQuota - $currentGeneralUsed,
            ];
        }

        return null;
    }
}
