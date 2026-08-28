<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * New Review module action `review.view_all` — "View All Projects". Roles
     * without it see only their assigned projects on /review; with it (or when
     * the account is privileged) they see every project's review data.
     *
     * Purely additive/opt-in: granted to the Admin role only by default (which
     * already bypasses every permission check anyway, so no behaviour change),
     * every other role stays scoped to member projects until an admin ticks the
     * box in Access Control.
     */
    public function up(): void
    {
        PermissionCatalog::sync();

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $id = Permission::where('slug', 'review.view_all')->value('id');
            if ($id) {
                $admin->permissions()->syncWithoutDetaching([$id]);
            }
        }
    }

    public function down(): void
    {
        $permission = Permission::where('slug', 'review.view_all')->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
