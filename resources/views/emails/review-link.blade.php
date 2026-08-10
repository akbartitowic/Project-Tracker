@extends('emails.layout')

@section('title', 'Permintaan Review Project')

@section('content')
    <p style="margin:0 0 16px; font-size:15px; color:#0f172a;">Halo,</p>

    <p style="margin:0 0 20px; color:#374151;">{!! nl2br(e($bodyText)) !!}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 4px; font-size:16px; font-weight:700; color:#0f172a;">{{ $project->name }}</p>
                <p style="margin:0; font-size:12px; color:#64748b;">{{ $evaluation->name }}</p>
            </td>
        </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
            <td style="border-radius:8px; background-color:#0f9c8f;">
                <a href="{{ $reviewUrl }}" style="display:inline-block; padding:11px 22px; font-size:13px; font-weight:700; color:#04302b; text-decoration:none;">Isi Review &rarr;</a>
            </td>
        </tr>
    </table>

    <p style="margin:20px 0 0; font-size:12px; color:#8a8fa3;">Atau salin link berikut ke browser Anda:<br>
        <span style="word-break:break-all; color:#0f9c8f;">{{ $reviewUrl }}</span>
    </p>

    <p style="margin:24px 0 0; font-size:12px; color:#8a8fa3;">Salam,<br>{{ $appName ?? 'HubTask' }}</p>
@endsection
