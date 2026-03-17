<?php

namespace App\Http\Controllers;

use App\Models\Manhour;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManhourController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('manhours as m')
            ->leftJoin('users as u', 'm.user_id', '=', 'u.id')
            ->leftJoin('projects as p', 'm.project_id', '=', 'p.id')
            ->select('m.id', 'm.date', 'm.hours', 'm.description', 'u.name as user_name', 'p.name as project_name');

        if ($request->has('project_id')) {
            $query->where('m.project_id', $request->query('project_id'));
        }

        $query->orderBy('m.date', 'desc');

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'project_id' => 'required|exists:projects,id',
            'project_role_id' => 'nullable|exists:project_roles,id',
            'date' => 'required|date',
            'hours' => 'required|numeric',
            'amount_idr' => 'nullable|numeric',
            'description' => 'nullable|string'
        ]);

        $manhour = Manhour::create($validated);
        return response()->json(['id' => $manhour->id]);
    }
}
