<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional per-client-user project restriction. No rows for a client user =
 * unrestricted (sees every project under their company); rows present =
 * restricted to just those projects. See App\Support\ProjectAccess::clientVisibleProjectIds().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_user_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('project_id');
            $table->timestamps();

            $table->foreign('user_id', MigrationNames::fk('cup', 'user'))
                ->references('id')->on('users')
                ->cascadeOnDelete();
            $table->foreign('project_id', MigrationNames::fk('cup', 'project'))
                ->references('id')->on('projects')
                ->cascadeOnDelete();
            $table->unique(['user_id', 'project_id'], MigrationNames::uq('cup', 'user_project'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_user_projects');
    }
};
