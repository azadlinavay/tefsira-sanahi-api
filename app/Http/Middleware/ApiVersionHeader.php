<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Adds X-API-Version to every API response, and lets clients/CDNs cache public reads. */
class ApiVersionHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('X-API-Version', config('tefsira.version'));

        if ($response instanceof JsonResponse) { // readable Arabic/Kurdish and URLs
            $response->setEncodingOptions($response->getEncodingOptions() | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        if ($request->isMethodCacheable() && $response->getStatusCode() === 200 && ! $request->is('api/*/admin/*')) {
            $response->headers->set('Cache-Control', 'public, max-age='.(int) config('tefsira.cache_seconds'));
        }

        return $response;
    }
}
