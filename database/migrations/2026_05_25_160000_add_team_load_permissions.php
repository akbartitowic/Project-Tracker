<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        PermissionCatalog::sync();

        $admin = Role::where('name', 'Admin')->first();
        $permissionId = Permission::where('slug', 'load.read')->value('id');

        if ($admin && $permissionId) {
            $admin->permissions()->syncWithoutDetaching([$permissionId]);
        }
    }

    public function down(): void
    {
        $admin = Role::where('name', 'Admin')->first();
        $permissionId = Permission::where('slug', 'load.read')->value('id');

        if ($admin && $permissionId) {
            $admin->permissions()->detach($permissionId);
        }

        Permission::where('slug', 'load.read')->delete();
    }
};
