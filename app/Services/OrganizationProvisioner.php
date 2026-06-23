<?php

namespace App\Services;

use App\Models\FinanceCategory;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\ProjectRole;
use App\Models\Role;
use App\Support\PermissionCatalog;

/**
 * Provisions a new organization with default roles, permissions,
 * finance categories, and project roles.
 */
class OrganizationProvisioner
{
    public function provision(Organization $org): void
    {
        // 1. Ensure all global permissions exist
        PermissionCatalog::sync();

        // 2. Create org-specific roles and assign permissions
        $this->seedRoles($org);

        // 3. Default finance categories
        $this->seedFinanceCategories($org);

        // 4. Default project roles (billable roles used in quotas)
        $this->seedProjectRoles($org);
    }

    private function seedRoles(Organization $org): void
    {
        $allPermissionIds = Permission::pluck('id')->all();

        $boardIds  = PermissionCatalog::permissionIdsForSlugs(PermissionCatalog::boardMemberPermissionSlugs());
        $freeIds   = PermissionCatalog::permissionIdsForSlugs(PermissionCatalog::freelancePermissionSlugs());
        $memberIds = PermissionCatalog::permissionIdsForSlugs([
            'project_board.read', 'project_board.update', 'profile.read', 'profile.update',
            'load.read', 'reports.read',
        ]);

        $matrix = [
            'Admin'           => $allPermissionIds,
            'Project Manager' => PermissionCatalog::permissionIdsForSlugs([
                'presales.read', 'presales.create', 'presales.update',
                'sales.read', 'sales.create', 'sales.update',
                'list_project.read', 'list_project.create', 'list_project.update',
                'project_board.read', 'project_board.create', 'project_board.update',
                'load.read',
                'reports.read', 'generate_report.read', 'generate_report.create',
                'finance_monitoring.read', 'finance_monitoring.create', 'finance_monitoring.update',
                'finance_report.read', 'realization_report.read',
                'teams_users.read',
                'profile.read', 'profile.update',
            ]),
            'Developer'   => $memberIds,
            'Designer'    => $memberIds,
            'QA'          => $memberIds,
            'Freelance'   => $freeIds,
            'Board Member' => $boardIds,
        ];

        foreach ($matrix as $roleName => $permissionIds) {
            // Create role scoped to this org (organization_id set via relationship)
            $role = $org->roles()->create(['name' => $roleName]);
            if ($permissionIds) {
                $role->permissions()->sync($permissionIds);
            }
        }
    }

    private function seedFinanceCategories(Organization $org): void
    {
        $categories = [
            'Internal Resource',
            'Freelance Fee',
            'Commission',
            'Operational',
            'License & Subscription',
            'Others',
            'Change Request',
        ];

        foreach ($categories as $name) {
            FinanceCategory::create(['name' => $name, 'organization_id' => $org->id]);
        }
    }

    private function seedProjectRoles(Organization $org): void
    {
        $roles = [
            'UI/UX Designer',
            'Frontend Dev',
            'Backend Dev',
            'System Analyst',
            'QA Engineer',
            'Product Manager',
            'DevOps Specialist',
        ];

        foreach ($roles as $name) {
            ProjectRole::create(['name' => $name, 'organization_id' => $org->id]);
        }
    }
}
