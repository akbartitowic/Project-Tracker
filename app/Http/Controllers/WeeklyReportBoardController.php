<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WeeklyReportBoard;
use App\Support\WeeklyReportAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;

class WeeklyReportBoardController extends Controller
{
    use LogActivity;

    private function serialize(WeeklyReportBoard $board): array
    {
        $board->loadMissing(['members:id,name,email', 'creator:id,name']);

        return [
            'id' => $board->id,
            'name' => $board->name,
            'description' => $board->description,
            'created_by' => $board->created_by,
            'creator_name' => $board->creator?->name,
            'members' => $board->members->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
            ])->values(),
            'periods_count' => $board->periods()->count(),
            'latest_period' => $board->periods()->first(['id', 'week_start', 'week_end']),
            'created_at' => $board->created_at,
        ];
    }

    /**
     * Searchable internal-user directory for the board-member / item-assignee
     * pickers. Gated by weekly_report.create (same bar as creating a board or
     * item), not teams_users.read — module-scoped, doesn't need user-mgmt access.
     */
    public function users(Request $request)
    {
        $users = User::where('user_type', '!=', 'client')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json(['data' => $users]);
    }

    /** Lightweight project picker for the item "Project" field — informational only, not a security boundary. */
    public function projects(Request $request)
    {
        return response()->json([
            'data' => \App\Models\Project::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $ids = WeeklyReportAccess::memberBoardIds($user);

        $query = WeeklyReportBoard::query()->orderByDesc('id');
        if ($ids !== null) {
            if ($ids === []) {
                return response()->json(['data' => []]);
            }
            $query->whereIn('id', $ids);
        }

        return response()->json([
            'data' => $query->get()->map(fn ($board) => $this->serialize($board)),
        ]);
    }

    /** @return array<int> */
    private function internalUserIds(array $ids): array
    {
        return User::whereIn('id', $ids)->where('user_type', '!=', 'client')->pluck('id')->all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'integer|exists:users,id',
        ]);

        $user = $request->user();
        $board = WeeklyReportBoard::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'created_by' => $user->id,
        ]);

        $memberIds = $this->internalUserIds($validated['member_ids'] ?? []);
        $memberIds[] = $user->id;
        $board->members()->sync(array_unique($memberIds));

        $this->log('Project', 'Created Weekly Report Board', "Board '{$board->name}' created.");

        return response()->json(['data' => $this->serialize($board)], 201);
    }

    public function show(Request $request, $id)
    {
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $id);
        $board = WeeklyReportBoard::findOrFail($id);

        return response()->json(['data' => $this->serialize($board)]);
    }

    public function update(Request $request, $id)
    {
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $id);
        $board = WeeklyReportBoard::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'integer|exists:users,id',
        ]);

        $board->fill([
            'name' => $validated['name'] ?? $board->name,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $board->description,
        ])->save();

        if (array_key_exists('member_ids', $validated)) {
            $memberIds = $this->internalUserIds($validated['member_ids'] ?? []);
            $memberIds[] = $board->created_by;
            $board->members()->sync(array_unique(array_filter($memberIds)));
        }

        $this->log('Project', 'Updated Weekly Report Board', "Board '{$board->name}' updated.");

        return response()->json(['data' => $this->serialize($board)]);
    }

    public function destroy(Request $request, $id)
    {
        WeeklyReportAccess::assertCanAccessBoard($request->user(), (int) $id);
        $board = WeeklyReportBoard::findOrFail($id);
        $name = $board->name;
        $board->delete();

        $this->log('Project', 'Deleted Weekly Report Board', "Board '{$name}' deleted.");

        return response()->json(['message' => 'Board deleted.']);
    }
}
