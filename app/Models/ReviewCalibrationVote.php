<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewCalibrationVote extends Model
{
    protected $fillable = ['review_id', 'question_id', 'user_id', 'agree', 'proposed_score', 'reason'];

    protected $casts = ['agree' => 'boolean', 'proposed_score' => 'integer'];

    public function review(): BelongsTo
    {
        return $this->belongsTo(ProjectReview::class, 'review_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(ReviewQuestion::class, 'question_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
