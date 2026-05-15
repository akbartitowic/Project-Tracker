<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesPitch extends Model
{
    public const STEP_NEW_PROSPECT = 'new_prospect';

    public const STEP_SENT_COMPRO = 'sent_compro';

    public const STEP_PROPOSAL_SENT = 'proposal_sent';

    public const STEP_MEETING = 'meeting';

    public const STEP_NEGOTIATION = 'negotiation';

    public const STEP_CLOSED = 'closed';

    public const OUTCOME_WIN = 'win';

    public const OUTCOME_LOST = 'lost';

    /** @var list<string> */
    public const STEPS_ORDER = [
        self::STEP_NEW_PROSPECT,
        self::STEP_SENT_COMPRO,
        self::STEP_PROPOSAL_SENT,
        self::STEP_MEETING,
        self::STEP_NEGOTIATION,
        self::STEP_CLOSED,
    ];

    protected $fillable = [
        'user_id',
        'company_id',
        'project_category_id',
        'sales_category_project_id',
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

    public function salesCategoryProject(): BelongsTo
    {
        return $this->belongsTo(SalesCategoryProject::class, 'sales_category_project_id');
    }
}
