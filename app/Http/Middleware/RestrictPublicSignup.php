<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictPublicSignup
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!config('app.allow_public_signup', false)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Public registration is disabled.',
            ], 403);
        }

        return $next($request);
    }
}
