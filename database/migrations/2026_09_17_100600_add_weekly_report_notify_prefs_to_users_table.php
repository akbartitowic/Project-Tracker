<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Two new personal notification toggles (Notification Center) for the Weekly Report module. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_weekly_report_assigned')->default(true)->after('notify_login_alert');
            $table->boolean('notify_weekly_report_due')->default(true)->after('notify_weekly_report_assigned');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['notify_weekly_report_assigned', 'notify_weekly_report_due']);
        });
    }
};
