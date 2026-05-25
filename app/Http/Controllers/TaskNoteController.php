<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskNote;
use App\Support\ProjectAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;

class TaskNoteController extends Controller
{
    use LogActivity;

    private function resolveTaskForUser(Request $request, int $taskId): Task
    {
        $task = Task::findOrFail($taskId);
        ProjectAccess::assertCanAccessProject($request->user(), (int) $task->project_id);

        return $task;
    }

    public function index(Request $request, $taskId)
    {
        $task = $this->resolveTaskForUser($request, (int) $taskId);

        $notes = TaskNote::query()
            ->join('users', 'users.id', '=', 'task_notes.user_id')
            ->where('task_notes.task_id', $task->id)
            ->orderBy('task_notes.created_at')
            ->orderBy('task_notes.id')
            ->get([
                'task_notes.id',
                'task_notes.task_id',
                'task_notes.user_id',
                'task_notes.body',
                'task_notes.created_at',
                'task_notes.updated_at',
                'users.name as user_name',
            ]);

        return response()->json(['data' => $notes]);
    }

    public function store(Request $request, $taskId)
    {
        $user = $request->user();
        $task = $this->resolveTaskForUser($request, (int) $taskId);

        $validated = $request->validate([
            'body' => 'required|string|min:1|max:5000',
        ]);

        $body = trim($validated['body']);
        if ($body === '') {
            return response()->json(['error' => 'Note cannot be empty.'], 422);
        }

        $note = TaskNote::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => $body,
        ]);

        $note->load('user:id,name');

        $this->log(
            'Project',
            'Task Note Added',
            "Note on task '{$task->title}' (#{$task->id}) by {$user->name}"
        );

        return response()->json([
            'data' => [
                'id' => $note->id,
                'task_id' => $note->task_id,
                'user_id' => $note->user_id,
                'body' => $note->body,
                'created_at' => $note->created_at,
                'updated_at' => $note->updated_at,
                'user_name' => $note->user?->name ?? $user->name,
            ],
        ], 201);
    }

    public function destroy(Request $request, $taskId, $noteId)
    {
        $user = $request->user();
        $task = $this->resolveTaskForUser($request, (int) $taskId);

        $note = TaskNote::where('task_id', $task->id)->where('id', $noteId)->firstOrFail();

        $canDelete = (int) $note->user_id === (int) $user->id
            || ProjectAccess::isPrivileged($user)
            || $user->hasPermission('project_board.update');

        if (!$canDelete) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $note->delete();

        return response()->json(['message' => 'Note deleted']);
    }
}
