<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('user_id');
            $table->string('category', 32);
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('url', 2048)->nullable();
            $table->timestamps();

            $table->foreign('project_id', MigrationNames::fk('pn', 'project'))
                ->references('id')->on('projects')
                ->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('pn', 'user'))
                ->references('id')->on('users')
                ->cascadeOnDelete();

            $table->index(['project_id', 'category', 'created_at'], MigrationNames::idx('pn', 'proj_cat'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_notes');
    }
};
