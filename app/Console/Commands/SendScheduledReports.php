<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Manhour;
use App\Models\ReportSchedule;
use App\Models\Task;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendScheduledReports extends Command
{
    protected $signature   = 'reports:send-scheduled';
    protected $description = 'Send auto-scheduled project reports via email (runs daily at 08:00)';

    public function handle(): void
    {
        $schedules = ReportSchedule::query()
            ->where('is_active', true)
            ->with('project')
            ->get()
            ->filter(fn ($s) => $s->isDueToday());

        if ($schedules->isEmpty()) {
            return;
        }

        foreach ($schedules as $schedule) {
            $this->runSchedule($schedule);
        }
    }

    private function runSchedule(ReportSchedule $schedule): void
    {
        try {
            $data       = $this->buildReportData($schedule->project, $schedule->frequency);
            $pdf        = Pdf::loadView('reports.project_report', $data);
            $pdfContent = $pdf->output();
            $fileName   = "Report-{$schedule->project->name}-{$schedule->frequency}.pdf";

            Mail::raw($schedule->body, function ($msg) use ($schedule, $pdfContent, $fileName) {
                $msg->to($schedule->emails)
                    ->subject($schedule->subject)
                    ->attachData($pdfContent, $fileName, ['mime' => 'application/pdf']);
            });

            Log::info("Scheduled report sent: schedule #{$schedule->id} project \"{$schedule->project->name}\"");
            $this->logScheduleActivity($schedule, 'Scheduled Report Email Sent', "Scheduled report for project '{$schedule->project->name}' sent to " . implode(', ', $schedule->emails ?? []));
        } catch (\Throwable $e) {
            Log::error("Scheduled report #{$schedule->id} failed: {$e->getMessage()}");
            $this->logScheduleActivity($schedule, 'Scheduled Report Email Failed', "Failed sending scheduled report for project '{$schedule->project->name}': {$e->getMessage()}");
        }

        $schedule->last_run_at = now();

        // Recalculate next_run_at for UI display
        $schedule->next_run_at = ReportSchedule::computeNextRun(
            $schedule->frequency,
            $schedule->day_of_week,
            $schedule->timezone,
            $schedule->custom_date?->toDateString(),
            now(),
        );

        // Custom (one-time) → deactivate after sending
        if ($schedule->frequency === 'custom') {
            $schedule->is_active = false;
        }

        $schedule->save();
    }

    /**
     * Attributed to the schedule's creator — there is no "acting user" in this cron
     * context, and activity_logs.user_id is a required FK, so schedules without a
     * created_by are silently skipped rather than logged under a fake actor.
     */
    private function logScheduleActivity(ReportSchedule $schedule, string $activity, string $description): void
    {
        if (!$schedule->created_by) {
            return;
        }

        ActivityLog::create([
            'user_id' => $schedule->created_by,
            'type' => 'System',
            'activity' => $activity,
            'description' => $description,
        ]);
    }

    // ── Report data builder ─────────────────────────────────────────────────

    private function buildReportData(\App\Models\Project $project, string $range): array
    {
        $endDate   = Carbon::now();
        $startDate = match ($range) {
            'biweekly' => Carbon::now()->subWeeks(2),
            'custom'   => Carbon::now()->subWeek(),
            default    => Carbon::now()->subWeek(),
        };

        $tasksInRange = Task::where('project_id', $project->id)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->get();
        $tasksInRange->each(fn ($t) => $t->normalized_status = $this->normalizeStatus($t->status));

        $inProgressTasks = Task::where('project_id', $project->id)
            ->get()
            ->filter(fn ($t) => in_array(
                $t->normalized_status = $this->normalizeStatus($t->status),
                ['In Progress', 'Reopen'],
                true
            ))
            ->values();

        $projectTasks    = Task::where('project_id', $project->id)->get();
        $weights         = ['To Do' => 0, 'In Progress' => 25, 'Reopen' => 50, 'Review' => 75, 'Done' => 100];
        $totalQuota      = (float) ($project->total_manhours ?? 0);
        $totalUsed       = (float) $projectTasks->sum(
            fn ($t) => $this->normalizeStatus($t->status) !== 'To Do' ? (float) ($t->estimated_hours ?? 0) : 0
        );
        $doneHours       = (float) $projectTasks
            ->filter(fn ($t) => $this->normalizeStatus($t->status) === 'Done')->sum('estimated_hours');
        $inProgressHours = (float) $projectTasks
            ->filter(fn ($t) => in_array($this->normalizeStatus($t->status), ['In Progress', 'Review', 'Reopen'], true))
            ->sum('estimated_hours');

        $stats = [
            'used_in_range'          => (float) $tasksInRange->sum(
                fn ($t) => $this->normalizeStatus($t->status) !== 'To Do' ? (float) ($t->estimated_hours ?? 0) : 0
            ),
            'total_used'             => $totalUsed,
            'done_hours'             => $doneHours,
            'in_progress_hours'      => $inProgressHours,
            'total_quota'            => $totalQuota,
            'remaining'              => $totalQuota - $totalUsed,
            'actual_logged_in_range' => (float) Manhour::where('project_id', $project->id)
                ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                ->sum('hours'),
            'actual_logged_total'    => (float) Manhour::where('project_id', $project->id)->sum('hours'),
        ];

        $categories = $projectTasks
            ->map(fn ($t) => trim((string) ($t->category ?? '')) ?: 'Uncategorized')
            ->unique()->values();

        $categoryProgress = [];
        foreach ($categories as $cat) {
            $catTasks = $projectTasks->filter(
                fn ($t) => (trim((string) ($t->category ?? '')) ?: 'Uncategorized') === $cat
            )->values();
            $count       = $catTasks->count();
            $statusCounts = ['To Do' => 0, 'In Progress' => 0, 'Reopen' => 0, 'Review' => 0, 'Done' => 0];
            $weightSum   = 0;
            foreach ($catTasks as $t) {
                $s = $this->normalizeStatus($t->status);
                $weightSum += $weights[$s] ?? 0;
                if (isset($statusCounts[$s])) $statusCounts[$s]++;
            }
            $categoryProgress[$cat] = [
                'weighted_total' => $count > 0 ? round($weightSum / $count) : 0,
                'total'          => $count,
                'counts'         => $statusCounts,
            ];
        }

        return [
            'project'          => $project,
            'range'            => $range === 'custom' ? 'weekly' : $range,
            'startDate'        => $startDate->format('d M Y'),
            'endDate'          => $endDate->format('d M Y'),
            'tasksInRange'     => $tasksInRange,
            'inProgressTasks'  => $inProgressTasks,
            'stats'            => $stats,
            'categoryProgress' => $categoryProgress,
        ];
    }

    private function normalizeStatus(?string $status): string
    {
        $value = trim((string) $status);
        return match (strtolower($value)) {
            're-open', 'reopen' => 'Reopen',
            'in progress'       => 'In Progress',
            'to do', 'todo'     => 'To Do',
            'review'            => 'Review',
            'done'              => 'Done',
            default             => $value !== '' ? $value : 'To Do',
        };
    }

}
