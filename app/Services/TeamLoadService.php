<?php

namespace App\Services;

use App\Models\ProjectRole;
use App\Models\Task;
use App\Models\TeamLoadExcludedDate;
use App\Models\User;
use App\Support\WeekdaySchedule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TeamLoadService
{
    /**
     * @return array{
     *   range_start: string,
     *   range_end: string,
     *   timeline_days: list<string>,
     *   excluded_dates: list<array{id: int, date: string, label: string|null}>,
     *   users: list<array{
     *     id: int,
     *     name: string,
     *     peak_mh: float,
     *     daily_mh: array<string, float>,
     *     daily_details: array<string, list<array<string, mixed>>>
     *   }>
     * }
     */
    public function build(): array
    {
        $excludedDates = $this->excludedDateStrings();

        $tasks = Task::query()
            ->whereNotNull('assignee_id')
            ->whereNotNull('start_date')
            ->whereNotNull('due_date')
            ->where('estimated_hours', '>', 0)
            ->where(function ($q) {
                // Always include subtasks that have their own dates
                $q->whereNotNull('parent_task_id')
                  // Include parent tasks only when none of their subtasks have dates yet
                  ->orWhere(function ($q2) {
                      $q2->whereNull('parent_task_id')
                         ->whereDoesntHave('subtasks', fn ($sub) =>
                             $sub->whereNotNull('start_date')->whereNotNull('due_date')
                         );
                  });
            })
            ->with(['project:id,name'])
            ->get(['id', 'title', 'feature_title', 'assignee_id', 'estimated_hours', 'start_date', 'due_date', 'project_id', 'parent_task_id']);

        /** @var array<int, array<string, float>> $dailyByUser */
        $dailyByUser = [];
        /** @var array<int, array<string, list<array<string, mixed>>> $detailsByUser */
        $detailsByUser = [];
        $allDates = [];

        foreach ($tasks as $task) {
            $this->distributeTask($task, $dailyByUser, $detailsByUser, $allDates, $excludedDates);
        }

        sort($allDates);
        $range = $this->resolveRange($allDates);
        $timelineDays = WeekdaySchedule::allDaysBetween(
            Carbon::parse($range['range_start']),
            Carbon::parse($range['range_end']),
        );

        $rolesByUser = DB::table('project_members')
            ->join('project_roles', 'project_members.project_role_id', '=', 'project_roles.id')
            ->select('project_members.user_id', 'project_roles.id as role_id', 'project_roles.name as role_name')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->map(fn ($r) => ['id' => $r->role_id, 'name' => $r->role_name])->unique('id')->values()->all());

        $projectIdsByUser = DB::table('project_members')
            ->select('user_id', 'project_id')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('project_id')->unique()->values()->all());

        $allRoles = ProjectRole::query()->orderBy('name')->get(['id', 'name'])->toArray();

        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function (User $user) use ($dailyByUser, $detailsByUser, $timelineDays, $excludedDates, $rolesByUser, $projectIdsByUser) {
                $raw = $dailyByUser[$user->id] ?? [];
                $rawDetails = $detailsByUser[$user->id] ?? [];
                $daily = [];
                $details = [];
                $peak = 0.0;

                foreach ($timelineDays as $date) {
                    $mh = round((float) ($raw[$date] ?? 0), 2);
                    if ($mh > 0) {
                        $daily[$date] = $mh;
                        $details[$date] = $rawDetails[$date] ?? [];
                    }
                    if ($mh > $peak && $this->countsForPeak($date, $excludedDates)) {
                        $peak = $mh;
                    }
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'peak_mh' => round($peak, 2),
                    'daily_mh' => $daily,
                    'daily_details' => $details,
                    'roles' => $rolesByUser->get($user->id, []),
                    'project_ids' => $projectIdsByUser->get($user->id, []),
                ];
            })
            ->values()
            ->all();

        return [
            'range_start' => $range['range_start'],
            'range_end' => $range['range_end'],
            'timeline_days' => $timelineDays,
            'excluded_dates' => $this->excludedDatesPayload(),
            'users' => $users,
            'roles' => $allRoles,
        ];
    }

    /** @return list<array{id: int, date: string, label: string|null}> */
    public function excludedDatesPayload(): array
    {
        return TeamLoadExcludedDate::query()
            ->orderBy('excluded_date')
            ->get()
            ->map(fn (TeamLoadExcludedDate $row) => [
                'id' => $row->id,
                'date' => $row->excluded_date->toDateString(),
                'label' => $row->label,
            ])
            ->values()
            ->all();
    }

    /** @return list<string> */
    public function excludedDateStrings(): array
    {
        return TeamLoadExcludedDate::query()
            ->orderBy('excluded_date')
            ->pluck('excluded_date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->all();
    }

    /**
     * @param  array<int, array<string, float>>  $dailyByUser
     * @param  array<int, array<string, list<array<string, mixed>>>  $detailsByUser
     * @param  list<string>  $allDates
     * @param  list<string>  $excludedDates
     */
    private function distributeTask(
        Task $task,
        array &$dailyByUser,
        array &$detailsByUser,
        array &$allDates,
        array $excludedDates,
    ): void {
        $start = Carbon::parse($task->start_date)->startOfDay();
        $end = Carbon::parse($task->due_date)->startOfDay();
        $workingDates = WeekdaySchedule::workingDaysBetween($start, $end, $excludedDates);

        if ($workingDates === []) {
            return;
        }

        $hours = (float) $task->estimated_hours;
        $perDay = $hours / count($workingDates);
        $assigneeId = (int) $task->assignee_id;

        if (! isset($dailyByUser[$assigneeId])) {
            $dailyByUser[$assigneeId] = [];
        }
        if (! isset($detailsByUser[$assigneeId])) {
            $detailsByUser[$assigneeId] = [];
        }

        $item = [
            'task_id' => $task->id,
            'title' => $task->title,
            'feature_title' => $task->feature_title,
            'project_id' => $task->project_id,
            'project_name' => $task->project?->name ?? 'Project',
            'mh_per_day' => round($perDay, 2),
            'is_subtask' => $task->parent_task_id !== null,
        ];

        foreach ($workingDates as $date) {
            $dailyByUser[$assigneeId][$date] = ($dailyByUser[$assigneeId][$date] ?? 0) + $perDay;
            $detailsByUser[$assigneeId][$date][] = $item;
            $allDates[] = $date;
        }
    }

    /** @param  list<string>  $excludedDates */
    private function countsForPeak(string $date, array $excludedDates): bool
    {
        return ! WeekdaySchedule::isWeekendDate($date)
            && ! WeekdaySchedule::isExcludedDate($date, $excludedDates);
    }

    /**
     * @param  list<string>  $allDates
     * @return array{range_start: string, range_end: string}
     */
    private function resolveRange(array $allDates): array
    {
        $today = Carbon::today();
        $defaultStart = $today->copy()->startOfMonth()->subWeeks(2);
        $defaultEnd = $today->copy()->endOfMonth()->addWeeks(6);

        if ($allDates === []) {
            return [
                'range_start' => $defaultStart->toDateString(),
                'range_end' => $defaultEnd->toDateString(),
            ];
        }

        $min = Carbon::parse(min($allDates))->startOfDay()->subWeeks(1);
        $max = Carbon::parse(max($allDates))->startOfDay()->addWeeks(2);

        $rangeStart = $min->lt($defaultStart) ? $min : $defaultStart;
        $rangeEnd = $max->gt($defaultEnd) ? $max : $defaultEnd;

        if ($today->lt($rangeStart)) {
            $rangeStart = $today->copy()->subWeek();
        }
        if ($today->gt($rangeEnd)) {
            $rangeEnd = $today->copy()->addWeeks(2);
        }

        return [
            'range_start' => $rangeStart->toDateString(),
            'range_end' => $rangeEnd->toDateString(),
        ];
    }
}
