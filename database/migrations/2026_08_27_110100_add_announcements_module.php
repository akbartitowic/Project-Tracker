<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "Announcements" broadcasts information to everyone landing on the login page,
     * so — unlike Notification Center — it's an admin-level content tool, not a
     * personal-settings module. Granted to Admin only by default (same pattern as
     * Settings/System Log), same as every other admin-only module added so far;
     * other roles can be granted access from Access Control if needed.
     */
    public function up(): void
    {
        PermissionCatalog::sync();

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::whereIn('slug', [
                'announcements.create',
                'announcements.read',
                'announcements.update',
                'announcements.delete',
            ])->pluck('id');
            $admin->permissions()->syncWithoutDetaching($ids);
        }

        DB::table('menu_items')->insert([
            'permission_slug' => 'announcements.read',
            'section' => 'System Settings',
            'path' => '/announcements',
            'label' => 'Announcements',
            'icon' => 'Megaphone',
            'variant' => 'primary',
            'sort_order' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('menu_items')
            ->where('permission_slug', 'announcements.read')
            ->where('path', '/announcements')
            ->delete();

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::whereIn('slug', [
                'announcements.create',
                'announcements.read',
                'announcements.update',
                'announcements.delete',
            ])->pluck('id');
            $admin->permissions()->detach($ids);
        }

        Permission::whereIn('slug', [
            'announcements.create',
            'announcements.read',
            'announcements.update',
            'announcements.delete',
        ])->delete();
    }
};
