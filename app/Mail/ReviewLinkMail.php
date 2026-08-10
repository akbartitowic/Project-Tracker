<?php

namespace App\Mail;

use App\Models\Project;
use App\Models\ReviewEvaluation;
use App\Support\AppBranding;
use App\Support\ReviewEmailTemplate;
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
        public ?string $subjectOverride = null,
        public ?string $bodyOverride = null,
    ) {
    }

    public function envelope(): Envelope
    {
        $rendered = ReviewEmailTemplate::renderFor(
            $this->project,
            $this->evaluation,
            $this->reviewUrl,
            $this->subjectOverride,
            $this->bodyOverride,
        );

        return new Envelope(
            subject: $rendered['subject'],
        );
    }

    public function content(): Content
    {
        $rendered = ReviewEmailTemplate::renderFor(
            $this->project,
            $this->evaluation,
            $this->reviewUrl,
            $this->subjectOverride,
            $this->bodyOverride,
        );

        return new Content(
            view: 'emails.review-link',
            with: [
                'appName' => AppBranding::appName(),
                'bodyText' => $rendered['body'],
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
