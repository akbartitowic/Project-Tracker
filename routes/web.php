<?php

use App\Support\AppBranding;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Tenant subdomain routes — {slug}.hubtask.id
|--------------------------------------------------------------------------
| The ResolveTenant middleware resolves the Organization from the subdomain
| and binds it to the service container as 'tenant'.
|
*/
$appDomain = config('saas.domain');

if ($appDomain) {
    Route::domain('{tenant}.' . $appDomain)
        ->middleware(['web', 'resolve.tenant'])
        ->group(function () {
            Route::get('/{any}', function () {
                return view('welcome', AppBranding::toArray());
            })->where('any', '.*');
        });
}

/*
|--------------------------------------------------------------------------
| Main domain routes — marketing, auth, org selection
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return view('welcome', AppBranding::toArray());
})->name('login');

Route::get('/{any}', function () {
    return view('welcome', AppBranding::toArray());
})->where('any', '.*');
