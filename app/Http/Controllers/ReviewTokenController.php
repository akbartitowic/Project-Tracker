<?php

namespace App\Http\Controllers;

use App\Mail\ReviewLinkMail;
use App\Models\Project;
use App\Models\ReviewEvaluation;
use App\Models\ReviewToken;
use App\Support\EmailListParser;
use App\Support\ProjectAccess;
use App\Support\ReviewEmailTemplate;
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

        $project = Project::findOrFail($projectId);
        if (!$project->review_enabled) {
            return response()->json(['error' => 'Project ini tidak berhak menerima review, link tidak bisa dibuat.'], 403);
        }

        $validated = $request->validate([
            'client_emails'   => 'nullable',
            'client_emails.*' => 'string',
            'auto_send'       => 'nullable|boolean',
            'subject'         => 'nullable|string|max:255',
            'body'            => 'nullable|string|max:5000',
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
            $this->sendTokenEmail($token, $eval, $validated['subject'] ?? null, $validated['body'] ?? null);
        }

        return response()->json(['data' => $this->serialize($token)], 201);
    }

    /** PATCH /review/tokens/{id}/emails — update the client email list on an already-created link */
    public function updateEmails(Request $request, int $id)
    {
        $token = ReviewToken::findOrFail($id);

        $validated = $request->validate([
            'client_emails'   => 'nullable',
            'client_emails.*' => 'string',
        ]);

        $clientEmails = EmailListParser::parse($validated['client_emails'] ?? null);
        $token->update(['client_emails' => $clientEmails]);

        return response()->json(['data' => $this->serialize($token->fresh())]);
    }

    /** GET /review/tokens/{id}/email-preview — rendered subject/body for the send dialog */
    public function emailPreview(int $id)
    {
        $token = ReviewToken::findOrFail($id);
        $project = Project::find($token->project_id);
        $eval = ReviewEvaluation::findOrFail($token->evaluation_id);
        $url = url('/r/' . $token->token);

        $rendered = ReviewEmailTemplate::renderFor($project, $eval, $url);

        return response()->json(['data' => $rendered]);
    }

    /** POST /review/tokens/{id}/send-email — manually (re)send the link to the stored client emails */
    public function sendEmail(Request $request, int $id)
    {
        $token = ReviewToken::findOrFail($id);

        if (empty($token->client_emails)) {
            return response()->json(['message' => 'Belum ada email client yang tersimpan untuk link ini.'], 422);
        }

        $validated = $request->validate([
            'subject' => 'nullable|string|max:255',
            'body'    => 'nullable|string|max:5000',
        ]);

        $eval = ReviewEvaluation::findOrFail($token->evaluation_id);
        $sent = $this->sendTokenEmail($token, $eval, $validated['subject'] ?? null, $validated['body'] ?? null);

        if (!$sent) {
            return response()->json(['message' => 'Gagal mengirim email. Cek konfigurasi SMTP atau System Logs untuk detail.'], 500);
        }

        return response()->json(['data' => $this->serialize($token->fresh())]);
    }

    private function sendTokenEmail(ReviewToken $token, ReviewEvaluation $eval, ?string $subjectOverride = null, ?string $bodyOverride = null): bool
    {
        $project = Project::find($token->project_id);
        $url = url('/r/' . $token->token);

        try {
            Mail::to($token->client_emails)->send(new ReviewLinkMail($project, $eval, $url, $subjectOverride, $bodyOverride));
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
