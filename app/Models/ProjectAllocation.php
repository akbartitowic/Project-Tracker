<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAllocation extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'project_id',
        'category_id',
        'user_id',
        'project_role_id',
        'amount',
        'description',
        'is_topup',
        'topup_hours',
        'realized_amount',
        'realized_at',
        'paid_at',
        'paid_amount',
        'cr_date',
        'cr_feature',
        'is_change_request',
    ];

    protected $casts = [
        'is_topup' => 'boolean',
        'is_change_request' => 'boolean',
        'realized_at' => 'datetime',
        'paid_at' => 'datetime',
        'paid_amount' => 'decimal:2',
        'cr_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(\App\Models\FinanceCategory::class, 'category_id');
    }
}
