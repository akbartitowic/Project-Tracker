<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_field_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id');
            $table->foreignId('user_id')->nullable();
            $table->string('field');
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('task_id', MigrationNames::fk('tfc', 'task'))
                ->references('id')->on('tasks')
                ->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('tfc', 'user'))
                ->references('id')->on('users')
                ->nullOnDelete();
            $table->index(['task_id', 'created_at'], MigrationNames::idx('tfc', 'task_created'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_field_changes');
    }
};
