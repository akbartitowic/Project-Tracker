<?php

namespace App\Support;

use App\Models\FinancialRecord;
use Illuminate\Database\Eloquent\Builder;

/**
 * Company-level OPEX / CAPEX (financial_records), separate from per-project allocations.
 *
 * OPEX — operational expense; each row is one calendar month at the given monthly amount.
 *        Use recurring entry to generate multiple monthly rows (e.g. 12 × rent).
 * CAPEX — capital expenditure; each row is a one-time amount on transaction date (no recurrence).
 *
 * P&L on Finance Report: OPEX and CAPEX totals use the same start_date–end_date filter as
 * gross income and project expenses (not a separate full-calendar-year window).
 */
class CompanyFinancialRules
{
    public const TYPE_OPEX = 'OPEX';

    public const TYPE_CAPEX = 'CAPEX';

    public static function sumByType(string $startDate, string $endDate): array
    {
        $base = fn (string $type) => (float) FinancialRecord::query()
            ->where('type', $type)
            ->whereBetween('date', [$startDate, $endDate])
            ->sum('amount');

        return [
            'opex_total' => $base(self::TYPE_OPEX),
            'capex_total' => $base(self::TYPE_CAPEX),
        ];
    }

    public static function recordsInRange(string $startDate, string $endDate): Builder
    {
        return FinancialRecord::query()
            ->whereBetween('date', [$startDate, $endDate])
            ->orderByDesc('date');
    }
}
