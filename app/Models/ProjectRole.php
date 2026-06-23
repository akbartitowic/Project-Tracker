<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ProjectRole extends Model
{
    use BelongsToTenant;
    protected $fillable = ['name'];
}
