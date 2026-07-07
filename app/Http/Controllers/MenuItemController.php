<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use App\Support\UserAccess;
use Illuminate\Http\Request;

class MenuItemController extends Controller
{
    private function assertCanManageMenuItems(Request $request): void
    {
        if (!UserAccess::isPrivileged($request->user())) {
            abort(403, 'Only administrators can manage menu items.');
        }
    }

    public function index()
    {
        return response()->json([
            'data' => MenuItem::orderBy('section')->orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $this->assertCanManageMenuItems($request);

        $validated = $request->validate([
            'permission_slug' => 'required|string|exists:permissions,slug',
            'section' => 'nullable|string|max:255',
            'path' => 'required|string|starts_with:/',
            'label' => 'required|string|max:255',
            'icon' => 'required|string|max:255',
            'variant' => 'nullable|in:primary,sub',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $menuItem = MenuItem::create($validated);

        return response()->json(['data' => $menuItem]);
    }

    public function update(Request $request, MenuItem $menuItem)
    {
        $this->assertCanManageMenuItems($request);

        $validated = $request->validate([
            'permission_slug' => 'sometimes|required|string|exists:permissions,slug',
            'section' => 'nullable|string|max:255',
            'path' => 'sometimes|required|string|starts_with:/',
            'label' => 'sometimes|required|string|max:255',
            'icon' => 'sometimes|required|string|max:255',
            'variant' => 'nullable|in:primary,sub',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $menuItem->update($validated);

        return response()->json(['data' => $menuItem]);
    }

    public function destroy(Request $request, MenuItem $menuItem)
    {
        $this->assertCanManageMenuItems($request);

        $menuItem->delete();

        return response()->json(['deleted' => 1]);
    }
}
