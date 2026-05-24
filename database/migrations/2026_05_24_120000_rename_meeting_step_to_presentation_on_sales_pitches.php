<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sales_pitches')
            ->where('current_step', 'meeting')
            ->update(['current_step' => 'presentation']);

        foreach (DB::table('sales_pitches')->whereNotNull('step_reached_at')->cursor() as $row) {
            $reached = json_decode($row->step_reached_at, true);
            if (!is_array($reached) || !array_key_exists('meeting', $reached)) {
                continue;
            }
            $reached['presentation'] = $reached['presentation'] ?? $reached['meeting'];
            unset($reached['meeting']);
            DB::table('sales_pitches')
                ->where('id', $row->id)
                ->update(['step_reached_at' => json_encode($reached)]);
        }
    }

    public function down(): void
    {
        DB::table('sales_pitches')
            ->where('current_step', 'presentation')
            ->update(['current_step' => 'meeting']);

        foreach (DB::table('sales_pitches')->whereNotNull('step_reached_at')->cursor() as $row) {
            $reached = json_decode($row->step_reached_at, true);
            if (!is_array($reached) || !array_key_exists('presentation', $reached)) {
                continue;
            }
            $reached['meeting'] = $reached['meeting'] ?? $reached['presentation'];
            unset($reached['presentation']);
            DB::table('sales_pitches')
                ->where('id', $row->id)
                ->update(['step_reached_at' => json_encode($reached)]);
        }
    }
};
