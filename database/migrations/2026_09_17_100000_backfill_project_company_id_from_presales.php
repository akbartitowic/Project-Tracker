<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * projects.company_id was added nullable with no backfill — every project
 * created before that migration (i.e. almost all of them) has company_id
 * NULL, which makes Client Monitoring appear empty for those companies.
 * Backfill it from presales.company_id for projects that came from a
 * converted presale. Portable single-table UPDATE (no JOIN), matching the
 * project's MySQL/Postgres portability convention.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('presales')
            ->whereNotNull('converted_project_id')
            ->whereNotNull('company_id')
            ->select('converted_project_id', 'company_id')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('projects')
                        ->where('id', $row->converted_project_id)
                        ->whereNull('company_id')
                        ->update(['company_id' => $row->company_id]);
                }
            }, 'converted_project_id');
    }

    public function down(): void
    {
        // Data backfill only — intentionally not reversible.
    }
};
