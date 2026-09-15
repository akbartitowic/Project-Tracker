<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\FinanceCategory;
use App\Models\Permission;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        PermissionCatalog::sync();
    }

    private function userWith(array $slugs, array $attributes = []): User
    {
        $role = Role::firstOrCreate(['name' => 'ClientTest ' . md5(implode(',', $slugs))]);
        $role->permissions()->syncWithoutDetaching(Permission::whereIn('slug', $slugs)->pluck('id'));

        return User::factory()->create(array_merge([
            'role_id' => $role->id,
            'role' => $role->name,
        ], $attributes));
    }

    private function clientUser(int $companyId, array $attributes = []): User
    {
        return $this->userWith(PermissionCatalog::clientPermissionSlugs(), array_merge([
            'user_type' => 'client',
            'company_id' => $companyId,
        ], $attributes));
    }

    public function test_client_user_sees_only_their_company_projects_in_summary(): void
    {
        $companyA = Company::create(['name' => 'Company A']);
        $companyB = Company::create(['name' => 'Company B']);

        $projectA1 = Project::factory()->create(['company_id' => $companyA->id, 'total_manhours' => 100]);
        $projectA2 = Project::factory()->create(['company_id' => $companyA->id, 'total_manhours' => 50]);
        Project::factory()->create(['company_id' => $companyB->id, 'total_manhours' => 200]);

        Sanctum::actingAs($this->clientUser($companyA->id));

        $res = $this->getJson('/api/client-monitoring/summary')->assertOk()->json('data');

        $this->assertSame($companyA->id, $res['company']['id']);
        $visibleIds = collect($res['projects'])->pluck('id')->sort()->values()->all();
        $this->assertSame([$projectA1->id, $projectA2->id], $visibleIds);

        // Regression guard: the summary rollup must read the project's actual quota
        // (total_manhours), not silently default to 0 because of an over-narrow select().
        $this->assertEquals(150.0, $res['totals']['quota_hours']);
        $byId = collect($res['projects'])->keyBy('id');
        $this->assertEquals(100.0, $byId[$projectA1->id]['quota_hours']);
        $this->assertEquals(50.0, $byId[$projectA2->id]['quota_hours']);
    }

    public function test_client_user_gets_403_for_project_outside_their_company(): void
    {
        $companyA = Company::create(['name' => 'Company A']);
        $companyB = Company::create(['name' => 'Company B']);
        $otherProject = Project::factory()->create(['company_id' => $companyB->id, 'total_manhours' => 100]);

        Sanctum::actingAs($this->clientUser($companyA->id));

        $this->getJson("/api/client-monitoring/projects/{$otherProject->id}")->assertForbidden();
    }

    public function test_client_user_projects_pivot_narrows_visible_projects(): void
    {
        $company = Company::create(['name' => 'Company A']);
        $projectAllowed = Project::factory()->create(['company_id' => $company->id, 'total_manhours' => 100]);
        $projectRestricted = Project::factory()->create(['company_id' => $company->id, 'total_manhours' => 100]);

        $user = $this->clientUser($company->id);
        $user->clientProjects()->sync([$projectAllowed->id]);

        Sanctum::actingAs($user);

        $res = $this->getJson('/api/client-monitoring/summary')->assertOk()->json('data');
        $visibleIds = collect($res['projects'])->pluck('id')->all();
        $this->assertSame([$projectAllowed->id], $visibleIds);

        $this->getJson("/api/client-monitoring/projects/{$projectAllowed->id}")->assertOk();
        $this->getJson("/api/client-monitoring/projects/{$projectRestricted->id}")->assertForbidden();
    }

    public function test_plain_internal_user_without_permission_is_blocked(): void
    {
        Sanctum::actingAs($this->userWith(['profile.read']));

        $this->getJson('/api/client-monitoring/summary')->assertForbidden();
    }

    public function test_internal_user_with_permission_but_not_client_type_gets_403(): void
    {
        // Granted the module permission (e.g. by mistake in Access Control) but has
        // no company_id/user_type — the module is meaningless without a company link.
        Sanctum::actingAs($this->userWith(['client_monitoring.read']));

        $this->getJson('/api/client-monitoring/summary')->assertForbidden();
    }

    public function test_project_detail_response_has_no_monetary_fields(): void
    {
        $company = Company::create(['name' => 'Company A']);
        $project = Project::factory()->create(['company_id' => $company->id, 'total_manhours' => 100]);

        $category = FinanceCategory::create(['name' => 'Change Requests']);

        DB::table('project_allocations')->insert([
            'project_id' => $project->id,
            'category_id' => $category->id,
            'amount' => 5_000_000,
            'is_change_request' => true,
            'cr_feature' => 'Extra reporting module',
            'cr_date' => now()->toDateString(),
            'description' => 'Client requested an extra report.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($this->clientUser($company->id));

        $json = $this->getJson("/api/client-monitoring/projects/{$project->id}")->assertOk()->json('data');

        $this->assertCount(1, $json['change_requests']);
        $this->assertSame('Extra reporting module', $json['change_requests'][0]['cr_feature']);
        $this->assertArrayNotHasKey('amount', $json['change_requests'][0]);
        $this->assertArrayNotHasKey('paid_amount', $json['change_requests'][0]);
        $this->assertArrayNotHasKey('realized_amount', $json['change_requests'][0]);

        $flat = json_encode($json);
        $this->assertStringNotContainsString('"amount"', $flat);
        $this->assertStringNotContainsString('"paid_amount"', $flat);
        $this->assertStringNotContainsString('"realized_amount"', $flat);
    }
}
