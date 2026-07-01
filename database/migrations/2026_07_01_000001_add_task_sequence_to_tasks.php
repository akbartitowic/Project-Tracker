<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedInteger('task_sequence')->nullable()->after('project_sequence');
        });

        // Backfill: assign sequential numbers per parent_task_id ordered by id
        $parentIds = DB::table('tasks')
            ->select('parent_task_id')
            ->distinct()
            ->whereNotNull('parent_task_id')
            ->pluck('parent_task_id');

        foreach ($parentIds as $parentId) {
            $subtaskIds = DB::table('tasks')
                ->where('parent_task_id', $parentId)
                ->orderBy('id')
                ->pluck('id');

            foreach ($subtaskIds as $seq => $taskId) {
                DB::table('tasks')
                    ->where('id', $taskId)
                    ->update(['task_sequence' => $seq + 1]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('task_sequence');
        });
    }
};
