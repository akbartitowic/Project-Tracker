<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectReview;
use App\Models\ProjectReviewAnswer;
use App\Models\ReviewCalibrationVote;
use App\Models\ReviewEvaluation;
use App\Models\ReviewQuestion;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use App\Support\ReviewCalibration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewCalibrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        PermissionCatalog::sync();
    }

    /** Build project + evaluation + 3 weighted questions + one submitted review with 3 answers (score 6). */
    private function scenario(array $weights = [40, 35, 25]): array
    {
        $project = Project::factory()->create([
            'methodology'    => 'Waterfall',
            'review_enabled' => true,
        ]);

        $eval = ReviewEvaluation::create([
            'methodology'   => 'Waterfall',
            'name'          => 'Evaluasi Test',
            'trigger_label' => 'Test',
            'trigger_type'  => 'date_based',
            'focus'         => 'x',
            'purpose'       => 'y',
            'order'         => 1,
            'is_active'     => true,
        ]);

        $questions = collect($weights)->map(fn ($w, $i) => ReviewQuestion::create([
            'evaluation_id' => $eval->id,
            'question'      => 'Q' . ($i + 1),
            'weight'        => $w,
            'has_weight'    => true,
            'order'         => $i + 1,
        ]));

        $author = User::factory()->create();
        $review = ProjectReview::create([
            'project_id'    => $project->id,
            'evaluation_id' => $eval->id,
            'submitted_by'  => $author->id,
            'total_score'   => 60.0, // (6/10*40)+(6/10*35)+(6/10*25)
        ]);

        foreach ($questions as $q) {
            ProjectReviewAnswer::create(['review_id' => $review->id, 'question_id' => $q->id, 'score' => 6]);
        }

        return [$project, $eval, $questions, $review];
    }

    private function userWith(array $slugs): User
    {
        $role = Role::firstOrCreate(['name' => 'Calib ' . md5(implode(',', $slugs))]);
        $role->permissions()->syncWithoutDetaching(Permission::whereIn('slug', $slugs)->pluck('id'));

        return User::factory()->create(['role_id' => $role->id, 'role' => $role->name]);
    }

    public function test_calibrate_permission_is_required(): void
    {
        [$project, , , $review] = $this->scenario();
        Sanctum::actingAs($this->userWith(['review.read', 'review.view_all']));

        $this->getJson('/api/review/calibration')->assertForbidden();
        $this->getJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration")->assertForbidden();
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", ['votes' => []])->assertForbidden();
        $this->postJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration/lock")->assertForbidden();
    }

    public function test_calibrator_can_upsert_and_retract_votes(): void
    {
        [$project, , $questions, $review] = $this->scenario();
        $q1 = $questions[0]->id;
        $q2 = $questions[1]->id;

        Sanctum::actingAs($this->userWith(['review.read', 'review.calibrate', 'review.view_all']));

        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [
                ['question_id' => $q1, 'agree' => true],
                ['question_id' => $q2, 'agree' => false, 'proposed_score' => 4, 'reason' => 'terlalu tinggi'],
            ],
        ])->assertOk();
        $this->assertDatabaseCount('review_calibration_votes', 2);

        $detail = $this->getJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration")->json('data');
        $byQ = collect($detail['questions'])->keyBy('question_id');
        $this->assertTrue($byQ[$q1]['my_vote']);
        $this->assertFalse($byQ[$q2]['my_vote']);
        $this->assertSame(4, $byQ[$q2]['my_proposed_score']);
        $this->assertSame('terlalu tinggi', $byQ[$q2]['my_reason']);

        // Re-submit with only q1 → q2 retracted.
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $q1, 'agree' => true]],
        ])->assertOk();
        $this->assertDatabaseCount('review_calibration_votes', 1);

        // Empty payload → all retracted.
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", ['votes' => []])->assertOk();
        $this->assertDatabaseCount('review_calibration_votes', 0);
    }

    public function test_disagree_requires_proposed_score_and_reason(): void
    {
        [$project, , $questions, $review] = $this->scenario();
        Sanctum::actingAs($this->userWith(['review.read', 'review.calibrate', 'review.view_all']));

        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false]],
        ])->assertStatus(422)->assertJsonValidationErrors('votes');

        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 4]],
        ])->assertStatus(422); // reason missing

        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 4, 'reason' => 'ok']],
        ])->assertOk();
    }

    public function test_proposed_score_is_capped_to_plus_minus_2_of_the_original(): void
    {
        // scenario() answers every question with score = 6, so the allowed range is 4–8.
        [$project, , $questions, $review] = $this->scenario();
        Sanctum::actingAs($this->userWith(['review.read', 'review.calibrate', 'review.view_all']));

        // 3 is 3 points below 6 → out of range (min 4).
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 3, 'reason' => 'x']],
        ])->assertStatus(422)->assertJsonValidationErrors('votes');

        // 9 is 3 points above 6 → out of range (max 8).
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 9, 'reason' => 'x']],
        ])->assertStatus(422);

        // Boundaries (4 and 8) are both allowed.
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 4, 'reason' => 'x']],
        ])->assertOk();
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 8, 'reason' => 'x']],
        ])->assertOk();
    }

    public function test_question_passes_only_when_strictly_above_60_percent(): void
    {
        $answers = collect([(object) ['question_id' => 1, 'score' => 6, 'question' => (object) ['weight' => 100]]]);

        // 3 of 5 agree = exactly 60% → NOT passed.
        $votes = collect([
            (object) ['question_id' => 1, 'user_id' => 1, 'agree' => true,  'proposed_score' => null],
            (object) ['question_id' => 1, 'user_id' => 2, 'agree' => true,  'proposed_score' => null],
            (object) ['question_id' => 1, 'user_id' => 3, 'agree' => true,  'proposed_score' => null],
            (object) ['question_id' => 1, 'user_id' => 4, 'agree' => false, 'proposed_score' => 3],
            (object) ['question_id' => 1, 'user_id' => 5, 'agree' => false, 'proposed_score' => 5],
        ]);
        $summary = ReviewCalibration::summarize($answers, $votes);
        $this->assertSame('failed', $summary['questions'][0]['status']);
        $this->assertSame('invalid', $summary['verdict']);
        $this->assertSame(5, $summary['voter_count']);
        // effective = (3*6 + 3 + 5) / 5 = 5.2
        $this->assertSame(5.2, $summary['questions'][0]['effective_score']);

        // 4 of 5 agree = 80% → passed.
        $votes[3]->agree = true;
        $votes[3]->proposed_score = null;
        $summary = ReviewCalibration::summarize($answers, $votes);
        $this->assertSame('passed', $summary['questions'][0]['status']);
        $this->assertSame('valid', $summary['verdict']);
        // effective = (4*6 + 5) / 5 = 5.8
        $this->assertSame(5.8, $summary['questions'][0]['effective_score']);
    }

    public function test_submission_verdict_uses_decided_questions_only(): void
    {
        $mk = fn ($id) => (object) ['question_id' => $id, 'score' => 6, 'question' => (object) ['weight' => 33]];
        $answers = collect([$mk(1), $mk(2), $mk(3)]);

        $votes = collect([
            (object) ['question_id' => 1, 'user_id' => 1, 'agree' => true, 'proposed_score' => null],
            (object) ['question_id' => 1, 'user_id' => 2, 'agree' => true, 'proposed_score' => null],
            (object) ['question_id' => 2, 'user_id' => 1, 'agree' => true, 'proposed_score' => null],
            (object) ['question_id' => 2, 'user_id' => 2, 'agree' => true, 'proposed_score' => null],
        ]);
        $summary = ReviewCalibration::summarize($answers, $votes);
        $this->assertSame('valid', $summary['verdict']);
        $this->assertSame(2, $summary['decided_count']);
        $this->assertSame(3, $summary['total_count']);

        $votes[2]->agree = false; $votes[2]->proposed_score = 2;
        $votes[3]->agree = false; $votes[3]->proposed_score = 2;
        $this->assertSame('invalid', ReviewCalibration::summarize($answers, $votes)['verdict']);

        $this->assertSame('pending', ReviewCalibration::summarize($answers, collect())['verdict']);
    }

    public function test_unlocked_calibration_does_not_change_the_score(): void
    {
        [$project, $eval, $questions, $review] = $this->scenario();
        Sanctum::actingAs($this->userWith(['review.read', 'review.calibrate', 'review.view_all']));

        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => $questions->map(fn ($q) => ['question_id' => $q->id, 'agree' => false, 'proposed_score' => 4, 'reason' => 'x'])->all(),
        ])->assertOk();

        $review->refresh();
        $this->assertEquals(60.0, $review->total_score);
        $this->assertNull($review->calibrated_score);
        $this->assertNull($review->calibration_locked_at);

        // Overall still the original while unlocked.
        $overall = $this->getJson("/api/projects/{$project->id}/reviews/summary")->json('overall');
        $this->assertEquals(60.0, $overall);
    }

    public function test_lock_snapshots_calibrated_scores_and_blocks_further_votes(): void
    {
        [$project, $eval, $questions, $review] = $this->scenario([40, 35, 25]);
        $calibrator = $this->userWith(['review.read', 'review.calibrate', 'review.view_all']);
        Sanctum::actingAs($calibrator);

        // Single calibrator: disagree on Q1 with 4 (min allowed, since original is 6), agree on Q2 & Q3.
        // effective Q1 = 4, Q2 = 6, Q3 = 6 → calibrated total = (4/10*40)+(6/10*35)+(6/10*25) = 16 + 21 + 15 = 52
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [
                ['question_id' => $questions[0]->id, 'agree' => false, 'proposed_score' => 4, 'reason' => 'jelek'],
                ['question_id' => $questions[1]->id, 'agree' => true],
                ['question_id' => $questions[2]->id, 'agree' => true],
            ],
        ])->assertOk();

        $locked = $this->postJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration/lock")
            ->assertOk()->json('data');
        $this->assertTrue($locked['is_locked']);
        $this->assertEquals(52.0, $locked['locked_score']);

        $review->refresh();
        $this->assertEquals(52.0, $review->calibrated_score);
        $this->assertNotNull($review->calibration_locked_at);
        $this->assertEquals(4.0, ProjectReviewAnswer::where('review_id', $review->id)->where('question_id', $questions[0]->id)->value('calibrated_score'));
        $this->assertEquals(6.0, ProjectReviewAnswer::where('review_id', $review->id)->where('question_id', $questions[1]->id)->value('calibrated_score'));

        // Aggregations now use the calibrated score.
        $this->assertEquals(52.0, $this->getJson("/api/projects/{$project->id}/reviews/summary")->json('overall'));

        // Votes are frozen while locked.
        $this->putJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration", [
            'votes' => [['question_id' => $questions[0]->id, 'agree' => true]],
        ])->assertStatus(422);

        // Unlock reverts everywhere.
        $this->deleteJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration/lock")->assertOk();
        $review->refresh();
        $this->assertNull($review->calibrated_score);
        $this->assertNull($review->calibration_locked_at);
        $this->assertNull(ProjectReviewAnswer::where('review_id', $review->id)->where('question_id', $questions[0]->id)->value('calibrated_score'));
        $this->assertEquals(60.0, $this->getJson("/api/projects/{$project->id}/reviews/summary")->json('overall'));
    }

    public function test_lock_requires_at_least_one_decided_question(): void
    {
        [$project, , , $review] = $this->scenario();
        Sanctum::actingAs($this->userWith(['review.read', 'review.calibrate', 'review.view_all']));

        $this->postJson("/api/projects/{$project->id}/reviews/{$review->id}/calibration/lock")
            ->assertStatus(422);
    }

    public function test_list_returns_tally_and_respects_status_filter(): void
    {
        [$project, , $questions, $review] = $this->scenario();

        foreach ([1, 2] as $n) {
            $u = User::factory()->create();
            foreach ($questions as $q) {
                ReviewCalibrationVote::create([
                    'review_id' => $review->id, 'question_id' => $q->id, 'user_id' => $u->id, 'agree' => true,
                ]);
            }
        }

        Sanctum::actingAs($this->userWith(['review.read', 'review.calibrate', 'review.view_all']));

        $row = $this->getJson('/api/review/calibration')->assertOk()->json('data.0');
        $this->assertSame('valid', $row['calibration']['verdict']);
        $this->assertSame(2, $row['calibration']['voter_count']);
        $this->assertFalse($row['calibration']['is_locked']);

        $this->assertCount(1, $this->getJson('/api/review/calibration?status=valid')->json('data'));
        $this->assertCount(0, $this->getJson('/api/review/calibration?status=pending')->json('data'));
    }
}
