<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantMember
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!app()->bound('tenant')) {
            abort(400, 'No tenant context.');
        }

        $user = $request->user();
        if (!$user) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Unauthenticated.'], 401)
                : redirect()->route('login');
        }

        $org = app('tenant');

        $isMember = $org->organizationUsers()
            ->where('user_id', $user->id)
            ->exists();

        if (!$isMember) {
            abort(403, 'You are not a member of this organization.');
        }

        return $next($request);
    }
}
