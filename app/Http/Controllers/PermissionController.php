<?php

namespace App\Http\Controllers;

use App\Support\PermissionCatalog;

class PermissionController extends Controller
{
    public function index()
    {
        PermissionCatalog::sync();
        $permissions = \App\Models\Permission::with('module')
            ->join('modules', 'modules.id', '=', 'permissions.module_id')
            ->orderBy('modules.name')
            ->orderBy('permissions.name')
            ->select('permissions.*')
            ->get()
            ->groupBy(fn ($p) => $p->module->name);
        return response()->json(['data' => $permissions]);
    }
}
