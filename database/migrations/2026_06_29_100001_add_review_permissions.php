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
        if ($admin) {
            $slugs = ['review.read', 'review.create', 'review.update', 'review.delete'];
            $ids   = Permission::whereIn('slug', $slugs)->pluck('id');
            $admin->permissions()->syncWithoutDetaching($ids);
        }
    }

    public function down(): void
    {
        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::whereIn('slug', ['review.read', 'review.create', 'review.update', 'review.delete'])->pluck('id');
            $admin->permissions()->detach($ids);
        }
        Permission::whereIn('slug', ['review.read', 'review.create', 'review.update', 'review.delete'])->delete();
    }
};
