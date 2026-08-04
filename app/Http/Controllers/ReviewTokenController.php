<?php

namespace App\Http\Controllers;

use App\Mail\ReviewLinkMail;
use App\Models\Project;
use App\Models\ReviewEvaluation;
use App\Models\ReviewToken;
use App\Support\EmailListParser;
use App\Support\ProjectAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class ReviewTokenController extends Controller
{
    use LogActivity;

    /** POST /projects/{projectId}/evaluations/{evalId}/tokens — generate a shareable link */
    public function store(Request $request, int $projectId, int $evalId)
    {
        $user  = $request->user();
        $eval  = ReviewEvaluation::findOrFail($evalId);

        $validated = $request->validate([
            'client_emails'   => 'nullable',
            'client_emails.*' => 'string',
            'auto_send'       => 'nullable|boolean',
        ]);

        $clientEmails = EmailListParser::parse($validated['client_emails'] ?? null);

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
            'client_emails' => $clientEmails,
        ]);

        if (!empty($validated['auto_send']) && $clientEmails !== []) {
            $this->sendTokenEmail($token, $eval);
        }

        return response()->json(['data' => $this->serialize($token)], 201);
    }

    /** POST /review/tokens/{id}/send-email — manually (re)send the link to the stored client emails */
    public function sendEmail(int $id)
    {
        $token = ReviewToken::findOrFail($id);

        if (empty($token->client_emails)) {
            return response()->json(['message' => 'Belum ada email client yang tersimpan untuk link ini.'], 422);
        }

        $eval = ReviewEvaluation::findOrFail($token->evaluation_id);
        $sent = $this->sendTokenEmail($token, $eval);

        if (!$sent) {
            return response()->json(['message' => 'Gagal mengirim email. Cek konfigurasi SMTP atau System Logs untuk detail.'], 500);
        }

        return response()->json(['data' => $this->serialize($token->fresh())]);
    }

    private function sendTokenEmail(ReviewToken $token, ReviewEvaluation $eval): bool
    {
        $project = Project::find($token->project_id);
        $url = url('/r/' . $token->token);

        try {
            Mail::to($token->client_emails)->send(new ReviewLinkMail($project, $eval, $url));
            $token->update(['email_sent_at' => now()]);
            $this->log(
                'Project',
                'Review Link Email Sent',
                "Review link for project '{$project?->name}' sent to " . implode(', ', $token->client_emails)
            );

            return true;
        } catch (Throwable $e) {
            $this->log(
                'Project',
                'Review Link Email Failed',
                "Failed sending review link for project '{$project?->name}' to " . implode(', ', $token->client_emails) . ": {$e->getMessage()}"
            );

            return false;
        }
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
            'id'             => $t->id,
            'token'          => $t->token,
            'url'            => url('/r/' . $t->token),
            'is_active'      => $t->is_active,
            'is_expired'     => $t->isExpired(),
            'is_usable'      => $t->isUsable(),
            'expires_at'     => $t->expires_at?->toIso8601String(),
            'created_at'     => $t->created_at->toIso8601String(),
            'created_by'     => $t->creator?->name,
            'client_emails'  => $t->client_emails ?? [],
            'email_sent_at'  => $t->email_sent_at?->toIso8601String(),
        ];
    }
}
