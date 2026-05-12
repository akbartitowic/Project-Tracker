<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\ProjectCategory;
use App\Models\SalesCategoryProject;
use App\Models\SalesPitch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesPitchController extends Controller
{
    public function formOptions()
    {
        return response()->json([
            'companies' => Company::query()->orderBy('name')->get(['id', 'name']),
            'company_categories' => ProjectCategory::query()->orderBy('name')->get(['id', 'name']),
            'category_projects' => SalesCategoryProject::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function index(Request $request)
    {
        $tab = $request->query('tab', 'pipeline');
        $query = SalesPitch::query()->with([
            'owner:id,name',
            'company:id,name',
            'companyCategory:id,name',
            'salesCategoryProject:id,name',
        ])->orderByDesc('updated_at');

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
            'prospect_name' => 'nullable|string|max:255',
            'company_id' => 'nullable|integer|exists:companies,id',
            'project_category_id' => 'nullable|integer|exists:project_categories,id',
            'sales_category_project_id' => 'nullable|integer|exists:sales_category_projects,id',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'compro_url' => 'nullable|string|max:2048',
            'proposal_url' => 'nullable|string|max:2048',
            'quotation_url' => 'nullable|string|max:2048',
            'meeting_at' => 'nullable|date',
            'meeting_location' => 'nullable|string|max:500',
            'meeting_mode' => ['nullable', Rule::in(['online', 'offline'])],
            'lead_started_at' => 'nullable|date',
            'current_step' => ['nullable', Rule::in(SalesPitch::STEPS_ORDER)],
        ]);

        $step = $validated['current_step'] ?? SalesPitch::STEP_NEW_PROSPECT;
        $now = now()->toIso8601String();
        $stepReached = [$step => $now];

        $companyId = $validated['company_id'] ?? null;
        $companyName = $validated['company_name'] ?? null;
        if ($companyId) {
            $companyName = Company::query()->find($companyId)?->name;
        }

        $prospectName = trim((string) ($validated['prospect_name'] ?? $validated['title']));
        $leadRaw = $validated['lead_started_at'] ?? null;
        $leadAt = ($leadRaw !== null && $leadRaw !== '')
            ? Carbon::parse($leadRaw)->startOfDay()
            : now()->startOfDay();

        $pitch = SalesPitch::create([
            'user_id' => $request->user()->id,
            'company_id' => $companyId,
            'project_category_id' => $validated['project_category_id'] ?? null,
            'sales_category_project_id' => $validated['sales_category_project_id'] ?? null,
            'title' => $validated['title'],
            'prospect_name' => $prospectName !== '' ? $prospectName : $validated['title'],
            'company_name' => $companyName,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'estimated_value' => $validated['estimated_value'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'meeting_at' => !empty($validated['meeting_at'])
                ? Carbon::parse($validated['meeting_at'])
                : null,
            'meeting_location' => $validated['meeting_location'] ?? null,
            'meeting_mode' => $validated['meeting_mode'] ?? null,
            'current_step' => $step,
            'lead_started_at' => $leadAt,
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
            'prospect_name' => 'nullable|sometimes|string|max:255',
            'company_id' => 'nullable|integer|exists:companies,id',
            'project_category_id' => 'nullable|integer|exists:project_categories,id',
            'sales_category_project_id' => 'nullable|integer|exists:sales_category_projects,id',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'compro_url' => 'nullable|string|max:2048',
            'proposal_url' => 'nullable|string|max:2048',
            'quotation_url' => 'nullable|string|max:2048',
            'meeting_at' => 'nullable|date',
            'meeting_location' => 'nullable|string|max:500',
            'meeting_mode' => ['nullable', Rule::in(['online', 'offline'])],
            'lead_started_at' => 'nullable|date',
            'current_step' => ['sometimes', Rule::in(SalesPitch::STEPS_ORDER)],
            'outcome' => ['nullable', Rule::in([SalesPitch::OUTCOME_WIN, SalesPitch::OUTCOME_LOST])],
        ]);

        foreach (['company_name', 'email', 'phone', 'estimated_value', 'notes', 'compro_url', 'proposal_url', 'quotation_url', 'meeting_location', 'meeting_mode'] as $field) {
            if (array_key_exists($field, $validated)) {
                $pitch->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('meeting_at', $validated)) {
            $raw = $validated['meeting_at'];
            $pitch->meeting_at = ($raw === null || $raw === '') ? null : Carbon::parse($raw);
        }
            $pitch->title = $validated['title'];
        }
        if (array_key_exists('prospect_name', $validated)) {
            $pn = $validated['prospect_name'];
            $pitch->prospect_name = ($pn !== null && $pn !== '')
                ? $pn
                : ((array_key_exists('title', $validated) ? $validated['title'] : null) ?: $pitch->title);
        } elseif (array_key_exists('title', $validated)) {
            $pitch->prospect_name = $validated['title'];
        }

        if (array_key_exists('lead_started_at', $validated)) {
            $raw = $validated['lead_started_at'];
            $pitch->lead_started_at = ($raw === null || $raw === '')
                ? now()->startOfDay()
                : Carbon::parse($raw)->startOfDay();
        }

        foreach (['company_id', 'project_category_id', 'sales_category_project_id'] as $fk) {
            if (array_key_exists($fk, $validated)) {
                $pitch->{$fk} = $validated[$fk];
            }
        }

        if (array_key_exists('company_id', $validated)) {
            if ($pitch->company_id) {
                $pitch->company_name = Company::query()->find($pitch->company_id)?->name;
            } elseif (!array_key_exists('company_name', $validated)) {
                $pitch->company_name = null;
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
        $p->loadMissing([
            'owner:id,name',
            'company:id,name',
            'companyCategory:id,name',
            'salesCategoryProject:id,name',
        ]);
        $arr = $p->toArray();
        $arr['owner_name'] = $p->owner?->name;
        $arr['company_name'] = $p->company?->name ?? $p->company_name;
        $arr['company_category_name'] = $p->companyCategory?->name;
        $arr['category_project_name'] = $p->salesCategoryProject?->name;
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
