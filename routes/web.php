<?php

use Illuminate\Support\Facades\Route;

// API-only project: the root points to the API and its documentation.
Route::get('/', fn () => response()->json([
    'name' => 'Tefsira Sanahi API',
    'version' => config('tefsira.version'),
    'api' => url('/api/v1'),
    'openapi' => url('/api/v1/openapi.yaml'),
    'docs' => 'https://github.com/azadlinavay/tefsira-sanahi-api#readme',
]));
