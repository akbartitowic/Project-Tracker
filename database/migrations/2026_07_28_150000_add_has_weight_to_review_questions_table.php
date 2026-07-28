<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_questions', function (Blueprint $table) {
            $table->boolean('has_weight')->default(true)->after('weight');
        });
    }

    public function down(): void
    {
        Schema::table('review_questions', function (Blueprint $table) {
            $table->dropColumn('has_weight');
        });
    }
};
