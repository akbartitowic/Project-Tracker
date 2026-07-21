<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_note_mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_note_id');
            $table->foreignId('user_id');
            $table->timestamps();

            $table->foreign('task_note_id', MigrationNames::fk('tnm', 'note'))
                ->references('id')->on('task_notes')->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('tnm', 'user'))
                ->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['task_note_id', 'user_id'], MigrationNames::uq('tnm', 'note_user'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_note_mentions');
    }
};
