<?php

use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        PermissionCatalog::sync();

        $freelancePermissionIds = PermissionCatalog::permissionIdsForSlugs(
            PermissionCatalog::freelancePermissionSlugs()
        );

        $freelance = Role::firstOrCreate(['name' => 'Freelance']);
        if ($freelancePermissionIds !== []) {
            $freelance->permissions()->sync($freelancePermissionIds);
        }
    }

    public function down(): void
    {
        // Role permissions are managed in-app.
    }
};
