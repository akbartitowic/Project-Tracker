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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('status');
            $table->string('budget_status');
            $table->integer('completion');
            $table->string('methodology')->nullable();
            $table->json('jobs')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->integer('total_manhours')->nullable();
            $table->decimal('hourly_rate', 15, 2)->nullable();
            $table->decimal('total_cost', 15, 2)->nullable();
            $table->decimal('quotation_value', 15, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
