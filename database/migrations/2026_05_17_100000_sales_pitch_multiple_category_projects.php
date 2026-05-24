<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_pitch_sales_category_project', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_pitch_id')->constrained('sales_pitches')->cascadeOnDelete();
            $table->foreignId('sales_category_project_id')->constrained('sales_category_projects')->cascadeOnDelete();
            $table->unique(['sales_pitch_id', 'sales_category_project_id'], 'pitch_category_unique');
        });

        if (Schema::hasColumn('sales_pitches', 'sales_category_project_id')) {
            $rows = DB::table('sales_pitches')
                ->whereNotNull('sales_category_project_id')
                ->select('id', 'sales_category_project_id')
                ->get();

            foreach ($rows as $row) {
                DB::table('sales_pitch_sales_category_project')->insertOrIgnore([
                    'sales_pitch_id' => $row->id,
                    'sales_category_project_id' => $row->sales_category_project_id,
                ]);
            }

            Schema::table('sales_pitches', function (Blueprint $table) {
                $table->dropConstrainedForeignId('sales_category_project_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('sales_pitches', 'sales_category_project_id')) {
            Schema::table('sales_pitches', function (Blueprint $table) {
                $table->foreignId('sales_category_project_id')
                    ->nullable()
                    ->after('project_category_id')
                    ->constrained('sales_category_projects')
                    ->nullOnDelete();
            });

            $pivotRows = DB::table('sales_pitch_sales_category_project')
                ->select('sales_pitch_id', DB::raw('MIN(sales_category_project_id) as sales_category_project_id'))
                ->groupBy('sales_pitch_id')
                ->get();

            foreach ($pivotRows as $row) {
                DB::table('sales_pitches')
                    ->where('id', $row->sales_pitch_id)
                    ->update(['sales_category_project_id' => $row->sales_category_project_id]);
            }
        }

        Schema::dropIfExists('sales_pitch_sales_category_project');
    }
};
