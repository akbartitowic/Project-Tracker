<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * New "Weekly Report" module (create/read/update/delete). Granted to Admin only
 * by default — same pattern as every other brand-new module added so far
 * (Announcements, Client Monitoring) — other roles get it manually via Access
 * Control. Note: unlike most modules, having the permission alone isn't enough
 * to see a given board — App\Support\WeeklyReportAccess also requires board
 * membership (weekly_report_board_members), mirroring Project Board.
 */
return new class extends Migration
{
    public function up(): void
    {
        PermissionCatalog::sync();

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::whereIn('slug', [
                'weekly_report.create',
                'weekly_report.read',
                'weekly_report.update',
                'weekly_report.delete',
            ])->pluck('id');
            $admin->permissions()->syncWithoutDetaching($ids);
        }

        DB::table('menu_items')->insert([
            'permission_slug' => 'weekly_report.read',
            'section' => 'Operation',
            'path' => '/weekly-report',
            'label' => 'Weekly Report',
            'icon' => 'ClipboardCheck',
            'variant' => 'primary',
            'sort_order' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('menu_items')
            ->where('permission_slug', 'weekly_report.read')
            ->where('path', '/weekly-report')
            ->delete();

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::whereIn('slug', [
                'weekly_report.create',
                'weekly_report.read',
                'weekly_report.update',
                'weekly_report.delete',
            ])->pluck('id');
            $admin->permissions()->detach($ids);
        }

        Permission::whereIn('slug', [
            'weekly_report.create',
            'weekly_report.read',
            'weekly_report.update',
            'weekly_report.delete',
        ])->delete();
    }
};
