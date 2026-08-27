<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskNote;
use App\Models\User;
use App\Notifications\TaskMentionNotification;
use App\Support\ProjectAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Throwable;

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
            ->with('mentionedUsers:id,name')
            ->get([
                'task_notes.id',
                'task_notes.task_id',
                'task_notes.user_id',
                'task_notes.body',
                'task_notes.created_at',
                'task_notes.updated_at',
                'users.name as user_name',
            ]);

        return response()->json([
            'data' => $notes->map(fn (TaskNote $note) => $this->formatNote($note)),
        ]);
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

        $mentioned = $this->resolveMentionedMembers($body, $task, $user->id);
        if ($mentioned->isNotEmpty()) {
            $note->mentionedUsers()->attach($mentioned->pluck('id'));
            $note->setRelation('mentionedUsers', $mentioned);
            $this->notifyMentionedUsers($task, $note, $user, $mentioned);
        } else {
            $note->setRelation('mentionedUsers', collect());
        }

        return response()->json([
            'data' => $this->formatNote($note),
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

    private function formatNote(TaskNote $note): array
    {
        return [
            'id' => $note->id,
            'task_id' => $note->task_id,
            'user_id' => $note->user_id,
            'body' => $note->body,
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
            'user_name' => $note->user_name ?? $note->user?->name,
            'mentions' => $note->mentionedUsers->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
            ])->values(),
        ];
    }

    /**
     * Match "@Full Name" tokens in the note body against the task's project members.
     * Longest names are matched first so a shorter name doesn't shadow a longer one
     * that starts with the same text (e.g. "Andi" vs "Andi Wijaya").
     */
    private function resolveMentionedMembers(string $body, Task $task, int $authorId): Collection
    {
        $members = User::query()
            ->join('project_members', 'project_members.user_id', '=', 'users.id')
            ->where('project_members.project_id', $task->project_id)
            ->select('users.id', 'users.name', 'users.email', 'users.notify_task_mention')
            ->get()
            ->unique('id');

        if ($members->isEmpty()) {
            return collect();
        }

        $sorted = $members->sortByDesc(fn (User $u) => mb_strlen($u->name))->values();
        $pattern = $sorted->map(fn (User $u) => preg_quote($u->name, '/'))->implode('|');

        if (!preg_match_all('/@(' . $pattern . ')(?![A-Za-z0-9])/u', $body, $matches)) {
            return collect();
        }

        $matchedNames = array_unique($matches[1]);

        return $sorted
            ->filter(fn (User $u) => in_array($u->name, $matchedNames, true) && (int) $u->id !== $authorId)
            ->unique('id')
            ->values();
    }

    private function notifyMentionedUsers(Task $task, TaskNote $note, User $author, Collection $mentionedUsers): void
    {
        foreach ($mentionedUsers as $mentioned) {
            try {
                $mentioned->notify(new TaskMentionNotification($task, $note, $author));
                $this->log(
                    'Project',
                    'Task Mention Notification Sent',
                    "Mention notification sent to '{$mentioned->email}' for note on task '{$task->title}' (#{$task->id})."
                );
            } catch (Throwable $e) {
                $this->log(
                    'Project',
                    'Task Mention Notification Failed',
                    "Failed sending mention notification to '{$mentioned->email}' for task '{$task->title}': {$e->getMessage()}"
                );
            }
        }
    }
}
