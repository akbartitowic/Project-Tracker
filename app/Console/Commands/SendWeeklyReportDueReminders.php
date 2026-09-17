<?php

namespace App\Console\Commands;

use App\Models\WeeklyReportItem;
use App\Notifications\WeeklyReportItemDueNotification;
use Illuminate\Console\Command;
use Throwable;

class SendWeeklyReportDueReminders extends Command
{
    protected $signature = 'weekly-report:send-due-reminders';

    protected $description = 'Send daily reminders (in-app + email) for due/overdue Weekly Report items not yet done';

    public function handle(): int
    {
        $today = now()->toDateString();
        $sent = 0;
        $skipped = 0;

        WeeklyReportItem::query()
            ->with('assignees')
            ->whereNotNull('due_date')
            ->where('is_done', false)
            ->whereDate('due_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('last_due_reminder_sent_at')
                    ->orWhereDate('last_due_reminder_sent_at', '<', $today);
            })
            ->orderBy('id')
            ->chunkById(100, function ($items) use (&$sent, &$skipped) {
                foreach ($items as $item) {
                    if ($item->assignees->isEmpty()) {
                        $skipped++;
                        continue;
                    }

                    foreach ($item->assignees as $assignee) {
                        try {
                            $assignee->notify(new WeeklyReportItemDueNotification($item));
                            $sent++;
                        } catch (Throwable $e) {
                            \Log::warning("Weekly report due reminder failed for user {$assignee->id}: {$e->getMessage()}");
                        }
                    }

                    $item->forceFill(['last_due_reminder_sent_at' => now()])->save();
                }
            });

        $this->info("Weekly report due reminders sent: {$sent}, skipped: {$skipped}");

        return self::SUCCESS;
    }
}
