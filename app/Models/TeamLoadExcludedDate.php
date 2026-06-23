<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class TeamLoadExcludedDate extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'excluded_date',
        'label',
    ];

    protected $casts = [
        'excluded_date' => 'date',
    ];
}
