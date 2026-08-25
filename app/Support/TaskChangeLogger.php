<?php

namespace App\Support;

use App\Models\ProjectRole;
use App\Models\Task;
use App\Models\TaskFieldChange;
use App\Models\User;
use Carbon\Carbon;

/**
 * Structured, field-level change log for the task detail card's "Change History" panel —
 * separate from the free-text `activity_logs` table (App\Traits\LogActivity), which stays
 * untouched and keeps powering the admin-wide System Logs page.
 */
class TaskChangeLogger
{
    /** Fields tracked from the main task edit form. Order here is the display/insert order. */
    public const TRACKABLE_FIELDS = [
        'title', 'feature_title', 'description', 'status', 'priority', 'is_billable',
        'assignee_id', 'estimated_hours', 'project_role_id', 'category', 'due_date',
        'start_date', 'rush_hour',
    ];

    private const FIELD_LABELS = [
        'title' => 'Title',
        'feature_title' => 'Feature',
        'description' => 'Description',
        'status' => 'Status',
        'priority' => 'Priority',
        'is_billable' => 'Billable',
        'assignee_id' => 'Assignee',
        'estimated_hours' => 'Estimated Hours',
        'project_role_id' => 'Role',
        'category' => 'Category',
        'due_date' => 'Due Date',
        'start_date' => 'Start Date',
        'rush_hour' => 'Rush Hour',
        'assignees' => 'Assignee',
    ];

    /**
     * @param  array<string, mixed>  $before  $task->only(TRACKABLE_FIELDS) captured before the mutation
     * @param  array<string, mixed>  $after   $task->fresh()->only(TRACKABLE_FIELDS) captured after
     */
    public static function logFieldChanges(Task $task, array $before, array $after, User $user): void
    {
        $rows = [];
        $now = Carbon::now();

        foreach (self::TRACKABLE_FIELDS as $field) {
            if (!array_key_exists($field, $before) || !array_key_exists($field, $after)) {
                continue;
            }

            $oldRaw = $before[$field];
            $newRaw = $after[$field];

            if (self::normalizeForCompare($oldRaw) === self::normalizeForCompare($newRaw)) {
                continue;
            }

            $rows[] = [
                'task_id' => $task->id,
                'user_id' => $user->id,
                'field' => self::FIELD_LABELS[$field] ?? $field,
                'old_value' => self::formatValue($field, $oldRaw),
                'new_value' => self::formatValue($field, $newRaw),
                'created_at' => $now,
            ];
        }

        if ($rows !== []) {
            TaskFieldChange::insert($rows);
        }
    }

    /**
     * @param  array<int, array{id:int,name:string}>  $oldAssignees
     * @param  array<int, array{id:int,name:string}>  $newAssignees
     */
    public static function logAssigneeChange(Task $task, array $oldAssignees, array $newAssignees, User $user): void
    {
        $oldIds = collect($oldAssignees)->pluck('id')->sort()->values();
        $newIds = collect($newAssignees)->pluck('id')->sort()->values();

        if ($oldIds->all() === $newIds->all()) {
            return;
        }

        $oldLabel = collect($oldAssignees)->pluck('name')->filter()->implode(', ');
        $newLabel = collect($newAssignees)->pluck('name')->filter()->implode(', ');

        TaskFieldChange::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'field' => self::FIELD_LABELS['assignees'],
            'old_value' => $oldLabel !== '' ? $oldLabel : null,
            'new_value' => $newLabel !== '' ? $newLabel : null,
        ]);
    }

    private static function normalizeForCompare(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return (string) $value;
    }

    private static function formatValue(string $field, mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($field === 'description') {
            // Rich text, can be long HTML — don't dump content into the log. `formatValue` is
            // only reached here when the value actually changed, so a fixed marker is enough;
            // the frontend renders "changed Description" for this field without a from/to diff.
            return 'updated';
        }

        if ($field === 'is_billable' || $field === 'rush_hour') {
            return $value ? 'Yes' : 'No';
        }

        if ($field === 'due_date' || $field === 'start_date') {
            $date = $value instanceof \DateTimeInterface ? $value : Carbon::parse((string) $value);

            return $date->format('d M Y');
        }

        if ($field === 'estimated_hours') {
            return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.') . 'h';
        }

        if ($field === 'assignee_id') {
            return User::find($value)?->name ?? "User #{$value}";
        }

        if ($field === 'project_role_id') {
            return ProjectRole::find($value)?->name ?? "Role #{$value}";
        }

        return (string) $value;
    }
}
