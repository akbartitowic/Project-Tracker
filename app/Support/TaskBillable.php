<?php

namespace App\Support;

/**
 * Billable tasks consume Scrum/WF manhour quota; non-billable tasks do not.
 */
final class TaskBillable
{
    /** Subtasks or leaf parents only (parents with children are excluded from quota). */
    public static function quotaEligibleCondition(string $taskAlias = 't'): string
    {
        return "({$taskAlias}.parent_task_id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM tasks _st WHERE _st.parent_task_id = {$taskAlias}.id))";
    }

    /** SQL expression: sum estimated_hours for billable quota-eligible tasks only. */
    public static function sumBillableEstimatedHours(string $taskAlias = 't'): string
    {
        $eligible = self::quotaEligibleCondition($taskAlias);

        return "COALESCE(SUM(CASE WHEN COALESCE({$taskAlias}.is_billable, 1) = 1 AND {$eligible} THEN {$taskAlias}.estimated_hours ELSE 0 END), 0)";
    }

    public static function applyNonBillable(array &$data): void
    {
        if (!($data['is_billable'] ?? true)) {
            $data['estimated_hours'] = 0;
            $data['rush_hour'] = false;
        }
    }
}
