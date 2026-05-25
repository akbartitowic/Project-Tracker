<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_task_id')->nullable()->after('project_id');
            $table->unsignedSmallInteger('sort_order')->default(0)->after('parent_task_id');

            $table->foreign('parent_task_id', MigrationNames::fk('tk', 'parent'))
                ->references('id')->on('tasks')
                ->cascadeOnDelete();

            $table->index('parent_task_id', MigrationNames::idx('tk', 'parent'));
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('tk', 'parent'));
            $table->dropIndex(MigrationNames::idx('tk', 'parent'));
            $table->dropColumn(['parent_task_id', 'sort_order']);
        });
    }
};
