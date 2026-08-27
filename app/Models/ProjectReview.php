<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectReview extends Model
{
    protected $fillable = [
        'project_id', 'evaluation_id', 'submitted_by', 'notes', 'total_score',
        'reviewer_name', 'reviewer_company', 'reviewer_position', 'token_id',
        'excluded_at', 'excluded_by',
    ];

    protected $casts = [
        'total_score' => 'float',
        'excluded_at' => 'datetime',
    ];

    /**
     * Only submissions that still count toward aggregations (Overall score,
     * radar, dashboard proportions). Excluded ones stay in the DB and remain
     * visible in the history list, they just don't feed any calculation.
     */
    public function scopeCounted($query)
    {
        return $query->whereNull('excluded_at');
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(ReviewEvaluation::class, 'evaluation_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function excludedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'excluded_by');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ProjectReviewAnswer::class, 'review_id');
    }
}
