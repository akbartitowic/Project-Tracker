<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Calibration now feeds the score once a submission's calibration is
     * *locked*:
     *  - review_calibration_votes.proposed_score / reason — a disagreeing
     *    calibrator must supply their own 1–10 score + a reason.
     *  - project_review_answers.calibrated_score — the effective per-question
     *    score (average across all calibrators: original score per "agree" vote,
     *    proposed score per "disagree" vote), snapshotted at lock time.
     *  - project_reviews.calibrated_score — the recomputed weighted total, also
     *    snapshotted at lock. While calibration_locked_at is set, every
     *    aggregation (Overall, radar, dashboard proportions, project cards) uses
     *    calibrated_score instead of total_score. Reversible (unlock clears them).
     */
    public function up(): void
    {
        Schema::table('review_calibration_votes', function (Blueprint $table) {
            $table->unsignedTinyInteger('proposed_score')->nullable()->after('agree');
            $table->text('reason')->nullable()->after('proposed_score');
        });

        Schema::table('project_reviews', function (Blueprint $table) {
            $table->decimal('calibrated_score', 5, 2)->nullable()->after('total_score');
            $table->timestamp('calibration_locked_at')->nullable()->after('calibrated_score');
            $table->unsignedBigInteger('calibration_locked_by')->nullable()->after('calibration_locked_at');
            $table->foreign('calibration_locked_by', MigrationNames::fk('prv', 'calib_user'))
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        Schema::table('project_review_answers', function (Blueprint $table) {
            $table->decimal('calibrated_score', 5, 2)->nullable()->after('score');
        });
    }

    public function down(): void
    {
        Schema::table('project_review_answers', function (Blueprint $table) {
            $table->dropColumn('calibrated_score');
        });

        Schema::table('project_reviews', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('prv', 'calib_user'));
            $table->dropColumn(['calibrated_score', 'calibration_locked_at', 'calibration_locked_by']);
        });

        Schema::table('review_calibration_votes', function (Blueprint $table) {
            $table->dropColumn(['proposed_score', 'reason']);
        });
    }
};
