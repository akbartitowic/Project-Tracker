<?php

namespace App\Support;

/**
 * Billable tasks consume Scrum/WF manhour quota; non-billable tasks do not.
 * Non-billable tasks may still store estimated_hours for Team Load (optional).
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

        // Portable across MySQL (booleans are tinyint) and Postgres (native boolean) —
        // avoid COALESCE(bool_col, 1) = 1, which Postgres rejects as a bool/int type mismatch.
        return "COALESCE(SUM(CASE WHEN ({$taskAlias}.is_billable IS NULL OR {$taskAlias}.is_billable = true) AND {$eligible} THEN {$taskAlias}.estimated_hours ELSE 0 END), 0)";
    }

    public static function applyNonBillable(array &$data): void
    {
        if (!($data['is_billable'] ?? true)) {
            $data['rush_hour'] = false;
        }
    }
}
