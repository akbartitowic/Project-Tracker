<?php

namespace App\Notifications;

use App\Mail\WeeklyReportItemDueMail;
use App\Models\WeeklyReportItem;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class WeeklyReportItemDueNotification extends Notification
{
    public function __construct(
        public WeeklyReportItem $item,
    ) {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->email && $notifiable->wantsEmailFor('weekly_report_due')) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        $board = $this->item->period?->board;

        return [
            'type' => 'weekly_report_due',
            'item_id' => $this->item->id,
            'period_id' => $this->item->period_id,
            'board_id' => $board?->id,
            'board_name' => $board?->name,
            'description_excerpt' => Str::limit((string) $this->item->description, 80),
            'due_date' => optional($this->item->due_date)->format('Y-m-d'),
        ];
    }

    public function toMail(object $notifiable): WeeklyReportItemDueMail
    {
        $board = $this->item->period?->board;
        $url = $board ? url('/weekly-report/' . $board->id . '/' . $this->item->period_id) : null;

        return (new WeeklyReportItemDueMail($this->item, $url))->to($notifiable->email);
    }
}
