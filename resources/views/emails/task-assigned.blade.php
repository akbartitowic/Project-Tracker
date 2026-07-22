@extends('emails.layout')

@section('title', 'Task baru untuk Anda')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Hai {{ $task->assignee?->name ?? 'Anda' }},</p>

    <p style="margin:0 0 20px; color:#374151;">Anda baru saja di-assign ke sebuah task:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 4px; font-size:16px; font-weight:700; color:#0f172a;">{{ $task->title }}</p>
                <p style="margin:0 0 14px; font-size:12px; color:#64748b;">{{ $task->project?->name ?? '-' }}</p>

                <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding-right:8px;">
                            <span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#0f5b52; background-color:#ccf5ee; padding:4px 10px; border-radius:999px;">{{ $task->status }}</span>
                        </td>
                        <td>
                            <span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#334155; background-color:#e2e8f0; padding:4px 10px; border-radius:999px;">{{ $task->priority }}</span>
                        </td>
                    </tr>
                </table>

                @if($task->due_date)
                    <p style="margin:14px 0 0; font-size:12px; color:#64748b;">Due date: <strong style="color:#0f172a;">{{ $task->due_date->format('d M Y') }}</strong></p>
                @endif
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

    <p style="margin:24px 0 0; font-size:12px; color:#8a8fa3;">Salam,<br>{{ $appName ?? 'HubTask' }}</p>
@endsection
