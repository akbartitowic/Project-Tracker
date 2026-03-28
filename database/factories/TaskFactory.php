<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Project;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => fake()->sentence(3),
            'feature_title' => fake()->word(),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(['To Do', 'In Progress', 'Testing', 'Done', 'Blocked']),
            'priority' => fake()->randomElement(['Low', 'Medium', 'High', 'Critical']),
            'assignee_id' => User::factory(),
            'estimated_hours' => fake()->randomFloat(2, 1, 40),
            'category' => fake()->randomElement(['Frontend', 'Backend', 'UI/UX', 'QA', 'DevOps']),
        ];
    }
}
