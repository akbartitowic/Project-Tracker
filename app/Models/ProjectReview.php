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
    ];

    protected $casts = ['total_score' => 'float'];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(ReviewEvaluation::class, 'evaluation_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ProjectReviewAnswer::class, 'review_id');
    }
}
