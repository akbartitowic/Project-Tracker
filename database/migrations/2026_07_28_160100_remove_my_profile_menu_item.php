<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "My Profile" (User Management section) became redundant once the sidebar's own
     * user card became a direct link to /profile — remove the duplicate nav entry.
     */
    public function up(): void
    {
        DB::table('menu_items')
            ->where('permission_slug', 'profile.read')
            ->where('path', '/profile')
            ->delete();
    }

    public function down(): void
    {
        DB::table('menu_items')->insert([
            'permission_slug' => 'profile.read',
            'section' => 'User Management',
            'path' => '/profile',
            'label' => 'My Profile',
            'icon' => 'User',
            'variant' => 'primary',
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
