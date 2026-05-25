<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'feature_title',
        'description',
        'status',
        'priority',
        'is_billable',
        'project_id',
        'parent_task_id',
        'sort_order',
        'assignee_id',
        'estimated_hours',
        'rush_hour',
        'project_role_id',
        'category',
        'due_date',
        'start_date',
    ];

    protected $casts = [
        'is_billable' => 'boolean',
        'rush_hour' => 'boolean',
        'due_date' => 'date',
        'start_date' => 'date',
        'sort_order' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id')->orderBy('sort_order')->orderBy('id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(TaskNote::class)->orderBy('created_at')->orderBy('id');
    }

    public function scopeRoots($query)
    {
        return $query->whereNull('parent_task_id');
    }

    public function scopeQuotaEligible($query)
    {
        return $query->where(function ($q) {
            $q->whereNotNull('parent_task_id')
                ->orWhereDoesntHave('subtasks');
        });
    }
}
