<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company() . ' ' . fake()->randomElement(['Website', 'Mobile App', 'Internal System', 'API Integration']),
            'status' => fake()->randomElement(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']),
            'budget_status' => fake()->randomElement(['Under Budget', 'On Budget', 'Over Budget']),
            'completion' => fake()->numberBetween(0, 100),
            'methodology' => fake()->randomElement(['Agile Scrum', 'Waterfall', 'Kanban']),
            'jobs' => json_encode(fake()->randomElements(['UI/UX', 'Frontend', 'Backend', 'QA', 'DevOps', 'Mobile'], fake()->numberBetween(1, 4))),
            'start_date' => fake()->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'end_date' => fake()->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'total_manhours' => fake()->numberBetween(100, 5000),
            'hourly_rate' => fake()->randomFloat(2, 50, 200),
            'total_cost' => fake()->randomFloat(2, 10000, 500000),
            'quotation_value' => fake()->randomFloat(2, 15000, 750000),
        ];
    }
}
