<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $topups = DB::table('project_allocations')
            ->where('is_topup', true)
            ->whereNull('project_role_id')
            ->orderBy('id')
            ->get(['id', 'project_id', 'created_at']);

        foreach ($topups as $topup) {
            if (!$topup->created_at) {
                continue;
            }

            $createdAt = Carbon::parse($topup->created_at);

            $candidates = DB::table('project_role_quotas')
                ->where('project_id', $topup->project_id)
                ->whereBetween('updated_at', [
                    $createdAt->copy()->subSeconds(30),
                    $createdAt->copy()->addSeconds(30),
                ])
                ->get(['project_role_id', 'updated_at']);

            if ($candidates->isEmpty()) {
                continue;
            }

            $bestMatch = $candidates->sortBy(function ($candidate) use ($createdAt) {
                return abs(Carbon::parse($candidate->updated_at)->diffInSeconds($createdAt, false));
            })->first();

            if ($bestMatch?->project_role_id) {
                DB::table('project_allocations')
                    ->where('id', $topup->id)
                    ->update(['project_role_id' => $bestMatch->project_role_id]);
            }
        }
    }

    public function down(): void
    {
        // Data backfill migration is intentionally irreversible.
    }
};
