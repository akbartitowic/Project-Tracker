<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Tables that belong to an organization (all business data)
    private array $tables = [
        'roles',
        'projects',
        'project_roles',
        'project_role_quotas',
        'project_members',
        'tasks',
        'manhours',
        'presales',
        'presale_role_requirements',
        'presale_operation_assignments',
        'finance_categories',
        'project_allocations',
        'financial_records',
        'companies',
        'project_categories',
        'sales_pitches',
        'sales_category_projects',
        'team_load_excluded_dates',
        'project_notes',
        'task_notes',
        'report_schedules',
        'project_integrations',
        'global_integrations',
        'settings',
        'activity_logs',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasColumn($table, 'organization_id')) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    $t->foreignId('organization_id')
                        ->nullable()
                        ->after('id')
                        ->constrained()
                        ->nullOnDelete();
                    $t->index('organization_id', "idx_{$table}_org");
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasColumn($table, 'organization_id')) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    $t->dropIndex("idx_{$table}_org");
                    $t->dropForeign(['organization_id']);
                    $t->dropColumn('organization_id');
                });
            }
        }
    }
};
