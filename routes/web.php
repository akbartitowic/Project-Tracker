<?php

use Illuminate\Support\Facades\Route;

Route::get('/migrate-db', function () {
    if (app()->environment('local')) {
        return "Migration should be run via Artisan in local.";
    }

    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return "Migration successful: " . \Illuminate\Support\Facades\Artisan::output();
    } catch (\Exception $e) {
        return "Migration failed: " . $e->getMessage();
    }
});

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
