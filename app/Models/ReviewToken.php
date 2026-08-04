<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewToken extends Model
{
    protected $fillable = [
        'token', 'project_id', 'evaluation_id', 'created_by', 'expires_at', 'is_active',
        'client_emails', 'email_sent_at',
    ];

    protected $casts = [
        'is_active'      => 'boolean',
        'expires_at'     => 'datetime',
        'client_emails'  => 'array',
        'email_sent_at'  => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(ReviewEvaluation::class, 'evaluation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isUsable(): bool
    {
        return $this->is_active && !$this->isExpired();
    }
}
