<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FinanceCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Internal Resource', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Freelance Fee', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Commission', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Operational', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'License & Subscription', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Others', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($categories as $cat) {
            DB::table('finance_categories')->insertOrIgnore($cat);
        }
    }
}
