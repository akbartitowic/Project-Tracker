@extends('emails.layout')

@section('title', 'Login baru terdeteksi')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Hai {{ $user->name }},</p>

    <p style="margin:0 0 20px; color:#374151;">Kami mendeteksi login baru ke akun Anda dengan detail berikut:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px;">
        <tr>
            <td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:6px 0; font-size:12px; color:#64748b; width:120px; vertical-align:top;">Tanggal Login</td>
                        <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:600;">{{ $loginDate }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; font-size:12px; color:#64748b; vertical-align:top;">Waktu Login</td>
                        <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:600;">{{ $loginTime }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; font-size:12px; color:#64748b; vertical-align:top;">Lokasi</td>
                        <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:600;">{{ $location }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; font-size:12px; color:#64748b; vertical-align:top;">IP Address</td>
                        <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:600; font-variant-numeric:tabular-nums;">{{ $ipAddress }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; font-size:12px; color:#64748b; vertical-align:top;">Perangkat</td>
                        <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:600;">{{ $device }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 14px; color:#374151;">Kalau ini bukan Anda, segera amankan akun dengan mengganti password:</p>

    <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
            <td style="border-radius:8px; background-color:#dc2626;">
                <a href="{{ $profileUrl }}" style="display:inline-block; padding:11px 22px; font-size:13px; font-weight:700; color:#ffffff; text-decoration:none;">Bukan Saya, Ganti Password &rarr;</a>
            </td>
        </tr>
    </table>

    <p style="margin:24px 0 0; font-size:12px; color:#8a8fa3;">Kalau ini memang Anda, tidak perlu ada tindakan lebih lanjut. Setelah password diganti, semua sesi/device yang sedang login akan otomatis logout.</p>
    <p style="margin:12px 0 0; font-size:12px; color:#8a8fa3;">Salam,<br>{{ $appName ?? 'HubTask' }}</p>
@endsection
