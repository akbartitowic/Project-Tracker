<?php

namespace App\Http\Controllers;

use App\Models\ProjectCategory;
use Illuminate\Http\Request;

class ProjectCategoryController extends Controller
{
    public function index()
    {
        return response()->json(['data' => ProjectCategory::orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:project_categories,name',
        ]);

        $category = ProjectCategory::create($validated);
        return response()->json(['id' => $category->id]);
    }

    public function update(Request $request, string $id)
    {
        $category = ProjectCategory::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:project_categories,name,' . $category->id,
        ]);

        $changes = $category->update($validated) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $deleted = ProjectCategory::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }
}
