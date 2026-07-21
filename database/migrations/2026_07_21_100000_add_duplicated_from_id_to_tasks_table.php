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
            $table->foreignId('duplicated_from_id')->nullable()->after('parent_task_id');
            $table->foreign('duplicated_from_id', MigrationNames::fk('tk', 'dup'))
                ->references('id')->on('tasks')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('tk', 'dup'));
            $table->dropColumn('duplicated_from_id');
        });
    }
};
