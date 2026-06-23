<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Project;

class PlanLimitService
{
    public function canAddUser(Organization $org): bool
    {
        $max = config("saas.plans.{$org->plan}.max_users");
        if ($max === null) return true;

        return $org->organizationUsers()->count() < $max;
    }

    public function canAddProject(Organization $org): bool
    {
        $max = config("saas.plans.{$org->plan}.max_projects");
        if ($max === null) return true;

        $count = Project::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->count();

        return $count < $max;
    }

    public function limitsFor(Organization $org): array
    {
        $plan        = config("saas.plans.{$org->plan}", []);
        $userCount    = $org->organizationUsers()->count();
        $projectCount = Project::withoutGlobalScopes()
            ->where('organization_id', $org->id)
            ->count();

        return [
            'plan'     => $org->plan,
            'users'    => ['current' => $userCount,    'max' => $plan['max_users']    ?? null],
            'projects' => ['current' => $projectCount, 'max' => $plan['max_projects'] ?? null],
        ];
    }
}
