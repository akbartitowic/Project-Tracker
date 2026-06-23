<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->timestamp('webhook_test_sent_at')->nullable()->after('webhook_last_status');
            $table->string('webhook_test_status', 32)->nullable()->after('webhook_test_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn(['webhook_test_sent_at', 'webhook_test_status']);
        });
    }
};
