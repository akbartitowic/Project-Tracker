@extends('emails.layout')

@section('title', 'Weekly Report Item Due')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Hi there,</p>

    <p style="margin:0 0 20px; color:#374151;">A checklist item assigned to you in <strong>{{ $item->period?->board?->name ?? 'Weekly Report' }}</strong> is due:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:10px; margin-bottom:24px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 14px; font-size:15px; font-weight:700; color:#0f172a;">{{ $item->description }}</p>

                <span style="display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#92400e; background-color:#fde68a; padding:4px 10px; border-radius:999px;">{{ $item->issue_level }}</span>

                @if($item->due_date)
                    <p style="margin:14px 0 0; font-size:12px; color:#64748b;">Due date: <strong style="color:#0f172a;">{{ $item->due_date->format('d M Y') }}</strong></p>
                @endif
            </td>
        </tr>
    </table>

    @if($url)
        <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
                <td style="border-radius:8px; background-color:#0f9c8f;">
                    <a href="{{ $url }}" style="display:inline-block; padding:11px 22px; font-size:13px; font-weight:700; color:#04302b; text-decoration:none;">Open Weekly Report &rarr;</a>
                </td>
            </tr>
        </table>
    @endif

    <p style="margin:24px 0 0; font-size:12px; color:#8a8fa3;">Regards,<br>{{ $appName ?? 'HubTask' }}</p>
@endsection
