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

Route::post('/login', [AuthController::class, 'login']);
Route::post('/signup', [AuthController::class, 'signup']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // 1. Projects Routes
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::delete('/projects', [ProjectController::class, 'destroy']);
    Route::get('/projects/{id}/quotas', [ProjectController::class, 'quotas']);
    Route::get('/projects/{id}/balance', [ProjectController::class, 'balance']);
    Route::get('/projects/{id}/members', [ProjectController::class, 'members']);
    Route::get('/projects/{id}/finance-summary', [ProjectAllocationController::class, 'financeSummary']);

    // 1.5 System Log Routes
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::post('/activity-logs/cleanup', [ActivityLogController::class, 'cleanup']);

    // 2. Users Routes
    Route::apiResource('users', UserController::class)->except(['show']);

    // 3. Roles Routes
    Route::apiResource('roles', RoleController::class)->except(['show']);

    // 3.5 Project Roles Routes
    Route::apiResource('project-roles', ProjectRoleController::class)->except(['show']);

    // 4. Tasks Routes
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::put('/tasks/{id}/status', [TaskController::class, 'updateStatus']);

    // 4. Manhours Routes
    Route::get('/manhours', [ManhourController::class, 'index']);
    Route::post('/manhours', [ManhourController::class, 'store']);

    // 5. Presales Routes
    Route::apiResource('presales', PresaleController::class)->except(['show']);

    // 6. Finance Categories Routes
    Route::apiResource('finance-categories', FinanceCategoryController::class)->except(['show']);

    // 7. Project Allocations
    Route::get('/project-allocations', [ProjectAllocationController::class, 'index']);
    Route::post('/project-allocations', [ProjectAllocationController::class, 'store']);
    Route::delete('/project-allocations/{id}', [ProjectAllocationController::class, 'destroy']);
    Route::post('/projects/{id}/top-up', [ProjectAllocationController::class, 'topUp']);

    // 8. Analytics
    Route::get('/stats', [StatController::class, 'stats']);
    Route::get('/stats/recent', [StatController::class, 'recentLogs']);
    Route::get('/reports/efficiency', [StatController::class, 'efficiency']);
    Route::get('/reports/revenue-trend', [StatController::class, 'revenueTrend']);
    Route::get('/reports/projects', [ReportController::class, 'getProjects']);
    Route::post('/reports/generate', [ReportController::class, 'generate']);
    Route::post('/reports/send-email', [ReportController::class, 'sendEmail']);

    // 9. Roles & Permissions (Deprecated duplication, keeping for safety if referenced)
    Route::get('/permissions', [PermissionController::class, 'index']);

    // 10. System Management
    Route::get('/settings/all', [SettingController::class, 'getSettings']);
    Route::post('/settings/update', [SettingController::class, 'updateSettings']);
    Route::post('/settings/test-smtp', [SettingController::class, 'testSmtp']);
    Route::post('/system/reset', [SystemController::class, 'resetData']);
});
