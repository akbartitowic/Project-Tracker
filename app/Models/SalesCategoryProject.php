<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SalesCategoryProject extends Model
{
    protected $fillable = ['name'];

    public function salesPitches(): BelongsToMany
    {
        return $this->belongsToMany(
            SalesPitch::class,
            'sales_pitch_sales_category_project',
            'sales_category_project_id',
            'sales_pitch_id'
        );
    }
}
