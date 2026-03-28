<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Presale>
 */
class PresaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company() . ' ' . fake()->randomElement(['ERP Project', 'Cloud Migration', 'E-commerce Dev', 'Security Audit']),
            'sector' => fake()->randomElement(['Government', 'Banking', 'E-commerce', 'Healthcare', 'Education', 'Manufacturing']),
            'estimated_value' => fake()->randomFloat(2, 50000000, 2000000000),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(['Lead', 'Proposal', 'Presentation', 'Negotiation', 'Won', 'Lost']),
            'proposal_doc_url' => 'https://example.com/proposals/' . fake()->uuid() . '.pdf',
            'presentation_log' => fake()->text(),
            'quotation_value' => fake()->randomFloat(2, 45000000, 1800000000),
            'competitor' => fake()->company(),
        ];
    }
}
