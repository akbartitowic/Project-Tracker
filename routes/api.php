<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ProjectRoleController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\ManhourController;
use App\Http\Controllers\PresaleController;
use App\Http\Controllers\FinanceCategoryController;
use App\Http\Controllers\ProjectAllocationController;
use App\Http\Controllers\StatController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ProjectCategoryController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/signup', [AuthController::class, 'signup']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile'])->middleware('permission:profile.update');

    // 1. Projects Routes
    Route::get('/projects', [ProjectController::class, 'index'])->middleware('permission:project_board.read');
    Route::post('/projects', [ProjectController::class, 'store'])->middleware('permission:list_project.create');
    Route::delete('/projects', [ProjectController::class, 'destroy'])->middleware('permission:list_project.delete');
    Route::get('/projects/{id}/quotas', [ProjectController::class, 'quotas'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/balance', [ProjectController::class, 'balance'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/members', [ProjectController::class, 'members'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/assignment-options', [ProjectController::class, 'assignmentOptions'])->middleware('permission:list_project.update');
    Route::put('/projects/{id}/members', [ProjectController::class, 'syncMembers'])->middleware('permission:list_project.update');
    Route::get('/projects/{id}/finance-summary', [ProjectAllocationController::class, 'financeSummary'])->middleware('permission:finance_monitoring.read');

    // 1.5 System Log Routes
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('permission:system_log.read');
    Route::post('/activity-logs/cleanup', [ActivityLogController::class, 'cleanup'])->middleware('permission:system_log.delete');

    // 2. Users Routes
    Route::get('/users', [UserController::class, 'index'])->middleware('permission:teams_users.read');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:teams_users.create');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:teams_users.update');
    Route::patch('/users/{user}', [UserController::class, 'update'])->middleware('permission:teams_users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:teams_users.delete');

    // 3. Roles Routes
    Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:access_control.read');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:access_control.create');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:access_control.update');
    Route::patch('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:access_control.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:access_control.delete');

    // 3.5 Project Roles Routes
    Route::get('/project-roles', [ProjectRoleController::class, 'index'])->middleware('permission:project_roles.read');
    Route::post('/project-roles', [ProjectRoleController::class, 'store'])->middleware('permission:project_roles.create');
    Route::put('/project-roles/{project_role}', [ProjectRoleController::class, 'update'])->middleware('permission:project_roles.update');
    Route::patch('/project-roles/{project_role}', [ProjectRoleController::class, 'update'])->middleware('permission:project_roles.update');
    Route::delete('/project-roles/{project_role}', [ProjectRoleController::class, 'destroy'])->middleware('permission:project_roles.delete');

    // 4. Tasks Routes
    Route::get('/tasks', [TaskController::class, 'index'])->middleware('permission:project_board.read');
    Route::post('/tasks', [TaskController::class, 'store'])->middleware('permission:project_board.create');
    Route::put('/tasks/bulk-edit', [TaskController::class, 'bulkEditManhours'])->middleware('permission:project_board.update');
    Route::put('/tasks/{id}', [TaskController::class, 'update'])->middleware('permission:project_board.update');
    Route::put('/tasks/{id}/status', [TaskController::class, 'updateStatus'])->middleware('permission:project_board.update');
});

