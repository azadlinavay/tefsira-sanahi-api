<?php

use Illuminate\Support\Facades\Route;

// The API lives under /api/v1. On the live site the web app is served at "/"
// by Nginx; these routes answer where Laravel is reached directly.
Route::get('/', fn () => response()->json([
    'name' => 'Tefsira Sanahi API',
    'version' => config('tefsira.version'),
    'website' => config('tefsira.website'),
    'api' => url('/api/v1'),
    'docs' => url('/docs'),
    'openapi' => url('/api/v1/openapi.yaml'),
]));

// Human-readable, interactive API documentation.
Route::get('/docs', fn () => view('docs', [
    'version' => config('tefsira.version'),
    'website' => config('tefsira.website'),
    'github' => config('tefsira.github'),
    'rateLimit' => config('tefsira.rate_limit'),
]));