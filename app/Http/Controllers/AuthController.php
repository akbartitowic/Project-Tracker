<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Traits\LogActivity;

class AuthController extends Controller
{
    use LogActivity;

    private function ensureBoardOnlyPermissions(Role $role): void
    {
        $permissionSpecs = [
            ['slug' => 'project_board.read', 'name' => 'Read Project Board', 'module' => 'Project Board'],
            ['slug' => 'project_board.create', 'name' => 'Create Project Board', 'module' => 'Project Board'],
            ['slug' => 'project_board.update', 'name' => 'Update Project Board', 'module' => 'Project Board'],
        ];

        $permissionIds = [];
        foreach ($permissionSpecs as $spec) {
            $permission = Permission::firstOrCreate(
                ['slug' => $spec['slug']],
                ['name' => $spec['name'], 'module' => $spec['module']]
            );
            $permissionIds[] = $permission->id;
        }

        $role->permissions()->sync($permissionIds);
    }

    public function signup(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Signup users default to board-only access.
        $defaultRole = Role::firstOrCreate(['name' => 'Board Member']);
        $this->ensureBoardOnlyPermissions($defaultRole);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $defaultRole->id,
            'role' => $defaultRole->name,
            'status' => 'Active',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('role.permissions'),
        ]);
    }

    public function login(Request $request)
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid login credentials'
            ], 401);
        }

        $user = User::where('email', $request['email'])->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('role.permissions'),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Successfully logged out'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'user' => $request->user()->load('role.permissions')
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->phone_number = $validated['phone_number'] ?? $user->phone_number;

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();
        $this->log('Auth', 'Updated Profile', "User name: {$user->name}, Email: {$user->email}");

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully',
            'user' => $user->load('role.permissions')
        ]);
    }
}
