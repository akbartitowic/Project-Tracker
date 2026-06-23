<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $host      = $request->getHost();
        $appDomain = config('saas.domain');

        // Strip subdomain to get the tenant slug
        if ($appDomain && str_ends_with($host, '.' . $appDomain)) {
            $slug = substr($host, 0, strlen($host) - strlen('.' . $appDomain));

            $org = Organization::where('slug', $slug)->where('is_active', true)->first();

            if (!$org) {
                abort(404, 'Organization not found.');
            }

            app()->instance('tenant', $org);
        }

        return $next($request);
    }
}
