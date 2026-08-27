<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SLUGS = ['notification_center.read', 'notification_center.update'];

    /**
     * "Notification Center" is a personal-settings module, same spirit as Profile —
     * every role that can already manage its own Profile should be able to manage
     * its own notification preferences too. Rather than hardcoding role names (this
     * DB's live roles have drifted from RoleSeeder.php — see HANDOVER.md), grant it
     * to every role currently holding `profile.read`, which covers whatever custom
     * roles exist today (Admin, Project Manager, Freelance, Management, Project
     * Director, ...) without needing an admin to flip it on per role manually.
     */
    public function up(): void
    {
        PermissionCatalog::sync();

        $newIds = Permission::whereIn('slug', self::SLUGS)->pluck('id');

        $profileReaderRoleIds = Permission::where('slug', 'profile.read')
            ->first()
            ?->roles()
            ->pluck('roles.id') ?? collect();

        foreach ($profileReaderRoleIds as $roleId) {
            Role::find($roleId)?->permissions()->syncWithoutDetaching($newIds);
        }

        DB::table('menu_items')->insert([
            'permission_slug' => 'notification_center.read',
            'section' => 'User Management',
            'path' => '/notification-center',
            'label' => 'Notification Center',
            'icon' => 'Bell',
            'variant' => 'primary',
            'sort_order' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('menu_items')
            ->where('permission_slug', 'notification_center.read')
            ->where('path', '/notification-center')
            ->delete();

        $ids = Permission::whereIn('slug', self::SLUGS)->pluck('id');
        foreach (Role::all() as $role) {
            $role->permissions()->detach($ids);
        }
        Permission::whereIn('slug', self::SLUGS)->delete();
    }
};
