<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $roles = ['Admin', 'Project Manager', 'Developer', 'Designer'];
        foreach ($roles as $role) {
            \Illuminate\Support\Facades\DB::table('roles')->insertOrIgnore(['name' => $role, 'created_at' => now(), 'updated_at' => now()]);
        }

        $projectRoles = ['UI/UX Designer', 'Frontend Dev', 'Backend Dev', 'System Analyst', 'QA Engineer', 'Product Manager'];
        foreach ($projectRoles as $pr) {
            \Illuminate\Support\Facades\DB::table('project_roles')->insertOrIgnore(['name' => $pr, 'created_at' => now(), 'updated_at' => now()]);
        }

        $cats = ['Freelance Fee', 'Commission', 'Internal Resource', 'Operational', 'Others'];
        foreach ($cats as $c) {
            \Illuminate\Support\Facades\DB::table('finance_categories')->insertOrIgnore(['name' => $c, 'created_at' => now(), 'updated_at' => now()]);
        }

        \Illuminate\Support\Facades\DB::table('users')->insertOrIgnore([
            ['name' => 'Jane Doe', 'role' => 'Project Manager', 'email' => 'jane@example.com', 'phone_number' => '081234567890', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'John Smith', 'role' => 'Developer', 'email' => 'john@example.com', 'phone_number' => '089876543210', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()]
        ]);

        \Illuminate\Support\Facades\DB::table('projects')->insertOrIgnore([
            ['name' => 'Website Redesign', 'status' => 'In Progress', 'budget_status' => 'On Budget', 'completion' => 65, 'methodology' => 'Agile Scrum', 'jobs' => json_encode(["UI/UX", "FE", "BE"]), 'start_date' => '2023-10-01', 'end_date' => '2023-12-31', 'total_manhours' => 1200, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Mobile App Dev', 'status' => 'Planning', 'budget_status' => 'Under Budget', 'completion' => 15, 'methodology' => 'Agile Scrum', 'jobs' => json_encode(["FE", "QA"]), 'start_date' => '2023-11-01', 'end_date' => '2024-03-01', 'total_manhours' => 800, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Marketing Campaign', 'status' => 'Completed', 'budget_status' => 'Over Budget', 'completion' => 100, 'methodology' => 'Waterfall', 'jobs' => json_encode(["UI/UX"]), 'start_date' => '2023-01-01', 'end_date' => '2023-06-30', 'total_manhours' => null, 'created_at' => now(), 'updated_at' => now()]
        ]);
    }
}
