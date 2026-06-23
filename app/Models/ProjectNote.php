<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectNote extends Model
{
    use BelongsToTenant;
    public const CATEGORY_WEEKLY = 'weekly';

    public const CATEGORY_DEVELOPMENT = 'development';

    public const CATEGORY_DOCUMENT = 'document';

    /** @return list<string> */
    public static function categories(): array
    {
        return [
            self::CATEGORY_WEEKLY,
            self::CATEGORY_DEVELOPMENT,
            self::CATEGORY_DOCUMENT,
        ];
    }

    protected $fillable = [
        'project_id',
        'user_id',
        'category',
        'title',
        'body',
        'url',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
