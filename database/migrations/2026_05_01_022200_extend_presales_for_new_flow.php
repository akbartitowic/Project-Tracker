<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presales', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->nullOnDelete();
            $table->string('project_name')->nullable()->after('name');
            $table->foreignId('project_category_id')->nullable()->after('project_name')->constrained('project_categories')->nullOnDelete();
            $table->decimal('estimated_budget', 15, 2)->nullable()->after('estimated_value');
            $table->text('project_description')->nullable()->after('description');

            $table->string('deck_url')->nullable()->after('proposal_doc_url');
            $table->string('quotation_url')->nullable()->after('deck_url');
            $table->string('drive_url')->nullable()->after('quotation_url');
            $table->string('methodology')->nullable()->after('drive_url');
            $table->decimal('total_manhours', 10, 2)->nullable()->after('methodology');

            $table->timestamp('business_acknowledged_at')->nullable()->after('total_manhours');
            $table->foreignId('business_acknowledged_by')->nullable()->after('business_acknowledged_at')->constrained('users')->nullOnDelete();
            $table->timestamp('development_acknowledged_at')->nullable()->after('business_acknowledged_by');
            $table->foreignId('development_acknowledged_by')->nullable()->after('development_acknowledged_at')->constrained('users')->nullOnDelete();
            $table->timestamp('operation_acknowledged_at')->nullable()->after('development_acknowledged_by');
            $table->foreignId('operation_acknowledged_by')->nullable()->after('operation_acknowledged_at')->constrained('users')->nullOnDelete();
            $table->timestamp('converted_at')->nullable()->after('operation_acknowledged_by');
            $table->foreignId('converted_project_id')->nullable()->after('converted_at')->constrained('projects')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('presales', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['project_category_id']);
            $table->dropForeign(['business_acknowledged_by']);
            $table->dropForeign(['development_acknowledged_by']);
            $table->dropForeign(['operation_acknowledged_by']);
            $table->dropForeign(['converted_project_id']);

            $table->dropColumn([
                'company_id',
                'project_name',
                'project_category_id',
                'estimated_budget',
                'project_description',
                'deck_url',
                'quotation_url',
                'drive_url',
                'methodology',
                'total_manhours',
                'business_acknowledged_at',
                'business_acknowledged_by',
                'development_acknowledged_at',
                'development_acknowledged_by',
                'operation_acknowledged_at',
                'operation_acknowledged_by',
                'converted_at',
                'converted_project_id',
            ]);
        });
    }
};
