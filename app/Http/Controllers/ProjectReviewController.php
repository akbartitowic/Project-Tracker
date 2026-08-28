<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectAllocation;
use App\Models\ProjectReview;
use App\Models\ProjectReviewAnswer;
use App\Models\ReviewEvaluation;
use App\Models\ReviewQuestion;
use App\Models\ReviewToken;
use App\Models\Task;
use App\Support\ProjectAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectReviewController extends Controller
{
    use LogActivity;

    /**
     * GET /review/projects
     * Project list backing both the /review dashboard and the "Project" tab on
     * Review Config. Scoped by the Review module's "View All Projects"
     * (`review.view_all`) permission: holders (and privileged users) see every
     * project; everyone else sees only the projects they're assigned to.
     */
    public function eligibleProjects(Request $request)
    {
        $query = Project::query()
            ->select('id', 'name', 'methodology', 'status', 'review_enabled', 'start_date', 'end_date', 'review_client_emails')
            ->orderBy('name');

        ProjectAccess::applyReviewProjectScope($query, 'id', $request->user());

        return response()->json(['data' => $query->get()]);
    }

    /**
     * PATCH /review/projects/{id}/eligibility
     * Toggle whether a project is allowed to receive reviews at all.
     */
    public function updateEligibility(Request $request, int $id)
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'review_enabled' => 'required|boolean',
        ]);

        $project->update(['review_enabled' => $validated['review_enabled']]);

        return response()->json(['data' => [
            'id'             => $project->id,
            'name'           => $project->name,
            'review_enabled' => $project->review_enabled,
        ]]);
    }

    /**
     * GET /projects/{id}/reviews
     * Returns all submitted reviews for a project, grouped by evaluation,
     * each with computed score and submitted_by info.
     */
    public function index(Request $request, int $projectId)
    {
        $user    = $request->user();
        $project = Project::findOrFail($projectId);

        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // Excluded submissions are returned too (so the history list can show
        // them greyed out and let an editor toggle them back on) — they're only
        // filtered out of the aggregation queries below.
        $reviews = ProjectReview::with(['evaluation', 'submitter:id,name', 'answers.question', 'excludedBy:id,name'])
            ->where('project_id', $projectId)
            ->orderBy('created_at', 'desc')
            ->get();

        // Group by evaluation_id, keep latest per evaluation
        $byEval = [];
        foreach ($reviews as $r) {
            $byEval[$r->evaluation_id][] = $this->serializeReview($r);
        }

        return response()->json(['data' => $byEval]);
    }

    /**
     * GET /review/radar
     * Average score per question (by position within its evaluation cycle,
     * not question text — cycles can have different question sets) for the
     * dashboard's radar chart. Two comparison modes:
     *  - compare=cycle (default): one series per active cycle (or a single
     *    one when `evaluation_id` narrows to a specific cycle); `project_ids`
     *    narrows which projects' reviews feed the averages (one or several),
     *    omitted = aggregate across every project the requester can see.
     *  - compare=project: one series per (project, cycle) pair that has
     *    submitted reviews for any cycle in `evaluation_ids` (at least one
     *    required). `project_ids` optionally narrows which projects are
     *    considered, omitted = every project with data. Selecting several
     *    cycles for the same project surfaces it as separate lines labeled
     *    "Project — Cycle", so the same project can be compared against
     *    itself across cycles, not just against other projects.
     * Each series also carries its questions' text (parallel to `values`) so
     * the frontend can show what a given axis position actually asked.
     */
    public function radar(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'methodology'      => 'required|in:Agile Scrum,Waterfall',
            'compare'          => 'nullable|in:cycle,project',
            'project_ids'      => 'nullable|array',
            'project_ids.*'    => 'integer|exists:projects,id',
            'evaluation_id'    => 'nullable|integer|exists:review_evaluations,id',
            'evaluation_ids'   => 'nullable|array',
            'evaluation_ids.*' => 'integer|exists:review_evaluations,id',
        ]);

        foreach ($validated['project_ids'] ?? [] as $projectId) {
            ProjectAccess::assertCanAccessProjectReview($user, $projectId);
        }

        if (($validated['compare'] ?? 'cycle') === 'project') {
            $evalIds = $validated['evaluation_ids'] ?? [];
            if (empty($evalIds)) {
                return response()->json(['message' => 'Pilih minimal satu siklus evaluasi untuk membandingkan antar project.'], 422);
            }
            return response()->json(['data' => $this->radarByProject(
                $validated['methodology'], $evalIds, $validated['project_ids'] ?? [], $user
            )]);
        }

        return response()->json(['data' => $this->radarByCycle($validated, $user)]);
    }

    /**
     * Reviews only feed the dashboard radar/aggregates while their project is
     * still review-enabled (Review Config → Project tab). Toggling a project
     * off there drops it from the chart immediately — matching how it's
     * already left out of the project cards and proportion charts (which
     * filter `review_enabled` on the frontend).
     */
    private function reviewEnabledProjectIds()
    {
        return Project::where('review_enabled', true)->select('id');
    }

    private function radarByCycle(array $validated, $user): array
    {
        $evalsQuery = ReviewEvaluation::with(['questions' => fn ($q) => $q->where('has_weight', true)->orderBy('order')])
            ->where('methodology', $validated['methodology'])
            ->where('is_active', true)
            ->orderBy('order');

        if (!empty($validated['evaluation_id'])) {
            $evalsQuery->where('id', $validated['evaluation_id']);
        }

        $evals       = $evalsQuery->get();
        $questionIds = $evals->flatMap(fn ($e) => $e->questions->pluck('id'))->all();

        $avgByQuestion = ProjectReviewAnswer::query()
            ->whereIn('question_id', $questionIds)
            ->whereHas('review', function ($q) use ($validated, $user) {
                $q->whereNull('excluded_at')
                  ->whereIn('project_id', $this->reviewEnabledProjectIds());
                if (!empty($validated['project_ids'])) {
                    $q->whereIn('project_id', $validated['project_ids']);
                } else {
                    ProjectAccess::applyReviewProjectScope($q, 'project_id', $user);
                }
            })
            ->groupBy('question_id')
            ->selectRaw('question_id, AVG(score) as avg_score')
            ->pluck('avg_score', 'question_id');

        // Axes/series text only account for cycles that actually have matching
        // data — a cycle with more questions but zero submissions must not
        // inflate the axis count for the cycle(s) that do have data.
        $series = [];
        foreach ($evals as $eval) {
            $values     = [];
            $questions  = [];
            $hasAnyData = false;

            foreach ($eval->questions as $i => $q) {
                $avg = $avgByQuestion->get($q->id);
                if ($avg !== null) $hasAnyData = true;
                $values[$i]    = $avg !== null ? round((float) $avg, 2) : null;
                $questions[$i] = $q->question;
            }

            if ($hasAnyData) {
                $series[] = [
                    'key'       => 'eval_' . $eval->id,
                    'label'     => $eval->name,
                    'values'    => array_values($values),
                    'questions' => array_values($questions),
                ];
            }
        }

        return $this->padSeriesToCommonAxes($series);
    }

    private function radarByProject(string $methodology, array $evalIds, array $requestedProjectIds, $user): array
    {
        $evals = ReviewEvaluation::with(['questions' => fn ($q) => $q->where('has_weight', true)->orderBy('order')])
            ->where('methodology', $methodology)
            ->whereIn('id', $evalIds)
            ->orderBy('order')
            ->get();

        if ($evals->isEmpty()) {
            return $this->padSeriesToCommonAxes([]);
        }

        // Only disambiguate the series label with the cycle name when more
        // than one cycle is actually being compared — keeps the common case
        // (one cycle) as clean as before.
        $multiCycle = $evals->count() > 1;

        $reviewsQuery = ProjectReview::whereIn('evaluation_id', $evals->pluck('id'))
            ->whereNull('excluded_at')
            ->whereIn('project_id', $this->reviewEnabledProjectIds());
        ProjectAccess::applyReviewProjectScope($reviewsQuery, 'project_id', $user);
        if (!empty($requestedProjectIds)) {
            $reviewsQuery->whereIn('project_id', $requestedProjectIds);
        }
        $projectIds = $reviewsQuery->distinct()->pluck('project_id');

        $projects    = Project::whereIn('id', $projectIds)->orderBy('name')->get(['id', 'name']);
        $questionIds = $evals->flatMap(fn ($e) => $e->questions->pluck('id'))->all();

        // Single grouped query across every project × cycle at once (avoids N+1).
        $rows = DB::table('project_review_answers')
            ->join('project_reviews', 'project_reviews.id', '=', 'project_review_answers.review_id')
            ->whereIn('project_review_answers.question_id', $questionIds)
            ->whereIn('project_reviews.evaluation_id', $evals->pluck('id'))
            ->whereIn('project_reviews.project_id', $projectIds)
            ->whereNull('project_reviews.excluded_at')
            ->groupBy('project_reviews.project_id', 'project_reviews.evaluation_id', 'project_review_answers.question_id')
            ->selectRaw('project_reviews.project_id, project_reviews.evaluation_id, project_review_answers.question_id, AVG(project_review_answers.score) as avg_score')
            ->get();

        $avgMap = []; // [project_id][evaluation_id][question_id] => avg
        foreach ($rows as $r) {
            $avgMap[$r->project_id][$r->evaluation_id][$r->question_id] = (float) $r->avg_score;
        }

        $series = [];
        foreach ($projects as $project) {
            foreach ($evals as $eval) {
                $projEvalAvg = $avgMap[$project->id][$eval->id] ?? null;
                if ($projEvalAvg === null) continue; // this project has no submission for this particular cycle

                $values = [];
                $qTexts = [];
                foreach ($eval->questions as $i => $q) {
                    $avg        = $projEvalAvg[$q->id] ?? null;
                    $values[$i] = $avg !== null ? round($avg, 2) : null;
                    $qTexts[$i] = $q->question;
                }

                $series[] = [
                    'key'       => 'project_' . $project->id . '_eval_' . $eval->id,
                    'label'     => $multiCycle ? "{$project->name} — {$eval->name}" : $project->name,
                    'values'    => array_values($values),
                    'questions' => array_values($qTexts),
                ];
            }
        }

        return $this->padSeriesToCommonAxes($series);
    }

    /**
     * Pads every series' values/questions to the longest series actually
     * present, and derives the shared axis count from that — never from
     * evaluations/projects that ended up excluded for having no data.
     */
    private function padSeriesToCommonAxes(array $series): array
    {
        $maxAxes = 0;
        foreach ($series as $s) {
            $maxAxes = max($maxAxes, count($s['values']));
        }

        foreach ($series as &$s) {
            for ($i = count($s['values']); $i < $maxAxes; $i++) {
                $s['values'][$i]    = null;
                $s['questions'][$i] = null;
            }
        }
        unset($s);

        return [
            'axes'   => range(1, max($maxAxes, 1)),
            'series' => $series,
        ];
    }

    /**
     * GET /projects/{id}/reviews/summary
     * Returns latest score per evaluation for the project card display.
     */
    public function summary(Request $request, int $projectId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // Get all evaluations for the project's methodology
        $project    = Project::findOrFail($projectId);
        $evals      = ReviewEvaluation::where('methodology', $project->methodology)->where('is_active', true)->orderBy('order')->get();

        // Share-link status is scoped per evaluation (per review), not the whole
        // project — a project can have several reviews, each with its own link(s)
        // and send/copy status, so counting must happen per review everywhere.
        $tokensByEval = ReviewToken::where('project_id', $projectId)
            ->get(['id', 'evaluation_id', 'is_active', 'email_sent_at', 'client_emails', 'created_at'])
            ->groupBy('evaluation_id');

        // Every counted submission for this project's active evaluations, newest
        // first. Excluded submissions never enter here (scopeCounted), so they
        // don't affect any score. The per-evaluation card score is the AVERAGE of
        // that evaluation's submissions, and the Overall further down is the flat
        // average across every submission — not "latest only" anymore.
        $allReviews = ProjectReview::where('project_id', $projectId)
            ->whereIn('evaluation_id', $evals->pluck('id'))
            ->counted()
            ->with('submitter:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        $reviewsByEval = $allReviews->groupBy('evaluation_id');

        $summary = $evals->map(function ($eval) use ($reviewsByEval, $tokensByEval) {
            $evalReviews = $reviewsByEval->get($eval->id, collect());
            $latest      = $evalReviews->first();
            $count       = $evalReviews->count();

            $evalTokens = $tokensByEval->get($eval->id, collect());

            return [
                'evaluation_id'    => $eval->id,
                'evaluation_name'  => $eval->name,
                'evaluation_order' => $eval->order,
                'trigger_label'    => $eval->trigger_label,
                'submitted'        => $count > 0,
                'submission_count' => $count,
                // Average of every counted submission for this evaluation.
                'total_score'      => $count ? round($evalReviews->avg('total_score'), 2) : null,
                // Latest submission's raw score + who/when, for context in the UI.
                'latest_score'     => $latest?->total_score,
                'submitted_at'     => $latest?->created_at?->toIso8601String(),
                'submitted_by'     => $latest?->submitter?->name ?? $latest?->reviewer_name,
                'review_id'        => $latest?->id,
                // Everyone who submitted a counted review for this evaluation —
                // the card lists all of them, not just the latest.
                'reviewers'        => $evalReviews->map(fn ($r) => [
                    'review_id'    => $r->id,
                    'name'         => $r->submitter?->name ?? $r->reviewer_name ?? 'Anonim',
                    'company'      => $r->reviewer_company,
                    'total_score'  => $r->total_score,
                    'submitted_at' => $r->created_at?->toIso8601String(),
                ])->values(),
                // `has_emails` lets the frontend treat a link that already has client
                // emails saved as "terkirim" even before the send button is clicked.
                // `generated_at` = when the first review link was created for this
                // evaluation — used by the dashboard to show "menunggu sejak X" for
                // projects that haven't been reviewed yet.
                'share'            => [
                    'has_link'      => $evalTokens->isNotEmpty(),
                    'email_sent_at' => $evalTokens->max('email_sent_at')?->toIso8601String(),
                    'has_emails'    => $evalTokens->contains(fn ($t) => !empty($t->client_emails)),
                    'token_ids'     => $evalTokens->pluck('id')->values(),
                    'generated_at'  => $evalTokens->min('created_at')?->toIso8601String(),
                ],
            ];
        });

        // Overall: flat average of every counted submission across all evaluations.
        $overall = $allReviews->count()
            ? round($allReviews->avg('total_score'), 2)
            : null;

        return response()->json([
            'data'          => $summary,
            'overall'       => $overall,
            'overall_count' => $allReviews->count(),
        ]);
    }

    /**
     * GET /projects/{id}/reviews/trigger-status
     * Returns computed trigger status (current value vs threshold) for each active evaluation.
     */
    public function triggerStatus(Request $request, int $projectId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $project = Project::findOrFail($projectId);

        if (!$project->review_enabled) {
            return response()->json(['data' => []]);
        }

        $evals = ReviewEvaluation::where('methodology', $project->methodology)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        $statuses = $evals->map(fn($e) => $this->computeTriggerStatus($e, $projectId, $project));

        return response()->json(['data' => $statuses]);
    }

    private function computeTriggerStatus(ReviewEvaluation $eval, int $projectId, Project $project): array
    {
        $base = [
            'evaluation_id'   => $eval->id,
            'evaluation_name' => $eval->name,
            'trigger_type'    => $eval->trigger_type,
            'trigger_basis'   => $eval->trigger_basis,
            'trigger_value'   => $eval->trigger_value,
            'current_value'   => null,
            'budget'          => null,
            'is_triggered'    => null,
        ];

        if ($eval->trigger_value === null) return $base;

        if ($eval->trigger_type === 'mh_percentage') {
            // Aligned with Project Board's "MH terpakai" (ProjectController::balance()):
            // planned/estimated hours on billable, quota-eligible tasks — not actual logged manhours.
            $usedHours = (float) Task::query()
                ->where('project_id', $projectId)
                ->where('is_billable', true)
                ->quotaEligible()
                ->sum('estimated_hours');

            if ($eval->trigger_basis === 'topup_mh') {
                $budget = (float) ProjectAllocation::where('project_id', $projectId)
                    ->where('is_topup', true)
                    ->whereNotNull('topup_hours')
                    ->sum('topup_hours');
            } else {
                // total_mh: budget = project's total MH quota, same as Project Board's "MH terpakai".
                $budget = (float) ($project->total_manhours ?? 0);
            }

            if ($budget > 0) {
                $pct = round(($usedHours / $budget) * 100, 1);
                $base['current_value'] = $pct;
                $base['budget']        = $budget;
                $base['is_triggered']  = $pct >= $eval->trigger_value;
            }
        } elseif (in_array($eval->trigger_type, ['task_done_percentage', 'project_percentage'])) {
            $total = Task::where('project_id', $projectId)->count();
            $done  = Task::where('project_id', $projectId)->where('status', 'Done')->count();

            if ($total > 0) {
                $pct = round(($done / $total) * 100, 1);
                $base['current_value'] = $pct;
                $base['budget']        = $total;
                $base['is_triggered']  = $pct >= $eval->trigger_value;
            }
        }
        // date_based: no auto calculation

        return $base;
    }

    /**
     * POST /projects/{id}/evaluations/{evalId}/reviews
     * Submit a review for a specific evaluation.
     */
    public function store(Request $request, int $projectId, int $evalId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $project = Project::findOrFail($projectId);
        if (!$project->review_enabled) {
            return response()->json(['error' => 'Project ini tidak berhak menerima review.'], 403);
        }

        $eval      = ReviewEvaluation::findOrFail($evalId);
        $questions = $eval->questions;

        // ── Submission rules enforcement ──
        $existingCount = ProjectReview::where('project_id', $projectId)
            ->where('evaluation_id', $evalId)
            ->count();

        if ($eval->max_submissions !== null && $existingCount >= $eval->max_submissions) {
            return response()->json([
                'error' => "Evaluasi ini sudah mencapai batas maksimal {$eval->max_submissions}x pengisian.",
            ], 422);
        }

        if ($eval->one_per_user) {
            $alreadySubmitted = ProjectReview::where('project_id', $projectId)
                ->where('evaluation_id', $evalId)
                ->where('submitted_by', $user->id)
                ->exists();
            if ($alreadySubmitted) {
                return response()->json(['error' => 'Anda sudah mengisi evaluasi ini sebelumnya.'], 422);
            }
        }

        $validated = $request->validate([
            'answers'          => 'required|array',
            'answers.*.question_id' => 'required|integer|exists:review_questions,id',
            'answers.*.score'  => 'required|integer|min:1|max:10',
            'answers.*.comment' => 'nullable|string|max:1000',
            'notes'            => 'nullable|string|max:2000',
        ]);

        // Compute weighted total score
        $questionMap = $questions->keyBy('id');
        $totalScore  = 0;
        foreach ($validated['answers'] as $ans) {
            $q = $questionMap[$ans['question_id']] ?? null;
            if ($q) {
                $totalScore += ($ans['score'] / 10) * $q->weight;
            }
        }

        $review = ProjectReview::create([
            'project_id'    => $projectId,
            'evaluation_id' => $evalId,
            'submitted_by'  => $user->id,
            'notes'         => $validated['notes'] ?? null,
            'total_score'   => round($totalScore, 2),
        ]);

        foreach ($validated['answers'] as $ans) {
            ProjectReviewAnswer::create([
                'review_id'   => $review->id,
                'question_id' => $ans['question_id'],
                'score'       => $ans['score'],
                'comment'     => $ans['comment'] ?? null,
            ]);
        }

        return response()->json(['data' => $this->serializeReview($review->load(['evaluation', 'submitter:id,name', 'answers.question', 'excludedBy:id,name']))], 201);
    }

    /**
     * GET /projects/{id}/reviews/{reviewId}
     * Get detail of a specific review (all answers).
     */
    public function show(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $review = ProjectReview::with(['evaluation.questions', 'submitter:id,name', 'answers.question', 'excludedBy:id,name'])
            ->where('project_id', $projectId)
            ->findOrFail($reviewId);

        return response()->json(['data' => $this->serializeReview($review)]);
    }

    /**
     * PATCH /projects/{id}/reviews/{reviewId}/exclusion
     * Toggle whether a submission counts toward aggregations. Non-destructive:
     * the submission and its answers stay intact and keep showing in the
     * history list — they're just skipped by every score calculation while
     * excluded_at is set. Reversible by sending { "excluded": false }.
     */
    public function updateExclusion(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate(['excluded' => 'required|boolean']);

        $review = ProjectReview::with(['evaluation', 'submitter:id,name', 'answers.question'])
            ->where('project_id', $projectId)
            ->findOrFail($reviewId);

        if ($validated['excluded']) {
            $review->excluded_at = now();
            $review->excluded_by = $user->id;
        } else {
            $review->excluded_at = null;
            $review->excluded_by = null;
        }
        $review->save();
        $review->load('excludedBy:id,name');

        $this->log(
            'Review',
            $validated['excluded'] ? 'Excluded Review from Scoring' : 'Re-included Review in Scoring',
            "Review #{$review->id} · project #{$projectId} · {$review->evaluation?->name}"
        );

        return response()->json(['data' => $this->serializeReview($review)]);
    }

    private function serializeReview(ProjectReview $r): array
    {
        $submitterName = $r->submitter?->name
            ?? ($r->reviewer_name
                ? trim($r->reviewer_name . ($r->reviewer_company ? " ({$r->reviewer_company})" : ''))
                : 'Anonim');

        return [
            'id'                => $r->id,
            'evaluation_id'     => $r->evaluation_id,
            'evaluation_name'   => $r->evaluation?->name,
            'trigger_label'     => $r->evaluation?->trigger_label,
            'total_score'       => $r->total_score,
            'notes'             => $r->notes,
            'is_excluded'       => $r->excluded_at !== null,
            'excluded_at'       => $r->excluded_at?->toIso8601String(),
            'excluded_by'       => $r->excludedBy?->name,
            'submitted_at'      => $r->created_at?->toIso8601String(),
            'submitted_by'      => $submitterName,
            'reviewer_name'     => $r->reviewer_name,
            'reviewer_company'  => $r->reviewer_company,
            'reviewer_position' => $r->reviewer_position,
            'is_public'         => $r->submitted_by === null,
            'answers'           => $r->answers->map(fn($a) => [
                'question_id'   => $a->question_id,
                'question'      => $a->question?->question,
                'description'   => $a->question?->description,
                'weight'        => $a->question?->weight,
                'score'         => $a->score,
                'comment'       => $a->comment,
            ])->values(),
        ];
    }
}
