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
        Schema::create('presales', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sector')->nullable();
            $table->decimal('estimated_value', 15, 2)->nullable();
            $table->text('description')->nullable();
            $table->string('status')->default('Lead');
            $table->string('proposal_doc_url')->nullable();
            $table->text('presentation_log')->nullable();
            $table->decimal('quotation_value', 15, 2)->nullable();
            $table->string('lost_reason')->nullable();
            $table->string('competitor')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('presales');
    }
};
