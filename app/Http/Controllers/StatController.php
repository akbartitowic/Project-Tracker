<?php

namespace App\Http\Controllers;

use App\Support\ManhourBucketCalculator;
use App\Support\ProjectAccess;
use App\Support\PublicStorageUrl;
use App\Support\UserAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StatController extends Controller
{
    private function normalizeTaskStatus(?string $status): string
    {
        $value = trim((string) $status);
        return match (strtolower($value)) {
            're-open', 'reopen' => 'Reopen',
            'in progress' => 'In Progress',
            'to do', 'todo' => 'To Do',
            'review' => 'Review',
            'done' => 'Done',
            default => $value !== '' ? $value : 'To Do',
        };
    }

    private function getMemberDashboardData($user): array
    {
        $assignedProjectIds = DB::table('project_members')
            ->where('user_id', $user->id)
            ->pluck('project_id')
            ->unique()
            ->values();

        $statusCounts = [
            'To Do' => 0,
            'In Progress' => 0,
            'Review' => 0,
            'Reopen' => 0,
            'Done' => 0,
        ];

        if ($assignedProjectIds->isNotEmpty()) {
            $tasks = DB::table('tasks')
                ->select('status')
                ->whereIn('project_id', $assignedProjectIds)
                ->get();

            foreach ($tasks as $task) {
                $normalized = $this->normalizeTaskStatus($task->status ?? null);
                if (!array_key_exists($normalized, $statusCounts)) {
                    $statusCounts[$normalized] = 0;
                }
                $statusCounts[$normalized]++;
            }
        }

        $activeTasks = collect($statusCounts)
            ->reject(fn ($count, $status) => $status === 'Done')
            ->sum();

        return [
            'totalProjectsHandled' => $assignedProjectIds->count(),
            'activeTasks' => $activeTasks,
            'taskStatusCounts' => $statusCounts,
        ];
    }

    public function stats(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getStatsData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $projectIds  null = all projects; [] = none
     */
    private function getStatsData(?array $projectIds = null): array
    {
        if ($projectIds !== null && $projectIds === []) {
            return $this->emptyStatsPayload();
        }

        $projectFilter = $this->sqlProjectIdFilter($projectIds, 'projects');
        $projectFilterAlias = $this->sqlProjectIdFilter($projectIds, 'p');
        $taskFilter = $this->sqlProjectIdFilter($projectIds, 'tasks', 'project_id');
        $manhourFilter = $this->sqlProjectIdFilter($projectIds, 'manhours', 'project_id');
        $allocationFilter = $this->sqlProjectIdFilter($projectIds, 'project_allocations', 'project_id');

        $stats = DB::selectOne("
            SELECT 
                (SELECT COUNT(*) FROM projects WHERE 1=1{$projectFilter}) as totalProjects,
                (SELECT COUNT(*) FROM projects p
                    WHERE 1=1{$projectFilterAlias}
                    AND COALESCE(p.status, '') != 'Done'
                ) as activeProjects,
                (SELECT COUNT(*) FROM projects p
                    WHERE 1=1{$projectFilterAlias}
                    AND p.status = 'Done'
                ) as doneProjects,
                (SELECT COUNT(*) FROM projects WHERE lower(coalesce(methodology, '')) LIKE '%waterfall%'{$projectFilter}) as waterfallProjects,
                (SELECT COUNT(*) FROM projects WHERE lower(coalesce(methodology, '')) LIKE '%scrum%' OR lower(coalesce(methodology, '')) LIKE '%agile%'{$projectFilter}) as scrumProjects,
                (SELECT COUNT(*) FROM tasks WHERE status != 'Done'{$taskFilter}) as activeTasks,
                (SELECT COALESCE(SUM(hours), 0) FROM manhours WHERE 1=1{$manhourFilter}) as totalHours,
                (SELECT COALESCE(SUM(quotation_value), 0) FROM projects WHERE 1=1{$projectFilter}) as totalRevenue,
                (SELECT COALESCE(SUM(amount), 0) FROM project_allocations WHERE is_topup = 0{$allocationFilter}) as totalAllocated,
                (SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE type = 'OPEX') as opexTotal,
                (SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE type = 'CAPEX') as capexTotal
        ");

        $totalRevenue = $stats->totalRevenue ?: 0;
        $totalAllocated = $stats->totalAllocated ?: 0;
        $includeCompanyFinancials = $projectIds === null;
        $opexTotal = $includeCompanyFinancials ? ($stats->opexTotal ?: 0) : 0;
        $capexTotal = $includeCompanyFinancials ? ($stats->capexTotal ?: 0) : 0;

        $totalMargin = $totalRevenue - $totalAllocated - $opexTotal - $capexTotal;
        $marginPercentage = $totalRevenue > 0 ? ($totalMargin / $totalRevenue) * 100 : 0;

        $taskStatusCounts = [
            'To Do' => 0,
            'In Progress' => 0,
            'Review' => 0,
            'Reopen' => 0,
            'Done' => 0,
        ];
        $statusQuery = DB::table('tasks')
            ->select('status', DB::raw('COUNT(*) as total'));
        if ($projectIds !== null) {
            $statusQuery->whereIn('project_id', $projectIds);
        }
        $statusRows = $statusQuery->groupBy('status')->get();
        foreach ($statusRows as $row) {
            $normalized = $this->normalizeTaskStatus($row->status ?? null);
            if (!array_key_exists($normalized, $taskStatusCounts)) {
                $taskStatusCounts[$normalized] = 0;
            }
            $taskStatusCounts[$normalized] += (int) ($row->total ?? 0);
        }

        return [
            'totalProjects' => $stats->totalProjects,
            'activeProjects' => $stats->activeProjects ?: 0,
            'doneProjects' => $stats->doneProjects ?: 0,
            'scrumProjects' => $stats->scrumProjects ?: 0,
            'waterfallProjects' => $stats->waterfallProjects ?: 0,
            'activeTasks' => $stats->activeTasks,
            'totalHours' => $stats->totalHours ?: 0,
            'totalRevenue' => $totalRevenue,
            'totalAllocated' => $totalAllocated,
            'totalMargin' => $totalMargin,
            'marginPercentage' => $marginPercentage,
            'taskStatusCounts' => $taskStatusCounts,
        ];
    }

    public function recentLogs(Request $request)
    {
        $user = $request->user();
        if (!UserAccess::canViewManhours($user)) {
            return response()->json(['data' => []]);
        }

        $projectIds = ProjectAccess::metricsProjectIds($user);

        return response()->json(['data' => $this->getRecentLogsData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $projectIds
     */
    private function getRecentLogsData(?array $projectIds = null)
    {
        if ($projectIds !== null && $projectIds === []) {
            return collect();
        }

        $query = DB::table('manhours as m')
            ->join('users as u', 'm.user_id', '=', 'u.id')
            ->join('projects as p', 'm.project_id', '=', 'p.id')
            ->leftJoin('project_roles as pr', 'm.project_role_id', '=', 'pr.id')
            ->select(
                'm.id', 
                'm.hours', 
                'm.description', 
                'm.date',
                'u.name as user_name',
                'p.name as project_name',
                'pr.name as role_name'
            )
            ->orderBy('m.created_at', 'desc')
            ->limit(10);

        if ($projectIds !== null) {
            $query->whereIn('m.project_id', $projectIds);
        }

        return $query->get();
    }

    public function efficiency(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getEfficiencyData($projectIds)]);
    }

    /**
     * @param  null|array<int>  $projectIds
     */
    private function getEfficiencyData(?array $projectIds = null)
    {
        if ($projectIds !== null && $projectIds === []) {
            return collect();
        }

        $projectsQuery = DB::table('projects')
            ->select('id', 'name', 'methodology', 'total_manhours as estimated_hours');

        if ($projectIds !== null) {
            $projectsQuery->whereIn('id', $projectIds);
        }

        $projects = $projectsQuery->get();

        $taskSumsQuery = DB::table('tasks')
            ->select('project_id', DB::raw('SUM(estimated_hours) as allocated'));
        if ($projectIds !== null) {
            $taskSumsQuery->whereIn('project_id', $projectIds);
        }
        $taskSums = $taskSumsQuery->groupBy('project_id')->pluck('allocated', 'project_id');

        $manhourSumsQuery = DB::table('manhours')
            ->select('project_id', DB::raw('SUM(hours) as actual'));
        if ($projectIds !== null) {
            $manhourSumsQuery->whereIn('project_id', $projectIds);
        }
        $manhourSums = $manhourSumsQuery->groupBy('project_id')->pluck('actual', 'project_id');

        $topupsQuery = DB::table('project_allocations')
            ->select('id', 'project_id', 'topup_hours', 'description', 'created_at')
            ->where('is_topup', true)
            ->whereNotNull('topup_hours')
            ->where('topup_hours', '>', 0)
            ->orderBy('created_at')
            ->orderBy('id');
        if ($projectIds !== null) {
            $topupsQuery->whereIn('project_id', $projectIds);
        }
        $topupsByProject = $topupsQuery->get()->groupBy('project_id');

        $projectIdsList = $projects->pluck('id')->map(fn ($id) => (int) $id)->all();
        $companyByProject = [];
        if ($projectIdsList !== []) {
            $presaleCompanies = DB::table('presales as pr')
                ->join('companies as c', 'c.id', '=', 'pr.company_id')
                ->whereIn('pr.converted_project_id', $projectIdsList)
                ->whereNotNull('pr.converted_project_id')
                ->select(
                    'pr.converted_project_id as project_id',
                    'c.id as company_id',
                    'c.name as company_name',
                    'pr.id as presale_id'
                )
                ->orderByDesc('pr.id')
                ->get();

            foreach ($presaleCompanies as $row) {
                $pid = (int) $row->project_id;
                if (!isset($companyByProject[$pid])) {
                    $companyByProject[$pid] = $row;
                }
            }
        }

        return $projects->map(function ($p) use ($taskSums, $manhourSums, $topupsByProject, $companyByProject) {
            $p->allocated_hours = (float) ($taskSums[$p->id] ?? 0);
            $p->actual_hours = (float) ($manhourSums[$p->id] ?? 0);
            $totalManhours = (float) ($p->estimated_hours ?? 0);
            $p->burn_percentage = $totalManhours > 0 ? ($p->allocated_hours * 100.0 / $totalManhours) : 0;

            $bucketData = ManhourBucketCalculator::build(
                $totalManhours,
                $topupsByProject->get($p->id, collect()),
                $p->allocated_hours,
            );

            $p->base_quota_hours = $bucketData['base_quota_hours'];
            $p->topup_total_hours = $bucketData['topup_total_hours'];
            $p->has_topup = $bucketData['has_topup'];
            $p->mh_overflow_hours = $bucketData['overflow_hours'];
            $p->manhour_buckets = $bucketData['buckets'];

            $company = $companyByProject[(int) $p->id] ?? null;
            $p->company_id = $company ? (int) $company->company_id : null;
            $p->company_name = $company ? (string) $company->company_name : null;

            return $p;
        })->sortByDesc('burn_percentage')->values();
    }

    public function revenueTrend(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getRevenueTrendData($projectIds)]);
    }

    public function companyProjects(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json(['data' => $this->getCompanyProjectsData($projectIds)]);
    }

    public function companyFinancials(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());

        return response()->json($this->getCompanyFinancialsData($projectIds));
    }

    public function expensePaymentBreakdown(Request $request)
    {
        $projectIds = ProjectAccess::metricsProjectIds($request->user());
        $dateRange = $this->resolveExpenseReportDateRange($request);

        return response()->json($this->getExpensePaymentBreakdownData($projectIds, $dateRange));
    }

    /**
     * @return array{mode: string, start_date: string, end_date: string, label: string}
     */
    private function resolveExpenseReportDateRange(Request $request): array
    {
        $today = Carbon::today();
        $mode = (string) $request->query('filter_mode', 'ytd');

        if ($mode === 'month') {
            $month = (string) $request->query('month', $today->format('Y-m'));
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            if ($end->gt($today)) {
                $end = $today->copy();
            }
        } elseif ($mode === 'custom') {
            $start = Carbon::parse((string) $request->query('start_date', $today->copy()->startOfYear()->toDateString()));
            $end = Carbon::parse((string) $request->query('end_date', $today->toDateString()));
            if ($start->gt($end)) {
                [$start, $end] = [$end, $start];
            }
            if ($end->gt($today)) {
                $end = $today->copy();
            }
        } else {
            $mode = 'ytd';
            $start = Carbon::create($today->year, 1, 1)->startOfDay();
            $end = $today->copy();
        }

        $label = match ($mode) {
            'month' => $start->format('F Y'),
            'custom' => $start->format('d M Y') . ' – ' . $end->format('d M Y'),
            default => '1 Jan ' . $start->year . ' – ' . $end->format('d M Y'),
        };

        return [
            'mode' => $mode,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'label' => $label,
        ];
    }

    /**
     * @return array{line_count: int, total_amount: float, paid_amount: float, unpaid_amount: float, paid_count: int, unpaid_count: int}
     */
    private function emptyExpenseTotals(): array
    {
        return [
            'line_count' => 0,
            'total_amount' => 0.0,
            'paid_amount' => 0.0,
            'unpaid_amount' => 0.0,
            'paid_count' => 0,
            'unpaid_count' => 0,
        ];
    }

    /**
     * @return array{target: float, paid: float, unpaid: float, is_fully_paid: bool}
     */
    private function allocationLineMetrics(object $row): array
    {
        $target = (float) ($row->realized_amount ?? $row->amount ?? 0);
        if ($target <= 0) {
            return ['target' => 0.0, 'paid' => 0.0, 'unpaid' => 0.0, 'is_fully_paid' => false];
        }

        $paid = min((float) ($row->paid_amount ?? 0), $target);
        $unpaid = max(0, $target - $paid);

        return [
            'target' => $target,
            'paid' => $paid,
            'unpaid' => $unpaid,
            'is_fully_paid' => $paid >= $target,
        ];
    }

    /**
     * @param  iterable<object>  $lines
     * @return array{line_count: int, total_amount: float, paid_amount: float, unpaid_amount: float, paid_count: int, unpaid_count: int}
     */
    private function sumExpenseMetricsFromLines(iterable $lines): array
    {
        $totals = $this->emptyExpenseTotals();

        foreach ($lines as $line) {
            $metrics = $this->allocationLineMetrics($line);
            $totals['line_count']++;
            $totals['total_amount'] += $metrics['target'];
            $totals['paid_amount'] += $metrics['paid'];
            $totals['unpaid_amount'] += $metrics['unpaid'];
            if ($metrics['is_fully_paid']) {
                $totals['paid_count']++;
            } else {
                $totals['unpaid_count']++;
            }
        }

        return $totals;
    }

    /**
     * @param  iterable<object>  $lines
     * @return array<int, array<string, mixed>>
     */
    private function buildExpenseProjectsBreakdown(iterable $lines): array
    {
        return collect($lines)
            ->groupBy('project_id')
            ->map(function ($projectLines, $projectId) {
                $first = $projectLines->first();
                $metrics = $this->sumExpenseMetricsFromLines($projectLines);

                return array_merge([
                    'project_id' => (int) $projectId,
                    'project_name' => (string) ($first->project_name ?? 'Project'),
                ], $metrics);
            })
            ->sortByDesc('total_amount')
            ->values()
            ->all();
    }

    /**
     * @param  null|array<int>  $scopedProjectIds
     * @param  array{mode: string, start_date: string, end_date: string, label: string}  $dateRange
     */
    private function getExpensePaymentBreakdownData(?array $scopedProjectIds, array $dateRange): array
    {
        $emptyTotals = $this->emptyExpenseTotals();

        if ($scopedProjectIds !== null && $scopedProjectIds === []) {
            return [
                'filters' => $dateRange,
                'by_user' => [],
                'by_category' => [],
                'totals' => $emptyTotals,
            ];
        }

        $linesQuery = DB::table('project_allocations as pa')
            ->join('projects as p', 'p.id', '=', 'pa.project_id')
            ->join('finance_categories as fc', 'fc.id', '=', 'pa.category_id')
            ->leftJoin('users as u', 'u.id', '=', 'pa.user_id')
            ->where(function ($q) {
                $q->where('pa.is_topup', false)->orWhereNull('pa.is_topup');
            })
            ->whereDate('pa.created_at', '>=', $dateRange['start_date'])
            ->whereDate('pa.created_at', '<=', $dateRange['end_date'])
            ->select(
                'pa.id',
                'pa.project_id',
                'pa.user_id',
                'pa.category_id',
                'pa.amount',
                'pa.realized_amount',
                'pa.paid_amount',
                'p.name as project_name',
                'u.name as user_name',
                'fc.name as category_name'
            );

        if ($scopedProjectIds !== null) {
            $linesQuery->whereIn('pa.project_id', $scopedProjectIds);
        }

        $lines = $linesQuery->get();
        $totals = $this->sumExpenseMetricsFromLines($lines);

        $byUser = $lines
            ->filter(fn ($line) => $line->user_id !== null)
            ->groupBy('user_id')
            ->map(function ($userLines, $userId) {
                $first = $userLines->first();
                $metrics = $this->sumExpenseMetricsFromLines($userLines);

                return array_merge([
                    'user_id' => (int) $userId,
                    'user_name' => (string) ($first->user_name ?? 'User'),
                    'projects' => $this->buildExpenseProjectsBreakdown($userLines),
                ], $metrics);
            })
            ->sortByDesc('total_amount')
            ->values()
            ->all();

        $linesByCategory = $lines->groupBy('category_id');

        $byCategory = DB::table('finance_categories')
            ->orderBy('name')
            ->get()
            ->map(function ($cat) use ($linesByCategory) {
                $categoryLines = $linesByCategory->get((int) $cat->id, collect());
                $metrics = $this->sumExpenseMetricsFromLines($categoryLines);

                return array_merge([
                    'category_id' => (int) $cat->id,
                    'category_name' => (string) $cat->name,
                    'projects' => $this->buildExpenseProjectsBreakdown($categoryLines),
                ], $metrics);
            })
            ->sortByDesc('total_amount')
            ->values()
            ->all();

        return [
            'filters' => $dateRange,
            'by_user' => $byUser,
            'by_category' => $byCategory,
            'totals' => $totals,
        ];
    }

    /**
     * @param  array<int>  $projectIdsList
     * @return array<int, object>
     */
    private function loadCompanyByProjectMap(array $projectIdsList): array
    {
        $companyByProject = [];
        if ($projectIdsList === []) {
            return $companyByProject;
        }

        $presaleCompanies = DB::table('presales as pr')
            ->join('companies as c', 'c.id', '=', 'pr.company_id')
            ->whereIn('pr.converted_project_id', $projectIdsList)
            ->whereNotNull('pr.converted_project_id')
            ->select(
                'pr.converted_project_id as project_id',
                'c.id as company_id',
                'c.name as company_name',
                'c.logo_path',
                'pr.id as presale_id'
            )
            ->orderByDesc('pr.id')
            ->get();

        foreach ($presaleCompanies as $row) {
            $pid = (int) $row->project_id;
            if (!isset($companyByProject[$pid])) {
                $companyByProject[$pid] = $row;
            }
        }

        return $companyByProject;
    }

    /**
     * @param  null|array<int>  $scopedProjectIds
     * @return array{data: array<int, array<string, mixed>>, totals: array<string, float|int>}
     */
    private function getCompanyFinancialsData(?array $scopedProjectIds = null): array
    {
        $emptyTotals = [
            'revenue' => 0.0,
            'planning_expense' => 0.0,
            'realized_expense' => 0.0,
            'margin' => 0.0,
            'margin_percentage' => 0.0,
            'project_count' => 0,
            'company_count' => 0,
        ];

        if ($scopedProjectIds !== null && $scopedProjectIds === []) {
            return ['data' => [], 'totals' => $emptyTotals];
        }

        $query = DB::table('projects as p')
            ->leftJoin('project_allocations as pa', 'pa.project_id', '=', 'p.id');

        if ($scopedProjectIds !== null) {
            $query->whereIn('p.id', $scopedProjectIds);
        }

        $projects = $query
            ->select(
                'p.id',
                'p.name',
                'p.status',
                'p.methodology',
                'p.quotation_value'
            )
            ->selectRaw('COALESCE(SUM(CASE WHEN pa.is_topup = 1 THEN pa.amount ELSE 0 END), 0) as topup_income_raw')
            ->selectRaw('COALESCE(SUM(CASE WHEN pa.is_topup = 0 OR pa.is_topup IS NULL THEN pa.amount ELSE 0 END), 0) as planning_expense')
            ->selectRaw('COALESCE(SUM(CASE WHEN pa.is_topup = 0 OR pa.is_topup IS NULL THEN COALESCE(pa.realized_amount, pa.amount) ELSE 0 END), 0) as realized_expense')
            ->groupBy('p.id', 'p.name', 'p.status', 'p.methodology', 'p.quotation_value')
            ->orderBy('p.name')
            ->get();

        if ($projects->isEmpty()) {
            return ['data' => [], 'totals' => $emptyTotals];
        }

        $projectIdsList = $projects->pluck('id')->map(fn ($id) => (int) $id)->all();
        $companyByProject = $this->loadCompanyByProjectMap($projectIdsList);

        $byCompany = [];
        foreach ($projects as $project) {
            $methodology = strtolower((string) ($project->methodology ?? ''));
            $isScrum = str_contains($methodology, 'scrum') || str_contains($methodology, 'agile');
            $topupIncome = $isScrum ? (float) ($project->topup_income_raw ?? 0) : 0.0;
            $revenue = (float) ($project->quotation_value ?? 0);
            $planningExpense = (float) ($project->planning_expense ?? 0);
            $realizedExpense = (float) ($project->realized_expense ?? 0);
            $margin = $revenue - $realizedExpense;
            $marginPct = $revenue > 0 ? round(($margin / $revenue) * 100, 2) : 0.0;

            $projectRow = [
                'project_id' => (int) $project->id,
                'project_name' => (string) $project->name,
                'status' => (string) ($project->status ?? 'Planning'),
                'methodology' => $project->methodology,
                'revenue' => $revenue,
                'topup_income' => $topupIncome,
                'initial_income' => max(0, $revenue - $topupIncome),
                'planning_expense' => $planningExpense,
                'realized_expense' => $realizedExpense,
                'margin' => $margin,
                'margin_percentage' => $marginPct,
            ];

            $company = $companyByProject[(int) $project->id] ?? null;
            $companyKey = $company ? (string) $company->company_id : '__none__';

            if (!isset($byCompany[$companyKey])) {
                $byCompany[$companyKey] = [
                    'company_id' => $company ? (int) $company->company_id : null,
                    'company_name' => $company ? (string) $company->company_name : 'Tanpa perusahaan',
                    'logo_url' => $company ? PublicStorageUrl::for($company->logo_path) : null,
                    'revenue' => 0.0,
                    'planning_expense' => 0.0,
                    'realized_expense' => 0.0,
                    'margin' => 0.0,
                    'margin_percentage' => 0.0,
                    'project_count' => 0,
                    'projects' => [],
                ];
            }

            $byCompany[$companyKey]['projects'][] = $projectRow;
            $byCompany[$companyKey]['revenue'] += $revenue;
            $byCompany[$companyKey]['planning_expense'] += $planningExpense;
            $byCompany[$companyKey]['realized_expense'] += $realizedExpense;
            $byCompany[$companyKey]['margin'] += $margin;
            $byCompany[$companyKey]['project_count']++;
        }

        $companies = array_values($byCompany);
        foreach ($companies as &$company) {
            $company['margin_percentage'] = $company['revenue'] > 0
                ? round(($company['margin'] / $company['revenue']) * 100, 2)
                : 0.0;
            usort(
                $company['projects'],
                fn ($a, $b) => $b['revenue'] <=> $a['revenue']
                    ?: strcasecmp($a['project_name'], $b['project_name'])
            );
        }
        unset($company);

        usort(
            $companies,
            fn ($a, $b) => $b['revenue'] <=> $a['revenue']
                ?: strcasecmp($a['company_name'], $b['company_name'])
        );

        $totals = [
            'revenue' => (float) array_sum(array_column($companies, 'revenue')),
            'planning_expense' => (float) array_sum(array_column($companies, 'planning_expense')),
            'realized_expense' => (float) array_sum(array_column($companies, 'realized_expense')),
            'margin' => (float) array_sum(array_column($companies, 'margin')),
            'margin_percentage' => 0.0,
            'project_count' => (int) array_sum(array_column($companies, 'project_count')),
            'company_count' => count($companies),
        ];
        $totals['margin_percentage'] = $totals['revenue'] > 0
            ? round(($totals['margin'] / $totals['revenue']) * 100, 2)
            : 0.0;

        return ['data' => $companies, 'totals' => $totals];
    }

    /**
     * @param  null|array<int>  $scopedProjectIds
     */
    private function getCompanyProjectsData(?array $scopedProjectIds = null): array
    {
        if ($scopedProjectIds !== null && $scopedProjectIds === []) {
            return [];
        }

        $pairsQuery = DB::table('presales as pr')
            ->join('companies as c', 'c.id', '=', 'pr.company_id')
            ->whereNotNull('pr.converted_project_id');

        if ($scopedProjectIds !== null) {
            $pairsQuery->whereIn('pr.converted_project_id', $scopedProjectIds);
        }

        $pairs = $pairsQuery
            ->select(
                'c.id as company_id',
                'c.name as company_name',
                'c.logo_path',
                'pr.converted_project_id as project_id'
            )
            ->distinct()
            ->get();

        if ($pairs->isEmpty()) {
            return [];
        }

        $projectIds = $pairs->pluck('project_id')->unique()->map(fn ($id) => (int) $id)->values();

        $doneProjectIds = DB::table('projects as p')
            ->whereIn('p.id', $projectIds)
            ->where('p.status', 'Done')
            ->pluck('p.id')
            ->flip()
            ->all();

        $byCompany = [];
        foreach ($pairs as $row) {
            $companyId = (int) $row->company_id;
            $projectId = (int) $row->project_id;

            if (!isset($byCompany[$companyId])) {
                $byCompany[$companyId] = [
                    'company_id' => $companyId,
                    'company_name' => $row->company_name,
                    'logo_path' => $row->logo_path,
                    'project_ids' => [],
                ];
            }
            $byCompany[$companyId]['project_ids'][$projectId] = true;
        }

        $result = [];
        foreach ($byCompany as $company) {
            $projectIds = array_keys($company['project_ids']);
            $total = count($projectIds);
            $done = 0;
            foreach ($projectIds as $projectId) {
                if (array_key_exists($projectId, $doneProjectIds)) {
                    $done++;
                }
            }
            $active = $total - $done;

            $result[] = [
                'company_id' => $company['company_id'],
                'company_name' => $company['company_name'],
                'logo_url' => PublicStorageUrl::for($company['logo_path'] ?? null),
                'total_projects' => $total,
                'active_projects' => $active,
                'done_projects' => $done,
                'status' => $active === 0 ? 'All done' : 'Active',
            ];
        }

        usort($result, fn ($a, $b) => $b['total_projects'] <=> $a['total_projects']
            ?: strcasecmp($a['company_name'], $b['company_name']));

        return $result;
    }

    /**
     * @param  null|array<int>  $scopedProjectIds
     */
    private function getRevenueTrendData(?array $scopedProjectIds = null)
    {
        if ($scopedProjectIds !== null && $scopedProjectIds === []) {
            return [];
        }

        $projectsQuery = DB::table('projects')
            ->select('id', 'created_at', 'quotation_value')
            ->orderBy('created_at', 'asc');

        if ($scopedProjectIds !== null) {
            $projectsQuery->whereIn('id', $scopedProjectIds);
        }

        $projects = $projectsQuery->get();

        if ($projects->isEmpty()) {
            return [];
        }

        $projectRows = $projects->map(function ($p) {
            return [
                'id' => (int) $p->id,
                'month' => Carbon::parse($p->created_at)->format('Y-m'),
                'billed' => (float) ($p->quotation_value ?? 0),
            ];
        });

        $monthList = $projectRows
            ->pluck('month')
            ->unique()
            ->sort()
            ->values()
            ->take(-6)
            ->values();

        $projectIds = $projectRows
            ->whereIn('month', $monthList)
            ->pluck('id')
            ->unique()
            ->values();

        $allocByProject = DB::table('project_allocations')
            ->select('project_id', DB::raw('SUM(amount) as cost'))
            ->whereIn('project_id', $projectIds)
            ->groupBy('project_id')
            ->pluck('cost', 'project_id');

        $financialByMonth = [];
        if ($scopedProjectIds === null) {
            $firstMonth = $monthList->first();
            $financialRows = DB::table('financial_records')
                ->select('date', 'amount')
                ->when($firstMonth, function ($q) use ($firstMonth) {
                    $q->whereDate('date', '>=', $firstMonth . '-01');
                })
                ->get();

            foreach ($financialRows as $row) {
                $month = Carbon::parse($row->date)->format('Y-m');
                if (!$monthList->contains($month)) {
                    continue;
                }
                $financialByMonth[$month] = ($financialByMonth[$month] ?? 0) + (float) ($row->amount ?? 0);
            }
        }

        return $monthList->map(function ($month) use ($projectRows, $allocByProject, $financialByMonth) {
            $monthProjects = $projectRows->where('month', $month);
            $billed = (float) $monthProjects->sum('billed');

            $projectCost = 0.0;
            foreach ($monthProjects as $project) {
                $projectCost += (float) ($allocByProject[$project['id']] ?? 0);
            }

            return (object) [
                'month' => $month,
                'billed' => $billed,
                'cost' => $projectCost + (float) ($financialByMonth[$month] ?? 0),
            ];
        });
    }

    public function dashboardOverview(Request $request)
    {
        $user = $request->user();
        $projectIds = ProjectAccess::metricsProjectIds($user);

        if ($user && !ProjectAccess::canViewGlobalFinanceMetrics($user) && !UserAccess::isPrivileged($user)) {
            return response()->json([
                'mode' => 'member',
                'userStats' => $this->getMemberDashboardData($user),
            ]);
        }

        // Fail-safe: if one section errors, keep dashboard stats available.
        try {
            $stats = $this->getStatsData($projectIds);
        } catch (\Throwable $e) {
            $stats = [
                'totalProjects' => 0,
                'activeProjects' => 0,
                'doneProjects' => 0,
                'scrumProjects' => 0,
                'waterfallProjects' => 0,
                'activeTasks' => 0,
                'totalHours' => 0,
                'totalRevenue' => 0,
                'totalAllocated' => 0,
                'totalMargin' => 0,
                'marginPercentage' => 0,
            ];
        }

        try {
            $efficiency = $this->getEfficiencyData($projectIds);
        } catch (\Throwable $e) {
            $efficiency = [];
        }

        try {
            $recentLogs = UserAccess::canViewManhours($user)
                ? $this->getRecentLogsData($projectIds)
                : [];
        } catch (\Throwable $e) {
            $recentLogs = [];
        }

        try {
            $revenueTrend = $this->getRevenueTrendData($projectIds);
        } catch (\Throwable $e) {
            $revenueTrend = [];
        }

        return response()->json([
            'stats' => $stats,
            'efficiency' => $efficiency,
            'recentLogs' => $recentLogs,
            'revenueTrend' => $revenueTrend
        ]);
    }

    /**
     * @param  null|array<int>  $projectIds
     */
    private function sqlProjectIdFilter(?array $projectIds, string $table, string $column = 'id'): string
    {
        if ($projectIds === null) {
            return '';
        }

        if ($projectIds === []) {
            return ' AND 1=0';
        }

        $ids = implode(',', array_map('intval', $projectIds));
        $qualified = $table === 'p' ? "p.{$column}" : "{$table}.{$column}";

        return " AND {$qualified} IN ({$ids})";
    }

    private function emptyStatsPayload(): array
    {
        return [
            'totalProjects' => 0,
            'activeProjects' => 0,
            'doneProjects' => 0,
            'scrumProjects' => 0,
            'waterfallProjects' => 0,
            'activeTasks' => 0,
            'totalHours' => 0,
            'totalRevenue' => 0,
            'totalAllocated' => 0,
            'totalMargin' => 0,
            'marginPercentage' => 0,
            'taskStatusCounts' => [
                'To Do' => 0,
                'In Progress' => 0,
                'Review' => 0,
                'Reopen' => 0,
                'Done' => 0,
            ],
        ];
    }
}
