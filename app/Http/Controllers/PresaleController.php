<?php

namespace App\Http\Controllers;

use App\Models\Presale;
use Illuminate\Http\Request;

class PresaleController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Presale::orderBy('created_at', 'desc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'sector' => 'nullable|string',
            'estimated_value' => 'nullable|numeric',
            'description' => 'nullable|string',
            'status' => 'nullable|string',
            'proposal_doc_url' => 'nullable|string',
            'presentation_log' => 'nullable|string',
            'quotation_value' => 'nullable|numeric',
            'lost_reason' => 'nullable|string',
            'competitor' => 'nullable|string',
        ]);

        if (!isset($validated['status'])) {
            $validated['status'] = 'Lead';
        }

        $presale = Presale::create($validated);
        return response()->json(['id' => $presale->id]);
    }

    public function update(Request $request, string $id)
    {
        $presale = Presale::findOrFail($id);
        $changes = $presale->update($request->all()) ? 1 : 0;
        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $deleted = Presale::destroy($id);
        return response()->json(['deleted' => $deleted]);
    }
}
