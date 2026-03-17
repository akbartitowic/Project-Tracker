<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Role::with('permissions')->orderBy('name', 'asc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        $role = Role::create(['name' => $validated['name']]);
        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }
        return response()->json(['id' => $role->id]);
    }

    public function update(Request $request, string $id)
    {
        $role = Role::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        $role->update(['name' => $validated['name']]);
        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }
        return response()->json(['changes' => 1]);
    }

    public function destroy(string $id)
    {
        $deleted = Role::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }
}
