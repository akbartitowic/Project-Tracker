<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presale_operation_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presale_id')->constrained('presales')->cascadeOnDelete();
            $table->foreignId('project_role_id')->constrained('project_roles')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['presale_id', 'project_role_id', 'user_id'], 'presale_role_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presale_operation_assignments');
    }
};
