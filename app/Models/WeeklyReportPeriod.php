<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyReportPeriod extends Model
{
    use HasFactory;

    protected $fillable = ['board_id', 'week_start', 'week_end', 'duplicated_from_id', 'created_by'];

    // 'date:Y-m-d' (not bare 'date') keeps API responses free of the UTC-shift bug
    // documented for other date columns in this app — see HANDOVER.md.
    protected function casts(): array
    {
        return [
            'week_start' => 'date:Y-m-d',
            'week_end' => 'date:Y-m-d',
        ];
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(WeeklyReportBoard::class, 'board_id');
    }

    public function duplicatedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicated_from_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(WeeklyReportItem::class, 'period_id')->orderBy('sort_order')->orderBy('id');
    }
}
