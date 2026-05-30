<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_schedules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                ->constrained('projects')
                ->cascadeOnDelete();

            $table->foreignId('created_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('frequency', 16);       // weekly | biweekly | monthly
            $table->tinyInteger('day_of_week');    // 0=Sun … 6=Sat
            $table->string('send_time', 5);        // HH:MM in user's timezone
            $table->string('timezone', 64)->default('Asia/Jakarta');

            $table->date('end_date')->nullable();

            $table->json('emails');                // ["a@b.com", ...]
            $table->string('subject');
            $table->text('body');

            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();

            $table->timestamps();

            $table->index('next_run_at', MigrationNames::idx('rs', 'next_run'));
            $table->index(['is_active', 'next_run_at'], MigrationNames::idx('rs', 'active_next'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_schedules');
    }
};
