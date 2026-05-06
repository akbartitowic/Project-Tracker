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
                // planning_expense = SUM(allocation.amount); final_expense = SUM(COALESCE(realized_amount, amount))
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
        $rangeStart = $startDate . ' 00:00:00';
        $rangeEnd = $endDate . ' 23:59:59';

        /*
         | Gross income: SUM(quotation_value) untuk project yang created_at dalam rentang filter.
         | Ini nilai forecasting (quotation), bukan cash-in aktual.
         */
        $grossIncome = (float) DB::table('projects')
            ->whereBetween('created_at', [$rangeStart, $rangeEnd])
            ->sum('quotation_value');

        /*
         | Pengeluaran project hanya dari alokasi bukan-top-up (top-up mencatat penambahan quotation/MH, bukan biaya).
         | Planning = SUM(amount). Realized = SUM(COALESCE(realized_amount, amount)) — sama seperti Realization Report.
         */
        $allocationRow = DB::table('project_allocations')
            ->whereBetween('created_at', [$rangeStart, $rangeEnd])
            ->where(function ($q) {
                $q->where('is_topup', 0)->orWhereNull('is_topup');
            })
            ->selectRaw('COALESCE(SUM(amount), 0) as planning_total')
            ->selectRaw('COALESCE(SUM(COALESCE(realized_amount, amount)), 0) as realized_total')
            ->first();

        $projectExpensesPlanning = (float) ($allocationRow->planning_total ?? 0);
        $projectExpensesRealized = (float) ($allocationRow->realized_total ?? 0);

        $incomeAfterProjectPlanning = $grossIncome - $projectExpensesPlanning;
        $incomeAfterProjectRealized = $grossIncome - $projectExpensesRealized;

        // OPEX and CAPEX: tahun kalender dari tanggal mulai filter (perilaku lama tetap dipakai).
        $yearStart = Carbon::parse($startDate)->startOfYear()->toDateString();
        $yearEnd = Carbon::parse($startDate)->endOfYear()->toDateString();

        $opexTotal = (float) FinancialRecord::where('type', 'OPEX')
            ->whereBetween('date', [$yearStart, $yearEnd])
            ->sum('amount');

        $capexTotal = (float) FinancialRecord::where('type', 'CAPEX')
            ->whereBetween('date', [$yearStart, $yearEnd])
            ->sum('amount');

        $opexCapex = $opexTotal + $capexTotal;
        $netRevenue = $incomeAfterProjectPlanning - $opexCapex;
        $netRevenueRealized = $incomeAfterProjectRealized - $opexCapex;

        return response()->json([
            'data' => [
                'gross_income' => $grossIncome,
                'project_expenses' => $projectExpensesPlanning,
                'project_expenses_realized' => $projectExpensesRealized,
                'income_after_project_expenses' => $incomeAfterProjectPlanning,
                'income_after_project_expenses_realized' => $incomeAfterProjectRealized,
                'opex_total' => $opexTotal,
                'capex_total' => $capexTotal,
                'net_revenue' => $netRevenue,
                'net_revenue_realized' => $netRevenueRealized,
                'records' => FinancialRecord::whereBetween('date', [$startDate, $endDate])->orderBy('date', 'desc')->get(),
            ],
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
