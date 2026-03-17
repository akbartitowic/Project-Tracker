<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ApiFeatureTest extends TestCase
{
    use RefreshDatabase;
    
    protected $seed = true;
    /**
     * A basic feature test example.
     */
    public function test_api_endpoints_return_successful_response(): void
    {
        $endpoints = [
            '/api/users',
            '/api/roles',
            '/api/project-roles',
            '/api/projects',
            '/api/tasks',
            '/api/manhours',
            '/api/presales',
            '/api/finance-categories',
            '/api/project-allocations',
            '/api/stats',
            '/api/reports/efficiency',
            '/api/reports/revenue-trend',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->get($endpoint);
            $response->assertStatus(200);
        }
    }
}
