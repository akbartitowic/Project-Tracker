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
            'frequency'   => 'required|in:weekly,biweekly,monthly',
            'day_of_week' => 'required|integer|min:0|max:6',
            'send_time'   => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'timezone'    => 'nullable|string|max:64',
            'end_date'    => 'nullable|date|after:today',
            'emails'      => 'required|string',
            'subject'     => 'required|string|max:255',
            'body'        => 'required|string',
        ]);

        ProjectAccess::assertCanAccessProject($request->user(), (int) $validated['project_id']);

        $emails = array_values(array_filter(array_map('trim', explode(',', $validated['emails']))));

        $schedule = ReportSchedule::create([
            'project_id'  => $validated['project_id'],
            'created_by'  => $request->user()->id,
            'frequency'   => $validated['frequency'],
            'day_of_week' => $validated['day_of_week'],
            'send_time'   => $validated['send_time'],
            'timezone'    => $validated['timezone'] ?? ($request->user()->timezone ?? 'Asia/Jakarta'),
            'end_date'    => $validated['end_date'] ?? null,
            'emails'      => $emails,
            'subject'     => $validated['subject'],
            'body'        => $validated['body'],
            'is_active'   => true,
        ]);

        $schedule->next_run_at = ReportSchedule::computeNextRun(
            $schedule->frequency,
            $schedule->day_of_week,
            $schedule->send_time,
            $schedule->timezone,
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
            'frequency'   => 'sometimes|in:weekly,biweekly,monthly',
            'day_of_week' => 'sometimes|integer|min:0|max:6',
            'send_time'   => ['sometimes', 'regex:/^\d{2}:\d{2}$/'],
            'timezone'    => 'nullable|string|max:64',
            'end_date'    => 'nullable|date',
            'emails'      => 'sometimes|string',
            'subject'     => 'sometimes|string|max:255',
            'body'        => 'sometimes|string',
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

        // Recalculate next_run_at whenever timing fields change
        $schedule->next_run_at = ReportSchedule::computeNextRun(
            $schedule->frequency,
            $schedule->day_of_week,
            $schedule->send_time,
            $schedule->timezone,
        );

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
                $schedule->send_time,
                $schedule->timezone,
            );
        }

        $schedule->save();

        return response()->json(['data' => $schedule->load('project:id,name')]);
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $schedule = ReportSchedule::where('id', $id)
            ->where('created_by', $request->user()->id)
            ->firstOrFail();

        $schedule->delete();

        return response()->json(['message' => 'Schedule deleted.']);
    }
}
