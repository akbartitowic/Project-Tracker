<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Task Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
    <p>Hi {{ $task->assignee?->name ?? 'there' }},</p>

    <p>This is a reminder that the following task is due (or overdue) and still not <strong>Done/Hold</strong>:</p>

    <ul>
        <li><strong>Project:</strong> {{ $task->project?->name ?? '-' }}</li>
        <li><strong>Task:</strong> {{ $task->title }}</li>
        <li><strong>Status:</strong> {{ $task->status }}</li>
        <li><strong>Due Date:</strong> {{ $task->due_date ? $task->due_date->format('Y-m-d') : '-' }}</li>
    </ul>

    @if($boardUrl)
        <p>Open task board: <a href="{{ $boardUrl }}">{{ $boardUrl }}</a></p>
    @endif

    <p>You will keep receiving daily reminders until status changes to Done or Hold, or due date is updated.</p>
    <p>Regards,<br>Noohtify Project Tracker</p>
</body>
</html>

