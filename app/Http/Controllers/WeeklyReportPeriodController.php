<?php

namespace App\Http\Controllers;

use App\Models\WeeklyReportItem;
use App\Models\WeeklyReportPeriod;
use App\Support\WeeklyReportAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WeeklyReportPeriodController extends Controller
{
    use LogActivity;

    private function serializePeriod(WeeklyReportPeriod $period): array
    {
        return [
            'id' => $period->id,
            'board_id' => $period->board_id,
            'week_start' => optional($period->week_start)->format('Y-m-d'),
            'week_end' => optional($period->week_end)->format('Y-m-d'),
            'duplicated_from_id' => $period->duplicated_from_id,
            'created_by' => $period->created_by,
            'items_count' => $period->items()->count(),
            'done_count' => $period->items()->where('is_done', true)->count(),
            'created_at' => $period->created_at,
        ];
    }

    private function serializeItem(WeeklyReportItem $item): array
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

    public function index(Request $request, $boardId)
    {
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $boardId);

        $periods = WeeklyReportPeriod::where('board_id', $boardId)
            ->orderByDesc('week_start')
            ->get();

        return response()->json(['data' => $periods->map(fn ($p) => $this->serializePeriod($p))]);
    }

    public function store(Request $request, $boardId)
    {
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $boardId);

        $validated = $request->validate([
            'week_start' => 'required|date',
            'week_end' => 'required|date|after_or_equal:week_start',
        ]);

        $period = WeeklyReportPeriod::create([
            'board_id' => (int) $boardId,
            'week_start' => $validated['week_start'],
            'week_end' => $validated['week_end'],
            'created_by' => $request->user()->id,
        ]);

        $this->log('Project', 'Created Weekly Report Period', "Period {$period->week_start}–{$period->week_end} created for board ID {$boardId}.");

        return response()->json(['data' => $this->serializePeriod($period)], 201);
    }

    public function show(Request $request, $id)
    {
        $period = WeeklyReportPeriod::findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $period->board_id);

        return response()->json([
            'data' => array_merge(
                $this->serializePeriod($period),
                ['items' => $period->items->map(fn ($i) => $this->serializeItem($i))]
            ),
        ]);
    }

    public function update(Request $request, $id)
    {
        $period = WeeklyReportPeriod::findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $period->board_id);

        $validated = $request->validate([
            'week_start' => 'sometimes|required|date',
            'week_end' => 'sometimes|required|date',
        ]);

        $period->fill($validated)->save();

        return response()->json(['data' => $this->serializePeriod($period)]);
    }

    public function destroy(Request $request, $id)
    {
        $period = WeeklyReportPeriod::findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $period->board_id);
        $boardId = $period->board_id;
        $period->delete();

        $this->log('Project', 'Deleted Weekly Report Period', "Period ID {$id} deleted from board ID {$boardId}.");

        return response()->json(['message' => 'Period deleted.']);
    }

    /**
     * Clone a period into a new one for the next week. Not-done items are
     * always carried forward; done items are only carried when `carry_done`
     * is true — otherwise they're left behind (the whole point of a rollover).
     */
    public function duplicate(Request $request, $id)
    {
        $source = WeeklyReportPeriod::with('items.assignees')->findOrFail($id);
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $source->board_id);

        $validated = $request->validate([
            'week_start' => 'required|date',
            'week_end' => 'required|date|after_or_equal:week_start',
            'carry_done' => 'nullable|boolean',
        ]);
        $carryDone = (bool) ($validated['carry_done'] ?? false);

        $newPeriod = DB::transaction(function () use ($source, $validated, $carryDone, $request) {
            $newPeriod = WeeklyReportPeriod::create([
                'board_id' => $source->board_id,
                'week_start' => $validated['week_start'],
                'week_end' => $validated['week_end'],
                'duplicated_from_id' => $source->id,
                'created_by' => $request->user()->id,
            ]);

            foreach ($source->items as $item) {
                if ($item->is_done && !$carryDone) {
                    continue;
                }

                $clone = WeeklyReportItem::create([
                    'period_id' => $newPeriod->id,
                    'duplicated_from_id' => $item->id,
                    'project_id' => $item->project_id,
                    'reporter_id' => $item->reporter_id,
                    'description' => $item->description,
                    'next_action' => $item->next_action,
                    'issue_level' => $item->issue_level,
                    'due_date' => $item->due_date,
                    'is_done' => $item->is_done,
                    'sort_order' => $item->sort_order,
                ]);
                $clone->assignees()->sync($item->assignees->pluck('id')->all());
            }

            return $newPeriod;
        });

        $this->log('Project', 'Duplicated Weekly Report Period', "Period ID {$source->id} duplicated into period ID {$newPeriod->id} (carry done: " . ($carryDone ? 'yes' : 'no') . ").");

        return response()->json([
            'data' => array_merge(
                $this->serializePeriod($newPeriod),
                ['items' => $newPeriod->items()->with(['project:id,name', 'reporter:id,name', 'assignees:id,name,email'])->get()->map(fn ($i) => $this->serializeItem($i))]
            ),
        ], 201);
    }
}
