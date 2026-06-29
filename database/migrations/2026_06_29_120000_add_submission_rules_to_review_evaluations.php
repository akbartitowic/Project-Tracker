<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_evaluations', function (Blueprint $table) {
            // How many days after trigger the form is still open. null = no time limit.
            $table->unsignedSmallInteger('active_days')->nullable()->after('order');
            // Max number of total submissions per project evaluation. null = unlimited.
            $table->unsignedSmallInteger('max_submissions')->nullable()->after('active_days');
            // Whether a single user can submit more than once. false = one submission per user.
            $table->boolean('one_per_user')->default(false)->after('max_submissions');
        });
    }

    public function down(): void
    {
        Schema::table('review_evaluations', function (Blueprint $table) {
            $table->dropColumn(['active_days', 'max_submissions', 'one_per_user']);
        });
    }
};
