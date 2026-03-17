<?php

use Illuminate\Support\Facades\Route;

Route::get('/migrate-db', function () {
    if (app()->environment('local')) {
        return "Migration should be run via Artisan in local.";
    }

    $db_host = config('database.connections.pgsql.host');
    $db_name = config('database.connections.pgsql.database');

    if ($db_host === '127.0.0.1') {
        return "ERROR: DB_HOST is still 127.0.0.1. Please update your environment variables in Vercel Dashboard and REDEPLOY.";
    }

    try {
        echo "Attempting to migrate on host: $db_host, database: $db_name...<br>";
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return "Migration successful!<br><pre>" . \Illuminate\Support\Facades\Artisan::output() . "</pre>";
    } catch (\Exception $e) {
        return "Migration failed!<br>Error: " . $e->getMessage();
    }
});

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
