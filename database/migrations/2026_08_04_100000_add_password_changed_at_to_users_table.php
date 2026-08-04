<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });

        // Existing accounts: treat account creation as their last password set, so the
        // 6-month expiry clock starts from a real date. Single-table column copy — portable
        // across MySQL/Postgres (unlike UPDATE...JOIN, which isn't).
        DB::table('users')->whereNull('password_changed_at')->update(['password_changed_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
        });
    }
};
