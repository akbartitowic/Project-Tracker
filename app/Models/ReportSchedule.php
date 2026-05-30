<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSchedule extends Model
{
    protected $fillable = [
        'project_id', 'created_by', 'frequency', 'day_of_week',
        'send_time', 'timezone', 'end_date', 'emails',
        'subject', 'body', 'is_active', 'last_run_at', 'next_run_at',
    ];

    protected $casts = [
        'emails'      => 'array',
        'is_active'   => 'boolean',
        'day_of_week' => 'integer',
        'end_date'    => 'date',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate the first future run time for a new or re-activated schedule.
     *
     * Logic:
     *   - If today is the target day_of_week AND send_time is still in the future → use today.
     *   - Otherwise → find the next calendar occurrence of day_of_week and use send_time there.
     */
    public static function computeNextRun(
        string $frequency,
        int $dayOfWeek,
        string $sendTime,
        string $timezone,
        ?Carbon $after = null
    ): Carbon {
        $tz    = $timezone ?: 'Asia/Jakarta';
        $now   = ($after ?? Carbon::now())->copy()->setTimezone($tz);
        [$h, $m] = array_map('intval', explode(':', $sendTime));

        // Try scheduling for today at send_time
        $candidate = $now->copy()->setTime($h, $m, 0);

        if ($candidate->dayOfWeek === $dayOfWeek && $candidate->gt($now)) {
            // Today is the right day and we haven't passed send_time yet
            return $candidate->utc();
        }

        // Move to the next occurrence of the target weekday
        if ($now->dayOfWeek === $dayOfWeek) {
            // Today is the right day but send_time already passed → next week
            $candidate = $now->copy()->addWeek()->setTime($h, $m, 0);
        } else {
            $candidate = $now->copy()->next($dayOfWeek)->setTime($h, $m, 0);
        }

        return $candidate->utc();
    }

    /**
     * Calculate the run after the current next_run_at, respecting frequency.
     */
    public static function computeNextRunAfterExecution(self $schedule): Carbon
    {
        $tz   = $schedule->timezone ?: 'Asia/Jakarta';
        $base = $schedule->next_run_at
            ? Carbon::instance($schedule->next_run_at)->setTimezone($tz)
            : Carbon::now($tz);

        $next = match ($schedule->frequency) {
            'biweekly' => $base->copy()->addWeeks(2),
            'monthly'  => $base->copy()->addMonth(),
            default    => $base->copy()->addWeek(),
        };

        return $next->utc();
    }
}
