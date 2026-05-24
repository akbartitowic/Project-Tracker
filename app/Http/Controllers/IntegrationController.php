<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IntegrationController extends Controller
{
    public function projects(Request $request)
    {
        return $this->registry($request);
    }

    public function registry(Request $request)
    {
        $projectFinancials = $this->loadProjectFinancials();
        $presales = $this->loadPresales();
        $pitches = $this->loadSalesPitches();

        $presalesByPitchId = [];
        $presalesByProjectId = [];
        foreach ($presales as $presale) {
            if ($presale['sales_pitch_id']) {
                $presalesByPitchId[(int) $presale['sales_pitch_id']] = $presale;
            }
            if ($presale['project_id']) {
                $presalesByProjectId[(int) $presale['project_id']] = $presale;
            }
        }

        $records = [];
        $seenPresaleIds = [];
        $seenProjectIds = [];

        foreach ($pitches as $pitch) {
            $presale = $presalesByPitchId[(int) $pitch['id']] ?? null;
            if ($presale) {
                $seenPresaleIds[(int) $presale['id']] = true;
            }
            $projectId = $presale['project_id'] ?? null;
            if ($projectId) {
                $seenProjectIds[(int) $projectId] = true;
            }
            $records[] = $this->buildRecord($pitch, $presale, $projectId ? ($projectFinancials[$projectId] ?? null) : null);
        }

        foreach ($presales as $presale) {
            if (isset($seenPresaleIds[(int) $presale['id']])) {
                continue;
            }
            $projectId = $presale['project_id'] ?? null;
            if ($projectId) {
                $seenProjectIds[(int) $projectId] = true;
            }
            $records[] = $this->buildRecord(null, $presale, $projectId ? ($projectFinancials[$projectId] ?? null) : null);
        }

        foreach ($projectFinancials as $projectId => $project) {
            if (isset($seenProjectIds[(int) $projectId])) {
                continue;
            }
            $presale = $presalesByProjectId[(int) $projectId] ?? null;
            $records[] = $this->buildRecord(null, $presale, $project);
        }

        usort($records, function ($a, $b) {
            $stageOrder = ['project' => 0, 'presale' => 1, 'sales' => 2];
            $sa = $stageOrder[$a['stage']] ?? 9;
            $sb = $stageOrder[$b['stage']] ?? 9;
            if ($sa !== $sb) {
                return $sa <=> $sb;
            }

            return strcasecmp($a['display_name'], $b['display_name']);
        });

        $totals = $this->summarizeRegistry($records);

        return response()->json([
            'data' => $records,
            'meta' => [
                'total' => count($records),
                'by_stage' => [
                    'sales' => count(array_filter($records, fn ($r) => $r['stage'] === 'sales')),
                    'presale' => count(array_filter($records, fn ($r) => $r['stage'] === 'presale')),
                    'project' => count(array_filter($records, fn ($r) => $r['stage'] === 'project')),
                ],
                'totals' => $totals,
            ],
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadProjectFinancials(): array
    {
        $rows = DB::table('projects as p')
            ->leftJoin('project_allocations as pa', 'pa.project_id', '=', 'p.id')
            ->select(
                'p.id',
                'p.name',
                'p.status',
                'p.budget_status',
                'p.methodology',
                'p.completion',
                'p.quotation_value',
                'p.start_date',
                'p.end_date',
                'p.created_at',
                'p.updated_at'
            )
            ->selectRaw('COALESCE(SUM(CASE WHEN pa.is_topup = 1 THEN pa.amount ELSE 0 END), 0) as topup_income_raw')
            ->selectRaw('COALESCE(SUM(CASE WHEN pa.is_topup = 0 OR pa.is_topup IS NULL THEN pa.amount ELSE 0 END), 0) as planning_expense')
            ->selectRaw('COALESCE(SUM(CASE WHEN pa.is_topup = 0 OR pa.is_topup IS NULL THEN COALESCE(pa.realized_amount, pa.amount) ELSE 0 END), 0) as realized_expense')
            ->groupBy(
                'p.id',
                'p.name',
                'p.status',
                'p.budget_status',
                'p.methodology',
                'p.completion',
                'p.quotation_value',
                'p.start_date',
                'p.end_date',
                'p.created_at',
                'p.updated_at'
            )
            ->orderBy('p.id')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $methodology = strtolower((string) ($row->methodology ?? ''));
            $isScrum = str_contains($methodology, 'scrum') || str_contains($methodology, 'agile');
            $topupIncome = $isScrum ? (float) $row->topup_income_raw : 0.0;
            $quotation = (float) ($row->quotation_value ?? 0);
            $planningExpense = (float) $row->planning_expense;
            $realizedExpense = (float) $row->realized_expense;
            $margin = $quotation - $realizedExpense;

            $map[(int) $row->id] = [
                'id' => (int) $row->id,
                'name' => (string) $row->name,
                'status' => (string) ($row->status ?? ''),
                'budget_status' => (string) ($row->budget_status ?? ''),
                'methodology' => $row->methodology,
                'completion' => (int) ($row->completion ?? 0),
                'quotation_value' => $quotation,
                'topup_income' => $topupIncome,
                'planning_expense' => $planningExpense,
                'realized_expense' => $realizedExpense,
                'margin' => $margin,
                'margin_percentage' => $quotation > 0 ? round(($margin / $quotation) * 100, 2) : 0.0,
                'start_date' => $row->start_date,
                'end_date' => $row->end_date,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
                'child_counts' => [
                    'allocations' => 0,
                    'tasks' => 0,
                    'members' => 0,
                    'manhours' => 0,
                ],
            ];
        }

        $this->attachProjectChildCounts($map);

        return $map;
    }

    /**
     * @param  array<int, array<string, mixed>>  $projectMap
     */
    private function attachProjectChildCounts(array &$projectMap): void
    {
        $ids = array_keys($projectMap);
        if ($ids === []) {
            return;
        }

        $tables = [
            'allocations' => 'project_allocations',
            'tasks' => 'tasks',
            'members' => 'project_members',
            'manhours' => 'manhours',
        ];

        foreach ($tables as $key => $table) {
            $counts = DB::table($table)
                ->whereIn('project_id', $ids)
                ->select('project_id', DB::raw('COUNT(*) as aggregate'))
                ->groupBy('project_id')
                ->pluck('aggregate', 'project_id');

            foreach ($ids as $projectId) {
                $projectMap[$projectId]['child_counts'][$key] = (int) ($counts[$projectId] ?? 0);
            }
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadPresales(): array
    {
        return DB::table('presales as pr')
            ->leftJoin('companies as c', 'c.id', '=', 'pr.company_id')
            ->select(
                'pr.id',
                'pr.name',
                'pr.project_name',
                'pr.status',
                'pr.sales_pitch_id',
                'pr.company_id',
                'pr.project_category_id',
                'c.name as company_name',
                'pr.estimated_value',
                'pr.quotation_value',
                'pr.estimated_budget',
                'pr.converted_project_id as project_id',
                'pr.converted_at',
                'pr.created_at',
                'pr.updated_at'
            )
            ->orderByDesc('pr.id')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => (string) ($row->project_name ?: $row->name ?: ''),
                'status' => (string) ($row->status ?? ''),
                'sales_pitch_id' => $row->sales_pitch_id ? (int) $row->sales_pitch_id : null,
                'company_id' => $row->company_id ? (int) $row->company_id : null,
                'project_category_id' => $row->project_category_id ? (int) $row->project_category_id : null,
                'company_name' => $row->company_name ? (string) $row->company_name : null,
                'estimated_value' => (float) ($row->estimated_value ?? $row->estimated_budget ?? 0),
                'quotation_value' => (float) ($row->quotation_value ?? 0),
                'project_id' => $row->project_id ? (int) $row->project_id : null,
                'converted_at' => $row->converted_at,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadSalesPitches(): array
    {
        $categoryIdsByPitch = DB::table('sales_pitch_sales_category_project')
            ->select('sales_pitch_id', 'sales_category_project_id')
            ->get()
            ->groupBy('sales_pitch_id')
            ->map(fn ($rows) => $rows->pluck('sales_category_project_id')->map(fn ($id) => (int) $id)->values()->all());

        return DB::table('sales_pitches as sp')
            ->leftJoin('companies as c', 'c.id', '=', 'sp.company_id')
            ->select(
                'sp.id',
                'sp.title',
                'sp.prospect_name',
                'sp.company_id',
                'sp.project_category_id',
                'c.name as company_name',
                'sp.estimated_value',
                'sp.final_deal_value',
                'sp.quotation_data',
                'sp.current_step',
                'sp.outcome',
                'sp.closed_at',
                'sp.lead_started_at',
                'sp.created_at',
                'sp.updated_at'
            )
            ->orderByDesc('sp.id')
            ->get()
            ->map(function ($row) {
                $quotationData = $row->quotation_data ? json_decode($row->quotation_data, true) : null;
                $quotationTotal = null;
                if (is_array($quotationData)) {
                    $quotationTotal = (float) (
                        $quotationData['grand_total']
                        ?? $quotationData['total']
                        ?? $quotationData['quotation_total']
                        ?? 0
                    );
                    if ($quotationTotal <= 0) {
                        $quotationTotal = null;
                    }
                }

                return [
                    'id' => (int) $row->id,
                    'title' => (string) ($row->title ?: $row->prospect_name ?: ''),
                    'prospect_name' => (string) ($row->prospect_name ?? ''),
                    'company_id' => $row->company_id ? (int) $row->company_id : null,
                    'project_category_id' => $row->project_category_id ? (int) $row->project_category_id : null,
                    'sales_category_project_ids' => $categoryIdsByPitch[(int) $row->id] ?? [],
                    'company_name' => $row->company_name ? (string) $row->company_name : null,
                    'estimated_value' => $row->estimated_value !== null ? (float) $row->estimated_value : null,
                    'final_deal_value' => $row->final_deal_value !== null ? (float) $row->final_deal_value : null,
                    'quotation_total' => $quotationTotal,
                    'current_step' => (string) ($row->current_step ?? ''),
                    'outcome' => $row->outcome ? (string) $row->outcome : null,
                    'closed_at' => $row->closed_at,
                    'lead_started_at' => $row->lead_started_at,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ];
            })
            ->all();
    }

    /**
     * @param  array<string, mixed>|null  $pitch
     * @param  array<string, mixed>|null  $presale
     * @param  array<string, mixed>|null  $project
     * @return array<string, mixed>
     */
    private function buildRecord(?array $pitch, ?array $presale, ?array $project): array
    {
        $projectId = $project['id'] ?? ($presale['project_id'] ?? null);
        $presaleId = $presale['id'] ?? null;
        $pitchId = $pitch['id'] ?? ($presale['sales_pitch_id'] ?? null);

        $stage = 'sales';
        if ($projectId) {
            $stage = 'project';
        } elseif ($presaleId) {
            $stage = 'presale';
        }

        $companyId = $pitch['company_id'] ?? $presale['company_id'] ?? null;
        $companyName = $pitch['company_name'] ?? $presale['company_name'] ?? null;
        $displayName = $project['name'] ?? $presale['name'] ?? $pitch['title'] ?? '—';

        $moneyIn = $this->resolveMoneyIn($pitch, $presale, $project);
        $moneyOut = [
            'planning_expense' => $project ? (float) $project['planning_expense'] : 0.0,
            'realized_expense' => $project ? (float) $project['realized_expense'] : 0.0,
        ];
        $effectiveRevenue = (float) $moneyIn['effective'];
        $margin = $effectiveRevenue - $moneyOut['realized_expense'];

        $recordId = $projectId
            ? 'project-' . $projectId
            : ($presaleId ? 'presale-' . $presaleId : 'pitch-' . $pitchId);

        return [
            'record_id' => $recordId,
            'stage' => $stage,
            'display_name' => $displayName,
            'company_id' => $companyId,
            'company_name' => $companyName,
            'ids' => [
                'sales_pitch_id' => $pitchId,
                'presale_id' => $presaleId,
                'project_id' => $projectId,
                'company_id' => $companyId,
            ],
            'sales' => $pitch ? [
                'id' => $pitch['id'],
                'title' => $pitch['title'],
                'current_step' => $pitch['current_step'],
                'outcome' => $pitch['outcome'],
                'estimated_value' => $pitch['estimated_value'],
                'final_deal_value' => $pitch['final_deal_value'],
                'quotation_total' => $pitch['quotation_total'],
                'closed_at' => $pitch['closed_at'],
                'lead_started_at' => $pitch['lead_started_at'],
            ] : null,
            'presale' => $presale ? [
                'id' => $presale['id'],
                'name' => $presale['name'],
                'status' => $presale['status'],
                'estimated_value' => $presale['estimated_value'],
                'quotation_value' => $presale['quotation_value'],
                'converted_at' => $presale['converted_at'],
            ] : null,
            'project' => $project ? [
                'id' => $project['id'],
                'name' => $project['name'],
                'status' => $project['status'],
                'methodology' => $project['methodology'],
                'quotation_value' => $project['quotation_value'],
                'topup_income' => $project['topup_income'],
                'start_date' => $project['start_date'],
                'end_date' => $project['end_date'],
            ] : null,
            'financial' => [
                'money_in' => $moneyIn,
                'money_out' => $moneyOut,
                'margin' => $margin,
                'margin_percentage' => $effectiveRevenue > 0
                    ? round(($margin / $effectiveRevenue) * 100, 2)
                    : 0.0,
            ],
            'relations' => $this->buildRelations($pitch, $presale, $project),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $pitch
     * @param  array<string, mixed>|null  $presale
     * @param  array<string, mixed>|null  $project
     * @return array{pipeline: list<array<string, mixed>>, foreign_keys: list<array<string, mixed>>, child_tables: list<array<string, mixed>>}
     */
    private function buildRelations(?array $pitch, ?array $presale, ?array $project): array
    {
        $companyId = $pitch['company_id'] ?? $presale['company_id'] ?? null;
        $pitchId = $pitch['id'] ?? ($presale['sales_pitch_id'] ?? null);
        $presaleId = $presale['id'] ?? null;
        $projectId = $project['id'] ?? ($presale['project_id'] ?? null);

        $companyLabel = $pitch !== null ? ($pitch['company_name'] ?? null) : null;
        $companyLabel = $companyLabel ?? ($presale !== null ? ($presale['company_name'] ?? null) : null);
        $pitchLabel = $pitch !== null ? ($pitch['title'] ?? null) : null;
        $presaleLabel = $presale !== null ? ($presale['name'] ?? null) : null;
        $projectLabel = $project !== null ? ($project['name'] ?? null) : null;

        $pipeline = [
            $this->pipelineNode('companies', $companyId, $companyLabel),
            $this->pipelineNode('sales_pitches', $pitchId, $pitchLabel),
            $this->pipelineNode('presales', $presaleId, $presaleLabel),
            $this->pipelineNode('projects', $projectId, $projectLabel),
        ];

        $foreignKeys = [];

        if ($pitchId && $pitch) {
            $foreignKeys[] = $this->fkRow(
                'sales_pitches',
                'company_id',
                $pitchId,
                'companies',
                'id',
                $companyId
            );
            if (!empty($pitch['project_category_id'])) {
                $foreignKeys[] = $this->fkRow(
                    'sales_pitches',
                    'project_category_id',
                    $pitchId,
                    'project_categories',
                    'id',
                    $pitch['project_category_id']
                );
            }
            foreach ($pitch['sales_category_project_ids'] ?? [] as $catProjId) {
                $foreignKeys[] = [
                    'type' => 'pivot',
                    'from_table' => 'sales_pitch_sales_category_project',
                    'from_columns' => 'sales_pitch_id → sales_category_project_id',
                    'from_id' => $pitchId,
                    'to_table' => 'sales_category_projects',
                    'to_column' => 'id',
                    'to_id' => $catProjId,
                    'linked' => true,
                ];
            }
        }

        if ($presaleId) {
            $foreignKeys[] = $this->fkRow(
                'presales',
                'company_id',
                $presaleId,
                'companies',
                'id',
                $companyId
            );
            $foreignKeys[] = $this->fkRow(
                'presales',
                'sales_pitch_id',
                $presaleId,
                'sales_pitches',
                'id',
                $pitchId
            );
            if (!empty($presale['project_category_id'])) {
                $foreignKeys[] = $this->fkRow(
                    'presales',
                    'project_category_id',
                    $presaleId,
                    'project_categories',
                    'id',
                    $presale['project_category_id']
                );
            }
            $foreignKeys[] = $this->fkRow(
                'presales',
                'converted_project_id',
                $presaleId,
                'projects',
                'id',
                $projectId
            );
        } elseif ($projectId) {
            $foreignKeys[] = [
                'type' => 'fk',
                'from_table' => 'presales',
                'from_column' => 'converted_project_id',
                'from_id' => null,
                'to_table' => 'projects',
                'to_column' => 'id',
                'to_id' => $projectId,
                'linked' => false,
                'note' => 'Tidak ada presale yang mengarah ke project ini',
            ];
        }

        $childTables = [];
        if ($projectId) {
            $counts = $project['child_counts'] ?? [];
            $childTables = [
                ['table' => 'project_allocations', 'fk_column' => 'project_id', 'fk_value' => $projectId, 'count' => (int) ($counts['allocations'] ?? 0)],
                ['table' => 'tasks', 'fk_column' => 'project_id', 'fk_value' => $projectId, 'count' => (int) ($counts['tasks'] ?? 0)],
                ['table' => 'project_members', 'fk_column' => 'project_id', 'fk_value' => $projectId, 'count' => (int) ($counts['members'] ?? 0)],
                ['table' => 'manhours', 'fk_column' => 'project_id', 'fk_value' => $projectId, 'count' => (int) ($counts['manhours'] ?? 0)],
            ];
        }

        return [
            'pipeline' => $pipeline,
            'foreign_keys' => $foreignKeys,
            'child_tables' => $childTables,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function pipelineNode(string $table, mixed $id, ?string $label): array
    {
        return [
            'table' => $table,
            'id' => $id !== null ? (int) $id : null,
            'label' => $label,
            'linked' => $id !== null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fkRow(
        string $fromTable,
        string $fromColumn,
        mixed $fromId,
        string $toTable,
        string $toColumn,
        mixed $toId
    ): array {
        return [
            'type' => 'fk',
            'from_table' => $fromTable,
            'from_column' => $fromColumn,
            'from_id' => $fromId !== null ? (int) $fromId : null,
            'to_table' => $toTable,
            'to_column' => $toColumn,
            'to_id' => $toId !== null ? (int) $toId : null,
            'linked' => $toId !== null,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $pitch
     * @param  array<string, mixed>|null  $presale
     * @param  array<string, mixed>|null  $project
     * @return array<string, float|null>
     */
    private function resolveMoneyIn(?array $pitch, ?array $presale, ?array $project): array
    {
        $salesEstimated = $pitch['estimated_value'] ?? null;
        $salesFinalDeal = $pitch['final_deal_value'] ?? null;
        $salesQuotation = $pitch['quotation_total'] ?? null;
        $presaleQuotation = $presale ? (($presale['quotation_value'] ?? 0) > 0 ? (float) $presale['quotation_value'] : null) : null;
        $presaleEstimated = $presale ? (($presale['estimated_value'] ?? 0) > 0 ? (float) $presale['estimated_value'] : null) : null;
        $projectQuotation = $project ? (float) $project['quotation_value'] : null;
        $topupIncome = $project ? (float) $project['topup_income'] : 0.0;

        $effective = 0.0;
        if ($projectQuotation !== null && $projectQuotation > 0) {
            $effective = $projectQuotation;
        } elseif ($presaleQuotation !== null && $presaleQuotation > 0) {
            $effective = $presaleQuotation;
        } elseif ($salesFinalDeal !== null && $salesFinalDeal > 0) {
            $effective = $salesFinalDeal;
        } elseif ($salesQuotation !== null && $salesQuotation > 0) {
            $effective = $salesQuotation;
        } elseif ($presaleEstimated !== null && $presaleEstimated > 0) {
            $effective = $presaleEstimated;
        } elseif ($salesEstimated !== null && $salesEstimated > 0) {
            $effective = $salesEstimated;
        }

        return [
            'sales_estimated' => $salesEstimated,
            'sales_final_deal' => $salesFinalDeal,
            'sales_quotation' => $salesQuotation,
            'presale_estimated' => $presaleEstimated,
            'presale_quotation' => $presaleQuotation,
            'project_quotation' => $projectQuotation,
            'topup_income' => $topupIncome > 0 ? $topupIncome : null,
            'effective' => $effective,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $records
     * @return array<string, float|int>
     */
    private function summarizeRegistry(array $records): array
    {
        $effectiveIn = 0.0;
        $planningOut = 0.0;
        $realizedOut = 0.0;

        foreach ($records as $record) {
            $effectiveIn += (float) ($record['financial']['money_in']['effective'] ?? 0);
            $planningOut += (float) ($record['financial']['money_out']['planning_expense'] ?? 0);
            $realizedOut += (float) ($record['financial']['money_out']['realized_expense'] ?? 0);
        }

        $margin = $effectiveIn - $realizedOut;

        return [
            'money_in_effective' => $effectiveIn,
            'money_out_planning' => $planningOut,
            'money_out_realized' => $realizedOut,
            'margin' => $margin,
            'margin_percentage' => $effectiveIn > 0 ? round(($margin / $effectiveIn) * 100, 2) : 0.0,
        ];
    }
}
