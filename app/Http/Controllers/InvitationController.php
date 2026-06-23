<?php

namespace App\Http\Controllers;

use App\Mail\InvitationMail;
use App\Models\Invitation;
use App\Models\Organization;
use App\Models\OrganizationUser;
use App\Models\Role;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class InvitationController extends Controller
{
    /** Create and send an invitation */
    public function store(Request $request, int $orgId): JsonResponse
    {
        $org = Organization::findOrFail($orgId);

        $isMember = $org->organizationUsers()->where('user_id', $request->user()->id)->exists();
        abort_unless($isMember, 403);

        // Plan limit check
        $limiter = app(PlanLimitService::class);
        if (!$limiter->canAddUser($org)) {
            return response()->json([
                'message' => 'Batas maksimal pengguna untuk plan ' . strtoupper($org->plan) . ' sudah tercapai. Upgrade plan untuk menambah lebih banyak anggota.',
            ], 422);
        }

        $data = $request->validate([
            'email'   => 'required|email',
            'role_id' => 'required|exists:roles,id',
        ]);

        // Check role belongs to this org
        $role = Role::withoutGlobalScopes()->where('id', $data['role_id'])
            ->where('organization_id', $orgId)
            ->firstOrFail();

        // Revoke any previous pending invite for same email + org
        Invitation::where('organization_id', $orgId)
            ->where('email', $data['email'])
            ->whereNull('accepted_at')
            ->delete();

        $invitation = Invitation::create([
            'organization_id' => $orgId,
            'email'           => $data['email'],
            'role_id'         => $role->id,
            'invited_by'      => $request->user()->id,
            'token'           => Str::random(48),
            'expires_at'      => now()->addDays(7),
        ]);

        // Send invitation email via queue
        $invitation->load(['organization', 'role', 'invitedBy']);
        Mail::to($invitation->email)->queue(new InvitationMail($invitation));

        return response()->json([
            'message'    => 'Undangan berhasil dikirim ke ' . $invitation->email,
            'invitation' => $invitation->only(['id', 'email', 'token', 'expires_at']),
        ], 201);
    }

    /** Public: get invitation details by token */
    public function show(string $token): JsonResponse
    {
        $invitation = Invitation::with(['organization:id,name,slug', 'role:id,name', 'invitedBy:id,name'])
            ->where('token', $token)
            ->firstOrFail();

        if (!$invitation->isPending()) {
            return response()->json(['message' => 'Invitation is expired or already accepted.'], 410);
        }

        return response()->json([
            'organization' => $invitation->organization,
            'role'         => $invitation->role,
            'invited_by'   => $invitation->invitedBy,
            'email'        => $invitation->email,
            'expires_at'   => $invitation->expires_at,
        ]);
    }

    /** Authenticated user accepts an invitation */
    public function accept(Request $request, string $token): JsonResponse
    {
        $invitation = Invitation::with('organization')->where('token', $token)->firstOrFail();

        if (!$invitation->isPending()) {
            return response()->json(['message' => 'Invitation is expired or already accepted.'], 410);
        }

        $user = $request->user();

        if (strtolower($user->email) !== strtolower($invitation->email)) {
            return response()->json(['message' => 'This invitation was sent to a different email address.'], 403);
        }

        // Check not already a member
        $alreadyMember = $invitation->organization->organizationUsers()
            ->where('user_id', $user->id)
            ->exists();

        if ($alreadyMember) {
            $invitation->update(['accepted_at' => now()]);
            return response()->json(['message' => 'You are already a member of this organization.', 'slug' => $invitation->organization->slug]);
        }

        DB::transaction(function () use ($invitation, $user) {
            OrganizationUser::create([
                'organization_id' => $invitation->organization_id,
                'user_id'         => $user->id,
                'role_id'         => $invitation->role_id,
                'joined_at'       => now(),
            ]);

            $invitation->update(['accepted_at' => now()]);
        });

        return response()->json([
            'message' => 'Invitation accepted.',
            'slug'    => $invitation->organization->slug,
        ]);
    }

    /** List pending invitations for an org */
    public function index(Request $request, int $orgId): JsonResponse
    {
        $org = Organization::findOrFail($orgId);

        $isMember = $org->organizationUsers()->where('user_id', $request->user()->id)->exists();
        abort_unless($isMember, 403);

        $invitations = Invitation::with(['role:id,name', 'invitedBy:id,name'])
            ->where('organization_id', $orgId)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invitations);
    }

    /** Revoke a pending invitation */
    public function destroy(Request $request, int $orgId, int $invitationId): JsonResponse
    {
        $org = Organization::findOrFail($orgId);

        $isMember = $org->organizationUsers()->where('user_id', $request->user()->id)->exists();
        abort_unless($isMember, 403);

        Invitation::where('id', $invitationId)
            ->where('organization_id', $orgId)
            ->whereNull('accepted_at')
            ->delete();

        return response()->json(['message' => 'Invitation revoked.']);
    }
}
