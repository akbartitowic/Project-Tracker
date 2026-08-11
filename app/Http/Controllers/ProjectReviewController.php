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
use Illuminate\Http\Request;

class ProjectReviewController extends Controller
{
    /**
     * GET /projects/{id}/reviews
     * Returns all submitted reviews for a project, grouped by evaluation,
     * each with computed score and submitted_by info.
     */
    public function index(Request $request, int $projectId)
    {
        $user    = $request->user();
        $project = Project::findOrFail($projectId);

        if (!ProjectAccess::canAccessProject($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $reviews = ProjectReview::with(['evaluation', 'submitter:id,name', 'answers.question'])
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
     * GET /projects/{id}/reviews/summary
     * Returns latest score per evaluation for the project card display.
     */
    public function summary(Request $request, int $projectId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProject($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // Get all evaluations for the project's methodology
        $project    = Project::findOrFail($projectId);
        $evals      = ReviewEvaluation::where('methodology', $project->methodology)->where('is_active', true)->orderBy('order')->get();

        // Share-link status is scoped per evaluation (per review), not the whole
        // project — a project can have several reviews, each with its own link(s)
        // and send/copy status, so counting must happen per review everywhere.
        $tokensByEval = ReviewToken::where('project_id', $projectId)
            ->get(['id', 'evaluation_id', 'is_active', 'email_sent_at', 'client_emails'])
            ->groupBy('evaluation_id');

        $summary = $evals->map(function ($eval) use ($projectId, $tokensByEval) {
            $latest = ProjectReview::where('project_id', $projectId)
                ->where('evaluation_id', $eval->id)
                ->latest()
                ->first();

            $evalTokens = $tokensByEval->get($eval->id, collect());

            return [
                'evaluation_id'    => $eval->id,
                'evaluation_name'  => $eval->name,
                'evaluation_order' => $eval->order,
                'trigger_label'    => $eval->trigger_label,
                'submitted'        => $latest !== null,
                'total_score'      => $latest?->total_score,
                'submitted_at'     => $latest?->created_at?->toIso8601String(),
                'submitted_by'     => $latest?->submitter?->name,
                'review_id'        => $latest?->id,
                // `has_emails` lets the frontend treat a link that already has client
                // emails saved as "terkirim" even before the send button is clicked.
                'share'            => [
                    'has_link'      => $evalTokens->isNotEmpty(),
                    'email_sent_at' => $evalTokens->max('email_sent_at')?->toIso8601String(),
                    'has_emails'    => $evalTokens->contains(fn ($t) => !empty($t->client_emails)),
                    'token_ids'     => $evalTokens->pluck('id')->values(),
                ],
            ];
        });

        // Overall: average of submitted scores
        $submitted = $summary->filter(fn($s) => $s['submitted']);
        $overall   = $submitted->count()
            ? round($submitted->avg('total_score'), 2)
            : null;

        return response()->json([
            'data'    => $summary,
            'overall' => $overall,
        ]);
    }

    /**
     * GET /projects/{id}/reviews/trigger-status
     * Returns computed trigger status (current value vs threshold) for each active evaluation.
     */
    public function triggerStatus(Request $request, int $projectId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProject($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $project = Project::findOrFail($projectId);
        $evals   = ReviewEvaluation::where('methodology', $project->methodology)
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
        if (!ProjectAccess::canAccessProject($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
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

        return response()->json(['data' => $this->serializeReview($review->load(['evaluation', 'submitter:id,name', 'answers.question']))], 201);
    }

    /**
     * GET /projects/{id}/reviews/{reviewId}
     * Get detail of a specific review (all answers).
     */
    public function show(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProject($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $review = ProjectReview::with(['evaluation.questions', 'submitter:id,name', 'answers.question'])
            ->where('project_id', $projectId)
            ->findOrFail($reviewId);

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
