<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Splits the single `task_email_notifications_enabled` flag into one toggle per
     * notification type (Notification Center feature) — existing value is carried
     * over to the three task-related toggles it used to gate, so nobody's current
     * preference is silently reset. `notify_login_alert` has no prior signal (login
     * alerts were always-on before this), so it defaults true — same behavior as today.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_task_assigned')->default(true)->after('task_email_notifications_enabled');
            $table->boolean('notify_task_due_reminder')->default(true)->after('notify_task_assigned');
            $table->boolean('notify_task_mention')->default(true)->after('notify_task_due_reminder');
            $table->boolean('notify_mh_threshold')->default(true)->after('notify_task_mention');
            $table->boolean('notify_login_alert')->default(true)->after('notify_mh_threshold');
        });

        // Single-table copy (no JOIN) so it stays portable across MySQL (dev/prod)
        // and PostgreSQL (test suite) — see task_assignees.mh migration note.
        DB::table('users')->update([
            'notify_task_assigned' => DB::raw('task_email_notifications_enabled'),
            'notify_task_due_reminder' => DB::raw('task_email_notifications_enabled'),
            'notify_task_mention' => DB::raw('task_email_notifications_enabled'),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('task_email_notifications_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('task_email_notifications_enabled')->default(true)->after('status');
        });

        DB::table('users')->update([
            'task_email_notifications_enabled' => DB::raw('notify_task_assigned'),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'notify_task_assigned',
                'notify_task_due_reminder',
                'notify_task_mention',
                'notify_mh_threshold',
                'notify_login_alert',
            ]);
        });
    }
};
