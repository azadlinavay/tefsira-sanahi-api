<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protects the admin endpoints with the bearer token in
 * TEFSIRA_ADMIN_TOKEN. With no token configured they are switched off.
 */
class AdminToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('tefsira.admin_token');

        if ($expected === '') {
            abort(404);
        }
        if (! hash_equals($expected, (string) $request->bearerToken())) {
            abort(401, 'A valid admin token is required.');
        }

        return $next($request);
    }
}
