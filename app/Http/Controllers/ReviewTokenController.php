<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ReviewEvaluation;
use App\Models\ReviewToken;
use App\Support\ProjectAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ReviewTokenController extends Controller
{
    /** POST /projects/{projectId}/evaluations/{evalId}/tokens — generate a shareable link */
    public function store(Request $request, int $projectId, int $evalId)
    {
        $user  = $request->user();
        $eval  = ReviewEvaluation::findOrFail($evalId);

        // Compute expiry from active_days if set
        $expiresAt = $eval->active_days
            ? now()->addDays($eval->active_days)
            : null;

        $token = ReviewToken::create([
            'token'         => (string) Str::uuid(),
            'project_id'    => $projectId,
            'evaluation_id' => $evalId,
            'created_by'    => $user->id,
            'expires_at'    => $expiresAt,
            'is_active'     => true,
        ]);

        return response()->json(['data' => $this->serialize($token)], 201);
    }

    /** GET /projects/{projectId}/evaluations/{evalId}/tokens — list tokens */
    public function index(Request $request, int $projectId, int $evalId)
    {
        $tokens = ReviewToken::where('project_id', $projectId)
            ->where('evaluation_id', $evalId)
            ->with('creator:id,name')
            ->latest()
            ->get();

        return response()->json(['data' => $tokens->map(fn($t) => $this->serialize($t))]);
    }

    /** DELETE /review/tokens/{id} — deactivate a token */
    public function destroy(int $id)
    {
        $token = ReviewToken::findOrFail($id);
        $token->update(['is_active' => false]);

        return response()->json(['message' => 'Link dinonaktifkan.']);
    }

    private function serialize(ReviewToken $t): array
    {
        return [
            'id'            => $t->id,
            'token'         => $t->token,
            'url'           => url('/r/' . $t->token),
            'is_active'     => $t->is_active,
            'is_expired'    => $t->isExpired(),
            'is_usable'     => $t->isUsable(),
            'expires_at'    => $t->expires_at?->toIso8601String(),
            'created_at'    => $t->created_at->toIso8601String(),
            'created_by'    => $t->creator?->name,
        ];
    }
}
