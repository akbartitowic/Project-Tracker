<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class ValidateSanctumTokenLifetime
{
    /**
     * Tokens expire after 12 hours or when the calendar day changes (server timezone).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken() instanceof PersonalAccessToken) {
            /** @var PersonalAccessToken $token */
            $token = $user->currentAccessToken();
            $created = $token->created_at;

            $maxMinutes = (int) config('sanctum.expiration', 720);
            $expiredByAge = $created && $created->diffInMinutes(now()) >= $maxMinutes;
            $expiredByDay = $created && !$created->isSameDay(now());

            if ($expiredByAge || $expiredByDay) {
                $token->delete();

                return response()->json([
                    'message' => 'Session expired. Please log in again.',
                    'code' => 'token_expired',
                ], 401);
            }
        }

        return $next($request);
    }
}
