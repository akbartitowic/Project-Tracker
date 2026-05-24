<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Presale;
use App\Models\ProjectCategory;
use App\Models\SalesCategoryProject;
use App\Models\SalesPitch;
use App\Services\SalesQuotationService;
use App\Support\PublicStorageUrl;
use App\Support\UserAccess;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SalesPitchController extends Controller
{
    public function __construct(
        private readonly SalesQuotationService $quotationService,
    ) {}

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
            'salesCategoryProjects:id,name',
        ])->orderByDesc('updated_at');

        if (!UserAccess::isPrivileged($request->user())) {
            $query->where('user_id', $request->user()->id);
        }

        if ($tab === 'win') {
            $query->where('outcome', SalesPitch::OUTCOME_WIN);
            $pitchItems = $query->with('presale:id,sales_pitch_id,converted_project_id')->get()
                ->map(fn (SalesPitch $p) => $this->serializePitch($p));

            $orphanPresales = Presale::query()
                ->with([
                    'company:id,name',
                    'projectCategory:id,name',
                ])
                ->where('status', 'Won')
                ->whereNotNull('converted_project_id')
                ->whereNull('sales_pitch_id')
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn (Presale $p) => $this->serializePresaleWinEntry($p));

            $items = $pitchItems->concat($orphanPresales)->sortByDesc('updated_at')->values();

            return response()->json(['data' => $items]);
        }

        if ($tab === 'lost') {
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
            'sales_category_project_ids' => 'nullable|array',
            'sales_category_project_ids.*' => 'integer|exists:sales_category_projects,id',
            'sales_category_project_id' => 'nullable|integer|exists:sales_category_projects,id',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'estimated_value' => 'nullable|numeric|min:0',
            'final_deal_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'compro_url' => 'nullable|string|max:2048',
            'proposal_url' => 'nullable|string|max:2048',
            'quotation_url' => 'nullable|string|max:2048',
            'quotation_data' => 'nullable|array',
            'meeting_at' => 'nullable|date',
            'meeting_location' => 'nullable|string|max:500',
            'meeting_mode' => ['nullable', Rule::in(['online', 'offline', 'no'])],
            'lead_started_at' => 'nullable|date',
            'current_step' => ['nullable', Rule::in(SalesPitch::STEPS_ORDER)],
        ]);

        $step = $validated['current_step'] ?? SalesPitch::STEP_NEW_PROSPECT;
        $now = now()->toIso8601String();
        $stepReached = [SalesPitch::STEP_NEW_PROSPECT => $now];
        if ($step !== SalesPitch::STEP_NEW_PROSPECT) {
            $stepReached[$step] = $now;
        }

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
            'title' => $validated['title'],
            'prospect_name' => $prospectName !== '' ? $prospectName : $validated['title'],
            'company_name' => $companyName,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'estimated_value' => $validated['estimated_value'] ?? null,
            'final_deal_value' => $validated['final_deal_value'] ?? null,
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

        $pitch->salesCategoryProjects()->sync($this->resolveCategoryProjectIds($validated));

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
            'sales_category_project_ids' => 'nullable|array',
            'sales_category_project_ids.*' => 'integer|exists:sales_category_projects,id',
            'sales_category_project_id' => 'nullable|integer|exists:sales_category_projects,id',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:64',
            'estimated_value' => 'nullable|numeric|min:0',
            'final_deal_value' => [
                'nullable',
                'numeric',
                'min:0',
                Rule::requiredIf((string) $request->input('outcome') === SalesPitch::OUTCOME_WIN),
            ],
            'notes' => 'nullable|string',
            'compro_url' => 'nullable|string|max:2048',
            'proposal_url' => 'nullable|string|max:2048',
            'quotation_url' => 'nullable|string|max:2048',
            'quotation_data' => 'nullable|array',
            'meeting_at' => 'nullable|date',
            'meeting_location' => 'nullable|string|max:500',
            'meeting_mode' => ['nullable', Rule::in(['online', 'offline', 'no'])],
            'lead_started_at' => 'nullable|date',
            'current_step' => ['sometimes', Rule::in(SalesPitch::STEPS_ORDER)],
            'outcome' => ['nullable', Rule::in([SalesPitch::OUTCOME_WIN, SalesPitch::OUTCOME_LOST])],
        ]);

        foreach (['company_name', 'email', 'phone', 'estimated_value', 'final_deal_value', 'notes', 'compro_url', 'proposal_url', 'quotation_url', 'meeting_location', 'meeting_mode'] as $field) {
            if (array_key_exists($field, $validated)) {
                $pitch->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('quotation_data', $validated)) {
            $raw = $validated['quotation_data'];
            if ($raw === null || $raw === []) {
                $pitch->quotation_data = null;
            } else {
                $history = is_array($pitch->quotation_data)
                    ? ($pitch->quotation_data['quotation_history'] ?? null)
                    : null;
                $normalized = $this->quotationService->normalizeQuotationData($raw, $pitch);
                if (is_array($history) && $history !== [] && !array_key_exists('quotation_history', $raw)) {
                    $normalized['quotation_history'] = $history;
                } elseif (array_key_exists('quotation_history', $raw) && is_array($raw['quotation_history'])) {
                    $normalized['quotation_history'] = $raw['quotation_history'];
                }
                $pitch->quotation_data = $normalized;
            }
        }

        if (array_key_exists('meeting_at', $validated)) {
            $raw = $validated['meeting_at'];
            $pitch->meeting_at = ($raw === null || $raw === '')
                ? null
                : Carbon::parse($raw)->startOfDay();
        }
        if (array_key_exists('meeting_mode', $validated) && ($validated['meeting_mode'] ?? null) === 'no') {
            $pitch->meeting_at = null;
            $pitch->meeting_location = null;
        }
        if (array_key_exists('meeting_mode', $validated) && ($validated['meeting_mode'] ?? null) === 'online') {
            $pitch->meeting_location = null;
        }
        if (array_key_exists('title', $validated)) {
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

        foreach (['company_id', 'project_category_id'] as $fk) {
            if (array_key_exists($fk, $validated)) {
                $pitch->{$fk} = $validated[$fk];
            }
        }

        if (array_key_exists('sales_category_project_ids', $validated)
            || array_key_exists('sales_category_project_id', $validated)) {
            $pitch->salesCategoryProjects()->sync($this->resolveCategoryProjectIds($validated));
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
            if ($validated['outcome'] === SalesPitch::OUTCOME_WIN) {
                $companyId = $validated['company_id'] ?? $pitch->company_id;
                $categoryId = $validated['project_category_id'] ?? $pitch->project_category_id;
                if (!$companyId || !$categoryId) {
                    return response()->json([
                        'message' => 'Perusahaan dan kategori company wajib diisi sebelum Sign Off.',
                    ], 422);
                }
            }

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

    public function linkWonPresale(Request $request, string $presaleId)
    {
        $presale = Presale::with(['company:id,name', 'projectCategory:id,name'])->findOrFail($presaleId);

        if ($presale->status !== 'Won' || !$presale->converted_project_id) {
            return response()->json(['message' => 'Hanya opportunity Won yang sudah jadi project yang dapat dihubungkan.'], 422);
        }

        if ($presale->sales_pitch_id) {
            return response()->json(['message' => 'Opportunity ini sudah terhubung ke sales pitch.'], 422);
        }

        $validated = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'project_category_id' => 'required|integer|exists:project_categories,id',
            'sales_category_project_ids' => 'nullable|array',
            'sales_category_project_ids.*' => 'integer|exists:sales_category_projects,id',
            'final_deal_value' => 'required|numeric|min:0',
            'estimated_value' => 'nullable|numeric|min:0',
        ]);

        $companyName = Company::query()->find($validated['company_id'])?->name;
        $title = trim((string) ($presale->project_name ?: $presale->name));
        $now = now();
        $closedAt = $presale->converted_at
            ? Carbon::parse($presale->converted_at)
            : $now;

        $pitch = SalesPitch::create([
            'user_id' => $request->user()->id,
            'company_id' => $validated['company_id'],
            'project_category_id' => $validated['project_category_id'],
            'title' => $title !== '' ? $title : 'Project Win',
            'prospect_name' => $title !== '' ? $title : 'Project Win',
            'company_name' => $companyName,
            'email' => null,
            'phone' => null,
            'estimated_value' => $validated['estimated_value']
                ?? $presale->estimated_budget
                ?? $presale->estimated_value,
            'final_deal_value' => $validated['final_deal_value'],
            'notes' => $presale->project_description ?? $presale->description,
            'current_step' => SalesPitch::STEP_CLOSED,
            'outcome' => SalesPitch::OUTCOME_WIN,
            'lead_started_at' => $presale->created_at?->copy()->startOfDay() ?? $now->copy()->startOfDay(),
            'closed_at' => $closedAt,
            'step_reached_at' => [SalesPitch::STEP_CLOSED => $closedAt->toIso8601String()],
        ]);

        $categoryIds = $validated['sales_category_project_ids'] ?? [];
        if ($categoryIds !== []) {
            $pitch->salesCategoryProjects()->sync($categoryIds);
        }

        $presale->sales_pitch_id = $pitch->id;
        $presale->save();

        return response()->json(['data' => $this->serializePitch($pitch->fresh())]);
    }

    public function previewQuotation(Request $request, string $id)
    {
        $pitch = SalesPitch::with('company:id,name')->findOrFail($id);
        $this->authorizePitch($pitch, $request);

        $validated = $request->validate([
            'quotation_data' => 'nullable|array',
        ]);

        $raw = $validated['quotation_data']
            ?? $pitch->quotation_data
            ?? $this->quotationService->defaultQuotationData($pitch);

        $pdf = $this->quotationService->makePdf($pitch, $raw);
        $fileName = 'Quotation-' . preg_replace('/[^a-zA-Z0-9_-]+/', '-', $pitch->title ?: 'preview') . '.pdf';

        return $pdf->stream($fileName);
    }

    public function generateQuotation(Request $request, string $id)
    {
        $pitch = SalesPitch::with('company:id,name')->findOrFail($id);
        $this->authorizePitch($pitch, $request);

        $validated = $request->validate([
            'quotation_data' => 'required|array',
            'regenerate' => 'nullable|boolean',
        ]);

        $result = $this->quotationService->generateAndStore(
            $pitch,
            $validated['quotation_data'],
            $request->boolean('regenerate')
        );

        $pitch->quotation_data = $result['quotation_data'];
        $pitch->quotation_url = $result['quotation_url'];
        $pitch->save();

        return response()->json([
            'data' => $this->serializePitch($pitch->fresh()),
            'quotation_url' => $result['quotation_url'],
        ]);
    }

    public function defaultQuotation(Request $request, string $id)
    {
        $pitch = SalesPitch::with('company:id,name')->findOrFail($id);
        $this->authorizePitch($pitch, $request);

        return response()->json([
            'data' => $this->quotationService->defaultQuotationData($pitch),
        ]);
    }

    public function uploadQuotationLogo(Request $request, string $id)
    {
        $pitch = SalesPitch::with('company:id,name')->findOrFail($id);
        $this->authorizePitch($pitch, $request);

        $request->validate([
            'logo' => 'required|image|max:4096',
        ]);

        $this->deleteQuotationLogoFile($pitch->quotation_logo_path);
        $path = $request->file('logo')->store('sales-quotation-logos', 'public');
        $pitch->quotation_logo_path = $path;
        $pitch->save();

        return response()->json(['data' => $this->serializePitch($pitch->fresh())]);
    }

    public function removeQuotationLogo(Request $request, string $id)
    {
        $pitch = SalesPitch::findOrFail($id);
        $this->authorizePitch($pitch, $request);

        $this->deleteQuotationLogoFile($pitch->quotation_logo_path);
        $pitch->quotation_logo_path = null;
        $pitch->save();

        return response()->json(['data' => $this->serializePitch($pitch->fresh())]);
    }

    private function deleteQuotationLogoFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function authorizePitch(SalesPitch $pitch, Request $request): void
    {
        if (UserAccess::isPrivileged($request->user())) {
            return;
        }
        if ((int) $pitch->user_id !== (int) $request->user()->id) {
            abort(403, 'Forbidden');
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<int>
     */
    private function resolveCategoryProjectIds(array $validated): array
    {
        if (array_key_exists('sales_category_project_ids', $validated)) {
            return collect($validated['sales_category_project_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values()
                ->all();
        }

        if (!empty($validated['sales_category_project_id'])) {
            return [(int) $validated['sales_category_project_id']];
        }

        return [];
    }

    private function serializePitch(SalesPitch $p): array
    {
        $p->loadMissing([
            'owner:id,name',
            'company:id,name',
            'companyCategory:id,name',
            'salesCategoryProjects:id,name',
        ]);
        $arr = $p->toArray();
        $categoryNames = $p->salesCategoryProjects->pluck('name')->filter()->values()->all();
        $arr['owner_name'] = $p->owner?->name;
        $arr['company_name'] = $p->company?->name ?? $p->company_name;
        $arr['company_category_name'] = $p->companyCategory?->name;
        $arr['sales_category_project_ids'] = $p->salesCategoryProjects->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $arr['category_project_names'] = $categoryNames;
        $arr['category_project_name'] = $categoryNames !== [] ? implode(', ', $categoryNames) : null;
        $start = $p->lead_started_at?->getTimestamp();
        $end = $p->closed_at?->getTimestamp() ?? now()->getTimestamp();
        $arr['duration_seconds_open'] = $start ? max(0, $end - $start) : 0;
        if ($p->outcome && $p->closed_at && $p->lead_started_at) {
            $arr['duration_seconds_closed'] = max(0, $p->closed_at->getTimestamp() - $p->lead_started_at->getTimestamp());
        } else {
            $arr['duration_seconds_closed'] = null;
        }

        $arr['quotation_logo_url'] = PublicStorageUrl::for($p->quotation_logo_path);

        $arr['win_entry_type'] = 'pitch';
        $arr['presale_id'] = $p->presale?->id;
        $arr['project_id'] = $p->presale?->converted_project_id;
        $arr['is_data_complete'] = $this->isPitchWinDataComplete($p);

        return $arr;
    }

    private function serializePresaleWinEntry(Presale $p): array
    {
        $p->loadMissing(['company:id,name', 'projectCategory:id,name']);
        $title = trim((string) ($p->project_name ?: $p->name ?: 'Project'));

        return [
            'id' => null,
            'win_entry_type' => 'presale',
            'presale_id' => $p->id,
            'project_id' => $p->converted_project_id,
            'sales_pitch_id' => null,
            'user_id' => null,
            'title' => $title,
            'prospect_name' => $title,
            'company_id' => $p->company_id,
            'company_name' => $p->company?->name,
            'project_category_id' => $p->project_category_id,
            'company_category_name' => $p->projectCategory?->name,
            'sales_category_project_ids' => [],
            'category_project_names' => [],
            'category_project_name' => null,
            'estimated_value' => $p->estimated_budget ?? $p->estimated_value,
            'final_deal_value' => $p->estimated_budget ?? $p->quotation_value ?? $p->estimated_value,
            'current_step' => SalesPitch::STEP_CLOSED,
            'outcome' => SalesPitch::OUTCOME_WIN,
            'closed_at' => $p->converted_at
                ? Carbon::parse($p->converted_at)->toIso8601String()
                : null,
            'lead_started_at' => $p->created_at?->toIso8601String(),
            'is_data_complete' => false,
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    private function isPitchWinDataComplete(SalesPitch $p): bool
    {
        return (bool) $p->company_id
            && (bool) $p->project_category_id
            && $p->final_deal_value !== null;
    }
}
