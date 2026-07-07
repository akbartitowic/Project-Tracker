<?php

namespace App\Support;

use App\Models\User;

class UserAccess
{
    public static function roleName(?User $user): string
    {
        if (!$user) {
            return '';
        }

        // `getRelationValue` resolves the `role()` relation directly, bypassing
        // the `role` string column that shares its name and would otherwise
        // shadow it via the magic `$user->role` property accessor.
        $role = $user->getRelationValue('role');

        return strtolower(trim((string) ($role->name ?? $user->getRawOriginal('role') ?? '')));
    }

    public static function isFreelance(?User $user): bool
    {
        return self::roleName($user) === 'freelance';
    }

    public static function canViewManhours(?User $user): bool
    {
        return !self::isFreelance($user);
    }

    public static function isPrivileged(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->is_superuser) {
            return true;
        }

        return self::roleName($user) === 'admin';
    }

    /**
     * @param  object|array<string, mixed>  $task
     * @return object|array<string, mixed>
     */
    public static function stripTaskManhourFields(object|array $task): object|array
    {
        $keys = ['estimated_hours', 'rush_hour'];

        if (is_array($task)) {
            foreach ($keys as $key) {
                unset($task[$key]);
            }

            return $task;
        }

        foreach ($keys as $key) {
            unset($task->{$key});
        }

        return $task;
    }

    /**
     * @param  object|array<string, mixed>  $project
     * @return object|array<string, mixed>
     */
    public static function stripProjectManhourFields(object|array $project): object|array
    {
        $keys = [
            'total_manhours',
            'allocated_hours',
            'usage_percentage',
            'remaining_manhours',
            'hourly_rate',
            'total_cost',
        ];

        if (is_array($project)) {
            foreach ($keys as $key) {
                unset($project[$key]);
            }

            return $project;
        }

        foreach ($keys as $key) {
            unset($project->{$key});
        }

        return $project;
    }
}
