<?php

namespace App\Http\Controllers;

use App\Models\SalesPitch;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesPitchController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'pipeline');
        $query = SalesPitch::query()->with('owner:id,name')->orderByDesc('updated_at');

        if (!$this->isPrivileged($request)) {
            $query->where('user_id', $request->user()->id);
        }

        if ($tab === 'win') {
            $query->where('outcome', SalesPitch::OUTCOME_WIN);
        } elseif ($tab === 'lost') {
            $query->where('outcome', SalesPitch::OUTCOME_LOST);
        } else {
            $query->whereNull('outcome');
        }

        $items = $query->get()->map(fn (SalesPitch $p) => $this->serializePitch($p));

        return response()->json(['data' => $items]);
    }

    public function show(Request $request, string $id)
    {
        $pitch = SalesPitch::findOrFail($id);
        $this->authorizePitch($pitch, $request);

        return response()->json(['data' => $this->serializePitch($pitch)]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'prospect_name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'lead_started_at' => 'nullable|date',
            'current_step' => ['nullable', Rule::in(SalesPitch::STEPS_ORDER)],
        ]);

        $step = $validated['current_step'] ?? SalesPitch::STEP_NEW_PROSPECT;
        $now = now()->toIso8601String();
        $stepReached = [$step => $now];

        $pitch = SalesPitch::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'prospect_name' => $validated['prospect_name'],
            'company_name' => $validated['company_name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'estimated_value' => $validated['estimated_value'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'current_step' => $step,
            'lead_started_at' => isset($validated['lead_started_at']) ? $validated['lead_started_at'] : now(),
            'step_reached_at' => $stepReached,
        ]);

        return response()->json(['id' => $pitch->id, 'data' => $this->serializePitch($pitch->fresh())]);
    }

    public function update(Request $request, string $id)
    {
        $pitch = SalesPitch::findOrFail($id);
        $this->authorizePitch($pitch, $request);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'prospect_name' => 'sometimes|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'lead_started_at' => 'nullable|date',
            'current_step' => ['sometimes', Rule::in(SalesPitch::STEPS_ORDER)],
            'outcome' => ['nullable', Rule::in([SalesPitch::OUTCOME_WIN, SalesPitch::OUTCOME_LOST])],
        ]);

        foreach (['title', 'prospect_name', 'company_name', 'email', 'phone', 'estimated_value', 'notes', 'lead_started_at'] as $field) {
            if (array_key_exists($field, $validated)) {
                $pitch->{$field} = $validated[$field];
            }
        }

        if (isset($validated['current_step']) && $validated['current_step'] !== $pitch->current_step) {
            $reached = $pitch->step_reached_at ?? [];
            $key = $validated['current_step'];
            $reached[$key] = $reached[$key] ?? now()->toIso8601String();
            $pitch->step_reached_at = $reached;
            $pitch->current_step = $key;
        }

        if (array_key_exists('outcome', $validated) && $validated['outcome'] !== null) {
            $pitch->outcome = $validated['outcome'];
            $pitch->closed_at = now();
            $pitch->current_step = SalesPitch::STEP_CLOSED;
            $reached = $pitch->step_reached_at ?? [];
            $reached[SalesPitch::STEP_CLOSED] = $reached[SalesPitch::STEP_CLOSED] ?? now()->toIso8601String();
            $pitch->step_reached_at = $reached;
        }

        $pitch->save();

        return response()->json(['data' => $this->serializePitch($pitch->fresh())]);
    }

    public function destroy(Request $request, string $id)
    {
        $pitch = SalesPitch::findOrFail($id);
        $this->authorizePitch($pitch, $request);
        $pitch->delete();

        return response()->json(['deleted' => 1]);
    }

    private function isPrivileged(Request $request): bool
    {
        if (strtolower((string) ($request->user()->email ?? '')) === 'tito@noohtify.com') {
            return true;
        }

        return strtolower((string) ($request->user()->role?->name ?? $request->user()->role ?? '')) === 'admin';
    }

    private function authorizePitch(SalesPitch $pitch, Request $request): void
    {
        if ($this->isPrivileged($request)) {
            return;
        }
        if ((int) $pitch->user_id !== (int) $request->user()->id) {
            abort(403, 'Forbidden');
        }
    }

    private function serializePitch(SalesPitch $p): array
    {
        $p->loadMissing('owner:id,name');
        $arr = $p->toArray();
        $arr['owner_name'] = $p->owner?->name;
        $start = $p->lead_started_at?->getTimestamp();
        $end = $p->closed_at?->getTimestamp() ?? now()->getTimestamp();
        $arr['duration_seconds_open'] = $start ? max(0, $end - $start) : 0;
        if ($p->outcome && $p->closed_at && $p->lead_started_at) {
            $arr['duration_seconds_closed'] = max(0, $p->closed_at->getTimestamp() - $p->lead_started_at->getTimestamp());
        } else {
            $arr['duration_seconds_closed'] = null;
        }

        return $arr;
    }
}
