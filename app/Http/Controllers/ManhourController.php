<?php

namespace App\Http\Controllers;

use App\Models\Manhour;
use App\Support\ProjectAccess;
use App\Support\UserAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManhourController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!UserAccess::canViewManhours($user)) {
            return response()->json(['data' => []]);
        }

        $query = DB::table('manhours as m')
            ->leftJoin('users as u', 'm.user_id', '=', 'u.id')
            ->leftJoin('projects as p', 'm.project_id', '=', 'p.id')
            ->select('m.id', 'm.date', 'm.hours', 'm.description', 'u.name as user_name', 'p.name as project_name');

        ProjectAccess::applyProjectScope($query, 'm.project_id', $user);

        if ($request->has('project_id')) {
            $projectId = (int) $request->query('project_id');
            ProjectAccess::assertCanAccessProject($user, $projectId);
            $query->where('m.project_id', $projectId);
        }

        $query->orderBy('m.date', 'desc');

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!UserAccess::canViewManhours($user)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'project_id' => 'required|exists:projects,id',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'date' => 'required|date',
            'hours' => 'required|numeric',
            'amount_idr' => 'nullable|numeric',
            'description' => 'nullable|string',
        ]);

        ProjectAccess::assertCanAccessProject($user, (int) $validated['project_id']);

        if (!UserAccess::isPrivileged($user)) {
            $validated['user_id'] = $user->id;
        } elseif (empty($validated['user_id'])) {
            $validated['user_id'] = $user->id;
        }

        $manhour = Manhour::create($validated);

        return response()->json(['id' => $manhour->id]);
    }
}
