<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_load_excluded_dates', function (Blueprint $table) {
            $table->id();
            $table->date('excluded_date')->unique();
            $table->string('label', 120)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_load_excluded_dates');
    }
};
