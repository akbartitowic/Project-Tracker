<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProjectRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $projectRoles = [
            ['name' => 'UI/UX Designer', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Frontend Dev', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Backend Dev', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'System Analyst', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'QA Engineer', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Product Manager', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'DevOps Specialist', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($projectRoles as $pr) {
            DB::table('project_roles')->insertOrIgnore($pr);
        }
    }
}
