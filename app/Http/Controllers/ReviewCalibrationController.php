<?php

namespace App\Http\Controllers;

use App\Models\ProjectReview;
use App\Models\ReviewCalibrationVote;
use App\Support\ProjectAccess;
use App\Support\ReviewCalibration;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Calibration of submitted reviews: roles granted `review.calibrate` vote
 * agree/disagree on each question of a submission. A calibrator who disagrees
 * must supply their own 1–10 score + a reason.
 *
 * The verdict + a recomputed "calibrated score" are shown live (see
 * App\Support\ReviewCalibration). The calibrated score only REPLACES the
 * reviewer's original in aggregations (Overall, radar, dashboard proportions,
 * project cards) once the submission's calibration is LOCKED here — locking
 * snapshots the effective per-question scores + the weighted total onto the
 * rows. Unlock reverts to the original everywhere.
 */
class ReviewCalibrationController extends Controller
{
    use LogActivity;

    /**
     * GET /review/calibration
     * Every submitted review across the projects the requester can see (Review
     * "View All Projects" scope, review-enabled projects only), each with its
     * live calibration tally + score.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'methodology' => 'nullable|in:Agile Scrum,Waterfall',
            'project_id'  => 'nullable|integer',
            'status'      => 'nullable|in:pending,valid,invalid',
            'year'        => 'nullable|integer|min:2000|max:2100',
            'sort'        => 'nullable|in:recent,oldest,score_desc,score_asc',
            'page'        => 'nullable|integer|min:1',
            'per_page'    => 'nullable|integer|min:1|max:100',
        ]);

        // Scope shared by the actual listing query and the "which years have
        // submissions at all" lookup below — everything except the year filter
        // itself, so picking a year never removes other years from the dropdown.
        $scopeProject = function ($q) use ($user, $validated) {
            $q->where('review_enabled', true);
            ProjectAccess::applyReviewProjectScope($q, 'id', $user);
            if (!empty($validated['project_id'])) {
                $q->where('id', $validated['project_id']);
            }
            if (!empty($validated['methodology'])) {
                $q->where('methodology', $validated['methodology']);
            }
        };

        $availableYears = ProjectReview::query()
            ->whereHas('project', $scopeProject)
            ->get(['created_at'])
            ->map(fn ($r) => $r->created_at?->year)
            ->filter()
            ->unique()
            ->sortDesc()
            ->values();

        $reviewsQuery = ProjectReview::query()
            ->with([
                'evaluation:id,name,methodology',
                'project:id,name,methodology',
                'submitter:id,name',
                'answers:id,review_id,question_id,score',
                'answers.question:id,weight',
            ])
            ->whereHas('project', $scopeProject);

        if (!empty($validated['year'])) {
            $reviewsQuery->whereYear('created_at', $validated['year']);
        }

        match ($validated['sort'] ?? 'recent') {
            'oldest'     => $reviewsQuery->orderBy('created_at', 'asc'),
            'score_desc' => $reviewsQuery->orderByDesc('total_score'),
            'score_asc'  => $reviewsQuery->orderBy('total_score', 'asc'),
            default      => $reviewsQuery->orderBy('created_at', 'desc'),
        };

        $reviews = $reviewsQuery->get();

        // One query for every vote across the listed submissions — no N+1.
        $votesByReview = ReviewCalibrationVote::whereIn('review_id', $reviews->pluck('id'))
            ->with('user:id,name')
            ->get(['review_id', 'question_id', 'user_id', 'agree', 'proposed_score'])
            ->groupBy('review_id');

        $rows = $reviews->map(function ($r) use ($votesByReview) {
            $reviewVotes = $votesByReview->get($r->id, collect());
            $summary     = ReviewCalibration::summarize($r->answers, $reviewVotes);
            $isLocked    = $r->calibration_locked_at !== null;

            return [
                'review_id'        => $r->id,
                'project_id'       => $r->project_id,
                'project_name'     => $r->project?->name,
                'methodology'      => $r->project?->methodology,
                'evaluation_id'    => $r->evaluation_id,
                'evaluation_name'  => $r->evaluation?->name,
                'reviewer_name'    => $r->submitter?->name ?? $r->reviewer_name ?? 'Anonim',
                'reviewer_company' => $r->reviewer_company,
                'total_score'      => $r->total_score,
                'is_excluded'      => $r->excluded_at !== null,
                'submitted_at'     => $r->created_at?->toIso8601String(),
                'calibration'      => [
                    'verdict'          => $summary['verdict'],
                    'voter_count'      => $summary['voter_count'],
                    'decided_count'    => $summary['decided_count'],
                    'total_count'      => $summary['total_count'],
                    'passed_count'     => $summary['passed_count'],
                    // Live recompute; once locked, the snapshot on the row.
                    'calibrated_score' => $isLocked ? $r->calibrated_score : $summary['calibrated_total'],
                    'is_locked'        => $isLocked,
                    // Who's calibrated this submission so far — names, not just a count.
                    'calibrator_names' => $reviewVotes->pluck('user.name')->filter()->unique()->values(),
                ],
            ];
        });

        if (!empty($validated['status'])) {
            $rows = $rows->where('calibration.verdict', $validated['status'])->values();
        }

        // Score distribution before vs. after calibration, over every project
        // with a non-excluded submission matching the current filters (not just
        // the current page) — weighted per project, same as the dashboard's own
        // "Distribusi Skor"/"Skor Overall", so this is a genuine apples-to-apples
        // comparison. "After" only differs from "before" for a locked submission;
        // unlocked ones still use their original score everywhere, same as
        // aggregation does.
        $distribution = $this->scoreDistribution($rows);

        $perPage = $validated['per_page'] ?? 20;
        $page    = $validated['page'] ?? 1;
        $total   = $rows->count();

        return response()->json([
            'data'         => $rows->forPage($page, $perPage)->values(),
            'meta'         => [
                'current_page'    => $page,
                'per_page'        => $perPage,
                'total'           => $total,
                'last_page'       => max(1, (int) ceil($total / $perPage)),
                'available_years' => $availableYears,
            ],
            'distribution' => $distribution,
        ]);
    }

    /**
     * Buckets the listing's projects into the same good/fair/poor levels the
     * frontend uses (score thresholds 80/60/0), separately for the original
     * score and the score currently in effect (calibrated once locked).
     *
     * Weighted PER PROJECT — first averaged within each project, then those
     * project averages are averaged again — the exact same method the
     * dashboard's own "Distribusi Skor" and "Skor Overall" use. This chart
     * exists purely to compare against those numbers, so it has to compute
     * them the same way; a flat per-submission average would report a
     * different number for reasons that have nothing to do with calibration
     * (e.g. one project having more submissions than another).
     */
    private function scoreDistribution($rows): array
    {
        $levelOf = function (?float $score): ?string {
            if ($score === null) return null;
            if ($score >= 80) return 'good';
            if ($score >= 60) return 'fair';
            return 'poor';
        };

        $effectiveScore = fn ($r) => ($r['calibration']['is_locked'] && $r['calibration']['calibrated_score'] !== null)
            ? (float) $r['calibration']['calibrated_score']
            : (float) $r['total_score'];

        // Excluded submissions never count toward Skor Overall/radar/dashboard
        // proportions (see project_reviews.excluded_at) — skipped here too.
        $byProject = $rows
            ->filter(fn ($r) => $r['total_score'] !== null && !$r['is_excluded'])
            ->groupBy('project_id');

        $before = ['good' => 0, 'fair' => 0, 'poor' => 0];
        $after  = ['good' => 0, 'fair' => 0, 'poor' => 0];
        $beforeSum = 0.0;
        $afterSum  = 0.0;
        $n = 0;

        foreach ($byProject as $projectRows) {
            $n++;
            $b = $projectRows->avg(fn ($r) => (float) $r['total_score']);
            $a = $projectRows->avg($effectiveScore);
            $before[$levelOf($b)]++;
            $after[$levelOf($a)]++;
            $beforeSum += $b;
            $afterSum  += $a;
        }

        return [
            'before' => [...$before, 'total' => $n, 'avg' => $n ? round($beforeSum / $n, 2) : null],
            'after'  => [...$after, 'total' => $n, 'avg' => $n ? round($afterSum / $n, 2) : null],
        ];
    }

