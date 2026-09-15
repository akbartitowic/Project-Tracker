<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('user_type', 20)->default('internal')->after('role');
            $table->foreignId('company_id')->nullable()->after('user_type');
            $table->foreign('company_id', MigrationNames::fk('us', 'co'))
                ->references('id')->on('companies')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('us', 'co'));
            $table->dropColumn(['company_id', 'user_type']);
        });
    }
};
