<?php

namespace App\Http\Controllers;

use App\Models\FinanceCategory;
use Illuminate\Http\Request;

class FinanceCategoryController extends Controller
{
    public function index()
    {
        return response()->json(['data' => FinanceCategory::orderBy('name', 'asc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:finance_categories',
        ]);

        $category = FinanceCategory::create($validated);
        return response()->json(['id' => $category->id]);
    }

    public function update(Request $request, string $id)
    {
        $category = FinanceCategory::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|unique:finance_categories,name,' . $category->id,
        ]);

        $changes = $category->update($validated) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $deleted = FinanceCategory::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }
}
