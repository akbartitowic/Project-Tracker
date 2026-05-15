<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class ProjectAccess
{
    public static function isPrivileged(?User $user): bool
    {
        return UserAccess::isPrivileged($user);
    }

    /**
     * Global finance/reports metrics (all projects). Otherwise scope to member projects only.
     */
    public static function canViewGlobalFinanceMetrics(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (self::isPrivileged($user)) {
            return true;
        }

        return $user->hasPermission('finance_monitoring.read')
            || $user->hasPermission('finance_report.read')
            || $user->hasPermission('realization_report.read');
    }

    /**
     * Project IDs for scoped metrics, or null when all projects are allowed.
     *
     * @return null|array<int>
     */
    public static function metricsProjectIds(?User $user): ?array
    {
        if (self::canViewGlobalFinanceMetrics($user)) {
            return null;
        }

        return self::memberProjectIds($user);
    }

    /**
     * Operational project membership only (tasks, reports). Excludes finance-wide access.
     *
     * @return null|array<int>
     */
    public static function memberProjectIds(?User $user): ?array
    {
        if (!$user) {
            return [];
        }

        if (self::isPrivileged($user)) {
            return null;
        }

        return DB::table('project_members')
            ->where('user_id', $user->id)
            ->pluck('project_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public static function applyMemberProjectScope($query, string $column, ?User $user): void
    {
        $ids = self::memberProjectIds($user);
        if ($ids !== null) {
            if ($ids === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn($column, $ids);
            }
        }
    }

    public static function canAccessProject(?User $user, int $projectId): bool
    {
        if (!$user || $projectId <= 0) {
            return false;
        }

        if (self::isPrivileged($user)) {
            return true;
        }

        return DB::table('project_members')
            ->where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->exists();
    }

    /**
     * Finance monitoring may operate on any project when the user has finance read permission.
     */
    public static function canAccessProjectFinance(?User $user, int $projectId): bool
    {
        if (!$user || $projectId <= 0) {
            return false;
        }

        if (self::canAccessProject($user, $projectId)) {
            return true;
        }

        return $user->hasPermission('finance_monitoring.read');
    }

    /**
     * @return null All projects allowed (no filter).
     * @return array<int> Restrict to these project IDs.
     */
    public static function allowedProjectIds(?User $user): ?array
    {
        if (!$user) {
            return [];
        }

        if (self::isPrivileged($user) || $user->hasPermission('finance_monitoring.read')) {
            return null;
        }

        return DB::table('project_members')
            ->where('user_id', $user->id)
            ->pluck('project_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public static function assertCanAccessProject(?User $user, int $projectId, int $status = 403): void
    {
        if (!self::canAccessProject($user, $projectId)) {
            throw new HttpResponseException(
                response()->json(['error' => 'Forbidden'], $status)
            );
        }
    }

    public static function assertCanAccessProjectFinance(?User $user, int $projectId, int $status = 403): void
    {
        if (!self::canAccessProjectFinance($user, $projectId)) {
            throw new HttpResponseException(
                response()->json(['error' => 'Forbidden'], $status)
            );
        }
    }

    public static function applyProjectScope($query, string $column, ?User $user): void
    {
        $ids = self::allowedProjectIds($user);
        if ($ids !== null) {
            $query->whereIn($column, $ids);
        }
    }
}
