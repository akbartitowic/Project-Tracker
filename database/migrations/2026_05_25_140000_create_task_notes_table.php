<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id');
            $table->unsignedBigInteger('user_id');
            $table->text('body');
            $table->timestamps();

            $table->foreign('task_id', MigrationNames::fk('tn', 'task'))
                ->references('id')->on('tasks')
                ->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('tn', 'user'))
                ->references('id')->on('users')
                ->cascadeOnDelete();

            $table->index(['task_id', 'created_at'], MigrationNames::idx('tn', 'task_created'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_notes');
    }
};
