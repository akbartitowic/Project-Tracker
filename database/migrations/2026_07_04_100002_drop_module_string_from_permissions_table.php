<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropForeign(['module_id']);
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->foreignId('module_id')->nullable(false)->change();
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->foreign('module_id')->references('id')->on('modules')->restrictOnDelete();
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->dropColumn('module');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Restores the `module` string column and repopulates it by joining
     * back through `module_id`, so old code relying on the raw string
     * (groupBy('module'), etc.) keeps working immediately after rollback.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('module')->nullable()->after('slug');
        });

        DB::table('permissions as p')
            ->join('modules as m', 'p.module_id', '=', 'm.id')
            ->update(['p.module' => DB::raw('m.name')]);

        Schema::table('permissions', function (Blueprint $table) {
            $table->dropForeign(['module_id']);
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->foreignId('module_id')->nullable()->change();
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->foreign('module_id')->references('id')->on('modules')->nullOnDelete();
        });
    }
};
