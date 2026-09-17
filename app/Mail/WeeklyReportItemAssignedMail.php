<?php

namespace App\Mail;

use App\Models\WeeklyReportItem;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyReportItemAssignedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public WeeklyReportItem $item,
        public ?string $url = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Weekly Report Item Assigned to You',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.weekly-report-assigned',
            with: ['appName' => AppBranding::appName()],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
