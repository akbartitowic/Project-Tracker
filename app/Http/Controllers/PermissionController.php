<?php

namespace App\Http\Controllers;

use App\Support\PermissionCatalog;

class PermissionController extends Controller
{
    public function index()
    {
        PermissionCatalog::sync();
        $permissions = \App\Models\Permission::orderBy('module')->orderBy('name')->get()->groupBy('module');
        return response()->json(['data' => $permissions]);
    }
}
