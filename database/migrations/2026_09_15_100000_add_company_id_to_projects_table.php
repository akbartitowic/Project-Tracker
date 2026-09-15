<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id');
            $table->foreign('company_id', MigrationNames::fk('pr', 'co'))
                ->references('id')->on('companies')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('pr', 'co'));
            $table->dropColumn('company_id');
        });
    }
};
