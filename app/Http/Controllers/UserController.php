<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    private function isAdminUser($user): bool
    {
        if (!$user) {
            return false;
        }
        if (strtolower((string) ($user->email ?? '')) === 'tito@noohtify.com') {
            return true;
        }
        $user->loadMissing('role');
        $roleName = strtolower((string) ($user->role->name ?? $user->role ?? ''));

        return $roleName === 'admin';
    }

    public function index()
    {
        return response()->json(['data' => User::with('role')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'role_id' => 'required|exists:roles,id',
            'email' => 'required|email|unique:users',
            'phone_number' => 'nullable|string',
            'password' => 'required|string|min:6',
            'status' => 'required|string',
        ]);

        $validated['role'] = \App\Models\Role::find($validated['role_id'])->name; // For legacy compatibility if still needed
        $user = User::create($validated);
        return response()->json(['id' => $user->id]);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);
        if ($request->filled('password') && !$this->isAdminUser($request->user())) {
            return response()->json(['message' => 'Only administrators can set or change user passwords.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'role_id' => 'required|exists:roles,id',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'status' => 'required|string',
        ]);

        if (!empty($validated['password'])) {
            // User model 'password' => 'hashed' cast applies on set
        } else {
            unset($validated['password']);
        }

        $validated['role'] = \App\Models\Role::find($validated['role_id'])->name;
        $changes = $user->update($validated) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $deleted = User::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }
}
