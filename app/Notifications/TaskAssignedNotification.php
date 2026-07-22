<?php

namespace App\Notifications;

use App\Mail\TaskAssignedMail;
use App\Models\Task;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification
{
    public function __construct(
        public Task $task,
    ) {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->email && $notifiable->task_email_notifications_enabled) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'task_assigned',
            'task_id' => $this->task->id,
            'project_id' => $this->task->project_id,
            'task_title' => $this->task->title,
            'project_name' => $this->task->project?->name,
        ];
    }

    public function toMail(object $notifiable): TaskAssignedMail
    {
        $boardUrl = $this->task->project_id
            ? url('/board/' . $this->task->project_id . '/task/' . $this->task->id)
            : null;

        return (new TaskAssignedMail($this->task, $boardUrl))->to($notifiable->email);
    }
}
