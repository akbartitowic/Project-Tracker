<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Schedule::command('logs:cleanup')->daily();
Schedule::command('tasks:send-due-reminders')->hourlyAt(0);
Schedule::command('reports:send-scheduled')->dailyAt('08:00');
