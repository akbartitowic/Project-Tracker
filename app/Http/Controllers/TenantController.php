<?php

namespace App\Http\Controllers;

use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    /** Returns the current tenant (organization) resolved from the subdomain */
    public function current(): JsonResponse
    {
        if (!app()->bound('tenant')) {
            return response()->json(null);
        }

        $org = app('tenant');

        return response()->json($org->only(['id', 'name', 'slug', 'plan', 'is_active', 'settings']));
    }

    /** Returns plan usage limits for the current tenant */
    public function limits(Request $request): JsonResponse
    {
        if (app()->bound('tenant')) {
            $org = app('tenant');
        } else {
            // Fallback for local dev (no subdomain): resolve by org_id query param
            $orgId = $request->query('org_id');
            if (!$orgId) {
                return response()->json(null, 404);
            }
            $org = \App\Models\Organization::find($orgId);
            if (!$org) {
                return response()->json(null, 404);
            }
        }

        $limits = app(PlanLimitService::class)->limitsFor($org);

        return response()->json($limits);
    }
}
