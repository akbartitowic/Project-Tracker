<?php

namespace App\Http\Controllers;

use App\Models\FinancialRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FinancialReportController extends Controller
{
    public function projectRealizationSummary(Request $request)
    {
        $projects = DB::table('projects as p')
            ->leftJoin('project_allocations as pa', 'pa.project_id', '=', 'p.id')
            ->select(
                'p.id',
                'p.name',
                'p.methodology',
                'p.quotation_value'
            )
            ->selectRaw("COALESCE(SUM(CASE WHEN pa.is_topup = 1 THEN pa.amount ELSE 0 END), 0) as topup_income")
            ->selectRaw("COALESCE(SUM(CASE WHEN pa.is_topup = 0 THEN pa.amount ELSE 0 END), 0) as planning_expense")
            ->selectRaw("COALESCE(SUM(CASE WHEN pa.is_topup = 0 THEN COALESCE(pa.realized_amount, pa.amount) ELSE 0 END), 0) as final_expense")
            ->groupBy('p.id', 'p.name', 'p.methodology', 'p.quotation_value')
            ->orderBy('p.name')
            ->get()
            ->map(function ($project) {
                $methodology = strtolower((string) ($project->methodology ?? ''));
                $isScrum = str_contains($methodology, 'scrum') || str_contains($methodology, 'agile');

                $rawTopUpIncome = (float) ($project->topup_income ?? 0);
                $topUpIncome = $isScrum ? $rawTopUpIncome : 0.0;

                $planningIncome = (float) ($project->quotation_value ?? 0);
                $initialIncome = max(0, $planningIncome - $topUpIncome);
                $planningExpense = (float) ($project->planning_expense ?? 0);
                $finalExpense = (float) ($project->final_expense ?? 0);

                $remainingMargin = $planningIncome - $finalExpense;
                $marginPercentage = $planningIncome > 0
                    ? round(($remainingMargin / $planningIncome) * 100, 2)
                    : 0;

                return [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'methodology' => $project->methodology,
                    'initial_income' => $initialIncome,
                    'topup_income' => $topUpIncome,
                    'planning_income' => $planningIncome,
                    'planning_expense' => $planningExpense,
                    'final_expense' => $finalExpense,
                    'remaining_margin' => $remainingMargin,
                    'margin_percentage' => $marginPercentage,
                ];
            })
            ->values();

        $totals = [
            'initial_income' => $projects->sum('initial_income'),
            'topup_income' => $projects->sum('topup_income'),
            'planning_income' => $projects->sum('planning_income'),
            'planning_expense' => $projects->sum('planning_expense'),
            'final_expense' => $projects->sum('final_expense'),
            'remaining_margin' => $projects->sum('remaining_margin'),
        ];
        $totals['margin_percentage'] = $totals['planning_income'] > 0
            ? round(($totals['remaining_margin'] / $totals['planning_income']) * 100, 2)
            : 0;

        return response()->json([
            'data' => $projects,
            'totals' => $totals,
        ]);
    }

    public function getSummary(Request $request)
    {
        $startDate = $request->query('start_date', Carbon::now()->startOfYear()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->toDateString());

        // 1. Gross Income (Total quotation value of projects in range)
        $grossIncome = DB::table('projects')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->sum('quotation_value');

        // 2. Project Expenses (Total project allocations in range)
        $projectExpenses = DB::table('project_allocations')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->sum('amount');

        $incomeAfterProjectExpenses = $grossIncome - $projectExpenses;

        // 3. OPEX and CAPEX (Calculated per Year as requested)
        $yearStart = Carbon::parse($startDate)->startOfYear()->toDateString();
        $yearEnd = Carbon::parse($startDate)->endOfYear()->toDateString();

        $opexTotal = FinancialRecord::where('type', 'OPEX')
            ->whereBetween('date', [$yearStart, $yearEnd])
            ->sum('amount');

        $capexTotal = FinancialRecord::where('type', 'CAPEX')
            ->whereBetween('date', [$yearStart, $yearEnd])
            ->sum('amount');

        $netRevenue = $incomeAfterProjectExpenses - ($opexTotal + $capexTotal);

        return response()->json([
            'data' => [
                'gross_income' => $grossIncome,
                'project_expenses' => $projectExpenses,
                'income_after_project_expenses' => $incomeAfterProjectExpenses,
                'opex_total' => $opexTotal,
                'capex_total' => $capexTotal,
                'net_revenue' => $netRevenue,
                'records' => FinancialRecord::whereBetween('date', [$startDate, $endDate])->orderBy('date', 'desc')->get()
            ]
        ]);
    }

    public function storeRecord(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:OPEX,CAPEX',
            'amount' => 'required|numeric',
            'date' => 'required|date',
            'description' => 'required|string',
            'recurring_months' => 'nullable|integer|min:1|max:24'
        ]);

        $recurringMonths = $validated['recurring_months'] ?? 1;
        $startDate = Carbon::parse($validated['date']);

        $records = [];
        for ($i = 0; $i < $recurringMonths; $i++) {
            $recordDate = $startDate->copy()->addMonths($i);
            $records[] = FinancialRecord::create([
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'date' => $recordDate->toDateString(),
                'description' => $validated['description'],
            ]);
        }

        return response()->json([
            'message' => $recurringMonths > 1 ? 'Recurring records created' : 'Financial record created',
            'data' => $records
        ], 201);
    }

    public function destroyRecord($id)
    {
        FinancialRecord::destroy($id);
        return response()->json(['message' => 'Record deleted']);
    }
}
