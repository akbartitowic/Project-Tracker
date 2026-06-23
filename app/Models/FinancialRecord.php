<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialRecord extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'type',
        'amount',
        'date',
        'description',
    ];

    protected $casts = [
        'date' => 'date',
    ];
}
