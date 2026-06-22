<?php

namespace App\Http\Controllers;

use App\Models\FinanceCategory;
use App\Models\ProjectAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExternalAllocationController extends Controller
{
    private function isGlobal(Request $request): bool
    {
        return (bool) $request->attributes->get('is_global_integration', false);
    }

    private function projectId(Request $request): ?int
    {
        return $request->attributes->get('integration_project_id');
    }

    /**
     * GET /api/external/allocations
     * Project key: returns that project's allocations.
     * Global key: returns all projects (optional ?project_id= filter).
     */
    public function index(Request $request)
    {
        $query = DB::table('project_allocations as pa')
            ->join('finance_categories as fc', 'pa.category_id', '=', 'fc.id')
            ->join('projects as p', 'p.id', '=', 'pa.project_id')
            ->select('pa.*', 'fc.name as category_name', 'p.name as project_name')
            ->orderByDesc('pa.created_at');

        if ($this->isGlobal($request)) {
            if ($request->filled('project_id')) {
                $query->where('pa.project_id', (int) $request->query('project_id'));
            }
        } else {
            $query->where('pa.project_id', $this->projectId($request));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * POST /api/external/allocations
     * Project key: project_id taken from key.
     * Global key: project_id required in body.
     */
    public function store(Request $request)
    {
        $rules = [
            'category'        => 'required|string|max:255',
            'amount'          => 'required|numeric|min:0',
            'description'     => 'nullable|string|max:1000',
            'realized_amount' => 'nullable|numeric|min:0',
            'paid_amount'     => 'nullable|numeric|min:0',
            'paid_at'         => 'nullable|date',
        ];

        if ($this->isGlobal($request)) {
            $rules['project_id'] = 'required|integer|exists:projects,id';
        }

        $validated  = $request->validate($rules);
        $projectId  = $this->isGlobal($request) ? (int) $validated['project_id'] : $this->projectId($request);
        $categoryId = $this->resolveCategoryId($validated['category']);

        $allocation = ProjectAllocation::create([
            'project_id'      => $projectId,
            'category_id'     => $categoryId,
            'amount'          => $validated['amount'],
            'description'     => $validated['description'] ?? null,
            'realized_amount' => $validated['realized_amount'] ?? null,
            'realized_at'     => isset($validated['realized_amount']) ? now() : null,
            'paid_amount'     => $validated['paid_amount'] ?? null,
            'paid_at'         => isset($validated['paid_at'])
                ? $validated['paid_at']
                : (isset($validated['paid_amount']) ? now() : null),
            'is_topup'        => false,
        ]);

        return response()->json(['message' => 'Allocation created.', 'data' => $this->serialize($allocation)], 201);
    }

    /**
     * PUT /api/external/allocations/{id}
     * Project key: allocation must belong to that project.
     * Global key: allocation can be from any project.
     */
    public function update(Request $request, int $id)
    {
        $query = ProjectAllocation::where('id', $id);
        if (!$this->isGlobal($request)) {
            $query->where('project_id', $this->projectId($request));
        }
        $allocation = $query->firstOrFail();

        $validated = $request->validate([
            'amount'          => 'sometimes|numeric|min:0',
            'description'     => 'sometimes|nullable|string|max:1000',
            'realized_amount' => 'sometimes|nullable|numeric|min:0',
            'paid_amount'     => 'sometimes|nullable|numeric|min:0',
            'paid_at'         => 'sometimes|nullable|date',
        ]);

        if (array_key_exists('amount', $validated))          $allocation->amount = $validated['amount'];
        if (array_key_exists('description', $validated))     $allocation->description = $validated['description'];
        if (array_key_exists('realized_amount', $validated)) {
            $allocation->realized_amount = $validated['realized_amount'];
            $allocation->realized_at     = $allocation->realized_at ?? now();
        }
        if (array_key_exists('paid_amount', $validated)) {
            $allocation->paid_amount = $validated['paid_amount'];
            $allocation->paid_at     = $allocation->paid_at ?? now();
        }
        if (array_key_exists('paid_at', $validated)) {
            $allocation->paid_at = $validated['paid_at'];
        }

        $allocation->save();

        return response()->json(['message' => 'Allocation updated.', 'data' => $this->serialize($allocation)]);
    }

    /**
     * DELETE /api/external/allocations/{id}
     */
    public function destroy(Request $request, int $id)
    {
        $query = ProjectAllocation::where('id', $id);
        if (!$this->isGlobal($request)) {
            $query->where('project_id', $this->projectId($request));
        }
        $allocation = $query->firstOrFail();
        $allocation->delete();

        return response()->json(['message' => 'Allocation deleted.']);
    }

    private function resolveCategoryId(string $name): int
    {
        return FinanceCategory::firstOrCreate(['name' => trim($name)])->id;
    }

    private function serialize(ProjectAllocation $a): array
    {
        return [
            'id'              => $a->id,
            'project_id'      => $a->project_id,
            'amount'          => (float) $a->amount,
            'description'     => $a->description,
            'realized_amount' => $a->realized_amount !== null ? (float) $a->realized_amount : null,
            'realized_at'     => $a->realized_at?->toDateString(),
            'paid_amount'     => $a->paid_amount !== null ? (float) $a->paid_amount : null,
            'paid_at'         => $a->paid_at?->toDateString(),
            'created_at'      => $a->created_at?->toIso8601String(),
            'updated_at'      => $a->updated_at?->toIso8601String(),
        ];
    }
}
