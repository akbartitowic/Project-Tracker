<?php

namespace App\Concerns;

use App\Models\Organization;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function (self $model) {
            if (empty($model->organization_id) && app()->bound('tenant')) {
                $model->organization_id = app('tenant')->id;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
