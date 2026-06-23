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
        if (!app()->bound('tenant')) {
            return response()->json(null, 404);
        }

        $limits = app(PlanLimitService::class)->limitsFor(app('tenant'));

        return response()->json($limits);
    }
}
