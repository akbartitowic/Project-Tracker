<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * New Review module action `review.calibrate` — "Calibrate". Only roles with
     * it see and use the Calibration tab on /review (agree/disagree per question
     * on submitted reviews). Calibration never changes any score — it's a label.
     *
     * Purely additive/opt-in: granted to the Admin role only by default (which
     * already bypasses every permission check anyway, so no behaviour change);
     * every other role stays without it until an admin ticks the box in
     * Access Control.
     */
    public function up(): void
    {
        PermissionCatalog::sync();

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $id = Permission::where('slug', 'review.calibrate')->value('id');
            if ($id) {
                $admin->permissions()->syncWithoutDetaching([$id]);
            }
        }
    }

    public function down(): void
    {
        $permission = Permission::where('slug', 'review.calibrate')->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
