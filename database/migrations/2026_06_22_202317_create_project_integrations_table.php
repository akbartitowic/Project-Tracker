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
        Schema::create('project_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('projects')->cascadeOnDelete();
            $table->string('inbound_api_key', 64)->unique();
            $table->string('webhook_url', 2048)->nullable();
            $table->string('webhook_secret', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('webhook_last_sent_at')->nullable();
            $table->string('webhook_last_status', 32)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_integrations');
    }
};
