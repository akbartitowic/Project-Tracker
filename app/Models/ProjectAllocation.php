<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectAllocation extends Model
{
    protected $fillable = [
        'project_id',
        'category_id',
        'project_role_id',
        'amount',
        'description',
        'is_topup',
        'topup_hours',
        'realized_amount',
        'realized_at',
        'cr_date',
        'cr_feature',
        'is_change_request',
    ];

    protected $casts = [
        'is_topup' => 'boolean',
        'is_change_request' => 'boolean',
        'realized_at' => 'datetime',
        'cr_date' => 'date',
    ];
}
