<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskFieldChange;
use App\Support\ProjectAccess;
use Illuminate\Http\Request;

class TaskHistoryController extends Controller
{
    private const PER_PAGE = 30;

    public function index(Request $request, $taskId)
    {
        $task = Task::findOrFail($taskId);
        ProjectAccess::assertCanAccessProject($request->user(), (int) $task->project_id);

        $page = max(1, (int) $request->query('page', 1));
        $perPage = self::PER_PAGE;

        $rows = TaskFieldChange::query()
            ->where('task_id', $task->id)
            ->with('changedBy:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->skip(($page - 1) * $perPage)
            ->take($perPage + 1)
            ->get();

        $hasMore = $rows->count() > $perPage;
        $rows = $rows->take($perPage);

        return response()->json([
            'data' => $rows->map(fn (TaskFieldChange $row) => [
                'id' => $row->id,
                'field' => $row->field,
                'old_value' => $row->old_value,
                'new_value' => $row->new_value,
                'user_name' => $row->changedBy?->name ?? 'Sistem',
                'created_at' => $row->created_at,
            ]),
            'has_more' => $hasMore,
        ]);
    }
}
