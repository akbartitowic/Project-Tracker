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
            $table->foreignId('module_id')->nullable()->after('module')
                ->constrained('modules')->nullOnDelete();
        });

        $moduleNames = DB::table('permissions')->distinct()->pluck('module');

        foreach ($moduleNames as $moduleName) {
            $moduleId = DB::table('modules')->where('name', $moduleName)->value('id');

            if ($moduleId) {
                DB::table('permissions')->where('module', $moduleName)->update(['module_id' => $moduleId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('module_id');
        });
    }
};
