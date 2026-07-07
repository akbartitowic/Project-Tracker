<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Support\UserAccess;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    private function assertCanManageModules(Request $request): void
    {
        if (!UserAccess::isPrivileged($request->user())) {
            abort(403, 'Only administrators can manage modules.');
        }
    }

    public function index()
    {
        $modules = Module::withCount('permissions')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $modules]);
    }

    /**
     * Only `is_active` and `sort_order` are editable here — `name`/`slug`
     * remain sourced from PermissionCatalog::menuActionMap() so they stay
     * in lockstep with the permissions that reference them.
     */
    public function update(Request $request, Module $module)
    {
        $this->assertCanManageModules($request);

        $validated = $request->validate([
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        // Deactivating this module would revoke modules_management.update from
        // everyone (superuser bypass aside), locking the screen out of itself.
        if ($module->slug === 'modules_management' && ($validated['is_active'] ?? true) === false) {
            abort(422, 'The Modules Management module cannot be deactivated.');
        }

        $module->update($validated);

        return response()->json(['data' => $module]);
    }
}
