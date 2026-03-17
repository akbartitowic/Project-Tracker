<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\ActivityLog;
use Carbon\Carbon;

class ActivityLogController extends Controller
{
    public function index()
    {
        return ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
    }

    /**
     * Remove logs older than 3 days.
     */
    public function cleanup()
    {
        $deleted = ActivityLog::where('created_at', '<', Carbon::now()->subDays(3))->delete();
        return response()->json(['message' => "Deleted $deleted old logs."]);
    }
}
