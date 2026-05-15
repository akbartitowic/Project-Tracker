<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Support\UserAccess;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    private function assertCanManageRoles(Request $request): void
    {
        if (!UserAccess::isPrivileged($request->user())) {
            abort(403, 'Only administrators can manage roles and permissions.');
        }
    }

    private function assertRoleIsMutable(Role $role): void
    {
        if (strtolower((string) $role->name) === 'admin') {
            abort(422, 'The Admin role cannot be modified or removed.');
        }
    }

    public function index()
    {
        return response()->json(['data' => Role::with('permissions')->orderBy('name', 'asc')->get()]);
    }

    public function store(Request $request)
    {
        $this->assertCanManageRoles($request);

        $validated = $request->validate([
            'name' => 'required|string|unique:roles',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create(['name' => $validated['name']]);
        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json(['id' => $role->id]);
    }

    public function update(Request $request, string $id)
    {
        $this->assertCanManageRoles($request);

        $role = Role::findOrFail($id);
        $this->assertRoleIsMutable($role);

        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update(['name' => $validated['name']]);
        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json(['changes' => 1]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->assertCanManageRoles($request);

        $role = Role::findOrFail($id);
        $this->assertRoleIsMutable($role);

        $deleted = $role->delete();

        return response()->json(['deleted' => $deleted ? 1 : 0]);
    }
}
