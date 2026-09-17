<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

/**
 * Access model for the Weekly Report module. Unlike most modules, holding the
 * `weekly_report.*` permission alone isn't enough to see a given board — a
 * board is only visible/assignable to its members (weekly_report_board_members),
 * same idea as `project_members` for Project Board. Privileged/superuser
 * accounts still bypass everything.
 */
class WeeklyReportAccess
{
    public static function isPrivileged(?User $user): bool
    {
        return UserAccess::isPrivileged($user);
    }

    /**
     * Board IDs the user is a member of, or null when they may see every board.
     *
     * @return null|array<int>
     */
    public static function memberBoardIds(?User $user): ?array
    {
        if (!$user) {
            return [];
        }

        if (self::isPrivileged($user)) {
            return null;
        }

        return DB::table('weekly_report_board_members')
            ->where('user_id', $user->id)
            ->pluck('board_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public static function canAccessBoard(?User $user, int $boardId): bool
    {
        if (!$user || $boardId <= 0) {
            return false;
        }

        if (self::isPrivileged($user)) {
            return true;
        }

        return DB::table('weekly_report_board_members')
            ->where('board_id', $boardId)
            ->where('user_id', $user->id)
            ->exists();
    }

    public static function assertCanAccessBoard(?User $user, int $boardId, int $status = 403): void
    {
        if (!self::canAccessBoard($user, $boardId)) {
            throw new HttpResponseException(
                response()->json(['error' => 'Forbidden'], $status)
            );
        }
    }

    public static function applyBoardScope($query, string $column, ?User $user): void
    {
        $ids = self::memberBoardIds($user);
        if ($ids !== null) {
            if ($ids === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn($column, $ids);
            }
        }
    }
}
