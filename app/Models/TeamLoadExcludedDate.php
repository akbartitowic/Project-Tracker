<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeamLoadExcludedDate extends Model
{
    protected $fillable = [
        'excluded_date',
        'label',
    ];

    protected $casts = [
        'excluded_date' => 'date',
    ];
}
