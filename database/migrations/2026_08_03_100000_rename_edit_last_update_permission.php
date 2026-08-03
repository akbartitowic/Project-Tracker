<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Permission "project_board.edit_last_update" existed in the DB but was never
     * rendered by the Access Control UI (frontend only looped over
     * create/read/update/delete), so no role could ever be granted it there.
     * Renaming to match the new UI label now that it's a selectable entry.
     */
    public function up(): void
    {
        DB::table('permissions')
            ->where('slug', 'project_board.edit_last_update')
            ->update(['name' => 'Update Date Task Manual Project Board']);
    }

    public function down(): void
    {
        DB::table('permissions')
            ->where('slug', 'project_board.edit_last_update')
            ->update(['name' => 'Edit Last Update Project Board']);
    }
};
