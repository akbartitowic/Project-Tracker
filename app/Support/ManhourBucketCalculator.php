<?php

namespace App\Support;

/**
 * FIFO consumption: allocated manhours deplete initial (base) quota first,
 * then each top-up in chronological order (oldest → newest).
 */
class ManhourBucketCalculator
{
    /**
     * @param  list<array<string, mixed>>  $buckets
     */
    public static function sumRemainingHours(array $buckets): float
    {
        $sum = 0.0;
        foreach ($buckets as $bucket) {
            $sum += (float) ($bucket['remaining_hours'] ?? 0);
        }

        return round($sum, 2);
    }

    /**
     * @param  list<array<string, mixed>>  $buckets
     */
    public static function sumConsumedHours(array $buckets): float
    {
        $sum = 0.0;
        foreach ($buckets as $bucket) {
            $sum += (float) ($bucket['consumed_hours'] ?? 0);
        }

        return round($sum, 2);
    }

    /**
     * @param  iterable<object|array<string, mixed>>  $topupRows  ordered oldest → newest
     * @return array{
     *   base_quota_hours: float,
     *   topup_total_hours: float,
     *   total_quota_hours: float,
     *   has_topup: bool,
     *   overflow_hours: float,
     *   buckets: list<array<string, mixed>>
     * }
     */
    public static function build(float $totalManhours, iterable $topupRows, float $consumedHours): array
    {
        $topups = [];
        foreach ($topupRows as $row) {
            $hours = (float) (is_array($row) ? ($row['topup_hours'] ?? 0) : ($row->topup_hours ?? 0));
            if ($hours <= 0) {
                continue;
            }
            $topups[] = $row;
        }

        $topupTotal = 0.0;
        foreach ($topups as $row) {
            $topupTotal += (float) (is_array($row) ? ($row['topup_hours'] ?? 0) : ($row->topup_hours ?? 0));
        }

        $baseQuota = max(0, $totalManhours - $topupTotal);
        $totalQuota = $baseQuota + $topupTotal;
        $remaining = max(0, $consumedHours);
        $buckets = [];

        $baseConsumed = min($remaining, $baseQuota);
        $remaining -= $baseConsumed;
        $buckets[] = self::bucket(
            kind: 'base',
            label: 'Initial',
            order: 0,
            quotaHours: $baseQuota,
            consumedHours: $baseConsumed,
            row: null,
        );

        foreach ($topups as $index => $row) {
            $quota = (float) (is_array($row) ? ($row['topup_hours'] ?? 0) : ($row->topup_hours ?? 0));
            $consumed = min($remaining, $quota);
            $remaining -= $consumed;
            $description = is_array($row) ? ($row['description'] ?? '') : ($row->description ?? '');
            $buckets[] = self::bucket(
                kind: 'topup',
                label: 'Top Up #'.($index + 1),
                order: $index + 1,
                quotaHours: $quota,
                consumedHours: $consumed,
                row: $row,
                description: $description,
            );
        }

        return [
            'base_quota_hours' => round($baseQuota, 2),
            'topup_total_hours' => round($topupTotal, 2),
            'total_quota_hours' => round($totalQuota, 2),
            'has_topup' => $topupTotal > 0,
            'overflow_hours' => round(max(0, $remaining), 2),
            'buckets' => $buckets,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function bucket(
        string $kind,
        string $label,
        int $order,
        float $quotaHours,
        float $consumedHours,
        mixed $row,
        string $description = '',
    ): array {
        $remaining = max(0, $quotaHours - $consumedHours);
        $remainingPct = $quotaHours > 0 ? round(($remaining / $quotaHours) * 100, 1) : 0.0;
        $consumedPct = $quotaHours > 0 ? round(($consumedHours / $quotaHours) * 100, 1) : 0.0;

        $payload = [
            'kind' => $kind,
            'label' => $label,
            'order' => $order,
            'quota_hours' => round($quotaHours, 2),
            'consumed_hours' => round($consumedHours, 2),
            'remaining_hours' => round($remaining, 2),
            'remaining_pct' => $remainingPct,
            'consumed_pct' => $consumedPct,
            'description' => $description !== '' ? $description : null,
        ];

        if ($row !== null) {
            $payload['topup_id'] = (int) (is_array($row) ? ($row['id'] ?? 0) : ($row->id ?? 0));
            $createdAt = is_array($row) ? ($row['created_at'] ?? null) : ($row->created_at ?? null);
            $payload['created_at'] = $createdAt;
        }

        return $payload;
    }
}
