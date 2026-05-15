<?php

namespace App\Http\Controllers;

use App\Models\Manhour;
use App\Models\Project;
use App\Models\Setting;
use App\Models\Task;
use App\Support\ProjectAccess;
use App\Support\UserAccess;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ReportController extends Controller
{
    private function normalizeTaskStatus(?string $status): string
    {
        $value = trim((string) $status);
        return match (strtolower($value)) {
            're-open', 'reopen' => 'Reopen',
            'in progress' => 'In Progress',
            'to do', 'todo' => 'To Do',
            'review' => 'Review',
            'done' => 'Done',
            default => $value !== '' ? $value : 'To Do',
        };
    }

    private function taskEstimatedHoursForStats(Task $task): float
    {
        if ($this->normalizeTaskStatus($task->status) === 'To Do') {
            return 0.0;
        }

        return (float) ($task->estimated_hours ?? 0);
    }

    private function sumEstimatedHoursByStatuses($tasks, array $statuses): float
    {
        return (float) $tasks->sum(function ($task) use ($statuses) {
            $normalized = $this->normalizeTaskStatus($task->status);
            if (!in_array($normalized, $statuses, true)) {
                return 0.0;
            }

            return (float) ($task->estimated_hours ?? 0);
        });
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'range' => 'required|in:weekly,biweekly,monthly,manual',
            'start_date' => 'nullable|date|required_if:range,manual',
            'end_date' => 'nullable|date|required_if:range,manual|after_or_equal:start_date',
            'preview' => 'nullable|boolean',
        ]);

        ProjectAccess::assertCanAccessProject($request->user(), (int) $validated['project_id']);

        $data = $this->getReportData(
            (int) $validated['project_id'],
            $validated['range'],
            $request->user(),
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null
        );
        $pdf = Pdf::loadView('reports.project_report', $data);

        if ($request->preview) {
            return $pdf->stream("Report-{$data['project']->name}-{$data['range']}.pdf");
        }

        return $pdf->download("Report-{$data['project']->name}-{$data['range']}.pdf");
    }

    public function sendEmail(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'range' => 'required|in:weekly,biweekly,monthly,manual',
            'start_date' => 'nullable|date|required_if:range,manual',
            'end_date' => 'nullable|date|required_if:range,manual|after_or_equal:start_date',
            'emails' => 'required|string',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        ProjectAccess::assertCanAccessProject($request->user(), (int) $validated['project_id']);

        $data = $this->getReportData(
            (int) $validated['project_id'],
            $validated['range'],
            $request->user(),
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null
        );
        $pdf = Pdf::loadView('reports.project_report', $data);
        $pdfContent = $pdf->output();

        $this->applyMailSettings();

        $emails = array_map('trim', explode(',', $validated['emails']));
        $subject = $validated['subject'];
        $body = $validated['body'];
        $fileName = "Report-{$data['project']->name}-{$data['range']}.pdf";

        try {
            Mail::raw($body, function ($message) use ($emails, $subject, $pdfContent, $fileName) {
                $message->to($emails)
                    ->subject($subject)
                    ->attachData($pdfContent, $fileName, [
                        'mime' => 'application/pdf',
                    ]);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Report sent successfully to ' . count($emails) . ' recipients.',
            ]);
        } catch (\Exception $e) {
            Log::error('Mail Error: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send email: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function getReportData(int $projectId, string $range, $user, $manualStartDate = null, $manualEndDate = null)
    {
        $project = Project::findOrFail($projectId);
        $endDate = null;
        $startDate = null;

        if ($range === 'manual') {
            $startDate = Carbon::parse($manualStartDate)->startOfDay();
            $endDate = Carbon::parse($manualEndDate)->endOfDay();
        } else {
            $endDate = Carbon::now();
            $startDate = match ($range) {
                'weekly' => Carbon::now()->subWeek(),
                'biweekly' => Carbon::now()->subWeeks(2),
                'monthly' => Carbon::now()->subMonth(),
                default => Carbon::now()->subWeek(),
            };
        }

        $tasksInRange = Task::where('project_id', $project->id)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->get();
        $tasksInRange->each(function ($task) {
            $task->normalized_status = $this->normalizeTaskStatus($task->status);
        });

        $inProgressTasks = Task::where('project_id', $project->id)->get();
        $inProgressTasks = $inProgressTasks
            ->filter(function ($task) {
                $normalized = $this->normalizeTaskStatus($task->status);
                $task->normalized_status = $normalized;
                return in_array($normalized, ['In Progress', 'Reopen'], true);
            })
            ->values();

        $projectTasksForStats = Task::where('project_id', $project->id)->get();
        $usedInRange = (float) $tasksInRange->sum(fn ($task) => $this->taskEstimatedHoursForStats($task));
        $totalUsed = (float) $projectTasksForStats->sum(fn ($task) => $this->taskEstimatedHoursForStats($task));
        $doneHours = $this->sumEstimatedHoursByStatuses($projectTasksForStats, ['Done']);
        $inProgressHours = $this->sumEstimatedHoursByStatuses(
            $projectTasksForStats,
            ['In Progress', 'Review', 'Reopen']
        );
        $totalQuota = (float) ($project->total_manhours ?? 0);

        $canViewManhours = UserAccess::canViewManhours($user);
        $stats = [
            'used_in_range' => $usedInRange,
            'total_used' => $totalUsed,
            'done_hours' => $doneHours,
            'in_progress_hours' => $inProgressHours,
            'total_quota' => $totalQuota,
            'remaining' => $totalQuota - $totalUsed,
            'actual_logged_in_range' => $canViewManhours
                ? (float) Manhour::where('project_id', $project->id)
                    ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->sum('hours')
                : 0.0,
            'actual_logged_total' => $canViewManhours
                ? (float) Manhour::where('project_id', $project->id)->sum('hours')
                : 0.0,
        ];

        $weights = [
            'To Do' => 0,
            'In Progress' => 25,
            'Reopen' => 50,
            'Review' => 75,
            'Done' => 100,
        ];
        $categoryProgress = [];
        $projectTasks = Task::where('project_id', $project->id)->get();
        $categories = $projectTasks
            ->map(fn ($task) => trim((string) ($task->category ?? '')))
            ->map(fn ($category) => $category === '' ? 'Uncategorized' : $category)
            ->unique()
            ->values();

        foreach ($categories as $cat) {
            $tasks = $projectTasks->filter(function ($task) use ($cat) {
                $taskCategory = trim((string) ($task->category ?? ''));
                $taskCategory = $taskCategory === '' ? 'Uncategorized' : $taskCategory;
                return $taskCategory === $cat;
            })->values();
            $totalCatTasks = $tasks->count();

            $weightedSum = 0;
            $statusCounts = [
                'To Do' => 0,
                'In Progress' => 0,
                'Reopen' => 0,
                'Review' => 0,
                'Done' => 0,
            ];

            foreach ($tasks as $task) {
                $normalizedStatus = $this->normalizeTaskStatus($task->status);
                $weight = $weights[$normalizedStatus] ?? 0;
                $weightedSum += $weight;
                if (isset($statusCounts[$normalizedStatus])) {
                    $statusCounts[$normalizedStatus]++;
                }
            }

            $weightedTotal = $totalCatTasks > 0 ? round($weightedSum / $totalCatTasks) : 0;

            $categoryProgress[$cat] = [
                'weighted_total' => $weightedTotal,
                'total' => $totalCatTasks,
                'counts' => $statusCounts,
            ];
        }

        return [
            'project' => $project,
            'range' => $range === 'manual' ? 'manual' : $range,
            'startDate' => $startDate->format('d M Y'),
            'endDate' => $endDate->format('d M Y'),
            'tasksInRange' => $tasksInRange,
            'inProgressTasks' => $inProgressTasks,
            'stats' => $stats,
            'categoryProgress' => $categoryProgress,
        ];
    }

    private function applyMailSettings()
    {
        $settings = Setting::whereIn('key', [
            'mail_host', 'mail_port', 'mail_username', 'mail_password',
            'mail_encryption', 'mail_from_address', 'mail_from_name',
        ])->get()->pluck('value', 'key');

        if ($settings->has('mail_host')) {
            Config::set('mail.default', 'smtp');
            Config::set('mail.mailers.smtp.transport', 'smtp');

            Config::set('mail.mailers.smtp.host', $settings['mail_host']);
            Config::set('mail.mailers.smtp.port', $settings['mail_port']);
            Config::set('mail.mailers.smtp.username', $settings['mail_username']);
            Config::set('mail.mailers.smtp.password', $settings['mail_password']);
            Config::set('mail.mailers.smtp.encryption', $settings['mail_encryption']);

            Config::set('mail.from.address', $settings['mail_from_address']);
            Config::set('mail.from.name', $settings['mail_from_name']);

            Mail::purge('smtp');
        }
    }

    public function getProjects(Request $request)
    {
        $user = $request->user();
        $query = Project::query()->select('id', 'name', 'methodology')->orderBy('name');

        $memberIds = ProjectAccess::memberProjectIds($user);
        if ($memberIds !== null) {
            if ($memberIds === []) {
                return response()->json(['data' => []]);
            }
            $query->whereIn('id', $memberIds);
        }

        return response()->json(['data' => $query->get()]);
    }
}
