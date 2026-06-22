<?php

namespace App\Http\Controllers;

use App\Models\FinanceCategory;
use App\Models\ProjectAllocation;
use App\Models\ProjectIntegration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExternalAllocationController extends Controller
{
    private function integration(Request $request): ProjectIntegration
    {
        return $request->attributes->get('integration');
    }

    /**
     * POST /api/external/allocations
     * Create a new allocation for the project linked to the API key.
     */
    public function store(Request $request)
    {
        $integration = $this->integration($request);

        $validated = $request->validate([
            'category'        => 'required|string|max:255',
            'amount'          => 'required|numeric|min:0',
            'description'     => 'nullable|string|max:1000',
            'realized_amount' => 'nullable|numeric|min:0',
            'paid_amount'     => 'nullable|numeric|min:0',
            'paid_at'         => 'nullable|date',
        ]);

        $categoryId = $this->resolveCategoryId($validated['category']);

        $allocation = ProjectAllocation::create([
            'project_id'      => $integration->project_id,
            'category_id'     => $categoryId,
            'amount'          => $validated['amount'],
            'description'     => $validated['description'] ?? null,
            'realized_amount' => $validated['realized_amount'] ?? null,
            'realized_at'     => isset($validated['realized_amount']) ? now() : null,
            'paid_amount'     => $validated['paid_amount'] ?? null,
            'paid_at'         => isset($validated['paid_at']) ? $validated['paid_at'] : (isset($validated['paid_amount']) ? now() : null),
            'is_topup'        => false,
        ]);

        return response()->json([
            'message' => 'Allocation created.',
            'data'    => $this->serialize($allocation),
        ], 201);
    }

    /**
     * PUT /api/external/allocations/{id}
     * Update expense, realization, or paid status.
     * Only allocations belonging to the API key's project can be updated.
     */
    public function update(Request $request, int $id)
    {
        $integration = $this->integration($request);

        $allocation = ProjectAllocation::where('id', $id)
            ->where('project_id', $integration->project_id)
            ->firstOrFail();

        $validated = $request->validate([
            'amount'          => 'sometimes|numeric|min:0',
            'description'     => 'sometimes|nullable|string|max:1000',
            'realized_amount' => 'sometimes|nullable|numeric|min:0',
            'paid_amount'     => 'sometimes|nullable|numeric|min:0',
            'paid_at'         => 'sometimes|nullable|date',
        ]);

        if (array_key_exists('amount', $validated)) {
            $allocation->amount = $validated['amount'];
        }
        if (array_key_exists('description', $validated)) {
            $allocation->description = $validated['description'];
        }
        if (array_key_exists('realized_amount', $validated)) {
            $allocation->realized_amount = $validated['realized_amount'];
            $allocation->realized_at = $allocation->realized_at ?? now();
        }
        if (array_key_exists('paid_amount', $validated)) {
            $allocation->paid_amount = $validated['paid_amount'];
            $allocation->paid_at = $allocation->paid_at ?? now();
        }
        if (array_key_exists('paid_at', $validated)) {
            $allocation->paid_at = $validated['paid_at'];
        }

        $allocation->save();

        return response()->json([
            'message' => 'Allocation updated.',
            'data'    => $this->serialize($allocation),
        ]);
    }

    /**
     * DELETE /api/external/allocations/{id}
     */
    public function destroy(Request $request, int $id)
    {
        $integration = $this->integration($request);

        $allocation = ProjectAllocation::where('id', $id)
            ->where('project_id', $integration->project_id)
            ->firstOrFail();

        $allocation->delete();

        return response()->json(['message' => 'Allocation deleted.']);
    }

    /**
     * GET /api/external/allocations
     * List all allocations for the project linked to the API key.
     */
    public function index(Request $request)
    {
        $integration = $this->integration($request);

        $rows = DB::table('project_allocations as pa')
            ->join('finance_categories as fc', 'pa.category_id', '=', 'fc.id')
            ->where('pa.project_id', $integration->project_id)
            ->select('pa.*', 'fc.name as category_name')
            ->orderByDesc('pa.created_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    private function resolveCategoryId(string $name): int
    {
        $row = FinanceCategory::firstOrCreate(['name' => trim($name)]);
        return $row->id;
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
