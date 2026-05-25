<?php

namespace App\Http\Controllers;

use App\Services\TeamLoadService;
use Illuminate\Http\Request;

class TeamLoadController extends Controller
{
    public function index(Request $request, TeamLoadService $teamLoadService)
    {
        return response()->json($teamLoadService->build());
    }
}
