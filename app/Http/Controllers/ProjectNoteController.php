<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectNote;
use App\Support\ProjectAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProjectNoteController extends Controller
{
    use LogActivity;

    private function resolveProjectForUser(Request $request, int $projectId): Project
    {
        $project = Project::findOrFail($projectId);
        ProjectAccess::assertCanAccessProject($request->user(), (int) $project->id);

        return $project;
    }

    /** @return array<string, mixed> */
    private function serializeNote(ProjectNote $note): array
    {
        $note->loadMissing('user:id,name');

        return [
            'id' => $note->id,
            'project_id' => $note->project_id,
            'user_id' => $note->user_id,
            'category' => $note->category,
            'title' => $note->title,
            'body' => $note->body,
            'url' => $note->url,
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
            'user_name' => $note->user?->name,
        ];
    }

    private function validatePayload(Request $request, ?string $category = null): array
    {
        $category = $category ?? $request->input('category');

        $validated = $request->validate([
            'category' => ['required', Rule::in(ProjectNote::categories())],
            'title' => 'nullable|string|max:255',
            'body' => 'nullable|string|max:10000',
            'url' => 'nullable|url|max:2048',
        ]);

        $validated['title'] = isset($validated['title']) ? trim($validated['title']) : null;
        $validated['body'] = isset($validated['body']) ? trim($validated['body']) : null;
        $validated['url'] = isset($validated['url']) ? trim($validated['url']) : null;

        if ($validated['title'] === '') {
            $validated['title'] = null;
        }
        if ($validated['body'] === '') {
            $validated['body'] = null;
        }
        if ($validated['url'] === '') {
            $validated['url'] = null;
        }

        $cat = $validated['category'];

        if ($cat === ProjectNote::CATEGORY_WEEKLY) {
            if (!$validated['body']) {
                throw ValidationException::withMessages(['body' => 'Weekly note content is required.']);
            }
            $validated['url'] = null;
        } else {
            if (!$validated['title']) {
                throw ValidationException::withMessages(['title' => 'Link title is required.']);
            }
            if (!$validated['url']) {
                throw ValidationException::withMessages(['url' => 'URL is required.']);
            }
        }

        return $validated;
    }

    public function index(Request $request, $projectId)
    {
        $project = $this->resolveProjectForUser($request, (int) $projectId);

        $notes = ProjectNote::query()
            ->join('users', 'users.id', '=', 'project_notes.user_id')
            ->where('project_notes.project_id', $project->id)
            ->orderByDesc('project_notes.created_at')
            ->orderByDesc('project_notes.id')
            ->get([
                'project_notes.id',
                'project_notes.project_id',
                'project_notes.user_id',
                'project_notes.category',
                'project_notes.title',
                'project_notes.body',
                'project_notes.url',
                'project_notes.created_at',
                'project_notes.updated_at',
                'users.name as user_name',
            ]);

        return response()->json(['data' => $notes]);
    }

    public function store(Request $request, $projectId)
    {
        $user = $request->user();
        $project = $this->resolveProjectForUser($request, (int) $projectId);
        $validated = $this->validatePayload($request);

        $note = ProjectNote::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            ...$validated,
        ]);

        $this->log('Project', 'Project Note Added', "Note on project '{$project->name}' (#{$project->id})");

        return response()->json(['data' => $this->serializeNote($note)], 201);
    }

    public function update(Request $request, $projectId, $noteId)
    {
        $user = $request->user();
        $project = $this->resolveProjectForUser($request, (int) $projectId);

        $note = ProjectNote::where('project_id', $project->id)->where('id', $noteId)->firstOrFail();

        $canEdit = (int) $note->user_id === (int) $user->id
            || ProjectAccess::isPrivileged($user)
            || $user->hasPermission('project_board.update');

        if (!$canEdit) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $this->validatePayload($request, $note->category);
        $note->update($validated);

        return response()->json(['data' => $this->serializeNote($note->fresh())]);
    }

    public function destroy(Request $request, $projectId, $noteId)
    {
        $user = $request->user();
        $project = $this->resolveProjectForUser($request, (int) $projectId);

        $note = ProjectNote::where('project_id', $project->id)->where('id', $noteId)->firstOrFail();

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
