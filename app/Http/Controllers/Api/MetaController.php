<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Models\Reciter;
use App\Models\TafsirEdition;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MetaController extends ApiController
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'name' => 'Tefsira Sanahi API',
            'version' => config('tefsira.version'),
            'counts' => [
                'surahs' => 114,
                'ayahs' => Ayah::count(),
                'pages' => 604,
                'tafsirs' => TafsirEdition::where('is_active', true)->count(),
                'reciters' => Reciter::where('is_active', true)->count(),
            ],
            'mushaf' => 'Madinah Mushaf, KFGQPC V2 (1421H), 604 pages × 15 lines',
            'website' => config('tefsira.website'),
            'links' => [
                'docs' => url('/docs'),
                'surahs' => url('/api/v1/surahs'),
                'tafsirs' => url('/api/v1/tafsirs'),
                'reciters' => url('/api/v1/reciters'),
                'search' => url('/api/v1/search?q='),
                'donation' => url('/api/v1/donation'),
                'openapi' => url('/api/v1/openapi.yaml'),
            ],
        ]]);
    }

    public function openapi(): BinaryFileResponse
    {
        return response()->file(base_path('docs/openapi.yaml'), ['Content-Type' => 'application/yaml; charset=utf-8']);
    }

    public function donation(): JsonResponse
    {
        return response()->json(['data' => config('tefsira.donation')]);
    }
}
