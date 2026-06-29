<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReviewEvaluation extends Model
{
    protected $fillable = [
        'methodology', 'name', 'trigger_label', 'trigger_type', 'trigger_basis',
        'trigger_value', 'focus', 'purpose', 'order', 'is_active',
        'active_days', 'max_submissions', 'one_per_user',
    ];

    protected $casts = [
        'one_per_user' => 'boolean',
        'is_active'    => 'boolean',
    ];

    public function questions(): HasMany
    {
        return $this->hasMany(ReviewQuestion::class, 'evaluation_id')->orderBy('order');
    }
}
