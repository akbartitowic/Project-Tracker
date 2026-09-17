<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WeeklyReportItem;
use App\Models\WeeklyReportPeriod;
use App\Notifications\WeeklyReportItemAssignedNotification;
use App\Support\WeeklyReportAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class WeeklyReportItemController extends Controller
{
    use LogActivity;

    private function serialize(WeeklyReportItem $item): array
    {
        $item->loadMissing(['project:id,name', 'reporter:id,name', 'assignees:id,name,email']);

        return [
            'id' => $item->id,
            'period_id' => $item->period_id,
            'description' => $item->description,
            'next_action' => $item->next_action,
            'issue_level' => $item->issue_level,
            'due_date' => optional($item->due_date)->format('Y-m-d'),
            'is_done' => (bool) $item->is_done,
            'sort_order' => $item->sort_order,
            'project' => $item->project ? ['id' => $item->project->id, 'name' => $item->project->name] : null,
            'reporter' => $item->reporter ? ['id' => $item->reporter->id, 'name' => $item->reporter->name] : null,
            'assignees' => $item->assignees->map(fn ($a) => ['id' => $a->id, 'name' => $a->name, 'email' => $a->email])->values(),
            'created_at' => $item->created_at,
        ];
    }

    /** Assigning someone to an item also grants them board access — mirrors ensureAssigneeIsProjectMember(). */
    private function ensureBoardMembers(int $boardId, array $userIds): void
    {
        if ($userIds === []) {
            return;
        }

        $existing = DB::table('weekly_report_board_members')
            ->where('board_id', $boardId)
            ->whereIn('user_id', $userIds)
            ->pluck('user_id')
            ->all();

        $missing = array_diff($userIds, $existing);
        if ($missing === []) {
            return;
        }

        $now = now();
        DB::table('weekly_report_board_members')->insert(array_map(fn ($userId) => [
            'board_id' => $boardId,
            'user_id' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ], $missing));
    }

    private function notifyAssignees(WeeklyReportItem $item, array $userIds): void
    {
        if ($userIds === []) {
            return;
        }

        $users = User::whereIn('id', $userIds)->get();
        foreach ($users as $assignee) {
            try {
                $assignee->notify(new WeeklyReportItemAssignedNotification($item));
            } catch (Throwable $e) {
                \Log::warning("Weekly report assignment notification failed for user {$assignee->id}: {$e->getMessage()}");
            }
        }
    }

    public function store(Request $request, $periodId)
    {
        $period = WeeklyReportPeriod::findOrFail($periodId);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $period->board_id);

        $validated = $request->validate([
            'description' => 'required|string',
            'next_action' => 'nullable|string',
            'issue_level' => ['required', Rule::in(WeeklyReportItem::ISSUE_LEVELS)],
            'project_id' => 'nullable|integer|exists:projects,id',
            'due_date' => 'nullable|date',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'integer|exists:users,id',
        ]);

        $maxSort = (int) $period->items()->max('sort_order');
        $item = WeeklyReportItem::create([
            'period_id' => $period->id,
            'project_id' => $validated['project_id'] ?? null,
            'reporter_id' => $request->user()->id,
            'description' => $validated['description'],
            'next_action' => $validated['next_action'] ?? null,
            'issue_level' => $validated['issue_level'],
            'due_date' => $validated['due_date'] ?? null,
            'sort_order' => $maxSort + 1,
        ]);

        $assigneeIds = array_values(array_unique($validated['assignee_ids'] ?? []));
        if ($assigneeIds !== []) {
            $this->ensureBoardMembers((int) $period->board_id, $assigneeIds);
            $item->assignees()->sync($assigneeIds);
            $this->notifyAssignees($item, $assigneeIds);
        }

        $this->log('Project', 'Created Weekly Report Item', "Item created in period ID {$period->id}.");

        return response()->json(['data' => $this->serialize($item)], 201);
    }

    public function update(Request $request, $id)
    {
        $item = WeeklyReportItem::findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $item->period->board_id);

        $validated = $request->validate([
            'description' => 'sometimes|required|string',
            'next_action' => 'nullable|string',
            'issue_level' => ['sometimes', 'required', Rule::in(WeeklyReportItem::ISSUE_LEVELS)],
            'project_id' => 'nullable|integer|exists:projects,id',
            'due_date' => 'nullable|date',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'integer|exists:users,id',
        ]);

        $item->fill(array_intersect_key($validated, array_flip(['description', 'next_action', 'issue_level', 'project_id', 'due_date'])))->save();

        if (array_key_exists('assignee_ids', $validated)) {
            $newIds = array_values(array_unique($validated['assignee_ids'] ?? []));
            $previousIds = $item->assignees()->pluck('users.id')->all();
            $addedIds = array_diff($newIds, $previousIds);

            $this->ensureBoardMembers((int) $item->period->board_id, $newIds);
            $item->assignees()->sync($newIds);

            if ($addedIds !== []) {
                $this->notifyAssignees($item, array_values($addedIds));
            }
        }

        return response()->json(['data' => $this->serialize($item)]);
    }

    /**
     * All items that came from duplicating the same original item, across every
     * week — found by walking up to the root via duplicated_from_id, then back
     * down through every clone of every item in that lineage (BFS, since a
     * period can be duplicated more than once from the same source).
     *
     * @return list<int>
     */
    private function chainItemIds(WeeklyReportItem $item): array
    {
        $root = $item;
        while ($root->duplicated_from_id) {
            $parent = WeeklyReportItem::find($root->duplicated_from_id);
            if (!$parent || $parent->id === $root->id) {
                break;
            }
            $root = $parent;
        }

        $ids = [$root->id];
        $queue = [$root->id];
        while ($queue !== []) {
            $parentId = array_shift($queue);
            $childIds = WeeklyReportItem::where('duplicated_from_id', $parentId)->pluck('id')->all();
            foreach ($childIds as $childId) {
                if (!in_array($childId, $ids, true)) {
                    $ids[] = $childId;
                    $queue[] = $childId;
                }
            }
        }

        return $ids;
    }

    public function updateStatus(Request $request, $id)
    {
        $item = WeeklyReportItem::findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $item->period->board_id);

        $validated = $request->validate([
            'is_done' => 'required|boolean',
        ]);

        if ($validated['is_done']) {
            // Marking one week's copy Done also closes out every other week it
            // was carried to/from — they represent the same underlying item.
            WeeklyReportItem::whereIn('id', $this->chainItemIds($item))->update(['is_done' => true]);
            $item->refresh();
        } else {
            $item->update(['is_done' => false]);
        }

        return response()->json(['data' => $this->serialize($item)]);
    }

    public function destroy(Request $request, $id)
    {
        $item = WeeklyReportItem::findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $item->period->board_id);
        $item->delete();

        return response()->json(['message' => 'Item deleted.']);
    }
}
