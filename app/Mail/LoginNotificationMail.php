<?php

namespace App\Mail;

use App\Models\User;
use App\Support\AppBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoginNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $loginDate,
        public string $loginTime,
        public string $ipAddress,
        public string $device,
        public string $location,
        public string $profileUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Login baru terdeteksi di akun Anda',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.login-notification',
            with: ['appName' => AppBranding::appName()],
        );
    }
}
