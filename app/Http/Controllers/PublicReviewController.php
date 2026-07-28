<?php

namespace App\Http\Controllers;

use App\Models\ProjectReview;
use App\Models\ProjectReviewAnswer;
use App\Models\ReviewToken;
use Illuminate\Http\Request;

class PublicReviewController extends Controller
{
    /** GET /public/review/{token} — get form info without auth */
    public function show(string $token)
    {
        $rt = ReviewToken::with(['project', 'evaluation.questions'])->where('token', $token)->firstOrFail();

        if (!$rt->isUsable()) {
            return response()->json([
                'error'  => $rt->is_active ? 'Link ini sudah kadaluarsa.' : 'Link ini sudah dinonaktifkan.',
                'status' => 'inactive',
            ], 403);
        }

        $eval = $rt->evaluation;

        if (!$eval->is_active) {
            return response()->json([
                'error'  => 'Evaluasi ini sedang tidak aktif.',
                'status' => 'inactive',
            ], 403);
        }

        // Check max_submissions at project+eval level
        if ($eval->max_submissions !== null) {
            $count = ProjectReview::where('project_id', $rt->project_id)
                ->where('evaluation_id', $rt->evaluation_id)
                ->count();
            if ($count >= $eval->max_submissions) {
                return response()->json([
                    'error'  => 'Form ini sudah mencapai batas maksimal pengisian.',
                    'status' => 'full',
                ], 403);
            }
        }

        return response()->json([
            'data' => [
                'project_name'    => $rt->project->name,
                'evaluation_name' => $eval->name,
                'trigger_label'   => $eval->trigger_label,
                'focus'           => $eval->focus,
                'purpose'         => $eval->purpose,
                'expires_at'      => $rt->expires_at?->toIso8601String(),
                'questions'       => $eval->questions->map(fn($q) => [
                    'id'          => $q->id,
                    'question'    => $q->question,
                    'description' => $q->description,
                    'weight'      => $q->weight,
                    'has_weight'  => $q->has_weight,
                ])->values(),
            ],
        ]);
    }

    /** POST /public/review/{token}/submit — anonymous submission */
    public function submit(Request $request, string $token)
    {
        $rt = ReviewToken::with('evaluation.questions')->where('token', $token)->firstOrFail();

        if (!$rt->isUsable()) {
            return response()->json(['error' => 'Link ini tidak aktif atau sudah kadaluarsa.'], 403);
        }

        $eval = $rt->evaluation;

        if (!$eval->is_active) {
            return response()->json(['error' => 'Evaluasi ini sedang tidak aktif.'], 403);
        }

        if ($eval->max_submissions !== null) {
            $count = ProjectReview::where('project_id', $rt->project_id)
                ->where('evaluation_id', $rt->evaluation_id)
                ->count();
            if ($count >= $eval->max_submissions) {
                return response()->json(['error' => 'Form ini sudah mencapai batas maksimal pengisian.'], 422);
            }
        }

        $validated = $request->validate([
            'reviewer_name'     => 'required|string|max:150',
            'reviewer_company'  => 'required|string|max:150',
            'reviewer_position' => 'nullable|string|max:100',
            'answers'           => 'required|array',
            'answers.*.question_id' => 'required|integer|exists:review_questions,id',
            'answers.*.score'   => 'required|integer|min:1|max:10',
            'answers.*.comment' => 'nullable|string|max:1000',
            'notes'             => 'nullable|string|max:2000',
        ]);

        // Compute weighted score
        $questionMap = $eval->questions->keyBy('id');
        $totalScore  = 0;
        foreach ($validated['answers'] as $ans) {
            $q = $questionMap[$ans['question_id']] ?? null;
            if ($q) $totalScore += ($ans['score'] / 10) * $q->weight;
        }

        $review = ProjectReview::create([
            'project_id'        => $rt->project_id,
            'evaluation_id'     => $rt->evaluation_id,
            'submitted_by'      => null,
            'reviewer_name'     => $validated['reviewer_name'],
            'reviewer_company'  => $validated['reviewer_company'],
            'reviewer_position' => $validated['reviewer_position'] ?? null,
            'token_id'          => $rt->id,
            'notes'             => $validated['notes'] ?? null,
            'total_score'       => round($totalScore, 2),
        ]);

        foreach ($validated['answers'] as $ans) {
            ProjectReviewAnswer::create([
                'review_id'   => $review->id,
                'question_id' => $ans['question_id'],
                'score'       => $ans['score'],
                'comment'     => $ans['comment'] ?? null,
            ]);
        }

        return response()->json(['message' => 'Terima kasih! Review Anda berhasil disimpan.'], 201);
    }
}
