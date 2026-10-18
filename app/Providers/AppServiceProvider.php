<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Public API: TEFSIRA_RATE_LIMIT requests per minute per IP (default 120).
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute((int) config('tefsira.rate_limit'))->by($request->ip()));
    }
}
