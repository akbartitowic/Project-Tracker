<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'user_id',
        'type',
        'activity',
        'description'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
