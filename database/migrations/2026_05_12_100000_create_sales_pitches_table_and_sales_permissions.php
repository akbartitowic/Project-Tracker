<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_pitches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('prospect_name');
            $table->string('company_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->decimal('estimated_value', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('current_step', 32)->default('new_prospect');
            $table->string('outcome', 16)->nullable();
            $table->timestamp('lead_started_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->json('step_reached_at')->nullable();
            $table->timestamps();
        });

        $specs = [
            ['slug' => 'sales.read', 'name' => 'Read Sales', 'module' => 'Sales'],
            ['slug' => 'sales.create', 'name' => 'Create Sales', 'module' => 'Sales'],
            ['slug' => 'sales.update', 'name' => 'Update Sales', 'module' => 'Sales'],
            ['slug' => 'sales.delete', 'name' => 'Delete Sales', 'module' => 'Sales'],
        ];
        foreach ($specs as $s) {
            Permission::firstOrCreate(
                ['slug' => $s['slug']],
                ['name' => $s['name'], 'module' => $s['module']]
            );
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $ids = Permission::where('slug', 'like', 'sales.%')->pluck('id')->all();
            if ($ids !== []) {
                $admin->permissions()->syncWithoutDetaching($ids);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_pitches');
        Permission::where('module', 'Sales')->delete();
    }
};
