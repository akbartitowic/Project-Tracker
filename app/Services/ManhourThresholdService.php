<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectAllocation;
use App\Models\Task;
use App\Models\User;
use App\Notifications\ManhourThresholdNotification;
use App\Support\ManhourBucketCalculator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Agile projects only: notifies Project Manager / Project Director project members
 * when MH usage on a specific top-up (not the project's overall MH) crosses 50/70/90%.
 */
class ManhourThresholdService
{
    private const THRESHOLDS = [50, 70, 90];

    private const NOTIFY_ROLE_NAMES = ['Project Manager', 'Project Director'];

    public static function checkProject(int $projectId): void
    {
        $project = Project::find($projectId);
        if (!$project || $project->methodology !== 'Agile Scrum') {
            return;
        }

        $roleQuotas = DB::table('project_role_quotas as pq')
            ->join('project_roles as pr', 'pr.id', '=', 'pq.project_role_id')
            ->where('pq.project_id', $projectId)
            ->where('pq.is_active', true)
            ->get(['pq.project_role_id', 'pq.quota_hours', 'pr.name as role_name']);

        if ($roleQuotas->isEmpty()) {
            return;
        }

        $recipients = null;

        foreach ($roleQuotas as $roleQuota) {
            $topupRows = DB::table('project_allocations')
                ->where('project_id', $projectId)
                ->where('project_role_id', $roleQuota->project_role_id)
                ->where('is_topup', true)
                ->whereNotNull('topup_hours')
                ->where('topup_hours', '>', 0)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get(['id', 'topup_hours', 'description', 'created_at', 'notified_thresholds']);

            if ($topupRows->isEmpty()) {
                continue;
            }

            $consumedHours = (float) Task::query()
                ->where('project_id', $projectId)
                ->where('project_role_id', $roleQuota->project_role_id)
                ->where('is_billable', true)
                ->quotaEligible()
                ->sum('estimated_hours');

            $fifo = ManhourBucketCalculator::build(
                (float) $roleQuota->quota_hours,
                $topupRows,
                $consumedHours,
            );

            foreach ($fifo['buckets'] as $bucket) {
                if ($bucket['kind'] !== 'topup' || empty($bucket['topup_id'])) {
                    continue;
                }

                $allocationRow = $topupRows->firstWhere('id', $bucket['topup_id']);
                if (!$allocationRow) {
                    continue;
                }

                $alreadyNotified = json_decode($allocationRow->notified_thresholds ?? '[]', true) ?: [];
                $newlyCrossed = array_values(array_filter(
                    self::THRESHOLDS,
                    fn ($threshold) => $bucket['consumed_pct'] >= $threshold && !in_array($threshold, $alreadyNotified, true)
                ));

                if (empty($newlyCrossed)) {
                    continue;
                }

                if ($recipients === null) {
                    $recipients = self::resolveRecipients($projectId);
                }

                foreach ($newlyCrossed as $threshold) {
                    if ($recipients->isNotEmpty()) {
                        Notification::send(
                            $recipients,
                            new ManhourThresholdNotification(
                                $project,
                                (int) $roleQuota->project_role_id,
                                (string) $roleQuota->role_name,
                                $bucket,
                                (int) $threshold,
                            )
                        );
                    }
                    $alreadyNotified[] = (int) $threshold;
                }

                sort($alreadyNotified);
                ProjectAllocation::whereKey($bucket['topup_id'])->update([
                    'notified_thresholds' => json_encode(array_values(array_unique($alreadyNotified))),
                ]);
            }
        }
    }

    /**
     * PM/Director project members only — not every PM/Director in the system.
     * "PM/Director" is matched two ways since this app has two separate role
     * concepts that can both be named "Project Manager"/"Project Director":
     *   - the member's global system role (`users.role_id` -> `roles`), used for RBAC;
     *   - the member's per-project task/manhour role (`project_members.project_role_id`
     *     -> `project_roles`), shown on the Project Board member list.
     * A member qualifies via either one, unioned and deduped.
     */
    private static function resolveRecipients(int $projectId): Collection
    {
        $bySystemRole = User::query()
            ->join('project_members', 'project_members.user_id', '=', 'users.id')
            ->join('roles', 'roles.id', '=', 'users.role_id')
            ->where('project_members.project_id', $projectId)
            ->whereIn('roles.name', self::NOTIFY_ROLE_NAMES)
            ->select('users.*')
            ->get();

        $byProjectRole = User::query()
            ->join('project_members', 'project_members.user_id', '=', 'users.id')
            ->join('project_roles', 'project_roles.id', '=', 'project_members.project_role_id')
            ->where('project_members.project_id', $projectId)
            ->whereIn('project_roles.name', self::NOTIFY_ROLE_NAMES)
            ->select('users.*')
            ->get();

        return $bySystemRole->merge($byProjectRole)->unique('id')->values();
    }
}
