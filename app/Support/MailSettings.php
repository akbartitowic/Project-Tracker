<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class MailSettings
{
    private const KEYS = [
        'mail_host', 'mail_port', 'mail_username', 'mail_password',
        'mail_encryption', 'mail_from_address', 'mail_from_name',
    ];

    /** Fields that must all be filled in before the saved settings replace `.env`'s mail config. */
    private const REQUIRED = ['mail_host', 'mail_username', 'mail_password', 'mail_from_address'];

    /**
     * Applies SMTP credentials saved via the admin Settings page (table `settings`,
     * `mail_*` keys) to the live mail config, so every outgoing mail — task assigned,
     * due-date reminders, @mention, login notification, scheduled reports — uses them
     * instead of silently falling back to whatever `.env` has (default mailer: `log`,
     * i.e. written to the log file and never actually delivered).
     *
     * No-ops (leaving `.env`-derived config untouched) when the `settings` table isn't
     * ready yet (fresh install) or when the saved settings are incomplete, so a
     * half-filled Settings form can't break a working `.env`-based mail setup.
     */
    public static function apply(): void
    {
        try {
            if (! Schema::hasTable('settings')) {
                return;
            }

            $settings = Setting::whereIn('key', self::KEYS)->pluck('value', 'key');

            foreach (self::REQUIRED as $key) {
                if (blank($settings->get($key))) {
                    return;
                }
            }

            Config::set('mail.default', 'smtp');
            Config::set('mail.mailers.smtp.transport', 'smtp');
            Config::set('mail.mailers.smtp.host', $settings['mail_host']);
            Config::set('mail.mailers.smtp.port', $settings['mail_port']);
            Config::set('mail.mailers.smtp.username', $settings['mail_username']);
            Config::set('mail.mailers.smtp.password', $settings['mail_password']);
            Config::set('mail.mailers.smtp.encryption', $settings->get('mail_encryption') ?: 'tls');
            Config::set('mail.from.address', $settings['mail_from_address']);
            Config::set('mail.from.name', $settings->get('mail_from_name') ?: $settings['mail_from_address']);

            Mail::purge('smtp');
        } catch (\Throwable $e) {
            // Boot-time best-effort: DB not reachable yet, etc. — fall back to `.env` mail config.
        }
    }
}
