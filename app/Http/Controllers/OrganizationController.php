<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationUser;
use App\Models\Role;
use App\Services\OrganizationProvisioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationController extends Controller
{
    /** List organizations the authenticated user belongs to */
    public function index(Request $request): JsonResponse
    {
        $orgs = $request->user()
            ->organizations()
            ->with('owner:id,name,email')
            ->get(['organizations.id', 'organizations.name', 'organizations.slug', 'organizations.plan', 'organizations.is_active']);

        return response()->json($orgs);
    }

    /** Create a new organization (owner = current user) */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'nullable|string|max:50|regex:/^[a-z0-9\-]+$/|unique:organizations,slug',
        ]);

        $slug = $data['slug'] ?? Organization::generateSlug($data['name']);

        $org = DB::transaction(function () use ($request, $data, $slug) {
            $org = Organization::create([
                'name'     => $data['name'],
                'slug'     => $slug,
                'owner_id' => $request->user()->id,
                'plan'     => 'free',
            ]);

            // Seed default roles, finance categories, project roles for this org
            app(OrganizationProvisioner::class)->provision($org);

            // Owner joins as Admin
            $adminRole = Role::withoutGlobalScopes()
                ->where('organization_id', $org->id)
                ->where('name', 'Admin')
                ->first();

            OrganizationUser::create([
                'organization_id' => $org->id,
                'user_id'         => $request->user()->id,
                'role_id'         => $adminRole?->id,
                'joined_at'       => now(),
            ]);

            return $org;
        });

        return response()->json($org, 201);
    }

    /** Show a single organization (must be a member) */
    public function show(Request $request, int $id): JsonResponse
    {
        $org = Organization::findOrFail($id);

        $isMember = $org->organizationUsers()
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($isMember, 403);

        return response()->json($org->load('owner:id,name,email'));
    }

    /** Update organization settings (owner only) */
    public function update(Request $request, int $id): JsonResponse
    {
        $org = Organization::findOrFail($id);
        abort_unless($org->owner_id === $request->user()->id, 403);

        $data = $request->validate([
            'name'     => 'sometimes|string|max:100',
            'settings' => 'sometimes|array',
        ]);

        $org->update($data);

        return response()->json($org);
    }

    /** List members of an organization */
    public function members(Request $request, int $id): JsonResponse
    {
        $org = Organization::findOrFail($id);

        $isMember = $org->organizationUsers()->where('user_id', $request->user()->id)->exists();
        abort_unless($isMember, 403);

        $members = $org->organizationUsers()
            ->with(['user:id,name,email,status', 'role:id,name'])
            ->get()
            ->map(fn($ou) => [
                'id'        => $ou->id,
                'user'      => $ou->user,
                'role'      => $ou->role,
                'joined_at' => $ou->joined_at,
            ]);

        return response()->json($members);
    }

    /** Remove a member from an organization (owner only) */
    public function removeMember(Request $request, int $id, int $userId): JsonResponse
    {
        $org = Organization::findOrFail($id);
        abort_unless($org->owner_id === $request->user()->id, 403);
        abort_if($userId === $org->owner_id, 422, 'Cannot remove the organization owner.');

        $org->organizationUsers()->where('user_id', $userId)->delete();

        return response()->json(['message' => 'Member removed.']);
    }

    /** List roles available in an organization */
    public function roles(Request $request, int $id): JsonResponse
    {
        $org = Organization::findOrFail($id);

        $isMember = $org->organizationUsers()->where('user_id', $request->user()->id)->exists();
        abort_unless($isMember, 403);

        $roles = Role::withoutGlobalScopes()
            ->where('organization_id', $id)
            ->select(['id', 'name'])
            ->get();

        return response()->json($roles);
    }
}
