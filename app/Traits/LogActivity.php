<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogActivity
{
    /**
     * Log a new activity.
     *
     * @param string $type The category of activity (e.g., 'Presales', 'Project')
     * @param string $activity The action performed (e.g., 'Created Lead')
     * @param string|null $description Additional details
     * @return void
     */
    public function log(string $type, string $activity, ?string $description = null)
    {
        $userId = auth()->id();
        
        // If we can't find a user ID, we might be in a context where auth isn't fully loaded
        // However, for this project's requirements, we should avoid logging if we don't have a user
        // OR we can use a system user if one exists.
        if (!$userId) {
            // Log a warning in laravel logs but don't break the application
            \Log::warning("Activity Log attempt without authenticated user: Type: $type, Activity: $activity");
            return;
        }

        ActivityLog::create([
            'user_id' => $userId,
            'type' => $type,
            'activity' => $activity,
            'description' => $description,
        ]);
    }
}
