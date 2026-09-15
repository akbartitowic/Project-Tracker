<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_questions', function (Blueprint $table) {
            // Weighted questions: admin chooses whether the guidance/description is
            // mandatory. Default false (optional). Non-weighted questions ignore this
            // flag — their description is always required (it is the whole content).
            $table->boolean('description_required')->default(false)->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('review_questions', function (Blueprint $table) {
            $table->dropColumn('description_required');
        });
    }
};
