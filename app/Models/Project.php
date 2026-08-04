<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'status',
        'budget_status',
        'completion',
        'methodology',
        'jobs',
        'start_date',
        'end_date',
        'total_manhours',
        'hourly_rate',
        'total_cost',
        'quotation_value',
        'review_client_emails',
    ];

    protected $casts = [
        'jobs' => 'array',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'review_client_emails' => 'array',
    ];
}
