<?php

namespace App\Support;

use App\Models\Permission;
use Illuminate\Support\Str;

class PermissionCatalog
{
    /**
     * Menu permissions aligned to available API endpoints.
     *
     * @return array<string, list<string>>
     */
    public static function menuActionMap(): array
    {
        return [
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
            'Settings' => ['read', 'update', 'reset'],
            'Profile' => ['read', 'update'],
        ];
    }

    /** @return list<string> */
    public static function boardMemberPermissionSlugs(): array
    {
        return [
            'project_board.read',
            'project_board.create',
            'project_board.update',
            'profile.read',
            'profile.update',
        ];
    }

    /** Freelance: board visibility and status updates only (no manhour logging). */
    public static function freelancePermissionSlugs(): array
    {
        return [
            'project_board.read',
            'project_board.update',
            'profile.read',
            'profile.update',
        ];
    }

    public static function sync(): void
    {
        $actionLabels = [
            'create' => 'Create',
            'read' => 'Read',
            'update' => 'Update',
            'delete' => 'Delete',
        ];

        foreach (self::menuActionMap() as $module => $moduleActions) {
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

            Permission::where('module', $module)
                ->whereNotIn('slug', $allowedSlugs)
                ->delete();
        }
    }

    /** @return list<int> */
    public static function permissionIdsForSlugs(array $slugs): array
    {
        return Permission::whereIn('slug', $slugs)->pluck('id')->all();
    }
}
