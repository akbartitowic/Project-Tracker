<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GlobalIntegration extends Model
{
    protected $fillable = [
        'name',
        'inbound_api_key',
        'webhook_url',
        'webhook_secret',
        'is_active',
        'last_used_at',
        'webhook_last_sent_at',
        'webhook_last_status',
        'webhook_test_sent_at',
        'webhook_test_status',
    ];

    protected $casts = [
        'is_active'            => 'boolean',
        'last_used_at'         => 'datetime',
        'webhook_last_sent_at' => 'datetime',
        'webhook_test_sent_at' => 'datetime',
    ];

    public static function generateApiKey(): string
    {
        return 'hbt_global_' . Str::random(40);
    }

    public static function generateSecret(): string
    {
        return Str::random(32);
    }
}