    /**
     * GET /projects/{id}/reviews/{reviewId}/calibration
     */
    public function show(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $review = ProjectReview::with([
                'evaluation:id,name,methodology',
                'project:id,name,methodology',
                'submitter:id,name',
                'answers.question',
                'calibrationLockedBy:id,name',
            ])
            ->where('project_id', $projectId)
            ->findOrFail($reviewId);

        $votes = ReviewCalibrationVote::where('review_id', $review->id)
            ->with('user:id,name')
            ->get(['id', 'question_id', 'user_id', 'agree', 'proposed_score', 'reason']);

        $summary       = ReviewCalibration::summarize($review->answers, $votes);
        $byQuestion    = collect($summary['questions'])->keyBy('question_id');
        $votesByQuestion = $votes->groupBy('question_id');
        $myVotes       = $votes->where('user_id', $user->id)->keyBy('question_id');
        $isLocked      = $review->calibration_locked_at !== null;

        $voterName = fn ($v) => $v->user?->name ?? "Pengguna #{$v->user_id}";

        // "Dikalibrasi oleh" — everyone who's cast at least one vote on this
        // submission, with how many questions each agreed/disagreed on.
        $calibrators = $votes->groupBy('user_id')->map(function ($userVotes) use ($voterName) {
            $first = $userVotes->first();
            return [
                'user_id'         => (int) $first->user_id,
                'name'            => $voterName($first),
                'agree_count'     => $userVotes->where('agree', true)->count(),
                'disagree_count'  => $userVotes->where('agree', false)->count(),
            ];
        })->values();

        $questions = $review->answers->map(function ($a) use ($byQuestion, $myVotes, $votesByQuestion, $voterName) {
            $tally = $byQuestion->get($a->question_id);
            $mine  = $myVotes->get($a->question_id);
            return [
                'question_id'      => (int) $a->question_id,
                'question'         => $a->question?->question,
                'description'      => $a->question?->description,
                'weight'          => $a->question?->weight,
                'score'           => $a->score,
                'comment'         => $a->comment,
                'votes'           => $tally['votes']  ?? 0,
                'agree'           => $tally['agree']  ?? 0,
                'ratio'           => $tally['ratio']  ?? null,
                'status'          => $tally['status'] ?? 'pending',
                'original_score'  => $tally['original_score']  ?? (float) $a->score,
                'effective_score' => $tally['effective_score'] ?? (float) $a->score,
                'proposed_avg'    => $tally['proposed_avg']    ?? null,
                'my_vote'         => $mine ? (bool) $mine->agree : null,
                'my_proposed_score' => $mine?->proposed_score,
                'my_reason'         => $mine?->reason,
                // Who voted what on this specific question — the point of asking
                // "who calibrated" is knowing not just how many, but exactly who.
                'voters' => $votesByQuestion->get($a->question_id, collect())->map(fn ($v) => [
                    'user_id'        => (int) $v->user_id,
                    'name'           => $voterName($v),
                    'agree'          => (bool) $v->agree,
                    'proposed_score' => $v->proposed_score,
                    'reason'         => $v->reason,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'data' => [
                'review_id'         => $review->id,
                'project_id'        => $review->project_id,
                'project_name'      => $review->project?->name,
                'methodology'       => $review->project?->methodology,
                'evaluation_name'   => $review->evaluation?->name,
                'reviewer_name'     => $review->submitter?->name ?? $review->reviewer_name ?? 'Anonim',
                'reviewer_company'  => $review->reviewer_company,
                'total_score'       => $review->total_score,
                'notes'             => $review->notes,
                'is_excluded'       => $review->excluded_at !== null,
                'submitted_at'      => $review->created_at?->toIso8601String(),
                'verdict'           => $summary['verdict'],
                'voter_count'       => $summary['voter_count'],
                'decided_count'     => $summary['decided_count'],
                'total_count'       => $summary['total_count'],
                'passed_count'      => $summary['passed_count'],
                // Who's calibrated this submission so far (across all questions).
                'calibrators'       => $calibrators,
                // Live recompute for the dialog preview.
                'calibrated_score'  => $summary['calibrated_total'],
                // Snapshot + who/when — only set while locked.
                'is_locked'         => $isLocked,
                'locked_score'      => $review->calibrated_score,
                'locked_at'         => $review->calibration_locked_at?->toIso8601String(),
                'locked_by'         => $review->calibrationLockedBy?->name,
                'questions'         => $questions,
            ],
        ]);
    }

    /**
     * PUT /projects/{id}/reviews/{reviewId}/calibration
     * Replace the current user's vote set for this submission. A "disagree" vote
     * must carry a 1–10 `proposed_score` and a `reason`. A question omitted from
     * the payload = that vote is retracted. Blocked while the calibration is locked.
     */
    public function update(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $review = ProjectReview::with('answers:id,review_id,question_id,score')
            ->where('project_id', $projectId)
            ->findOrFail($reviewId);

        if ($review->calibration_locked_at !== null) {
            return response()->json(['error' => 'Kalibrasi sudah dikunci. Buka kunci untuk mengubah suara.'], 422);
        }

        $validated = $request->validate([
            'votes'                  => 'present|array',
            'votes.*.question_id'    => 'required|integer',
            'votes.*.agree'          => 'required|boolean',
            'votes.*.proposed_score' => 'nullable|integer|min:1|max:10',
            'votes.*.reason'         => 'nullable|string|max:1000',
        ]);

        $answersByQuestion = $review->answers->keyBy('question_id');
        $allowedQuestionIds = $answersByQuestion->keys()->map(fn ($id) => (int) $id)->all();

        $incoming = collect($validated['votes'])
            ->filter(fn ($v) => in_array((int) $v['question_id'], $allowedQuestionIds, true))
            ->keyBy(fn ($v) => (int) $v['question_id']);

        // This endpoint replaces the caller's ENTIRE vote set every save (an
        // omitted question = retracted), so the frontend always resends every
        // question, touched or not. Fetch what's already stored so an untouched
        // vote can be told apart from a genuinely new/edited one below.
        $existingByQuestion = ReviewCalibrationVote::where('review_id', $review->id)
            ->where('user_id', $user->id)
            ->get(['question_id', 'proposed_score'])
            ->keyBy(fn ($v) => (int) $v->question_id);

        // A "disagree" vote is only meaningful with a score + reason attached, and
        // the proposed score is capped to ±2 of the reviewer's original score
        // (e.g. original 5 → allowed range 3–7) so calibration nudges a score
        // rather than replacing it outright. That cap is only enforced for a
        // NEW or CHANGED proposed score — an already-stored one being resent
        // unchanged (nothing else to do here, since a save always resends the
        // whole set) is grandfathered in, so e.g. a rule change or a since-edited
        // review score can't retroactively brick editing of OTHER questions on
        // the same submission.
        foreach ($incoming as $qid => $v) {
            if ($v['agree'] !== false) {
                continue;
            }
            if (($v['proposed_score'] ?? null) === null || trim((string) ($v['reason'] ?? '')) === '') {
                throw ValidationException::withMessages([
                    'votes' => 'Pilihan "Tidak Setuju" wajib menyertakan skor usulan (1–10) dan alasan.',
                ]);
            }

            $existingScore = $existingByQuestion->get($qid)?->proposed_score;
            if ($existingScore !== null && (int) $existingScore === (int) $v['proposed_score']) {
                continue; // unchanged from what's already stored — grandfathered in
            }

            $original = (int) ($answersByQuestion->get($qid)?->score ?? 0);
            $min = max(1, $original - 2);
            $max = min(10, $original + 2);
            if ($v['proposed_score'] < $min || $v['proposed_score'] > $max) {
                throw ValidationException::withMessages([
                    'votes' => "Skor usulan harus di antara {$min}–{$max} (maksimal ±2 dari skor asli {$original}).",
                ]);
            }
        }

        DB::transaction(function () use ($review, $user, $incoming) {
            ReviewCalibrationVote::where('review_id', $review->id)
                ->where('user_id', $user->id)
                ->whereNotIn('question_id', $incoming->keys()->all())
                ->delete();

            foreach ($incoming as $qid => $v) {
                $agree = (bool) $v['agree'];
                ReviewCalibrationVote::updateOrCreate(
                    ['review_id' => $review->id, 'question_id' => $qid, 'user_id' => $user->id],
                    [
                        'agree'          => $agree,
                        'proposed_score' => $agree ? null : $v['proposed_score'],
                        'reason'         => $agree ? null : $v['reason'],
                    ],
                );
            }
        });

        $this->log('Review', 'Calibrated Review', "Review #{$review->id} · project #{$projectId} · " . $incoming->count() . ' vote(s)');

        return $this->show($request, $projectId, $reviewId);
    }

    /**
     * POST /projects/{id}/reviews/{reviewId}/calibration/lock
     * Snapshot the effective per-question scores + the recomputed weighted total
     * onto the rows and lock. From here the calibrated score replaces the
     * original in every aggregation until unlocked.
     */
    public function lock(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $review = ProjectReview::with('answers.question:id,weight')
            ->where('project_id', $projectId)
            ->findOrFail($reviewId);

        if ($review->calibration_locked_at !== null) {
            return response()->json(['error' => 'Kalibrasi sudah dikunci.'], 422);
        }

        $votes   = ReviewCalibrationVote::where('review_id', $review->id)
            ->get(['question_id', 'user_id', 'agree', 'proposed_score']);
        $summary = ReviewCalibration::summarize($review->answers, $votes);

        if ($summary['decided_count'] === 0) {
            return response()->json(['error' => 'Belum ada suara kalibrasi untuk dikunci.'], 422);
        }

        $effByQuestion = collect($summary['questions'])->keyBy('question_id');

        DB::transaction(function () use ($review, $summary, $effByQuestion, $user) {
            foreach ($review->answers as $a) {
                $a->calibrated_score = $effByQuestion[$a->question_id]['effective_score'] ?? (float) $a->score;
                $a->save();
            }
            $review->calibrated_score      = $summary['calibrated_total'];
            $review->calibration_locked_at = now();
            $review->calibration_locked_by = $user->id;
            $review->save();
        });

        $this->log('Review', 'Locked Review Calibration',
            "Review #{$review->id} · project #{$projectId} · skor {$review->total_score} → {$review->calibrated_score}");

        return $this->show($request, $projectId, $reviewId);
    }

    /**
     * DELETE /projects/{id}/reviews/{reviewId}/calibration/lock
     * Revert to the reviewer's original score everywhere. Votes are kept.
     */
    public function unlock(Request $request, int $projectId, int $reviewId)
    {
        $user = $request->user();
        if (!ProjectAccess::canAccessProjectReview($user, $projectId)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $review = ProjectReview::where('project_id', $projectId)->findOrFail($reviewId);

        if ($review->calibration_locked_at === null) {
            return response()->json(['error' => 'Kalibrasi belum dikunci.'], 422);
        }

        DB::transaction(function () use ($review) {
            $review->answers()->update(['calibrated_score' => null]);
            $review->calibrated_score      = null;
            $review->calibration_locked_at = null;
            $review->calibration_locked_by = null;
            $review->save();
        });

        $this->log('Review', 'Unlocked Review Calibration', "Review #{$review->id} · project #{$projectId}");

        return $this->show($request, $projectId, $reviewId);
    }
}
