<?php

namespace App\Http\Controllers;

use App\Models\FinancialRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FinancialReportController extends Controller
{
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
