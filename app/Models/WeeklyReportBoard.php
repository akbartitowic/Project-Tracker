<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyReportBoard extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'created_by'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'weekly_report_board_members', 'board_id', 'user_id')
            ->withTimestamps();
    }

    public function periods(): HasMany
    {
        return $this->hasMany(WeeklyReportPeriod::class, 'board_id')->orderByDesc('week_start');
    }
}
