<?php

use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        PermissionCatalog::sync();

        $boardPermissionIds = PermissionCatalog::permissionIdsForSlugs(
            PermissionCatalog::boardMemberPermissionSlugs()
        );

        foreach (['Freelance', 'Board Member'] as $roleName) {
            $role = Role::firstOrCreate(['name' => $roleName]);
            if ($boardPermissionIds !== []) {
                $role->permissions()->sync($boardPermissionIds);
            }
        }
    }

    public function down(): void
    {
        // Permissions and role links are managed in-app; no destructive rollback.
    }
};
