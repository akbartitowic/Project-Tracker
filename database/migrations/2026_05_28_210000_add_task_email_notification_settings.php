<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('task_email_notifications_enabled')
                ->default(true)
                ->after('status');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->timestamp('last_due_reminder_sent_at')
                ->nullable()
                ->after('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('last_due_reminder_sent_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('task_email_notifications_enabled');
        });
    }
};

