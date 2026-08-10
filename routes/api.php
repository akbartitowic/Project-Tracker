<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ProjectRoleController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskHistoryController;
use App\Http\Controllers\TaskNoteController;
use App\Http\Controllers\ManhourController;
use App\Http\Controllers\PresaleController;
use App\Http\Controllers\FinanceCategoryController;
use App\Http\Controllers\ProjectAllocationController;
use App\Http\Controllers\StatController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\MenuItemController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ProjectCategoryController;
use App\Http\Controllers\SalesPitchController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\SalesCategoryProjectController;
use App\Http\Controllers\TeamLoadController;
use App\Http\Controllers\ProjectNoteController;
use App\Http\Controllers\ReportScheduleController;
use App\Http\Controllers\ExternalAllocationController;
use App\Http\Controllers\ProjectIntegrationController;
use App\Http\Controllers\GlobalIntegrationController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ProjectReviewController;
use App\Http\Controllers\ReviewTokenController;
use App\Http\Controllers\PublicReviewController;
use App\Http\Controllers\NotificationController;

// Public review submission — no auth required
Route::middleware('throttle:30,1')->prefix('public')->group(function () {
    Route::get('/review/{token}', [PublicReviewController::class, 'show']);
    Route::post('/review/{token}/submit', [PublicReviewController::class, 'submit']);
});

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/signup', [AuthController::class, 'signup'])
    ->middleware(['throttle:5,1', 'signup.enabled']);
Route::get('/branding', [SettingController::class, 'branding']);

