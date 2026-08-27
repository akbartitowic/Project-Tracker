<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_reviews', function (Blueprint $table) {
            // Soft "exclude from calculation": the submission + its answers stay
            // in place and remain visible, but every aggregation (Overall score,
            // radar chart, dashboard proportions) skips rows where excluded_at
            // is set. Reversible — clearing excluded_at counts it again.
            $table->timestamp('excluded_at')->nullable()->after('total_score');
            $table->unsignedBigInteger('excluded_by')->nullable()->after('excluded_at');
            $table->foreign('excluded_by', MigrationNames::fk('prv', 'user'))
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_reviews', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('prv', 'user'));
            $table->dropColumn(['excluded_at', 'excluded_by']);
        });
    }
};
