@extends('emails.layout')

@section('title', 'Reminder task jatuh tempo')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Hai {{ $task->assignee?->name ?? 'Anda' }},</p>

    <p style="margin:0 0 20px; color:#374151;">Ini pengingat bahwa task berikut sudah jatuh tempo (atau overdue) dan belum berstatus <strong style="color:#0f172a;">Done/Hold</strong>:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:10px; margin-bottom:24px; border-left:3px solid #d97706;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 4px; font-size:16px; font-weight:700; color:#0f172a;">{{ $task->title }}</p>
                <p style="margin:0 0 14px; font-size:12px; color:#64748b;">{{ $task->project?->name ?? '-' }}</p>

                <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding-right:8px;">
                            <span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#334155; background-color:#e2e8f0; padding:4px 10px; border-radius:999px;">{{ $task->status }}</span>
                        </td>
                        <td>
                            <span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#78350f; background-color:#fde68a; padding:4px 10px; border-radius:999px;">Due {{ $task->due_date ? $task->due_date->format('d M Y') : '-' }}</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    @if($boardUrl)
        <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
                <td style="border-radius:8px; background-color:#0f9c8f;">
                    <a href="{{ $boardUrl }}" style="display:inline-block; padding:11px 22px; font-size:13px; font-weight:700; color:#04302b; text-decoration:none;">Buka Task &rarr;</a>
                </td>
            </tr>
        </table>
    @endif

    <p style="margin:24px 0 0; font-size:12px; color:#8a8fa3;">Anda akan terus menerima reminder harian sampai status berubah jadi Done/Hold, atau due date diperbarui.</p>
    <p style="margin:12px 0 0; font-size:12px; color:#8a8fa3;">Salam,<br>{{ $appName ?? 'HubTask' }}</p>
@endsection
