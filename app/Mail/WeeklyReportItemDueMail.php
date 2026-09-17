<?php

namespace App\Mail;

use App\Models\WeeklyReportItem;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyReportItemDueMail extends Mailable
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
            subject: 'Weekly Report Item Due: ' . \Illuminate\Support\Str::limit($this->item->description, 60),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.weekly-report-due',
            with: ['appName' => AppBranding::appName()],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
