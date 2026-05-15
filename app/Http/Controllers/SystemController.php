<?php

namespace App\Http\Controllers;

use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemController extends Controller
{
    use LogActivity;

    /**
     * Resets transactional data but keeps users, roles, and permissions.
     */
    public function resetData(Request $request)
    {
        try {
            DB::beginTransaction();

            Schema::disableForeignKeyConstraints();

            $tables = [
                'activity_logs',
                'financial_records',
                'manhours',
                'tasks',
                'project_members',
                'project_allocations',
                'project_role_quotas',
                'projects',
                'presales',
                'finance_categories',
            ];

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->truncate();
                }
            }

            Schema::enableForeignKeyConstraints();
            DB::commit();

            $actor = $request->user();
            $this->log(
                'System',
                'Reset Transactional Data',
                'Full data reset executed by ' . ($actor?->email ?? 'unknown')
            );

            return response()->json([
                'status' => 'success',
                'message' => 'All transactional data has been successfully reset.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Schema::enableForeignKeyConstraints();

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reset data: ' . $e->getMessage(),
            ], 500);
        }
    }
}
