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

        $freelance = Role::where('name', 'Freelance')->first();
        if ($freelance) {
            $freelance->permissions()->sync(
                PermissionCatalog::permissionIdsForSlugs(PermissionCatalog::freelancePermissionSlugs())
            );
        }

        $boardMember = Role::where('name', 'Board Member')->first();
        if ($boardMember) {
            $boardMember->permissions()->sync(
                PermissionCatalog::permissionIdsForSlugs(PermissionCatalog::boardMemberPermissionSlugs())
            );
        }

        $projectManager = Role::where('name', 'Project Manager')->first();
        $loadPermissionId = Permission::where('slug', 'load.read')->value('id');
        if ($projectManager && $loadPermissionId) {
            $projectManager->permissions()->syncWithoutDetaching([$loadPermissionId]);
        }
    }

    public function down(): void
    {
        $projectManager = Role::where('name', 'Project Manager')->first();
        $loadPermissionId = Permission::where('slug', 'load.read')->value('id');
        if ($projectManager && $loadPermissionId) {
            $projectManager->permissions()->detach($loadPermissionId);
        }
    }
};
