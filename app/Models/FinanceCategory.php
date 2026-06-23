<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class FinanceCategory extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'name',
    ];
}
