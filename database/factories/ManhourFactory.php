<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Project;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Manhour>
 */
class ManhourFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'project_id' => Project::factory(),
            'date' => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'hours' => fake()->randomFloat(2, 1, 8),
            'amount_idr' => fake()->randomFloat(2, 100000, 2000000),
            'description' => fake()->sentence(),
        ];
    }
}
