<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Models\Reciter;
use Illuminate\Http\JsonResponse;

class ReciterController extends ApiController
{
    public function index(): JsonResponse
    {
        $reciters = Reciter::where('is_active', true)->orderBy('sort')->get()->map(fn (Reciter $r) => [
            'id' => $r->id,
            'name' => $r->name,
            'url_template' => $r->url_template,
            'is_default' => $r->is_default,
        ]);

        return response()->json(['data' => $reciters]);
    }

    /** Recitation URL of every ayah in a surah. */
    public function surah(Reciter $reciter, int $surah): JsonResponse
    {
        $this->findSurah($surah);
        $urls = Ayah::where('surah_id', $surah)->orderBy('number')->get()
            ->map(fn (Ayah $a) => ['key' => $a->key(), 'url' => $reciter->urlFor($a)]);

        return response()->json(['data' => ['reciter' => $reciter->id, 'surah' => $surah, 'ayahs' => $urls]]);
    }
}
