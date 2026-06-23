<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GlobalIntegration extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'inbound_api_key',
        'webhook_url',
        'webhook_secret',
        'is_active',
        'webhook_last_sent_at',
        'webhook_last_status',
        'webhook_test_sent_at',
        'webhook_test_status',
    ];

    protected $casts = [
        'is_active'            => 'boolean',
        'webhook_last_sent_at' => 'datetime',
        'webhook_test_sent_at' => 'datetime',
    ];

    /** Always return the single global record, creating it if needed. */
    public static function instance(): self
    {
        return self::firstOrCreate(
            ['id' => 1],
            [
                'inbound_api_key' => self::generateApiKey(),
                'webhook_secret'  => self::generateSecret(),
                'is_active'       => true,
            ]
        );
    }

    public static function generateApiKey(): string
    {
        return 'hbt_global_' . Str::random(40);
    }

    public static function generateSecret(): string
    {
        return Str::random(32);
    }
}
