@extends('emails.layout')

@section('title', 'Peringatan Penggunaan MH')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Halo,</p>

    <p style="margin:0 0 20px; color:#374151;">
        Penggunaan manhour (MH) pada salah satu top up di project berikut sudah mencapai
        <strong style="color:#0f172a;">{{ $threshold }}%</strong> dari quota top up tersebut:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 4px; font-size:16px; font-weight:700; color:#0f172a;">{{ $project->name }}</p>
                <p style="margin:0 0 14px; font-size:12px; color:#64748b;">Role: {{ $roleName }} &middot; {{ $bucket['label'] ?? 'Top Up' }}</p>

                @if(!empty($bucket['description']))
                    <p style="margin:0 0 10px; font-size:12px; color:#64748b;">{{ $bucket['description'] }}</p>
                @endif

                <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding-right:8px;">
                            <span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#92400e; background-color:#fef3c7; padding:4px 10px; border-radius:999px;">{{ $threshold }}% Tercapai</span>
                        </td>
                    </tr>
                </table>

                <p style="margin:14px 0 0; font-size:12px; color:#64748b;">
                    Terpakai: <strong style="color:#0f172a;">{{ $bucket['consumed_hours'] ?? 0 }} jam</strong>
                    dari quota top up <strong style="color:#0f172a;">{{ $bucket['quota_hours'] ?? 0 }} jam</strong>
                    ({{ $bucket['consumed_pct'] ?? 0 }}%)
                </p>
            </td>
        </tr>
    </table>

    @if($boardUrl)
        <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
                <td style="border-radius:8px; background-color:#0f9c8f;">
                    <a href="{{ $boardUrl }}" style="display:inline-block; padding:11px 22px; font-size:13px; font-weight:700; color:#04302b; text-decoration:none;">Buka Project &rarr;</a>
                </td>
            </tr>
        </table>
    @endif

    <p style="margin:24px 0 0; font-size:12px; color:#8a8fa3;">Salam,<br>{{ $appName ?? 'HubTask' }}</p>
@endsection
