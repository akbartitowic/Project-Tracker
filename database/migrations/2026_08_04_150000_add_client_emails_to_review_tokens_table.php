<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_tokens', function (Blueprint $table) {
            $table->json('client_emails')->nullable()->after('is_active');
            $table->timestamp('email_sent_at')->nullable()->after('client_emails');
        });
    }

    public function down(): void
    {
        Schema::table('review_tokens', function (Blueprint $table) {
            $table->dropColumn(['client_emails', 'email_sent_at']);
        });
    }
};