Route::middleware(['auth:sanctum', 'token.lifetime', 'throttle:api'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile'])->middleware('permission:profile.update');
    Route::post('/force-password-change', [AuthController::class, 'forcePasswordChange']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread', [NotificationController::class, 'unread']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // 1. Projects Routes
    Route::get('/projects', [ProjectController::class, 'index'])->middleware('permission:project_board.read');
    Route::post('/projects', [ProjectController::class, 'store'])->middleware('permission:list_project.create');
    Route::delete('/projects', [ProjectController::class, 'destroy'])->middleware('permission:list_project.delete');
    Route::get('/projects/{id}/quotas', [ProjectController::class, 'quotas'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/balance', [ProjectController::class, 'balance'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/members', [ProjectController::class, 'members'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/notes', [ProjectNoteController::class, 'index'])->middleware('permission:project_board.read');
    Route::post('/projects/{id}/notes', [ProjectNoteController::class, 'store'])->middleware('permission:project_board.read');
    Route::put('/projects/{id}/notes/{noteId}', [ProjectNoteController::class, 'update'])->middleware('permission:project_board.read');
    Route::delete('/projects/{id}/notes/{noteId}', [ProjectNoteController::class, 'destroy'])->middleware('permission:project_board.read');
    Route::get('/projects/{id}/assignment-options', [ProjectController::class, 'assignmentOptions'])->middleware('permission:list_project.update');
    Route::put('/projects/{id}/members', [ProjectController::class, 'syncMembers'])->middleware('permission:list_project.update');
    Route::patch('/projects/{id}/status', [ProjectController::class, 'updateStatus'])->middleware('permission:project_board.update');
    Route::get('/projects/{id}/finance-summary', [ProjectAllocationController::class, 'financeSummary'])->middleware('permission:finance_monitoring.read');
    Route::post('/projects/{id}/favorite', [ProjectController::class, 'favorite'])->middleware('permission:project_board.read');
    Route::delete('/projects/{id}/favorite', [ProjectController::class, 'unfavorite'])->middleware('permission:project_board.read');
    Route::put('/projects/{id}/review-client-emails', [ProjectController::class, 'updateReviewClientEmails'])->middleware('permission:review.update');

    // 1.5 System Log Routes
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('permission:system_log.read');
    Route::post('/activity-logs/cleanup', [ActivityLogController::class, 'cleanup'])
        ->middleware(['permission:system_log.delete', 'throttle:5,1']);

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

    // 3.1 Modules Routes
    Route::get('/modules', [ModuleController::class, 'index'])->middleware('permission:modules_management.read');
    Route::put('/modules/{module}', [ModuleController::class, 'update'])->middleware('permission:modules_management.update');
    Route::patch('/modules/{module}', [ModuleController::class, 'update'])->middleware('permission:modules_management.update');

    // 3.2 Menu Items Routes
    Route::get('/menu-items', [MenuItemController::class, 'index'])->middleware('permission:modules_management.read');
    Route::post('/menu-items', [MenuItemController::class, 'store'])->middleware('permission:modules_management.create');
    Route::put('/menu-items/{menuItem}', [MenuItemController::class, 'update'])->middleware('permission:modules_management.update');
    Route::patch('/menu-items/{menuItem}', [MenuItemController::class, 'update'])->middleware('permission:modules_management.update');
    Route::delete('/menu-items/{menuItem}', [MenuItemController::class, 'destroy'])->middleware('permission:modules_management.delete');

    // 3.5 Project Roles Routes
    Route::get('/project-roles', [ProjectRoleController::class, 'index'])->middleware('permission:project_roles.read');
    Route::post('/project-roles', [ProjectRoleController::class, 'store'])->middleware('permission:project_roles.create');
    Route::put('/project-roles/{project_role}', [ProjectRoleController::class, 'update'])->middleware('permission:project_roles.update');
    Route::patch('/project-roles/{project_role}', [ProjectRoleController::class, 'update'])->middleware('permission:project_roles.update');
    Route::delete('/project-roles/{project_role}', [ProjectRoleController::class, 'destroy'])->middleware('permission:project_roles.delete');

    Route::get('/team-load', [TeamLoadController::class, 'index'])->middleware('permission:load.read');
    Route::post('/team-load/excluded-dates', [TeamLoadController::class, 'storeExcludedDate'])->middleware('permission:load.read');
    Route::delete('/team-load/excluded-dates/{id}', [TeamLoadController::class, 'destroyExcludedDate'])->middleware('permission:load.read');

    // 4. Tasks Routes
    Route::get('/tasks', [TaskController::class, 'index'])->middleware('permission:project_board.read');
    Route::get('/tasks/template', [TaskController::class, 'downloadTemplate'])->middleware('permission:project_board.read');
    Route::get('/tasks/backlog', [TaskController::class, 'backlog'])->middleware('permission:project_board.read');
    Route::post('/tasks/import', [TaskController::class, 'import'])->middleware('permission:project_board.create');
    Route::post('/tasks/description-images', [TaskController::class, 'uploadDescriptionImage'])->middleware('permission:project_board.read');
    Route::post('/tasks', [TaskController::class, 'store'])->middleware('permission:project_board.create');
    Route::post('/tasks/{id}/duplicate', [TaskController::class, 'duplicate'])->middleware('permission:project_board.create');
    Route::put('/tasks/bulk-edit', [TaskController::class, 'bulkEditManhours'])->middleware('permission:project_board.update');
    Route::delete('/tasks/bulk-delete', [TaskController::class, 'bulkDestroy'])->middleware('permission:project_board.update');
    Route::get('/tasks/{taskId}/notes', [TaskNoteController::class, 'index'])->middleware('permission:project_board.read');
    Route::post('/tasks/{taskId}/notes', [TaskNoteController::class, 'store'])->middleware('permission:project_board.read');
    Route::delete('/tasks/{taskId}/notes/{noteId}', [TaskNoteController::class, 'destroy'])->middleware('permission:project_board.read');
    Route::get('/tasks/{taskId}/history', [TaskHistoryController::class, 'index'])->middleware('permission:project_board.read');
    Route::put('/tasks/{id}', [TaskController::class, 'update'])->middleware('permission:project_board.update');
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy'])->middleware('permission:project_board.update');
    Route::put('/tasks/{id}/status', [TaskController::class, 'updateStatus'])->middleware('permission:project_board.update');
    Route::put('/tasks/{id}/assignees', [TaskController::class, 'updateAssignees'])->middleware('permission:project_board.update');
    Route::post('/tasks/{id}/promote', [TaskController::class, 'promote'])->middleware('permission:project_board.update');
    Route::post('/tasks/{id}/send-to-backlog', [TaskController::class, 'sendToBacklog'])->middleware('permission:project_board.update');

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

    Route::get('/sales-pitches/form-options', [SalesPitchController::class, 'formOptions'])->middleware('permission:sales.read');
    Route::get('/sales-pitches', [SalesPitchController::class, 'index'])->middleware('permission:sales.read');
    Route::post('/sales-pitches/link-won-presale/{presaleId}', [SalesPitchController::class, 'linkWonPresale'])->middleware('permission:sales.update');
    Route::get('/sales-pitches/{id}', [SalesPitchController::class, 'show'])->middleware('permission:sales.read');
    Route::post('/sales-pitches', [SalesPitchController::class, 'store'])->middleware('permission:sales.create');
    Route::put('/sales-pitches/{id}', [SalesPitchController::class, 'update'])->middleware('permission:sales.update');
    Route::get('/sales-pitches/{id}/quotation/default', [SalesPitchController::class, 'defaultQuotation'])->middleware('permission:sales.read');
    Route::post('/sales-pitches/{id}/quotation/preview', [SalesPitchController::class, 'previewQuotation'])->middleware('permission:sales.update');
    Route::post('/sales-pitches/{id}/quotation/generate', [SalesPitchController::class, 'generateQuotation'])->middleware('permission:sales.update');
    Route::post('/sales-pitches/{id}/quotation/logo', [SalesPitchController::class, 'uploadQuotationLogo'])->middleware('permission:sales.update');
    Route::delete('/sales-pitches/{id}/quotation/logo', [SalesPitchController::class, 'removeQuotationLogo'])->middleware('permission:sales.update');
    Route::delete('/sales-pitches/{id}', [SalesPitchController::class, 'destroy'])->middleware('permission:sales.delete');

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

    Route::get('/sales-category-projects', [SalesCategoryProjectController::class, 'index'])->middleware('permission:sales_category_project.read');
    Route::post('/sales-category-projects', [SalesCategoryProjectController::class, 'store'])->middleware('permission:sales_category_project.create');
    Route::put('/sales-category-projects/{id}', [SalesCategoryProjectController::class, 'update'])->middleware('permission:sales_category_project.update');
    Route::delete('/sales-category-projects/{id}', [SalesCategoryProjectController::class, 'destroy'])->middleware('permission:sales_category_project.delete');

    // 6. Finance Categories Routes
    Route::get('/finance-categories', [FinanceCategoryController::class, 'index'])->middleware('permission:finance_categories.read');
    Route::post('/finance-categories', [FinanceCategoryController::class, 'store'])->middleware('permission:finance_categories.create');
    Route::put('/finance-categories/{finance_category}', [FinanceCategoryController::class, 'update'])->middleware('permission:finance_categories.update');
    Route::patch('/finance-categories/{finance_category}', [FinanceCategoryController::class, 'update'])->middleware('permission:finance_categories.update');
    Route::delete('/finance-categories/{finance_category}', [FinanceCategoryController::class, 'destroy'])->middleware('permission:finance_categories.delete');

    // 7. Project Allocations
    Route::get('/project-allocations', [ProjectAllocationController::class, 'index'])->middleware('permission:finance_monitoring.read');
    Route::post('/project-allocations', [ProjectAllocationController::class, 'store'])->middleware('permission:finance_monitoring.create');
    Route::put('/project-allocations/{id}', [ProjectAllocationController::class, 'update'])->middleware('permission:finance_monitoring.update');
    Route::put('/project-allocations/{id}/realization', [ProjectAllocationController::class, 'realize'])->middleware('permission:finance_monitoring.update');
    Route::put('/project-allocations/{id}/paid', [ProjectAllocationController::class, 'markPaid'])->middleware('permission:finance_monitoring.update');
    Route::delete('/project-allocations/{id}', [ProjectAllocationController::class, 'destroy'])->middleware('permission:finance_monitoring.delete');
    Route::post('/projects/{id}/top-up', [ProjectAllocationController::class, 'topUp'])->middleware('permission:finance_monitoring.create');
    Route::post('/projects/{id}/change-request', [ProjectAllocationController::class, 'changeRequest'])->middleware('permission:finance_monitoring.create');
    Route::post('/projects/{id}/quota-transfer', [ProjectAllocationController::class, 'transferQuota'])->middleware('permission:finance_monitoring.update');
    Route::post('/projects/{id}/role-quotas/{quotaId}/deactivate', [ProjectAllocationController::class, 'deactivateRoleQuota'])->middleware('permission:finance_monitoring.update');

    // 8. Analytics
    Route::get('/stats', [StatController::class, 'stats'])->middleware('permission:reports.read');
    Route::get('/dashboard/overview', [StatController::class, 'dashboardOverview'])->middleware('permission:dashboard.read');
    Route::get('/stats/recent', [StatController::class, 'recentLogs'])->middleware('permission:dashboard.read');
    Route::get('/reports/efficiency', [StatController::class, 'efficiency'])->middleware('permission:reports.read');
    Route::get('/reports/revenue-trend', [StatController::class, 'revenueTrend'])->middleware('permission:reports.read');
    Route::get('/reports/company-projects', [StatController::class, 'companyProjects'])->middleware('permission:reports.read');
    Route::get('/reports/company-financials', [StatController::class, 'companyFinancials'])->middleware('permission:reports.read');
    Route::get('/reports/expense-payment-breakdown', [StatController::class, 'expensePaymentBreakdown'])->middleware('permission:reports.read');

    Route::get('/integration/projects', [IntegrationController::class, 'projects'])->middleware('permission:integrasi.read');
    Route::get('/integration/registry', [IntegrationController::class, 'registry'])->middleware('permission:integrasi.read');
    Route::get('/reports/projects', [ReportController::class, 'getProjects'])->middleware('permission:generate_report.read');
    Route::post('/reports/generate', [ReportController::class, 'generate'])->middleware('permission:generate_report.create');
    Route::post('/reports/send-email', [ReportController::class, 'sendEmail'])->middleware('permission:generate_report.create');

    // Report Schedules
    Route::get('/report-schedules', [ReportScheduleController::class, 'index'])->middleware('permission:generate_report.read');
    Route::post('/report-schedules', [ReportScheduleController::class, 'store'])->middleware('permission:generate_report.create');
    Route::put('/report-schedules/{id}', [ReportScheduleController::class, 'update'])->middleware('permission:generate_report.create');
    Route::patch('/report-schedules/{id}/toggle', [ReportScheduleController::class, 'toggle'])->middleware('permission:generate_report.create');
    Route::delete('/report-schedules/{id}', [ReportScheduleController::class, 'destroy'])->middleware('permission:generate_report.create');

    // 9. Roles & Permissions (Deprecated duplication, keeping for safety if referenced)
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:access_control.read');

    // 10. System Management
    Route::get('/settings/all', [SettingController::class, 'getSettings'])->middleware('permission:settings.read');
    Route::post('/settings/update', [SettingController::class, 'updateSettings'])
        ->middleware(['permission:settings.update', 'throttle:20,1']);
    Route::post('/settings/branding/logo', [SettingController::class, 'uploadLogo'])
        ->middleware(['permission:settings.update', 'throttle:20,1']);
    Route::delete('/settings/branding/logo', [SettingController::class, 'removeLogo'])
        ->middleware(['permission:settings.update', 'throttle:20,1']);
    Route::post('/settings/branding/favicon', [SettingController::class, 'uploadFavicon'])
        ->middleware(['permission:settings.update', 'throttle:20,1']);
    Route::delete('/settings/branding/favicon', [SettingController::class, 'removeFavicon'])
        ->middleware(['permission:settings.update', 'throttle:20,1']);
    Route::post('/settings/test-smtp', [SettingController::class, 'testSmtp'])
        ->middleware(['permission:settings.update', 'throttle:10,1']);
    Route::post('/system/reset', [SystemController::class, 'resetData'])
        ->middleware(['permission:settings.reset', 'throttle:3,1']);
    Route::get('/system/backup/sql', [SystemController::class, 'backupSql'])
        ->middleware(['permission:settings.update', 'throttle:10,1']);
    Route::get('/system/backup/csv', [SystemController::class, 'backupCsv'])
        ->middleware(['permission:settings.update', 'throttle:10,1']);

    // 11. Financial Reports
    Route::get('/financial-reports/summary', [FinancialReportController::class, 'getSummary'])->middleware('permission:finance_report.read');
    Route::get('/financial-reports/project-realization', [FinancialReportController::class, 'projectRealizationSummary'])->middleware('permission:realization_report.read');
    Route::post('/financial-reports/records', [FinancialReportController::class, 'storeRecord'])->middleware('permission:finance_report.create');
    Route::delete('/financial-reports/records/{id}', [FinancialReportController::class, 'destroyRecord'])->middleware('permission:finance_report.delete');

    // 12. Project Integration Settings
    Route::get('/projects/{id}/integration', [ProjectIntegrationController::class, 'show'])->middleware('permission:finance_monitoring.read');
    Route::get('/projects/{id}/integrations', [ProjectIntegrationController::class, 'index'])->middleware('permission:finance_monitoring.read');
    Route::post('/projects/{id}/integrations', [ProjectIntegrationController::class, 'store'])->middleware('permission:finance_monitoring.update');
    Route::put('/projects/{id}/integrations/{cid}', [ProjectIntegrationController::class, 'update'])->middleware('permission:finance_monitoring.update');
    Route::delete('/projects/{id}/integrations/{cid}', [ProjectIntegrationController::class, 'destroy'])->middleware('permission:finance_monitoring.update');
    Route::post('/projects/{id}/integrations/{cid}/regenerate-key', [ProjectIntegrationController::class, 'regenerateKey'])->middleware('permission:finance_monitoring.update');
    Route::post('/projects/{id}/integrations/{cid}/test', [ProjectIntegrationController::class, 'testWebhook'])->middleware('permission:finance_monitoring.update');

    // 14. Review — evaluations & questions configuration
    Route::get('/review/evaluations', [ReviewController::class, 'evaluations'])->middleware('permission:review.read');
    Route::post('/review/evaluations', [ReviewController::class, 'store'])->middleware('permission:review.create');
    Route::put('/review/evaluations/{id}', [ReviewController::class, 'updateEvaluation'])->middleware('permission:review.update');
    Route::delete('/review/evaluations/{id}', [ReviewController::class, 'destroyEvaluation'])->middleware('permission:review.delete');
    Route::post('/review/evaluations/{id}/questions', [ReviewController::class, 'storeQuestion'])->middleware('permission:review.update');
    Route::put('/review/questions/{id}', [ReviewController::class, 'updateQuestion'])->middleware('permission:review.update');
    Route::delete('/review/questions/{id}', [ReviewController::class, 'deleteQuestion'])->middleware('permission:review.delete');

    // 15. Project Review Submissions
    Route::get('/projects/{id}/reviews/summary', [ProjectReviewController::class, 'summary'])->middleware('permission:review.read');
    Route::get('/projects/{id}/reviews/trigger-status', [ProjectReviewController::class, 'triggerStatus'])->middleware('permission:review.read');
    Route::get('/projects/{id}/reviews', [ProjectReviewController::class, 'index'])->middleware('permission:review.read');
    Route::get('/projects/{id}/reviews/{reviewId}', [ProjectReviewController::class, 'show'])->middleware('permission:review.read');
    Route::post('/projects/{id}/evaluations/{evalId}/reviews', [ProjectReviewController::class, 'store'])->middleware('permission:review.create');

    // 16. Review Tokens (shareable links)
    Route::get('/projects/{projectId}/evaluations/{evalId}/tokens', [ReviewTokenController::class, 'index'])->middleware('permission:review.update');
    Route::post('/projects/{projectId}/evaluations/{evalId}/tokens', [ReviewTokenController::class, 'store'])->middleware('permission:review.update');
    Route::delete('/review/tokens/{id}', [ReviewTokenController::class, 'destroy'])->middleware('permission:review.update');
    Route::patch('/review/tokens/{id}/emails', [ReviewTokenController::class, 'updateEmails'])->middleware('permission:review.update');
    Route::get('/review/tokens/{id}/email-preview', [ReviewTokenController::class, 'emailPreview'])->middleware('permission:review.update');
    Route::post('/review/tokens/{id}/send-email', [ReviewTokenController::class, 'sendEmail'])->middleware('permission:review.update');

    // 13. Global Integration Settings
    Route::get('/global-integration', [GlobalIntegrationController::class, 'show'])->middleware('permission:finance_monitoring.read');
    Route::get('/global-integrations', [GlobalIntegrationController::class, 'index'])->middleware('permission:finance_monitoring.read');
    Route::post('/global-integrations', [GlobalIntegrationController::class, 'store'])->middleware('permission:finance_monitoring.update');
    Route::put('/global-integrations/{id}', [GlobalIntegrationController::class, 'update'])->middleware('permission:finance_monitoring.update');
    Route::delete('/global-integrations/{id}', [GlobalIntegrationController::class, 'destroy'])->middleware('permission:finance_monitoring.update');
    Route::post('/global-integrations/{id}/regenerate-key', [GlobalIntegrationController::class, 'regenerateKey'])->middleware('permission:finance_monitoring.update');
    Route::post('/global-integrations/{id}/test', [GlobalIntegrationController::class, 'testWebhook'])->middleware('permission:finance_monitoring.update');
});

// External API — authenticated via X-Api-Key header (no Sanctum user session needed)
Route::middleware(['external.apikey', 'throttle:60,1'])->prefix('external')->group(function () {
    Route::get('/allocations', [ExternalAllocationController::class, 'index']);
    Route::post('/allocations', [ExternalAllocationController::class, 'store']);
    Route::put('/allocations/{id}', [ExternalAllocationController::class, 'update']);
    Route::delete('/allocations/{id}', [ExternalAllocationController::class, 'destroy']);
});
