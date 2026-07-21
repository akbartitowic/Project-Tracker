<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_assignees', function (Blueprint $table) {
            $table->decimal('mh', 8, 2)->nullable()->after('is_active');
        });

        // Every existing pivot row is (still) a task's sole assignee — it owns 100% of the task's hours.
        // Looped in PHP (rather than an UPDATE...JOIN) so this runs the same on MySQL and Postgres.
        DB::table('task_assignees')->orderBy('id')->chunkById(500, function ($rows) {
            $hoursByTask = DB::table('tasks')
                ->whereIn('id', $rows->pluck('task_id')->unique())
                ->pluck('estimated_hours', 'id');

            foreach ($rows as $row) {
                DB::table('task_assignees')
                    ->where('id', $row->id)
                    ->update(['mh' => $hoursByTask[$row->task_id] ?? 0]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('task_assignees', function (Blueprint $table) {
            $table->dropColumn('mh');
        });
    }
};
