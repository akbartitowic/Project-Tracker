<?php

namespace App\Mail;

use App\Models\Task;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskDueReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Task $task,
        public ?string $boardUrl = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Task Reminder: ' . $this->task->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.task-due-reminder',
            with: ['appName' => AppBranding::appName()],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

