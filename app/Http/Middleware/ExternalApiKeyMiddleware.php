<?php

namespace App\Http\Middleware;

use App\Models\GlobalIntegration;
use App\Models\ProjectIntegration;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExternalApiKeyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('X-Api-Key') ?? $request->header('Authorization');

        if ($key && str_starts_with($key, 'Bearer ')) {
            $key = substr($key, 7);
        }

        if (!$key) {
            return response()->json(['message' => 'API key missing. Use X-Api-Key header.'], 401);
        }

        // Check project-level key first
        $integration = ProjectIntegration::where('inbound_api_key', $key)
            ->where('is_active', true)
            ->first();

        if ($integration) {
            $request->attributes->set('integration', $integration);
            $request->attributes->set('integration_project_id', $integration->project_id);
            $request->attributes->set('is_global_integration', false);
            return $next($request);
        }

        // Check global key
        $global = GlobalIntegration::where('inbound_api_key', $key)
            ->where('is_active', true)
            ->first();

        if ($global) {
            $request->attributes->set('integration', $global);
            $request->attributes->set('integration_project_id', null);
            $request->attributes->set('is_global_integration', true);
            return $next($request);
        }

        return response()->json(['message' => 'Invalid or inactive API key.'], 401);
    }
}
