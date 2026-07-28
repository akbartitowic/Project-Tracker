<?php

namespace App\Http\Controllers;

use App\Mail\LoginNotificationMail;
use App\Models\User;
use App\Models\Role;
use App\Models\MenuItem;
use App\Support\ClientInfo;
use App\Support\PermissionCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use App\Traits\LogActivity;
use Throwable;

class AuthController extends Controller
{
    use LogActivity;

    private function serializeUser(User $user): array
    {
        $roleModel = $user->role()->with('permissions.module')->first();
        $data = $user->toArray();
        $data['role_name'] = $roleModel?->name ?? ($data['role'] ?? null);
        $data['role_permissions'] = $roleModel
            ? $roleModel->permissions->map(fn ($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->name,
                'module' => $p->module->name,
                'module_is_active' => $p->module->is_active,
                'module_sort_order' => $p->module->sort_order,
            ])->values()->all()
            : [];
        // Same list for every user — visibility is still gated by role_permissions
        // above; this is just sidebar presentation metadata (label/icon/path).
        $data['menu_items'] = MenuItem::orderBy('sort_order')->get(
            ['permission_slug', 'section', 'path', 'label', 'icon', 'variant', 'sort_order']
        )->all();
        return $data;
    }

    private function ensureBoardOnlyPermissions(Role $role): void
    {
        PermissionCatalog::sync();
        $permissionIds = PermissionCatalog::permissionIdsForSlugs(
            PermissionCatalog::boardMemberPermissionSlugs()
        );
        if ($permissionIds !== []) {
            $role->permissions()->sync($permissionIds);
        }
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
            'timezone' => 'Asia/Jakarta',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->serializeUser($user),
        ]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid login credentials'
            ], 401);
        }

        $user = User::where('email', $credentials['email'])->firstOrFail();

        // Single active session per user (reduces stolen-token window).
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        $this->log('Auth', 'User Login', "User logged in: {$user->email}");
        $this->sendLoginNotification($request, $user);

        return response()->json([
            'status' => 'success',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->serializeUser($user),
        ]);
    }

    /**
     * Best-effort security alert — never blocks or fails the login response itself.
     */
    private function sendLoginNotification(Request $request, User $user): void
    {
        if (!$user->email) {
            return;
        }

        try {
            $tz = $user->timezone ?: 'Asia/Jakarta';
            $now = now()->timezone($tz);
            $ip = (string) $request->ip();

            Mail::to($user->email)->send(new LoginNotificationMail(
                $user,
                $now->translatedFormat('d M Y'),
                $now->format('H:i') . ' (' . $tz . ')',
                $ip,
                ClientInfo::device($request->userAgent()),
                ClientInfo::location($ip),
                url('/profile'),
            ));
        } catch (Throwable $e) {
            $this->log(
                'Auth',
                'Login Notification Failed',
                "Failed sending login notification to '{$user->email}': {$e->getMessage()}"
            );
        }
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
            'user' => $this->serializeUser($request->user())
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8|confirmed',
            'task_email_notifications_enabled' => 'nullable|boolean',
            'timezone' => 'nullable|timezone',
        ]);

        $user->name = $validated['name'];
        $user->nickname = $validated['nickname'] ?: null;
        $user->email = $validated['email'];
        $user->phone_number = $validated['phone_number'] ?? $user->phone_number;
        if (array_key_exists('task_email_notifications_enabled', $validated)) {
            $user->task_email_notifications_enabled = (bool) $validated['task_email_notifications_enabled'];
        }
        if (array_key_exists('timezone', $validated)) {
            $user->timezone = $validated['timezone'] ?: 'Asia/Jakarta';
        }

        $passwordChanged = !empty($validated['password']);
        if ($passwordChanged) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();
        $this->log('Auth', 'Updated Profile', "User name: {$user->name}, Email: {$user->email}");

        if ($passwordChanged) {
            // Force logout everywhere (including this request's own token) so a
            // leaked/stolen session can't keep riding on the old password.
            $user->tokens()->delete();
            $this->log('Auth', 'Password Changed', "Password changed for {$user->email} — all sessions revoked.");
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully',
            'user' => $this->serializeUser($user),
            'force_logout' => $passwordChanged,
        ]);
    }
}
