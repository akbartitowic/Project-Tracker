<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemController extends Controller
{
    /**
     * Resets transactional data but keeps users, roles, and permissions.
     */
    public function resetData()
    {
        try {
            DB::beginTransaction();

            // Disable foreign key checks for truncation
            Schema::disableForeignKeyConstraints();

            // Tables to truncate (transactional data)
            $tables = [
                'manhours',
                'tasks',
                'project_members',
                'project_allocations',
                'project_role_quotas',
                'projects',
                'presales',
            ];

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->truncate();
                }
            }

            Schema::enableForeignKeyConstraints();
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'All transactional data has been successfully reset.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Schema::enableForeignKeyConstraints();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reset data: ' . $e->getMessage()
            ], 500);
        }
    }
}
