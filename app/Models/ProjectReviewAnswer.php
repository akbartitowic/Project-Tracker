<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectReviewAnswer extends Model
{
    protected $fillable = ['review_id', 'question_id', 'score', 'comment', 'calibrated_score'];

    protected $casts = ['score' => 'integer', 'calibrated_score' => 'float'];

    public function question(): BelongsTo
    {
        return $this->belongsTo(ReviewQuestion::class, 'question_id');
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(ProjectReview::class, 'review_id');
    }
}
