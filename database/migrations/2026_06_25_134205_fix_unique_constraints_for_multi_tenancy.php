<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // roles: drop global unique on name, add composite unique (name, organization_id)
        Schema::table('roles', function (Blueprint $table) {
            $table->dropUnique('roles_name_unique');
            $table->unique(['name', 'organization_id'], 'roles_name_org_unique');
        });

        // finance_categories: drop global unique on name, add composite unique
        Schema::table('finance_categories', function (Blueprint $table) {
            $table->dropUnique('finance_categories_name_unique');
            $table->unique(['name', 'organization_id'], 'finance_categories_name_org_unique');
        });

        // project_roles: drop global unique on name, add composite unique
        Schema::table('project_roles', function (Blueprint $table) {
            $table->dropUnique('project_roles_name_unique');
            $table->unique(['name', 'organization_id'], 'project_roles_name_org_unique');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropUnique('roles_name_org_unique');
            $table->unique('name', 'roles_name_unique');
        });

        Schema::table('finance_categories', function (Blueprint $table) {
            $table->dropUnique('finance_categories_name_org_unique');
            $table->unique('name', 'finance_categories_name_unique');
        });

        Schema::table('project_roles', function (Blueprint $table) {
            $table->dropUnique('project_roles_name_org_unique');
            $table->unique('name', 'project_roles_name_unique');
        });
    }
};
