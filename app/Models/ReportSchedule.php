<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSchedule extends Model
{
    protected $fillable = [
        'project_id', 'created_by', 'frequency', 'day_of_week',
        'day_of_month', 'custom_date', 'send_time', 'timezone',
        'emails', 'subject', 'body',
        'is_active', 'last_run_at', 'next_run_at',
    ];

    protected $casts = [
        'emails'       => 'array',
        'is_active'    => 'boolean',
        'day_of_week'  => 'integer',
        'day_of_month' => 'integer',
        'custom_date'  => 'date',
        'last_run_at'  => 'datetime',
        'next_run_at'  => 'datetime',
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
     * Is this schedule due to run today (checked at 08:00 server time)?
     */
    public function isDueToday(): bool
    {
        $tz    = $this->timezone ?: 'Asia/Jakarta';
        $today = Carbon::now($tz);

        return match ($this->frequency) {
            'weekly'   => $today->dayOfWeek === (int) $this->day_of_week,
            'biweekly' => $today->dayOfWeek === (int) $this->day_of_week
                && ($this->last_run_at === null
                    || Carbon::instance($this->last_run_at)->diffInDays($today) >= 13),
            'monthly'  => $today->day === (int) $this->day_of_month,
            'custom'   => $this->custom_date !== null
                && $today->toDateString() === $this->custom_date->toDateString(),
            default    => false,
        };
    }

    /**
     * Calculate the next display date shown in the UI (not used for trigger logic).
     */
    public static function computeNextRun(
        string $frequency,
        ?int $dayOfWeek,
        string $timezone,
        ?string $customDate = null,
        ?Carbon $lastRunAt = null,
        ?int $dayOfMonth = null,
    ): ?Carbon {
        $tz  = $timezone ?: 'Asia/Jakarta';
        $now = Carbon::now($tz)->setTime(8, 0, 0);

        return match ($frequency) {
            'weekly' => self::nextWeekday($dayOfWeek, $now),

            'biweekly' => $lastRunAt
                ? Carbon::instance($lastRunAt)->setTimezone($tz)->addWeeks(2)->setTime(8, 0, 0)->utc()
                : self::nextWeekday($dayOfWeek, $now),

            'monthly' => self::nextMonthDay($dayOfMonth ?? 1, $now),

            'custom' => $customDate
                ? Carbon::parse($customDate, $tz)->setTime(8, 0, 0)->utc()
                : null,

            default => null,
        };
    }

    private static function nextMonthDay(int $dayOfMonth, Carbon $from): Carbon
    {
        $candidate = $from->copy()->setDay(min($dayOfMonth, $from->daysInMonth));
        if ($candidate->lte($from)) {
            $next = $from->copy()->addMonth();
            $candidate = $next->setDay(min($dayOfMonth, $next->daysInMonth));
        }
        return $candidate->setTime(8, 0, 0)->utc();
    }

    private static function nextWeekday(int $dayOfWeek, Carbon $from): Carbon
    {
        if ($from->dayOfWeek === $dayOfWeek && $from->gt(Carbon::now())) {
            return $from->copy()->utc();
        }
        if ($from->dayOfWeek === $dayOfWeek) {
            return $from->copy()->addWeek()->utc();
        }
        return $from->copy()->next($dayOfWeek)->setTime(8, 0, 0)->utc();
    }
}
