@extends('emails.layout')

@section('title', 'Kamu di-mention')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Hai {{ $recipient->name }},</p>

    <p style="margin:0 0 20px; color:#374151;">
        <strong style="color:#0f172a;">{{ $mentionedBy->name }}</strong> mention kamu di catatan task
        <strong style="color:#0f172a;">{{ $task->title }}</strong>
        <span style="color:#64748b;">({{ $task->project?->name ?? '-' }})</span>:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px; border-left:3px solid #0f9c8f;">
        <tr>
            <td style="padding:16px 20px; font-size:13px; color:#374151; font-style:italic;">
                &ldquo;{{ $note->body }}&rdquo;
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
