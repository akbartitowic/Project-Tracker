<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use BelongsToTenant;
    protected $fillable = ['key', 'value'];
}
