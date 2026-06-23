<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Manhour extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'user_id',
        'project_id',
        'project_role_id',
        'date',
        'hours',
        'amount_idr',
        'description',
    ];
}
