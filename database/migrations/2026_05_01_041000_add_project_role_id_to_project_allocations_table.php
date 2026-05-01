<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->foreignId('project_role_id')
                ->nullable()
                ->after('category_id')
                ->constrained('project_roles')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_role_id');
        });
    }
};
