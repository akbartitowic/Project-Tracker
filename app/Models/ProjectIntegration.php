<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ProjectIntegration extends Model
{
    protected $fillable = [
        'project_id',
        'inbound_api_key',
        'webhook_url',
        'webhook_secret',
        'is_active',
        'webhook_last_sent_at',
        'webhook_last_status',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'webhook_last_sent_at' => 'datetime',
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
