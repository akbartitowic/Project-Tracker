<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewQuestion extends Model
{
    protected $fillable = ['evaluation_id', 'question', 'description', 'weight', 'has_weight', 'order'];

    protected $casts = ['weight' => 'float', 'has_weight' => 'boolean'];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(ReviewEvaluation::class, 'evaluation_id');
    }
}
