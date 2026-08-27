<?php

namespace App\Notifications;

use App\Mail\TaskMentionMail;
use App\Models\Task;
use App\Models\TaskNote;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class TaskMentionNotification extends Notification
{
    public function __construct(
        public Task $task,
        public TaskNote $note,
        public User $mentionedBy,
    ) {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->email && $notifiable->wantsEmailFor('task_mention')) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'task_mention',
            'task_id' => $this->task->id,
            'project_id' => $this->task->project_id,
            'task_title' => $this->task->title,
            'task_note_id' => $this->note->id,
            'note_excerpt' => Str::limit($this->note->body, 140),
            'mentioned_by_id' => $this->mentionedBy->id,
            'mentioned_by_name' => $this->mentionedBy->name,
        ];
    }

    public function toMail(object $notifiable): TaskMentionMail
    {
        $boardUrl = $this->task->project_id
            ? url('/board/' . $this->task->project_id . '/task/' . $this->task->id)
            : null;

        return (new TaskMentionMail($this->task, $this->note, $this->mentionedBy, $notifiable, $boardUrl))
            ->to($notifiable->email);
    }
}
