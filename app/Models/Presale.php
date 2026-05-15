<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Presale extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sector',
        'estimated_value',
        'description',
        'status',
        'proposal_doc_url',
        'presentation_log',
        'quotation_value',
        'lost_reason',
        'competitor',
        'company_id',
        'project_name',
        'project_category_id',
        'estimated_budget',
        'project_description',
        'sales_pitch_id',
        'deck_url',
        'quotation_url',
        'drive_url',
        'methodology',
        'total_manhours',
        'business_acknowledged_at',
        'business_acknowledged_by',
        'development_acknowledged_at',
        'development_acknowledged_by',
        'operation_acknowledged_at',
        'operation_acknowledged_by',
        'converted_at',
        'converted_project_id',
    ];

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
