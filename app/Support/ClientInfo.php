<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Best-effort device/location summary for security-notification emails (login alerts, etc).
 * Not a precise UA parser — just enough to be recognizable to the end user.
 */
class ClientInfo
{
    public static function device(?string $userAgent): string
    {
        $ua = (string) $userAgent;
        if ($ua === '') {
            return 'Perangkat tidak diketahui';
        }

        $browser = self::matchBrowser($ua);
        $os = self::matchOs($ua);

        if ($browser && $os) {
            return "{$browser} di {$os}";
        }

        return $browser ?? $os ?? 'Perangkat tidak diketahui';
    }

    public static function location(?string $ip): string
    {
        if (!$ip || self::isPrivateOrReserved($ip)) {
            return 'Tidak diketahui (jaringan lokal)';
        }

        try {
            $response = Http::timeout(3)->get("https://ipwho.is/{$ip}");
            if (!$response->ok()) {
                return 'Tidak diketahui';
            }

            $data = $response->json();
            if (($data['success'] ?? true) === false) {
                return 'Tidak diketahui';
            }

            $parts = array_filter([$data['city'] ?? null, $data['country'] ?? null]);

            return $parts ? implode(', ', $parts) : 'Tidak diketahui';
        } catch (Throwable $e) {
            Log::warning('IP geolocation lookup failed', ['ip' => $ip, 'error' => $e->getMessage()]);

            return 'Tidak diketahui';
        }
    }

    private static function matchBrowser(string $ua): ?string
    {
        // Order matters: Chrome/Edge/Opera UAs also contain "Safari/", so the
        // more specific tokens must be checked first.
        $patterns = [
            'Edg/' => 'Microsoft Edge',
            'OPR/' => 'Opera',
            'CriOS/' => 'Chrome',
            'Chrome/' => 'Chrome',
            'FxiOS/' => 'Firefox',
            'Firefox/' => 'Firefox',
            'Safari/' => 'Safari',
        ];

        foreach ($patterns as $needle => $name) {
            if (str_contains($ua, $needle)) {
                return $name;
            }
        }

        return null;
    }

    private static function matchOs(string $ua): ?string
    {
        return match (true) {
            // iOS UAs also contain "like Mac OS X", so they must be checked first.
            str_contains($ua, 'iPhone'), str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS X'), str_contains($ua, 'Macintosh') => 'macOS',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'Linux') => 'Linux',
            default => null,
        };
    }

    private static function isPrivateOrReserved(string $ip): bool
    {
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }
}
