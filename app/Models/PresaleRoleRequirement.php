<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PresaleRoleRequirement extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'presale_id',
        'project_role_id',
        'business_mh',
        'development_mh',
    ];

    public function role()
    {
        return $this->belongsTo(ProjectRole::class, 'project_role_id');
    }
}
