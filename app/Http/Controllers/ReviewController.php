<?php

namespace App\Http\Controllers;

use App\Models\ReviewEvaluation;
use App\Models\ReviewQuestion;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /** POST /review/evaluations — create a new evaluation cycle */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'methodology'    => 'required|in:Agile Scrum,Waterfall',
            'name'           => 'required|string|max:150',
            'trigger_type'   => 'required|in:mh_percentage,project_percentage,task_done_percentage,date_based',
            'trigger_basis'  => 'nullable|in:total_mh,topup_mh',
            'trigger_value'  => 'nullable|integer|min:1|max:100',
            'trigger_label'  => 'required|string|max:200',
            'focus'          => 'nullable|string',
            'purpose'        => 'nullable|string',
        ]);

        $order = ReviewEvaluation::where('methodology', $validated['methodology'])->max('order') + 1;

        $eval = ReviewEvaluation::create([...$validated, 'order' => $order]);

        return response()->json(['data' => $eval->load('questions')], 201);
    }

    /** DELETE /review/evaluations/{id} — delete an evaluation and its questions */
    public function destroyEvaluation(int $id)
    {
        $eval = ReviewEvaluation::findOrFail($id);
        $eval->delete(); // cascades to questions via migration FK

        return response()->json(['message' => 'Siklus evaluasi berhasil dihapus.']);
    }

    /** GET /review/evaluations — all evaluations with questions, optionally filtered by methodology */
    public function evaluations(Request $request)
    {
        $query = ReviewEvaluation::with('questions')->orderBy('order');

        if ($request->filled('methodology')) {
            $query->where('methodology', $request->methodology);
        }

        return response()->json(['data' => $query->get()]);
    }

    /** PUT /review/evaluations/{id} — update evaluation meta + submission rules */
    public function updateEvaluation(Request $request, int $id)
    {
        $eval      = ReviewEvaluation::findOrFail($id);
        $validated = $request->validate([
            'name'            => 'sometimes|string|max:150',
            'trigger_label'   => 'sometimes|string|max:200',
            'trigger_value'   => 'nullable|integer|min:1|max:100',
            'focus'           => 'sometimes|string',
            'purpose'         => 'sometimes|string',
            'active_days'     => 'nullable|integer|min:1|max:3650',
            'max_submissions' => 'nullable|integer|min:1|max:999',
            'one_per_user'    => 'sometimes|boolean',
            'is_active'       => 'sometimes|boolean',
        ]);
        $eval->update($validated);
        return response()->json(['data' => $eval->load('questions')]);
    }

    /** POST /review/evaluations/{id}/questions — add question to an evaluation */
    public function storeQuestion(Request $request, int $id)
    {
        $eval      = ReviewEvaluation::findOrFail($id);
        $validated = $request->validate([
            'question'    => 'required|string|max:500',
            'description' => 'nullable|string',
            'weight'      => 'required|numeric|min:0|max:100',
        ]);

        $currentTotal = (float) $eval->questions()->sum('weight');
        if ($currentTotal + $validated['weight'] > 100) {
            return response()->json([
                'message' => 'Total bobot pertanyaan tidak boleh melebihi 100%.',
                'errors'  => ['weight' => ['Sisa bobot yang tersedia: ' . round(100 - $currentTotal, 2) . '%']],
            ], 422);
        }

        $order    = $eval->questions()->max('order') + 1;
        $question = ReviewQuestion::create([...$validated, 'evaluation_id' => $eval->id, 'order' => $order]);

        return response()->json(['data' => $question], 201);
    }

    /** PUT /review/questions/{id} — update a question */
    public function updateQuestion(Request $request, int $id)
    {
        $question  = ReviewQuestion::findOrFail($id);
        $validated = $request->validate([
            'question'    => 'sometimes|string|max:500',
            'description' => 'nullable|string',
            'weight'      => 'sometimes|numeric|min:0|max:100',
            'order'       => 'sometimes|integer|min:0',
        ]);

        if (isset($validated['weight'])) {
            $otherTotal = (float) ReviewQuestion::where('evaluation_id', $question->evaluation_id)
                ->where('id', '!=', $question->id)
                ->sum('weight');
            if ($otherTotal + $validated['weight'] > 100) {
                return response()->json([
                    'message' => 'Total bobot pertanyaan tidak boleh melebihi 100%.',
                    'errors'  => ['weight' => ['Sisa bobot yang tersedia: ' . round(100 - $otherTotal, 2) . '%']],
                ], 422);
            }
        }

        $question->update($validated);
        return response()->json(['data' => $question]);
    }

    /** DELETE /review/questions/{id} */
    public function deleteQuestion(int $id)
    {
        ReviewQuestion::findOrFail($id)->delete();
        return response()->json(['message' => 'Pertanyaan berhasil dihapus.']);
    }
}
