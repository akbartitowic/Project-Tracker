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

    /**
     * Weekdays minus custom excluded dates (e.g. company holidays).
     *
     * @param  list<string>  $excludedDates  Y-m-d strings
     * @return list<string>
     */
    public static function workingDaysBetween(Carbon $start, Carbon $end, array $excludedDates = []): array
    {
        $start = $start->copy()->startOfDay();
        $end = $end->copy()->startOfDay();
        if ($end->lt($start)) {
            return [];
        }

        $excluded = array_flip($excludedDates);
        $days = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            if (! $cursor->isWeekend() && ! isset($excluded[$key])) {
                $days[] = $key;
            }
            $cursor->addDay();
        }

        return $days;
    }

    public static function isWeekendDate(string $date): bool
    {
        return Carbon::parse($date)->isWeekend();
    }

    /** @param  list<string>  $excludedDates */
    public static function isExcludedDate(string $date, array $excludedDates): bool
    {
        return in_array($date, $excludedDates, true);
    }
}
