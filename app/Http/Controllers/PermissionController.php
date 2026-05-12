<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PermissionController extends Controller
{
    public function index()
    {
        $this->ensurePermissionCatalog();
        $permissions = Permission::orderBy('module')->orderBy('name')->get()->groupBy('module');
        return response()->json(['data' => $permissions]);
    }

    private function ensurePermissionCatalog(): void
    {
        // Actions are aligned to currently available API endpoints per menu.
        $menuActionMap = [
            'Dashboard' => ['read'],
            'Presales' => ['create', 'read', 'update', 'delete'],
            'Sales' => ['create', 'read', 'update', 'delete'],
            'List Company' => ['create', 'read', 'update', 'delete'],
            'Category Project' => ['create', 'read', 'update', 'delete'],
            'Sales Category Project' => ['create', 'read', 'update', 'delete'],
            'List Project' => ['create', 'read', 'update', 'delete'],
            'Project Board' => ['create', 'read', 'update'],
            'Reports' => ['read'],
            'Generate Report' => ['create', 'read'],
            'Finance Monitoring' => ['create', 'read', 'update', 'delete'],
            'Finance Categories' => ['create', 'read', 'update', 'delete'],
            'Finance Report' => ['create', 'read', 'delete'],
            'Realization Report' => ['read'],
            'Teams & Users' => ['create', 'read', 'update', 'delete'],
            'Access Control' => ['create', 'read', 'update', 'delete'],
            'Project Roles' => ['create', 'read', 'update', 'delete'],
            'System Log' => ['read', 'delete'],
            'Settings' => ['read', 'update'],
            'Profile' => ['read', 'update'],
        ];

        $actionLabels = [
            'create' => 'Create',
            'read' => 'Read',
            'update' => 'Update',
            'delete' => 'Delete',
        ];

        foreach ($menuActionMap as $module => $moduleActions) {
            $moduleSlug = Str::slug($module, '_');
            $allowedSlugs = [];

            foreach ($moduleActions as $actionKey) {
                $actionLabel = $actionLabels[$actionKey] ?? ucfirst($actionKey);
                $slug = "{$moduleSlug}.{$actionKey}";
                $allowedSlugs[] = $slug;

                Permission::firstOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => "{$actionLabel} {$module}",
                        'module' => $module,
                    ]
                );
            }

            // Remove stale CRUD permissions for this managed module
            Permission::where('module', $module)
                ->whereNotIn('slug', $allowedSlugs)
                ->delete();
        }
    }
}
