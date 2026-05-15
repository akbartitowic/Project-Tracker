<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Support\UserAccess;
use Illuminate\Http\Request;

class UserController extends Controller
{
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

    private function assertValidRoleAssignment(Request $request, int $roleId): void
    {
        if (UserAccess::isPrivileged($request->user())) {
            return;
        }

        $role = Role::find($roleId);
        if ($role && strtolower((string) $role->name) === 'admin') {
            abort(403, 'Only administrators can assign the Admin role.');
        }
    }

    public function index()
    {
        return response()->json([
            'data' => User::with('role')
                ->select('id', 'name', 'email', 'phone_number', 'status', 'role_id', 'role', 'created_at', 'updated_at')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'role_id' => 'required|exists:roles,id',
            'email' => 'required|email|unique:users',
            'phone_number' => 'nullable|string',
            'password' => 'required|string|min:8',
            'status' => 'required|string',
        ]);

        $this->assertValidRoleAssignment($request, (int) $validated['role_id']);

        $validated['role'] = Role::find($validated['role_id'])->name;
        $user = User::create($validated);

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
            'role_id' => 'required|exists:roles,id',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string',
            'password' => 'nullable|string|min:8',
            'status' => 'required|string',
        ]);

        $this->assertValidRoleAssignment($request, (int) $validated['role_id']);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $validated['role'] = Role::find($validated['role_id'])->name;
        $changes = $user->update($validated) ? 1 : 0;

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

        $deleted = $user->delete();

        return response()->json(['deleted' => $deleted ? 1 : 0]);
    }
}
