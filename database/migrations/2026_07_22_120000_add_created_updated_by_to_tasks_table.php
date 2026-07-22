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
            $table->foreignId('created_by_id')->nullable()->after('duplicated_from_id');
            $table->foreignId('updated_by_id')->nullable()->after('created_by_id');

            $table->foreign('created_by_id', MigrationNames::fk('tk', 'creator'))
                ->references('id')->on('users')
                ->nullOnDelete();
            $table->foreign('updated_by_id', MigrationNames::fk('tk', 'updater'))
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('tk', 'creator'));
            $table->dropForeign(MigrationNames::fk('tk', 'updater'));
            $table->dropColumn(['created_by_id', 'updated_by_id']);
        });
    }
};
