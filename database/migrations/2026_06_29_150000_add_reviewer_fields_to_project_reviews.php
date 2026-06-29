<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_reviews', function (Blueprint $table) {
            // Drop existing FK so we can make submitted_by nullable
            $table->dropForeign(['submitted_by']);
            $table->unsignedBigInteger('submitted_by')->nullable()->change();

            $table->string('reviewer_name', 150)->nullable()->after('submitted_by');
            $table->string('reviewer_company', 150)->nullable()->after('reviewer_name');
            $table->string('reviewer_position', 100)->nullable()->after('reviewer_company');
            $table->foreignId('token_id')->nullable()->constrained('review_tokens')->nullOnDelete()->after('reviewer_position');
        });
    }

    public function down(): void
    {
        Schema::table('project_reviews', function (Blueprint $table) {
            $table->dropForeign(['token_id']);
            $table->dropColumn(['reviewer_name', 'reviewer_company', 'reviewer_position', 'token_id']);
            $table->unsignedBigInteger('submitted_by')->nullable(false)->change();
            $table->foreign('submitted_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
