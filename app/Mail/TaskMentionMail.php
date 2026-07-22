<?php

namespace App\Mail;

use App\Models\Task;
use App\Models\TaskNote;
use App\Models\User;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskMentionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Task $task,
        public TaskNote $note,
        public User $mentionedBy,
        public User $recipient,
        public ?string $boardUrl = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You were mentioned in: ' . $this->task->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.task-mention',
            with: ['appName' => AppBranding::appName()],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