Route::get('/tasks/template', [TaskController::class, 'downloadTemplate']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/tasks/import', [TaskController::class, 'import'])->middleware('permission:project_board.create');

    // 4. Manhours Routes
    Route::get('/manhours', [ManhourController::class, 'index'])->middleware('permission:project_board.read');
    Route::post('/manhours', [ManhourController::class, 'store'])->middleware('permission:project_board.create');

    // 5. Presales Routes
    Route::get('/presales', [PresaleController::class, 'index'])->middleware('permission:presales.read');
    Route::post('/presales', [PresaleController::class, 'store'])->middleware('permission:presales.create');
    Route::put('/presales/{presale}', [PresaleController::class, 'update'])->middleware('permission:presales.update');
    Route::patch('/presales/{presale}', [PresaleController::class, 'update'])->middleware('permission:presales.update');
    Route::delete('/presales/{presale}', [PresaleController::class, 'destroy'])->middleware('permission:presales.delete');
    Route::put('/presales/{id}/business', [PresaleController::class, 'updateBusiness'])->middleware('permission:presales.update');
    Route::post('/presales/{id}/business/acknowledge', [PresaleController::class, 'acknowledgeBusiness'])->middleware('permission:presales.update');
    Route::put('/presales/{id}/development', [PresaleController::class, 'updateDevelopment'])->middleware('permission:presales.update');
    Route::post('/presales/{id}/development/acknowledge', [PresaleController::class, 'acknowledgeDevelopment'])->middleware('permission:presales.update');
    Route::put('/presales/{id}/operation', [PresaleController::class, 'updateOperation'])->middleware('permission:presales.update');
    Route::post('/presales/{id}/operation/acknowledge', [PresaleController::class, 'acknowledgeOperation'])->middleware('permission:presales.update');
    Route::post('/presales/{id}/proceed-project', [PresaleController::class, 'proceedToProject'])->middleware('permission:presales.update');
    Route::get('/companies', [CompanyController::class, 'index'])->middleware('permission:list_company.read');
    Route::post('/companies', [CompanyController::class, 'store'])->middleware('permission:list_company.create');
    Route::put('/companies/{company}', [CompanyController::class, 'update'])->middleware('permission:list_company.update');
    Route::patch('/companies/{company}', [CompanyController::class, 'update'])->middleware('permission:list_company.update');
    Route::delete('/companies/{company}', [CompanyController::class, 'destroy'])->middleware('permission:list_company.delete');
    Route::get('/project-categories', [ProjectCategoryController::class, 'index'])->middleware('permission:category_project.read');
    Route::post('/project-categories', [ProjectCategoryController::class, 'store'])->middleware('permission:category_project.create');
    Route::put('/project-categories/{project_category}', [ProjectCategoryController::class, 'update'])->middleware('permission:category_project.update');
    Route::patch('/project-categories/{project_category}', [ProjectCategoryController::class, 'update'])->middleware('permission:category_project.update');
    Route::delete('/project-categories/{project_category}', [ProjectCategoryController::class, 'destroy'])->middleware('permission:category_project.delete');

    // 6. Finance Categories Routes
    Route::get('/finance-categories', [FinanceCategoryController::class, 'index'])->middleware('permission:finance_categories.read');
    Route::post('/finance-categories', [FinanceCategoryController::class, 'store'])->middleware('permission:finance_categories.create');
    Route::put('/finance-categories/{finance_category}', [FinanceCategoryController::class, 'update'])->middleware('permission:finance_categories.update');
    Route::patch('/finance-categories/{finance_category}', [FinanceCategoryController::class, 'update'])->middleware('permission:finance_categories.update');
    Route::delete('/finance-categories/{finance_category}', [FinanceCategoryController::class, 'destroy'])->middleware('permission:finance_categories.delete');

    // 7. Project Allocations
    Route::get('/project-allocations', [ProjectAllocationController::class, 'index'])->middleware('permission:finance_monitoring.read');
    Route::post('/project-allocations', [ProjectAllocationController::class, 'store'])->middleware('permission:finance_monitoring.create');
    Route::put('/project-allocations/{id}/realization', [ProjectAllocationController::class, 'realize'])->middleware('permission:finance_monitoring.update');
    Route::delete('/project-allocations/{id}', [ProjectAllocationController::class, 'destroy'])->middleware('permission:finance_monitoring.delete');
    Route::post('/projects/{id}/top-up', [ProjectAllocationController::class, 'topUp'])->middleware('permission:finance_monitoring.create');

    // 8. Analytics
    Route::get('/stats', [StatController::class, 'stats'])->middleware('permission:reports.read');
    Route::get('/dashboard/overview', [StatController::class, 'dashboardOverview'])->middleware('permission:dashboard.read');
    Route::get('/stats/recent', [StatController::class, 'recentLogs'])->middleware('permission:dashboard.read');
    Route::get('/reports/efficiency', [StatController::class, 'efficiency'])->middleware('permission:reports.read');
    Route::get('/reports/revenue-trend', [StatController::class, 'revenueTrend'])->middleware('permission:reports.read');
    Route::get('/reports/projects', [ReportController::class, 'getProjects'])->middleware('permission:generate_report.read');
    Route::post('/reports/generate', [ReportController::class, 'generate'])->middleware('permission:generate_report.create');
    Route::post('/reports/send-email', [ReportController::class, 'sendEmail'])->middleware('permission:generate_report.create');

    // 9. Roles & Permissions (Deprecated duplication, keeping for safety if referenced)
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:access_control.read');

    // 10. System Management
    Route::get('/settings/all', [SettingController::class, 'getSettings'])->middleware('permission:settings.read');
    Route::post('/settings/update', [SettingController::class, 'updateSettings'])->middleware('permission:settings.update');
    Route::post('/settings/test-smtp', [SettingController::class, 'testSmtp'])->middleware('permission:settings.update');
    Route::post('/system/reset', [SystemController::class, 'resetData'])->middleware('permission:settings.update');

    // 11. Financial Reports
    Route::get('/financial-reports/summary', [FinancialReportController::class, 'getSummary'])->middleware('permission:finance_report.read');
    Route::get('/financial-reports/project-realization', [FinancialReportController::class, 'projectRealizationSummary'])->middleware('permission:realization_report.read');
    Route::post('/financial-reports/records', [FinancialReportController::class, 'storeRecord'])->middleware('permission:finance_report.create');
    Route::delete('/financial-reports/records/{id}', [FinancialReportController::class, 'destroyRecord'])->middleware('permission:finance_report.delete');
});
