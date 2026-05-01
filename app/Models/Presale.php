<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Presale extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'estimated_value' => 'float',
        'quotation_value' => 'float',
        'total_manhours' => 'float',
        'business_acknowledged_at' => 'datetime',
        'development_acknowledged_at' => 'datetime',
        'operation_acknowledged_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function projectCategory()
    {
        return $this->belongsTo(ProjectCategory::class);
    }

    public function roleRequirements()
    {
        return $this->hasMany(PresaleRoleRequirement::class);
    }

    public function operationAssignments()
    {
        return $this->hasMany(PresaleOperationAssignment::class);
    }
}
