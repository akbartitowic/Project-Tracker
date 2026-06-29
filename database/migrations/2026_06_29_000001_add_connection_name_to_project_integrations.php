<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            // Drop FK + unique first, then re-add FK without unique
            $table->dropForeign(['project_id']);
            $table->dropUnique('project_integrations_project_id_unique');
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();

            $table->string('connection_name', 100)->after('project_id')->default('Default');
            $table->timestamp('last_used_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn(['connection_name', 'last_used_at']);
            // Restore unique (may fail if duplicate project_id rows exist)
            $table->unique('project_id');
        });
    }
};
