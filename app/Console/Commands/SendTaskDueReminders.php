<?php

namespace App\Console\Commands;

use App\Mail\TaskDueReminderMail;
use App\Models\ActivityLog;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendTaskDueReminders extends Command
{
    protected $signature = 'tasks:send-due-reminders';

    protected $description = 'Send daily email reminders for due/overdue tasks not done/hold';

    public function handle(): int
    {
        $nowUtc = now();
        $sent = 0;
        $skipped = 0;

        Task::query()
            ->with(['assignee', 'project'])
            ->whereNotNull('assignee_id')
            ->whereNotNull('due_date')
            ->orderBy('id')
            ->chunkById(100, function ($tasks) use (&$sent, &$skipped, $nowUtc) {
                foreach ($tasks as $task) {
                    $status = strtolower(trim((string) $task->status));
                    if (str_contains($status, 'done') || str_contains($status, 'hold')) {
                        $skipped++;
                        continue;
                    }

                    $assignee = $task->assignee;
                    if (!$assignee || !$assignee->email || !$assignee->task_email_notifications_enabled) {
                        $skipped++;
                        continue;
                    }

                    $tz = (string) ($assignee->timezone ?: 'Asia/Jakarta');
                    try {
                        $nowLocal = $nowUtc->copy()->timezone($tz);
                    } catch (Throwable) {
                        $nowLocal = $nowUtc->copy()->timezone('Asia/Jakarta');
                        $tz = 'Asia/Jakarta';
                    }

                    if ($nowLocal->format('H') !== '08') {
                        $skipped++;
                        continue;
                    }

                    $dueDate = $task->due_date instanceof Carbon
                        ? $task->due_date->copy()->timezone($tz)->toDateString()
                        : Carbon::parse((string) $task->due_date, $tz)->toDateString();
                    $todayLocal = $nowLocal->toDateString();
                    if ($dueDate > $todayLocal) {
                        $skipped++;
                        continue;
                    }

                    $lastLocalDate = $task->last_due_reminder_sent_at
                        ? $task->last_due_reminder_sent_at->copy()->timezone($tz)->toDateString()
                        : null;
                    if ($lastLocalDate === $todayLocal) {
                        $skipped++;
                        continue;
                    }

                    $boardUrl = $task->project_id ? url('/board/' . $task->project_id) : null;
                    try {
                        Mail::to($assignee->email)->send(new TaskDueReminderMail($task, $boardUrl));
                        $task->forceFill([
                            'last_due_reminder_sent_at' => now(),
                        ])->save();
                        $sent++;
                        ActivityLog::create([
                            'user_id' => $assignee->id,
                            'type' => 'Project',
                            'activity' => 'Task Reminder Email Sent',
                            'description' => "Reminder email sent to '{$assignee->email}' for task '{$task->title}' (project ID: {$task->project_id}).",
                        ]);
                    } catch (Throwable $e) {
                        ActivityLog::create([
                            'user_id' => $assignee->id,
                            'type' => 'Project',
                            'activity' => 'Task Reminder Email Failed',
                            'description' => "Failed sending reminder to '{$assignee->email}' for task '{$task->title}': {$e->getMessage()}",
                        ]);
                    }
                }
            });

        $this->info("Task due reminders sent: {$sent}, skipped: {$skipped}");

        return self::SUCCESS;
    }
}

