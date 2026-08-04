<?php

namespace App\Mail;

use App\Models\Project;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ManhourThresholdMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $bucket
     */
    public function __construct(
        public Project $project,
        public string $roleName,
        public array $bucket,
        public int $threshold,
        public ?string $boardUrl = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Peringatan MH {$this->threshold}% Tercapai — {$this->project->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.manhour-threshold',
            with: ['appName' => AppBranding::appName()],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
