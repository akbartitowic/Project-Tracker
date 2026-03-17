<?php

namespace App\Http\Controllers;

use App\Models\Presale;
use Illuminate\Http\Request;
use App\Traits\LogActivity;

class PresaleController extends Controller
{
    use LogActivity;
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
        $this->log('Presales', 'Created Opportunity', "Created new lead entry: {$presale->name}");
        return response()->json(['id' => $presale->id]);
    }

    public function update(Request $request, string $id)
    {
        $presale = Presale::findOrFail($id);
        $oldStatus = $presale->status;
        $changes = $presale->update($request->all()) ? 1 : 0;

        if (isset($request->status) && $request->status !== $oldStatus) {
            $this->log('Presales', 'Updated Pipeline Status', "Moved '{$presale->name}' from {$oldStatus} to {$request->status}");
        } else {
            $this->log('Presales', 'Updated Lead Details', "Modified data for '{$presale->name}'");
        }

        return response()->json(['changes' => $changes]);
    }

    public function destroy(string $id)
    {
        $presale = Presale::find($id);
        if ($presale) {
            $this->log('Presales', 'Deleted Lead', "Permanently removed lead: {$presale->name}");
            $deleted = $presale->delete();
        } else {
            $deleted = 0;
        }
        return response()->json(['deleted' => $deleted]);
    }
}
