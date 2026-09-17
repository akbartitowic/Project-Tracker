<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WeeklyReportBoard;
use App\Models\WeeklyReportItem;
use App\Models\WeeklyReportPeriod;
use App\Notifications\WeeklyReportItemAssignedNotification;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WeeklyReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        PermissionCatalog::sync();
    }

    private function userWith(array $slugs, array $attributes = []): User
    {
        $role = Role::firstOrCreate(['name' => 'WeeklyReportTest ' . md5(implode(',', $slugs))]);
        $role->permissions()->syncWithoutDetaching(Permission::whereIn('slug', $slugs)->pluck('id'));

        return User::factory()->create(array_merge([
            'role_id' => $role->id,
            'role' => $role->name,
        ], $attributes));
    }

    private function fullAccessUser(): User
    {
        return $this->userWith([
            'weekly_report.create', 'weekly_report.read', 'weekly_report.update', 'weekly_report.delete',
        ]);
    }

    public function test_board_is_only_visible_to_its_members(): void
    {
        $creator = $this->fullAccessUser();
        $outsider = $this->fullAccessUser();

        Sanctum::actingAs($creator);
        $res = $this->postJson('/api/weekly-report/boards', ['name' => 'Weekly Report Project']);
        $res->assertStatus(201);
        $boardId = $res->json('data.id');

        Sanctum::actingAs($outsider);
        $this->getJson("/api/weekly-report/boards/{$boardId}")->assertStatus(403);
        $this->getJson('/api/weekly-report/boards')->assertJsonCount(0, 'data');

        Sanctum::actingAs($creator);
        $this->getJson("/api/weekly-report/boards/{$boardId}")->assertOk();
    }

    public function test_assigning_a_new_user_to_an_item_grants_them_board_access(): void
    {
        Notification::fake();
        $creator = $this->fullAccessUser();
        $assignee = $this->fullAccessUser();

        $board = WeeklyReportBoard::create(['name' => 'Board', 'created_by' => $creator->id]);
        $board->members()->sync([$creator->id]);
        $period = WeeklyReportPeriod::create([
            'board_id' => $board->id, 'week_start' => '2026-09-14', 'week_end' => '2026-09-20', 'created_by' => $creator->id,
        ]);

        $this->assertFalse(\App\Support\WeeklyReportAccess::canAccessBoard($assignee, $board->id));

        Sanctum::actingAs($creator);
        $res = $this->postJson("/api/weekly-report/periods/{$period->id}/items", [
            'description' => 'Fix the bug',
            'issue_level' => 'High',
            'assignee_ids' => [$assignee->id],
        ]);
        $res->assertStatus(201);

        $this->assertTrue(\App\Support\WeeklyReportAccess::canAccessBoard($assignee, $board->id));
        Notification::assertSentTo($assignee, WeeklyReportItemAssignedNotification::class);
    }

    public function test_duplicate_carries_undone_items_and_respects_carry_done_flag(): void
    {
        $user = $this->fullAccessUser();
        $board = WeeklyReportBoard::create(['name' => 'Board', 'created_by' => $user->id]);
        $board->members()->sync([$user->id]);
        $period = WeeklyReportPeriod::create([
            'board_id' => $board->id, 'week_start' => '2026-09-14', 'week_end' => '2026-09-20', 'created_by' => $user->id,
        ]);
        $done = WeeklyReportItem::create([
            'period_id' => $period->id, 'reporter_id' => $user->id, 'description' => 'Done thing',
            'issue_level' => 'Low', 'is_done' => true,
        ]);
        $notDone = WeeklyReportItem::create([
            'period_id' => $period->id, 'reporter_id' => $user->id, 'description' => 'Not done thing',
            'issue_level' => 'Medium', 'is_done' => false,
        ]);

        Sanctum::actingAs($user);

        $res = $this->postJson("/api/weekly-report/periods/{$period->id}/duplicate", [
            'week_start' => '2026-09-21', 'week_end' => '2026-09-27', 'carry_done' => false,
        ]);
        $res->assertStatus(201);
        $this->assertCount(1, $res->json('data.items'));
        $this->assertSame('Not done thing', $res->json('data.items.0.description'));

        $res2 = $this->postJson("/api/weekly-report/periods/{$period->id}/duplicate", [
            'week_start' => '2026-09-28', 'week_end' => '2026-10-04', 'carry_done' => true,
        ]);
        $res2->assertStatus(201);
        $this->assertCount(2, $res2->json('data.items'));
    }

    public function test_next_action_is_saved_and_carried_over_on_duplicate(): void
    {
        $user = $this->fullAccessUser();
        $board = WeeklyReportBoard::create(['name' => 'Board', 'created_by' => $user->id]);
        $board->members()->sync([$user->id]);
        $period = WeeklyReportPeriod::create([
            'board_id' => $board->id, 'week_start' => '2026-09-14', 'week_end' => '2026-09-20', 'created_by' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $res = $this->postJson("/api/weekly-report/periods/{$period->id}/items", [
            'description' => 'Fix the bug',
            'issue_level' => 'High',
            'next_action' => 'Wait for QA sign-off',
        ]);
        $res->assertStatus(201);
        $this->assertSame('Wait for QA sign-off', $res->json('data.next_action'));

        $dup = $this->postJson("/api/weekly-report/periods/{$period->id}/duplicate", [
            'week_start' => '2026-09-21', 'week_end' => '2026-09-27', 'carry_done' => false,
        ]);
        $dup->assertStatus(201);
        $this->assertSame('Wait for QA sign-off', $dup->json('data.items.0.next_action'));
    }

    public function test_marking_a_duplicated_item_done_also_marks_the_earlier_week_done(): void
    {
        $user = $this->fullAccessUser();
        $board = WeeklyReportBoard::create(['name' => 'Board', 'created_by' => $user->id]);
        $board->members()->sync([$user->id]);
        $period1 = WeeklyReportPeriod::create([
            'board_id' => $board->id, 'week_start' => '2026-09-14', 'week_end' => '2026-09-20', 'created_by' => $user->id,
        ]);
        $original = WeeklyReportItem::create([
            'period_id' => $period1->id, 'reporter_id' => $user->id, 'description' => 'Carried task',
            'issue_level' => 'Medium', 'is_done' => false,
        ]);

        Sanctum::actingAs($user);

        $dup = $this->postJson("/api/weekly-report/periods/{$period1->id}/duplicate", [
            'week_start' => '2026-09-21', 'week_end' => '2026-09-27', 'carry_done' => false,
        ]);
        $dup->assertStatus(201);
        $week2ItemId = $dup->json('data.items.0.id');

        // Duplicate again to a third week, from the week-2 copy.
        $period2Id = $dup->json('data.id');
        $dup2 = $this->postJson("/api/weekly-report/periods/{$period2Id}/duplicate", [
            'week_start' => '2026-09-28', 'week_end' => '2026-10-04', 'carry_done' => false,
        ]);
        $dup2->assertStatus(201);
        $week3ItemId = $dup2->json('data.items.0.id');

        // Marking the WEEK-2 copy done should close out week 1 too.
        $this->patchJson("/api/weekly-report/items/{$week2ItemId}/status", ['is_done' => true])->assertOk();
        $this->assertTrue((bool) $original->fresh()->is_done);

        // And it should also reach forward to week 3, since it's the same lineage.
        $this->assertTrue((bool) WeeklyReportItem::find($week3ItemId)->is_done);
    }

    public function test_item_dates_serialize_as_plain_date_not_shifted_utc(): void
    {
        $user = $this->fullAccessUser();
        $board = WeeklyReportBoard::create(['name' => 'Board', 'created_by' => $user->id]);
        $board->members()->sync([$user->id]);
        $period = WeeklyReportPeriod::create([
            'board_id' => $board->id, 'week_start' => '2026-09-14', 'week_end' => '2026-09-20', 'created_by' => $user->id,
        ]);
        WeeklyReportItem::create([
            'period_id' => $period->id, 'reporter_id' => $user->id, 'description' => 'Item',
            'issue_level' => 'Low', 'due_date' => '2026-09-19',
        ]);

        Sanctum::actingAs($user);
        $res = $this->getJson("/api/weekly-report/periods/{$period->id}");
        $res->assertOk();
        $this->assertSame('2026-09-19', $res->json('data.items.0.due_date'));
        $this->assertSame('2026-09-14', $res->json('data.week_start'));
    }
}
