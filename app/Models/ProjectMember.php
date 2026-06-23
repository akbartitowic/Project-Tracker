<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ProjectMember extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'project_id',
        'user_id',
        'project_role_id',
    ];
}
