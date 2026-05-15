<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'feature_title',
        'description',
        'status',
        'priority',
        'project_id',
        'assignee_id',
        'estimated_hours',
        'rush_hour',
        'project_role_id',
        'category',
        'due_date',
    ];

    protected $casts = [
        'rush_hour' => 'boolean',
        'due_date' => 'date',
    ];
}
