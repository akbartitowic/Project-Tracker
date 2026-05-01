<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presale_role_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presale_id')->constrained('presales')->cascadeOnDelete();
            $table->foreignId('project_role_id')->constrained('project_roles')->cascadeOnDelete();
            $table->decimal('business_mh', 10, 2)->nullable();
            $table->decimal('development_mh', 10, 2)->nullable();
            $table->timestamps();
            $table->unique(['presale_id', 'project_role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presale_role_requirements');
    }
};
