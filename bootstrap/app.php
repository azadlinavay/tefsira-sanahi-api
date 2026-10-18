<?php

use App\Http\Middleware\AdminToken;
use App\Http\Middleware\ApiVersionHeader;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->throttleApi();
        $middleware->api(append: [ApiVersionHeader::class]);
        $middleware->alias(['admin' => AdminToken::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // This is an API: every error is JSON.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);
    })->create();
