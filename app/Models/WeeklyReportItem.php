<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyReportItem extends Model
{
    use HasFactory;

    public const ISSUE_LEVELS = ['Low', 'Medium', 'High'];

    protected $fillable = [
        'period_id', 'duplicated_from_id', 'project_id', 'reporter_id', 'description', 'next_action',
        'issue_level', 'due_date', 'is_done', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'is_done' => 'boolean',
            'last_due_reminder_sent_at' => 'datetime',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(WeeklyReportPeriod::class, 'period_id');
    }

    /** The item this one was cloned from via "Duplicate to Next Week". */
    public function duplicatedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicated_from_id');
    }

    /** Items cloned from this one in later weeks. */
    public function duplicates(): HasMany
    {
        return $this->hasMany(self::class, 'duplicated_from_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'weekly_report_item_assignees', 'item_id', 'user_id')
            ->withTimestamps();
    }
}
