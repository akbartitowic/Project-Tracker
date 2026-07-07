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
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_superuser')->default(false)->after('status');
        });

        // Preserve current behavior exactly: only the one account that was
        // previously hardcoded by email in User::hasPermission() /
        // UserAccess::isPrivileged() gets the bypass.
        DB::table('users')
            ->whereRaw('LOWER(email) = ?', ['tito@noohtify.com'])
            ->update(['is_superuser' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_superuser');
        });
    }
};
