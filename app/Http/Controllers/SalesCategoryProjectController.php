<?php

namespace App\Http\Controllers;

use App\Models\SalesCategoryProject;
use Illuminate\Http\Request;

class SalesCategoryProjectController extends Controller
{
    public function index()
    {
        return response()->json(['data' => SalesCategoryProject::orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:sales_category_projects,name',
        ]);

        $row = SalesCategoryProject::create($validated);

        return response()->json(['id' => $row->id]);
    }

    public function update(Request $request, string $id)
    {
        $row = SalesCategoryProject::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:sales_category_projects,name,' . $row->id,
        ]);

        $changes = $row->update($validated) ? 1 : 0;

        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $deleted = SalesCategoryProject::destroy($id);

        return response()->json(['deleted' => $deleted]);
    }
}
