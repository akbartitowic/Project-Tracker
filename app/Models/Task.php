<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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
        'duplicated_from_id',
        'sort_order',
        'assignee_id',
        'estimated_hours',
        'rush_hour',
        'project_role_id',
        'category',
        'due_date',
        'start_date',
        'is_backlog',
        'project_sequence',
        'task_sequence',
    ];

    protected $casts = [
        'is_billable' => 'boolean',
        'is_backlog' => 'boolean',
        'rush_hour' => 'boolean',
        'due_date' => 'date:Y-m-d',
        'start_date' => 'date:Y-m-d',
        'last_due_reminder_sent_at' => 'datetime',
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

    public function duplicatedFrom(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'duplicated_from_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /** All users attached to this task, with an `is_active` flag and their own `mh` (manhour) share of the task. */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees')
            ->withPivot('is_active', 'mh')
            ->withTimestamps();
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
