<?php

namespace App\Http\Controllers;

use App\Models\TeamLoadExcludedDate;
use App\Services\TeamLoadService;
use Illuminate\Http\Request;

class TeamLoadController extends Controller
{
    public function index(TeamLoadService $teamLoadService)
    {
        return response()->json($teamLoadService->build());
    }

    public function storeExcludedDate(Request $request, TeamLoadService $teamLoadService)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'label' => 'nullable|string|max:120',
        ]);

        $date = \Carbon\Carbon::parse($validated['date'])->toDateString();

        $row = TeamLoadExcludedDate::query()->updateOrCreate(
            ['excluded_date' => $date],
            ['label' => $validated['label'] ?? null],
        );

        return response()->json([
            'excluded_date' => [
                'id' => $row->id,
                'date' => $row->excluded_date->toDateString(),
                'label' => $row->label,
            ],
            'data' => $teamLoadService->build(),
        ]);
    }

    public function destroyExcludedDate(int $id, TeamLoadService $teamLoadService)
    {
        TeamLoadExcludedDate::query()->whereKey($id)->delete();

        return response()->json(['data' => $teamLoadService->build()]);
    }
}
