<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ProjectRoleQuota extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'project_id',
        'project_role_id',
        'quota_hours',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
