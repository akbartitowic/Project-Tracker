<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>You were mentioned</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
    <p>Hi {{ $recipient->name }},</p>

    <p>{{ $mentionedBy->name }} mentioned you in a note on task <strong>{{ $task->title }}</strong>
        (project: {{ $task->project?->name ?? '-' }}):</p>

    <blockquote style="margin: 0; padding: 8px 12px; border-left: 3px solid #94a3b8; color: #334155;">
        {{ $note->body }}
    </blockquote>

    @if($boardUrl)
        <p>Open task: <a href="{{ $boardUrl }}">{{ $boardUrl }}</a></p>
    @endif

    <p>Regards,<br>Noohtify Project Tracker</p>
</body>
</html>
