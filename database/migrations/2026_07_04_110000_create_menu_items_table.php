<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            // Not a DB foreign key on purpose: visibility/order for a menu item
            // is resolved through the permission's own module (already exposed
            // via role_permissions), so this is just a matching key, mirroring
            // how ROUTE_PERMISSION_MAP already keys off the same slugs.
            $table->string('permission_slug');
            $table->string('section')->nullable();
            $table->string('path');
            $table->string('label');
            $table->string('icon');
            $table->string('variant')->default('primary');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $items = [
            ['permission_slug' => 'dashboard.read', 'section' => null, 'path' => '/', 'label' => 'Dashboard', 'icon' => 'LayoutDashboard', 'variant' => 'primary', 'sort_order' => 0],

            ['permission_slug' => 'sales.read', 'section' => 'Bisnis', 'path' => '/sales', 'label' => 'Sales', 'icon' => 'Handshake', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'list_company.read', 'section' => 'Bisnis', 'path' => '/presales-companies', 'label' => 'List Company', 'icon' => 'Building2', 'variant' => 'sub', 'sort_order' => 1],
            ['permission_slug' => 'category_project.read', 'section' => 'Bisnis', 'path' => '/presales-project-categories', 'label' => 'Category Company', 'icon' => 'Tag', 'variant' => 'sub', 'sort_order' => 2],
            ['permission_slug' => 'sales_category_project.read', 'section' => 'Bisnis', 'path' => '/sales-category-projects', 'label' => 'Category Project', 'icon' => 'Layers', 'variant' => 'sub', 'sort_order' => 3],

            ['permission_slug' => 'presales.read', 'section' => 'Operation', 'path' => '/presales', 'label' => 'New Project', 'icon' => 'Activity', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'list_project.read', 'section' => 'Operation', 'path' => '/create-project', 'label' => 'List Project', 'icon' => 'PlusCircle', 'variant' => 'primary', 'sort_order' => 1],
            ['permission_slug' => 'project_board.read', 'section' => 'Operation', 'path' => '/board', 'label' => 'Project Board', 'icon' => 'KanbanSquare', 'variant' => 'primary', 'sort_order' => 2],
            ['permission_slug' => 'load.read', 'section' => 'Operation', 'path' => '/team-load', 'label' => 'Load', 'icon' => 'Gauge', 'variant' => 'primary', 'sort_order' => 3],
            ['permission_slug' => 'review.read', 'section' => 'Operation', 'path' => '/review', 'label' => 'Review', 'icon' => 'Star', 'variant' => 'primary', 'sort_order' => 4],

            ['permission_slug' => 'reports.read', 'section' => 'Report', 'path' => '/reports', 'label' => 'Reports', 'icon' => 'BarChart3', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'generate_report.read', 'section' => 'Report', 'path' => '/generate-report', 'label' => 'Generate Report', 'icon' => 'FileText', 'variant' => 'primary', 'sort_order' => 1],
            ['permission_slug' => 'finance_report.read', 'section' => 'Report', 'path' => '/finance-report', 'label' => 'Finance Report', 'icon' => 'PieChart', 'variant' => 'primary', 'sort_order' => 2],
            ['permission_slug' => 'realization_report.read', 'section' => 'Report', 'path' => '/finance-realization-report', 'label' => 'Realization Report', 'icon' => 'ClipboardCheck', 'variant' => 'primary', 'sort_order' => 3],

            ['permission_slug' => 'finance_monitoring.read', 'section' => 'Finance', 'path' => '/finance-monitoring', 'label' => 'Monitoring', 'icon' => 'Wallet', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'finance_categories.read', 'section' => 'Finance', 'path' => '/finance-categories', 'label' => 'Categories', 'icon' => 'Tag', 'variant' => 'primary', 'sort_order' => 1],

            ['permission_slug' => 'integrasi.read', 'section' => 'API Monitoring', 'path' => '/integrasi/projects', 'label' => 'Integrasi Monitoring', 'icon' => 'Plug', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'integrasi.read', 'section' => 'API Monitoring', 'path' => '/integrasi/connector', 'label' => 'Connector Monitoring', 'icon' => 'Cable', 'variant' => 'primary', 'sort_order' => 1],

            ['permission_slug' => 'profile.read', 'section' => 'User Management', 'path' => '/profile', 'label' => 'My Profile', 'icon' => 'User', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'teams_users.read', 'section' => 'User Management', 'path' => '/users', 'label' => 'Teams & Users', 'icon' => 'Users', 'variant' => 'primary', 'sort_order' => 1],
            ['permission_slug' => 'access_control.read', 'section' => 'User Management', 'path' => '/roles', 'label' => 'Access Control', 'icon' => 'Lock', 'variant' => 'primary', 'sort_order' => 2],
            ['permission_slug' => 'modules_management.read', 'section' => 'User Management', 'path' => '/modules', 'label' => 'Modules', 'icon' => 'LayoutGrid', 'variant' => 'primary', 'sort_order' => 3],

            ['permission_slug' => 'settings.read', 'section' => 'System Settings', 'path' => '/settings', 'label' => 'Settings', 'icon' => 'Settings', 'variant' => 'primary', 'sort_order' => 0],
            ['permission_slug' => 'project_roles.read', 'section' => 'System Settings', 'path' => '/project-roles', 'label' => 'Project Roles', 'icon' => 'Shield', 'variant' => 'primary', 'sort_order' => 1],
            ['permission_slug' => 'system_log.read', 'section' => 'System Settings', 'path' => '/system-logs', 'label' => 'System Log', 'icon' => 'ClipboardList', 'variant' => 'primary', 'sort_order' => 2],
        ];

        $now = now();
        foreach ($items as &$item) {
            $item['created_at'] = $now;
            $item['updated_at'] = $now;
        }

        DB::table('menu_items')->insert($items);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
