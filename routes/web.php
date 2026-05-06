<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome')->name('login');

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
