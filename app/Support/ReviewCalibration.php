<?php

namespace App\Support;

use Illuminate\Support\Collection;

/**
 * Derives the live calibration verdict AND the recomputed calibrated score for
 * a submitted review from its raw agree/disagree votes.
 *
 *  - Per question: "passed" when strictly more than 60% of the votes cast on
 *    that question agree. Zero votes → "pending".
 *  - Per submission verdict: among questions that have at least one vote
 *    ("decided"), "valid" when strictly more than 60% of them passed. No decided
 *    question at all → "pending".
 *  - Per-question effective score = average across every calibrator who voted on
 *    it: the reviewer's original score for each "agree" vote, the calibrator's
 *    own proposed score for each "disagree" vote. A question with no vote keeps
 *    the original score.
 *  - Calibrated total = the same weighted formula as a normal submission
 *    (sum of effective_score/10 * weight), using effective scores.
 *
 * The verdict/tally are always live. The calibrated score only *replaces* the
 * original in aggregations once the submission's calibration is locked (that
 * lock snapshots these values onto the rows — see ReviewCalibrationController).
 */
class ReviewCalibration
{
    /** Strictly-greater-than share required to pass (">60%"). */
    public const THRESHOLD = 0.6;

    /**
     * @param  Collection  $answers  the submission's answers (each needs ->score and ->question->weight)
     * @param  Collection  $votes    review_calibration_votes rows for this review (->question_id, ->user_id, ->agree, ->proposed_score)
     * @return array{
     *   verdict: 'pending'|'valid'|'invalid',
     *   voter_count: int,
     *   decided_count: int,
     *   total_count: int,
     *   passed_count: int,
     *   calibrated_total: float,
     *   questions: array<int, array{question_id:int, votes:int, agree:int, ratio:float|null, status:string, original_score:float, effective_score:float, proposed_avg:float|null}>
     * }
     */
    public static function summarize(Collection $answers, Collection $votes): array
    {
        $votesByQuestion = $votes->groupBy('question_id');
        $voterCount      = $votes->pluck('user_id')->filter()->unique()->count();

        $questions        = [];
        $decided          = 0;
        $passed           = 0;
        $calibratedTotal  = 0.0;

        foreach ($answers as $answer) {
            $original = (float) data_get($answer, 'score', 0);
            $weight   = (float) data_get($answer, 'question.weight', 0);
            $qVotes   = $votesByQuestion->get($answer->question_id, collect());
            $count    = $qVotes->count();
            $agree    = $qVotes->filter(fn ($v) => (bool) $v->agree)->count();

            if ($count === 0) {
                $questions[] = [
                    'question_id'     => (int) $answer->question_id,
                    'votes'           => 0,
                    'agree'           => 0,
                    'ratio'           => null,
                    'status'          => 'pending',
                    'original_score'  => $original,
                    'effective_score' => round($original, 2),
                    'proposed_avg'    => null,
                ];
                $calibratedTotal += ($original / 10) * $weight;
                continue;
            }

            $proposed = $qVotes->filter(fn ($v) => !$v->agree)
                ->pluck('proposed_score')
                ->filter(fn ($s) => $s !== null)
                ->map(fn ($s) => (float) $s);

            // Average across all calibrators: original per "agree", proposed per
            // "disagree". Disagree votes missing a proposed score (shouldn't
            // happen — enforced on write) are left out of the score average but
            // still count toward the verdict ratio below.
            $scoreDenom = $agree + $proposed->count();
            $effective  = $scoreDenom > 0
                ? (($agree * $original) + $proposed->sum()) / $scoreDenom
                : $original;

            $ratio = $agree / $count;
            $ok    = $ratio > self::THRESHOLD;
            $decided++;
            if ($ok) {
                $passed++;
            }

            $questions[] = [
                'question_id'     => (int) $answer->question_id,
                'votes'           => $count,
                'agree'           => $agree,
                'ratio'           => round($ratio, 4),
                'status'          => $ok ? 'passed' : 'failed',
                'original_score'  => $original,
                'effective_score' => round($effective, 2),
                'proposed_avg'    => $proposed->isNotEmpty() ? round($proposed->avg(), 2) : null,
            ];
            $calibratedTotal += ($effective / 10) * $weight;
        }

        $verdict = 'pending';
        if ($decided > 0) {
            $verdict = ($passed / $decided) > self::THRESHOLD ? 'valid' : 'invalid';
        }

        return [
            'verdict'          => $verdict,
            'voter_count'      => $voterCount,
            'decided_count'    => $decided,
            'total_count'      => $answers->count(),
            'passed_count'     => $passed,
            'calibrated_total' => round($calibratedTotal, 2),
            'questions'        => $questions,
        ];
    }
}
