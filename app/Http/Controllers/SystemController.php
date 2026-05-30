<?php

namespace App\Http\Controllers;

use App\Traits\LogActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemController extends Controller
{
    use LogActivity;

    /**
     * Resets transactional data but keeps users, roles, and permissions.
     */
    public function resetData(Request $request)
    {
        try {
            DB::beginTransaction();

            Schema::disableForeignKeyConstraints();

            $tables = [
                'activity_logs',
                'financial_records',
                'manhours',
                'tasks',
                'project_members',
                'project_allocations',
                'project_role_quotas',
                'projects',
                'presales',
                'finance_categories',
            ];

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->truncate();
                }
            }

            Schema::enableForeignKeyConstraints();
            DB::commit();

            $actor = $request->user();
            $this->log(
                'System',
                'Reset Transactional Data',
                'Full data reset executed by ' . ($actor?->email ?? 'unknown')
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'All transactional data has been successfully reset.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Schema::enableForeignKeyConstraints();

            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to reset data: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ── Backup ───────────────────────────────────────────────────────────────

    public function backupSql(Request $request): Response
    {
        $tables  = $this->allTableNames();
        $driver  = DB::connection()->getDriverName();
        $now     = now()->format('Y-m-d H:i:s');
        $lines   = [];

        $lines[] = "-- Project Tracker SQL Backup";
        $lines[] = "-- Generated: {$now}";
        $lines[] = "-- Driver: {$driver}";
        $lines[] = "";

        foreach ($tables as $table) {
            $rows = DB::table($table)->get();
            if ($rows->isEmpty()) {
                $lines[] = "-- Table `{$table}` is empty";
                $lines[] = "";
                continue;
            }

            $lines[] = "-- Table: `{$table}`";

            foreach ($rows as $row) {
                $data    = (array) $row;
                $cols    = implode(', ', array_map(fn ($c) => "`{$c}`", array_keys($data)));
                $vals    = implode(', ', array_map(fn ($v) => $this->sqlValue($v), array_values($data)));
                $lines[] = "INSERT INTO `{$table}` ({$cols}) VALUES ({$vals});";
            }

            $lines[] = "";
        }

        $content  = implode("\n", $lines);
        $filename = 'backup-' . now()->format('Ymd-His') . '.sql';

        $this->log('System', 'Backup SQL', "SQL backup downloaded by {$request->user()?->email}");

        return response($content, 200, [
            'Content-Type'        => 'application/sql',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function backupCsv(Request $request): Response
    {
        $tables   = $this->allTableNames();
        $now      = now()->format('Y-m-d H:i:s');
        $zipPath  = tempnam(sys_get_temp_dir(), 'backup_csv_');

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response('Failed to create ZIP archive.', 500);
        }

        // README inside the ZIP
        $zip->addFromString('README.txt', "Project Tracker CSV Backup\nGenerated: {$now}\n");

        foreach ($tables as $table) {
            $rows = DB::table($table)->get();
            if ($rows->isEmpty()) {
                $zip->addFromString("{$table}.csv", "");
                continue;
            }

            $csv    = '';
            $first  = (array) $rows->first();
            $csv   .= $this->csvRow(array_keys($first));

            foreach ($rows as $row) {
                $csv .= $this->csvRow(array_values((array) $row));
            }

            $zip->addFromString("{$table}.csv", $csv);
        }

        $zip->close();

        $content  = file_get_contents($zipPath);
        @unlink($zipPath);

        $filename = 'backup-' . now()->format('Ymd-His') . '.zip';

        $this->log('System', 'Backup CSV', "CSV backup downloaded by {$request->user()?->email}");

        return response($content, 200, [
            'Content-Type'        => 'application/zip',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** @return list<string> */
    private function allTableNames(): array
    {
        $driver = DB::connection()->getDriverName();
        $pdo    = DB::connection()->getPdo();

        if ($driver === 'sqlite') {
            $rows = $pdo->query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )->fetchAll(\PDO::FETCH_COLUMN);
        } elseif ($driver === 'pgsql') {
            $rows = $pdo->query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
            )->fetchAll(\PDO::FETCH_COLUMN);
        } else {
            // MySQL / MariaDB
            $rows = array_map(
                fn ($r) => array_values((array) $r)[0],
                $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_ASSOC)
            );
        }

        // Exclude Laravel internal tables that don't contain business data
        $exclude = ['migrations', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'];

        return array_values(array_filter($rows, fn ($t) => !in_array($t, $exclude, true)));
    }

    private function sqlValue(mixed $v): string
    {
        if ($v === null) return 'NULL';
        if (is_bool($v))  return $v ? '1' : '0';
        if (is_int($v) || is_float($v)) return (string) $v;
        return "'" . str_replace("'", "''", (string) $v) . "'";
    }

    private function csvRow(array $fields): string
    {
        $cells = array_map(function ($v) {
            if ($v === null) return '';
            $s = (string) $v;
            if (str_contains($s, ',') || str_contains($s, '"') || str_contains($s, "\n")) {
                return '"' . str_replace('"', '""', $s) . '"';
            }
            return $s;
        }, $fields);

        return implode(',', $cells) . "\n";
    }
}
