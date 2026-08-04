<?php

namespace App\Mail;

use App\Models\Project;
use App\Models\ReviewEvaluation;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReviewLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Project $project,
        public ReviewEvaluation $evaluation,
        public string $reviewUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Permintaan Review Project: ' . $this->project->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.review-link',
            with: ['appName' => AppBranding::appName()],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
