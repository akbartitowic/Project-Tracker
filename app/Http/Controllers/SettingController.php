<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class SettingController extends Controller
{
    public function getSettings(Request $request)
    {
        $keys = $request->query('keys');
        if ($keys) {
            $keyList = explode(',', $keys);
            $settings = Setting::whereIn('key', $keyList)->get();
        } else {
            $settings = Setting::all();
        }

        return response()->json([
            'status' => 'success',
            'data' => $settings->pluck('value', 'key')
        ]);
    }

    public function updateSettings(Request $request)
    {
        $settings = $request->all();
        
        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Settings updated successfully'
        ]);
    }

    public function testSmtp(Request $request)
    {
        $settings = $request->all();
        
        // 1. Apply provided settings temporarily
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $settings['mail_host']);
        Config::set('mail.mailers.smtp.port', $settings['mail_port']);
        Config::set('mail.mailers.smtp.username', $settings['mail_username']);
        Config::set('mail.mailers.smtp.password', $settings['mail_password']);
        Config::set('mail.mailers.smtp.encryption', $settings['mail_encryption'] ?? 'tls');
        
        Config::set('mail.from.address', $settings['mail_from_address']);
        Config::set('mail.from.name', $settings['mail_from_name']);

        Mail::purge('smtp');

        try {
            Mail::raw('This is a test email from Noohtify to verify your SMTP settings.', function ($message) use ($settings) {
                $message->to($settings['mail_from_address'])
                    ->subject('Noohtify SMTP Test');
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Test email sent successfully to ' . $settings['mail_from_address']
            ]);
        } catch (\Exception $e) {
            Log::error("SMTP Test Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send test email: ' . $e->getMessage()
            ], 500);
        }
    }
}
