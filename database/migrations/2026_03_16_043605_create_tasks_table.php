<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->string('title');
            $table->string('feature_title')->nullable();
            $table->text('description')->nullable();
            $table->string('status');
            $table->string('priority');
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('estimated_hours', 8, 2)->default(0);
            $table->foreignId('project_role_id')->nullable()->constrained('project_roles')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
