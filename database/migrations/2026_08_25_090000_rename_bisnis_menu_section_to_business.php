<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The original menu_items seed migration used 'Bisnis' as the sidebar section
 * label — a leftover from before the UI language rule was switched to English.
 * That migration already ran on existing databases (and has since been
 * corrected for fresh installs), so this data-only fix catches up already
 * migrated environments.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('menu_items')->where('section', 'Bisnis')->update(['section' => 'Business']);
    }

    public function down(): void
    {
        DB::table('menu_items')->where('section', 'Business')->update(['section' => 'Bisnis']);
    }
};
