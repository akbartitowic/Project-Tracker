<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ProjectIntegration extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'project_id',
        'connection_name',
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

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public static function generateApiKey(): string
    {
        return 'hbt_' . Str::random(48);
    }

    public static function generateSecret(): string
    {
        return Str::random(32);
    }
}
