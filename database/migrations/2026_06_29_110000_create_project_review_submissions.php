<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluation_id')->constrained('review_evaluations')->cascadeOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->decimal('total_score', 5, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('project_review_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained('project_reviews')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('review_questions')->cascadeOnDelete();
            $table->unsignedTinyInteger('score');
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_review_answers');
        Schema::dropIfExists('project_reviews');
    }
};
