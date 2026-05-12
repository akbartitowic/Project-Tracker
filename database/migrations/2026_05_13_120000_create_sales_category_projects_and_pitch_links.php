<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_category_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('user_id')->constrained('companies')->nullOnDelete();
            $table->foreignId('project_category_id')->nullable()->after('company_id')->constrained('project_categories')->nullOnDelete();
            $table->foreignId('sales_category_project_id')->nullable()->after('project_category_id')->constrained('sales_category_projects')->nullOnDelete();
        });

        $specs = [
            ['slug' => 'sales_category_project.read', 'name' => 'Read Sales Category Project', 'module' => 'Sales Category Project'],
            ['slug' => 'sales_category_project.create', 'name' => 'Create Sales Category Project', 'module' => 'Sales Category Project'],
            ['slug' => 'sales_category_project.update', 'name' => 'Update Sales Category Project', 'module' => 'Sales Category Project'],
            ['slug' => 'sales_category_project.delete', 'name' => 'Delete Sales Category Project', 'module' => 'Sales Category Project'],
        ];
        foreach ($specs as $s) {
            Permission::firstOrCreate(
                ['slug' => $s['slug']],
                ['name' => $s['name'], 'module' => $s['module']]
            );
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::where('slug', 'like', 'sales_category_project.%')->pluck('id')->all();
            if ($ids !== []) {
                $admin->permissions()->syncWithoutDetaching($ids);
            }
        }
    }

    public function down(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sales_category_project_id');
            $table->dropConstrainedForeignId('project_category_id');
            $table->dropConstrainedForeignId('company_id');
        });

        Schema::dropIfExists('sales_category_projects');
        Permission::where('module', 'Sales Category Project')->delete();
    }
};
