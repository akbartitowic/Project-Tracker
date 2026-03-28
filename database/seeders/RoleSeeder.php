<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'Admin', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Project Manager', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Developer', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Designer', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'QA', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->insertOrIgnore($role);
        }
    }
}
