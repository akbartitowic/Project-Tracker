<?php

namespace App\Http\Controllers;

use App\Models\ProjectRole;
use Illuminate\Http\Request;

class ProjectRoleController extends Controller
{
    public function index()
    {
        return response()->json(['data' => ProjectRole::orderBy('name', 'asc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:project_roles',
        ]);

        $role = ProjectRole::create($validated);
        return response()->json(['id' => $role->id]);
    }

    public function update(Request $request, string $id)
    {
        $role = ProjectRole::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|unique:project_roles,name,' . $role->id,
        ]);

        $changes = $role->update($validated) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $deleted = ProjectRole::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }
}
