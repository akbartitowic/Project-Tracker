<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SalesPitch extends Model
{
    public const STEP_NEW_PROSPECT = 'new_prospect';

    public const STEP_SENT_COMPRO = 'sent_compro';

    public const STEP_PROPOSAL_SENT = 'proposal_sent';

    public const STEP_PRESENTATION = 'presentation';

    /** @deprecated Use STEP_PRESENTATION */
    public const STEP_MEETING = 'presentation';

    public const STEP_NEGOTIATION = 'negotiation';

    public const STEP_CLOSED = 'closed';

    public const OUTCOME_WIN = 'win';

    public const OUTCOME_LOST = 'lost';

    /** @var list<string> */
    public const STEPS_ORDER = [
        self::STEP_NEW_PROSPECT,
        self::STEP_SENT_COMPRO,
        self::STEP_PROPOSAL_SENT,
        self::STEP_PRESENTATION,
        self::STEP_NEGOTIATION,
        self::STEP_CLOSED,
    ];

    protected $fillable = [
        'user_id',
        'company_id',
        'project_category_id',
        'title',
        'prospect_name',
        'company_name',
        'email',
        'phone',
        'estimated_value',
        'final_deal_value',
        'notes',
        'compro_url',
        'proposal_url',
        'quotation_url',
        'quotation_data',
        'quotation_logo_path',
        'meeting_at',
        'meeting_location',
        'meeting_mode',
        'current_step',
        'outcome',
        'lead_started_at',
        'closed_at',
        'step_reached_at',
    ];

    protected function casts(): array
    {
        return [
            'estimated_value' => 'decimal:2',
            'final_deal_value' => 'decimal:2',
            'lead_started_at' => 'datetime',
            'meeting_at' => 'datetime',
            'closed_at' => 'datetime',
            'step_reached_at' => 'array',
            'quotation_data' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function companyCategory(): BelongsTo
    {
        return $this->belongsTo(ProjectCategory::class, 'project_category_id');
    }

    public function salesCategoryProjects(): BelongsToMany
    {
        return $this->belongsToMany(
            SalesCategoryProject::class,
            'sales_pitch_sales_category_project',
            'sales_pitch_id',
            'sales_category_project_id'
        );
    }

    public function presale(): HasOne
    {
        return $this->hasOne(Presale::class, 'sales_pitch_id');
    }
}
