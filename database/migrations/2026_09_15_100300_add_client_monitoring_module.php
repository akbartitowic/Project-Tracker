<?php

use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        PermissionCatalog::sync();

        $role = Role::firstOrCreate(['name' => 'Client']);
        $permissionIds = PermissionCatalog::permissionIdsForSlugs(
            PermissionCatalog::clientPermissionSlugs()
        );
        if ($permissionIds !== []) {
            $role->permissions()->syncWithoutDetaching($permissionIds);
        }

        DB::table('menu_items')->insert([
            'permission_slug' => 'client_monitoring.read',
            'section' => 'Finance',
            'path' => '/client-monitoring',
            'label' => 'Client Monitoring',
            'icon' => 'PieChart',
            'variant' => 'primary',
            'sort_order' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('menu_items')
            ->where('permission_slug', 'client_monitoring.read')
            ->where('path', '/client-monitoring')
            ->delete();

        $ids = \App\Models\Permission::whereIn('slug', PermissionCatalog::clientPermissionSlugs())->pluck('id');
        foreach (Role::all() as $role) {
            $role->permissions()->detach($ids);
        }
        \App\Models\Permission::where('slug', 'client_monitoring.read')->delete();

        // Keep the "Client" role itself — deleting it would orphan any client
        // accounts already assigned to it. Only the module-specific permission
        // is reverted here, matching how other module migrations roll back.
    }
};
