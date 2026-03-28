<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use App\Models\Presale;
use App\Models\Manhour;
use App\Models\FinancialRecord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Basic Lookups
        $this->call([
            RoleSeeder::class,
            ProjectRoleSeeder::class,
            FinanceCategorySeeder::class,
        ]);

        // 2. Create Default Admin User
        User::factory()->create([
            'name' => 'Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'Admin',
            'status' => 'Active',
        ]);

        // 3. Create Additional Users
        $users = User::factory()->count(10)->create();

        // 4. Create Presales
        Presale::factory()->count(15)->create();

        // 5. Create Financial Records (General)
        FinancialRecord::factory()->count(20)->create();

        // 6. Create Projects with related Tasks and Manhours
        Project::factory()->count(10)->create()->each(function ($project) use ($users) {
            // Create 5-10 tasks for each project
            Task::factory()->count(rand(5, 10))->create([
                'project_id' => $project->id,
                'assignee_id' => $users->random()->id,
            ]);

            // Create some manhour logs for the project
            foreach (range(1, 15) as $index) {
                Manhour::factory()->create([
                    'project_id' => $project->id,
                    'user_id' => $users->random()->id,
                ]);
            }
        });
    }
}
