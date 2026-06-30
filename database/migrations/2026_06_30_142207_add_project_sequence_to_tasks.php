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
            $table->unsignedInteger('project_sequence')->nullable()->after('project_id');
        });

        // Backfill: assign sequential numbers per project ordered by id
        $projectIds = DB::table('tasks')
            ->select('project_id')
            ->distinct()
            ->whereNotNull('project_id')
            ->pluck('project_id');

        foreach ($projectIds as $projectId) {
            $taskIds = DB::table('tasks')
                ->where('project_id', $projectId)
                ->orderBy('id')
                ->pluck('id');

            foreach ($taskIds as $seq => $taskId) {
                DB::table('tasks')
                    ->where('id', $taskId)
                    ->update(['project_sequence' => $seq + 1]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('project_sequence');
        });
    }
};
