<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use App\Support\WeekdaySchedule;
use Carbon\Carbon;

class TeamLoadService
{
    /**
     * @return array{
     *   range_start: string,
     *   range_end: string,
     *   timeline_days: list<string>,
     *   users: list<array{
     *     id: int,
     *     name: string,
     *     peak_mh: float,
     *     daily_mh: array<string, float>,
     *     daily_details: array<string, list<array{
     *       task_id: int,
     *       title: string,
     *       feature_title: string|null,
     *       project_id: int,
     *       project_name: string,
     *       mh_per_day: float,
     *       is_subtask: bool
     *     }>>
     *   }>
     * }
     */
    public function build(): array
    {
        $tasks = Task::query()
            ->whereNotNull('assignee_id')
            ->whereNotNull('start_date')
            ->whereNotNull('due_date')
            ->where('estimated_hours', '>', 0)
            ->with(['project:id,name'])
            ->get(['id', 'title', 'feature_title', 'assignee_id', 'estimated_hours', 'start_date', 'due_date', 'project_id', 'parent_task_id']);

        /** @var array<int, array<string, float>> $dailyByUser */
        $dailyByUser = [];
        /** @var array<int, array<string, list<array<string, mixed>>> $detailsByUser */
        $detailsByUser = [];
        $allDates = [];

        foreach ($tasks as $task) {
            $this->distributeTask($task, $dailyByUser, $detailsByUser, $allDates);
        }

        sort($allDates);
        $range = $this->resolveRange($allDates);
        $timelineDays = WeekdaySchedule::allDaysBetween(
            Carbon::parse($range['range_start']),
            Carbon::parse($range['range_end']),
        );

        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function (User $user) use ($dailyByUser, $detailsByUser, $timelineDays) {
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
                    if ($mh > $peak && ! WeekdaySchedule::isWeekendDate($date)) {
                        $peak = $mh;
                    }
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'peak_mh' => round($peak, 2),
                    'daily_mh' => $daily,
                    'daily_details' => $details,
                ];
            })
            ->values()
            ->all();

        return [
            'range_start' => $range['range_start'],
            'range_end' => $range['range_end'],
            'timeline_days' => $timelineDays,
            'users' => $users,
        ];
    }

    /**
     * @param  array<int, array<string, float>>  $dailyByUser
     * @param  array<int, array<string, list<array<string, mixed>>>  $detailsByUser
     * @param  list<string>  $allDates
     */
    private function distributeTask(Task $task, array &$dailyByUser, array &$detailsByUser, array &$allDates): void
    {
        $start = Carbon::parse($task->start_date)->startOfDay();
        $end = Carbon::parse($task->due_date)->startOfDay();
        $weekdayDates = WeekdaySchedule::weekdaysBetween($start, $end);

        if ($weekdayDates === []) {
            return;
        }

        $hours = (float) $task->estimated_hours;
        $perDay = $hours / count($weekdayDates);
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

        foreach ($weekdayDates as $date) {
            $dailyByUser[$assigneeId][$date] = ($dailyByUser[$assigneeId][$date] ?? 0) + $perDay;
            $detailsByUser[$assigneeId][$date][] = $item;
            $allDates[] = $date;
        }
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
