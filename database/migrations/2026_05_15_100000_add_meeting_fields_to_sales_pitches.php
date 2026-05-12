<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->timestamp('meeting_at')->nullable()->after('quotation_url');
            $table->string('meeting_location', 500)->nullable()->after('meeting_at');
            $table->string('meeting_mode', 16)->nullable()->after('meeting_location');
        });
    }

    public function down(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->dropColumn(['meeting_at', 'meeting_location', 'meeting_mode']);
        });
    }
};
