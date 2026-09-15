<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Support\UserAccess;
use App\Traits\LogActivity;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use LogActivity;

    private function isProtectedAccount(User $user): bool
    {
        return UserAccess::isPrivileged($user);
    }

    private function assertCanManageUser(Request $request, User $target): void
    {
        $actor = $request->user();

        if ($this->isProtectedAccount($target) && !UserAccess::isPrivileged($actor)) {
            abort(403, 'You cannot modify this user account.');
        }
    }

    private function assertValidRoleAssignment(Request $request, int $roleId, string $userType = 'internal'): void
    {
        $role = Role::find($roleId);
        $roleName = strtolower((string) ($role?->name ?? ''));

        // A client account is scoped to one company's read-only data — it must
        // never carry the Admin role (or its permission set), regardless of who's assigning it.
        if ($userType === 'client' && $roleName === 'admin') {
            abort(403, 'The Admin role cannot be assigned to a client account.');
        }

        if (UserAccess::isPrivileged($request->user())) {
            return;
        }

        if ($roleName === 'admin') {
            abort(403, 'Only administrators can assign the Admin role.');
        }
    }

    private function syncClientProjects(User $user, Request $request): void
    {
        if ($user->user_type !== 'client') {
            if ($user->clientProjects()->exists()) {
                $user->clientProjects()->sync([]);
            }
            return;
        }

        $projectIds = collect($request->input('client_project_ids', []))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $user->clientProjects()->sync($projectIds);
    }

    public function index()
    {
        return response()->json([
            'data' => User::with(['role', 'company:id,name', 'clientProjects:id'])
                ->select('id', 'name', 'nickname', 'email', 'phone_number', 'status', 'role_id', 'role', 'user_type', 'company_id', 'created_at', 'updated_at')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'nickname' => 'nullable|string|max:255',
            'role_id' => 'required|exists:roles,id',
            'email' => 'required|email|unique:users',
            'phone_number' => 'nullable|string',
            'password' => 'required|string|min:8',
            'status' => 'required|string',
            'user_type' => 'nullable|in:internal,client',
            'company_id' => 'required_if:user_type,client|nullable|exists:companies,id',
            'client_project_ids' => 'nullable|array',
            'client_project_ids.*' => 'integer|exists:projects,id',
        ]);

        $userType = $validated['user_type'] ?? 'internal';
        $this->assertValidRoleAssignment($request, (int) $validated['role_id'], $userType);

        $validated['role'] = Role::find($validated['role_id'])->name;
        $validated['user_type'] = $userType;
        if ($userType !== 'client') {
            $validated['company_id'] = null;
        }
        $clientProjectIds = $validated['client_project_ids'] ?? [];
        unset($validated['client_project_ids']);

        $user = User::create($validated);
        if ($userType === 'client' && $clientProjectIds !== []) {
            $user->clientProjects()->sync($clientProjectIds);
        }

        $this->log('System', 'Created User', "Created user '{$user->name}' ({$user->email}) with role: {$user->role}");

        return response()->json(['id' => $user->id]);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);
        $this->assertCanManageUser($request, $user);

        if ($request->filled('password') && !UserAccess::isPrivileged($request->user())) {
            return response()->json(['message' => 'Only administrators can set or change user passwords.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'nickname' => 'nullable|string|max:255',
            'role_id' => 'required|exists:roles,id',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string',
            'password' => 'nullable|string|min:8',
            'status' => 'required|string',
            'user_type' => 'nullable|in:internal,client',
            'company_id' => 'required_if:user_type,client|nullable|exists:companies,id',
            'client_project_ids' => 'nullable|array',
            'client_project_ids.*' => 'integer|exists:projects,id',
        ]);

        $userType = $validated['user_type'] ?? 'internal';
        $this->assertValidRoleAssignment($request, (int) $validated['role_id'], $userType);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $oldRoleId = $user->role_id;
        $oldRoleName = $user->role;

        $validated['role'] = Role::find($validated['role_id'])->name;
        $validated['user_type'] = $userType;
        if ($userType !== 'client') {
            $validated['company_id'] = null;
        }
        unset($validated['client_project_ids']);

        $changes = $user->update($validated) ? 1 : 0;
        $this->syncClientProjects($user, $request);

        if ((int) $oldRoleId !== (int) $validated['role_id']) {
            $this->log(
                'System',
                'Updated User Role',
                "Changed role for '{$user->name}' ({$user->email}) from '{$oldRoleName}' to '{$validated['role']}'"
            );
        }

        return response()->json(['changes' => $changes]);
    }

    public function destroy(Request $request, string $id)
    {
        $actor = $request->user();
        $user = User::find($id);

        if (!$user) {
            return response()->json(['deleted' => 0]);
        }

        if ((int) $user->id === (int) $actor->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $this->assertCanManageUser($request, $user);

        $userName = $user->name;
        $userEmail = $user->email;
        $deleted = $user->delete();

        if ($deleted) {
            $this->log('System', 'Deleted User', "Deleted user '{$userName}' ({$userEmail})");
        }

        return response()->json(['deleted' => $deleted ? 1 : 0]);
    }
}
