<?php

namespace App\Support;

use Carbon\Carbon;

class WeekdaySchedule
{
    /**
     * @return list<string> Y-m-d weekdays from start through end (inclusive)
     */
    public static function weekdaysBetween(Carbon $start, Carbon $end): array
    {
        $start = $start->copy()->startOfDay();
        $end = $end->copy()->startOfDay();
        if ($end->lt($start)) {
            return [];
        }

        $days = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            if (! $cursor->isWeekend()) {
                $days[] = $cursor->toDateString();
            }
            $cursor->addDay();
        }

        return $days;
    }

    /**
     * @return list<string> Y-m-d every calendar day from start through end (inclusive)
     */
    public static function allDaysBetween(Carbon $start, Carbon $end): array
    {
        $start = $start->copy()->startOfDay();
        $end = $end->copy()->startOfDay();
        if ($end->lt($start)) {
            return [];
        }

        $days = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $days[] = $cursor->toDateString();
            $cursor->addDay();
        }

        return $days;
    }

    public static function isWeekendDate(string $date): bool
    {
        return Carbon::parse($date)->isWeekend();
    }
}
