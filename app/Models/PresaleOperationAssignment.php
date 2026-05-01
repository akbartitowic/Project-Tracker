<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PresaleOperationAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'presale_id',
        'project_role_id',
        'user_id',
    ];

    public function role()
    {
        return $this->belongsTo(ProjectRole::class, 'project_role_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
