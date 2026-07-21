<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id');
            $table->foreignId('user_id');
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->foreign('task_id', MigrationNames::fk('tka', 'task'))
                ->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('tka', 'user'))
                ->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['task_id', 'user_id'], MigrationNames::uq('tka', 'task_user'));
        });

        // Backfill: every task's existing single assignee becomes its initial active assignee.
        $now = now();
        DB::table('tasks')
            ->whereNotNull('assignee_id')
            ->orderBy('id')
            ->select('id', 'assignee_id')
            ->chunkById(500, function ($tasks) use ($now) {
                $rows = $tasks->map(fn ($t) => [
                    'task_id' => $t->id,
                    'user_id' => $t->assignee_id,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();
                DB::table('task_assignees')->insert($rows);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_assignees');
    }
};
