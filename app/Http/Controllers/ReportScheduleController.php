<?php

namespace App\Http\Controllers;

use App\Models\ReportSchedule;
use App\Support\ProjectAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $schedules = ReportSchedule::with('project:id,name')
            ->where('created_by', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id'  => 'required|exists:projects,id',
            'frequency'    => 'required|in:weekly,biweekly,monthly,custom',
            'day_of_week'  => 'nullable|integer|min:0|max:6|required_if:frequency,weekly|required_if:frequency,biweekly',
            'day_of_month' => 'nullable|integer|min:1|max:28|required_if:frequency,monthly',
            'custom_date'  => 'nullable|date|after_or_equal:today|required_if:frequency,custom',
            'emails'      => 'required|string',
            'subject'     => 'required|string|max:255',
            'body'        => 'required|string',
            'timezone'    => 'nullable|string|max:64',
        ]);

        ProjectAccess::assertCanAccessProject($request->user(), (int) $validated['project_id']);

        $emails = array_values(array_filter(array_map('trim', explode(',', $validated['emails']))));
        $tz     = $validated['timezone'] ?? ($request->user()->timezone ?? 'Asia/Jakarta');

        $schedule = ReportSchedule::create([
            'project_id'   => $validated['project_id'],
            'created_by'   => $request->user()->id,
            'frequency'    => $validated['frequency'],
            'day_of_week'  => $validated['day_of_week'] ?? null,
            'day_of_month' => $validated['day_of_month'] ?? null,
            'custom_date'  => $validated['custom_date'] ?? null,
            'send_time'   => '08:00',
            'timezone'    => $tz,
            'emails'      => $emails,
            'subject'     => $validated['subject'],
            'body'        => $validated['body'],
            'is_active'   => true,
        ]);

        $schedule->next_run_at = ReportSchedule::computeNextRun(
            $schedule->frequency,
            $schedule->day_of_week,
            $schedule->timezone,
            $schedule->custom_date?->toDateString(),
            null,
            $schedule->day_of_month,
        );
        $schedule->save();

        return response()->json(['data' => $schedule->load('project:id,name')], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $schedule = ReportSchedule::where('id', $id)
            ->where('created_by', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validate([
            'project_id'  => 'sometimes|exists:projects,id',
            'frequency'    => 'sometimes|in:weekly,biweekly,monthly,custom',
            'day_of_week'  => 'nullable|integer|min:0|max:6',
            'day_of_month' => 'nullable|integer|min:1|max:28',
            'custom_date'  => 'nullable|date',
            'emails'      => 'sometimes|string',
            'subject'     => 'sometimes|string|max:255',
            'body'        => 'sometimes|string',
            'timezone'    => 'nullable|string|max:64',
        ]);

        if (isset($validated['project_id'])) {
            ProjectAccess::assertCanAccessProject($request->user(), (int) $validated['project_id']);
        }

        if (isset($validated['emails'])) {
            $validated['emails'] = array_values(
                array_filter(array_map('trim', explode(',', $validated['emails'])))
            );
        }

        $schedule->fill($validated);

        $schedule->next_run_at = ReportSchedule::computeNextRun(
            $schedule->frequency,
            $schedule->day_of_week,
            $schedule->timezone,
            $schedule->custom_date?->toDateString(),
            null,
            $schedule->day_of_month,
        );

        // Re-activate in case it was deactivated after a custom send
        if ($schedule->frequency !== 'custom') {
            $schedule->is_active = true;
        }

        $schedule->save();

        return response()->json(['data' => $schedule->load('project:id,name')]);
    }

    public function toggle(int $id, Request $request): JsonResponse
    {
        $schedule = ReportSchedule::where('id', $id)
            ->where('created_by', $request->user()->id)
            ->firstOrFail();

        $schedule->is_active = !$schedule->is_active;

        if ($schedule->is_active) {
            $schedule->next_run_at = ReportSchedule::computeNextRun(
                $schedule->frequency,
                $schedule->day_of_week,
                $schedule->timezone,
                $schedule->custom_date?->toDateString(),
            );
        }

        $schedule->save();

        return response()->json(['data' => $schedule->load('project:id,name')]);
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        ReportSchedule::where('id', $id)
            ->where('created_by', $request->user()->id)
            ->firstOrFail()
            ->delete();

        return response()->json(['message' => 'Schedule deleted.']);
    }
}
